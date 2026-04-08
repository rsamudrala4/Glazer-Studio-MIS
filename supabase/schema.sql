-- Team Task Manager schema
-- Run this in the Supabase SQL editor for a fresh project.

create extension if not exists "pgcrypto";

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid not null references auth.users (id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  organization_id uuid references public.organizations (id) on delete set null,
  full_name text,
  email text not null unique,
  access_level text not null default 'member' check (access_level in ('member', 'summary_viewer')),
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.profiles
  add column if not exists access_level text not null default 'member';

alter table public.profiles
  drop constraint if exists profiles_access_level_check;

alter table public.profiles
  add constraint profiles_access_level_check
  check (access_level in ('member', 'summary_viewer'));

create table if not exists public.organization_invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  email text not null,
  invite_type text not null default 'member' check (invite_type in ('member', 'summary_viewer')),
  invited_by uuid not null references public.profiles (id) on delete cascade,
  token text not null unique,
  accepted_at timestamptz,
  expires_at timestamptz not null,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.organization_invitations
  add column if not exists invite_type text not null default 'member';

alter table public.organization_invitations
  drop constraint if exists organization_invitations_invite_type_check;

alter table public.organization_invitations
  add constraint organization_invitations_invite_type_check
  check (invite_type in ('member', 'summary_viewer'));

create table if not exists public.recurrence_rules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  title text not null,
  description text,
  assigned_to uuid not null references public.profiles (id) on delete cascade,
  created_by uuid not null references public.profiles (id) on delete cascade,
  start_date date not null,
  end_date date,
  due_time time,
  frequency text not null check (frequency in ('daily', 'weekly', 'monthly')),
  interval_value integer not null default 1 check (interval_value > 0),
  weekdays integer[] not null default '{}',
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  recurrence_rule_id uuid references public.recurrence_rules (id) on delete set null,
  recurrence_instance_date date,
  title text not null,
  description text,
  assigned_to uuid not null references public.profiles (id) on delete cascade,
  created_by uuid not null references public.profiles (id) on delete cascade,
  due_date date not null,
  due_time time,
  status text not null default 'pending' check (status in ('pending', 'completed')),
  completed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  constraint unique_recurrence_instance unique (recurrence_rule_id, recurrence_instance_date)
);

create table if not exists public.attendance_entries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  work_date date not null,
  check_in_at timestamptz not null,
  check_out_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  constraint unique_attendance_entry_per_day unique (user_id, work_date)
);

create index if not exists idx_profiles_organization_id on public.profiles (organization_id);
create index if not exists idx_tasks_organization_due_date on public.tasks (organization_id, due_date);
create index if not exists idx_tasks_assigned_due_date on public.tasks (assigned_to, due_date);
create index if not exists idx_tasks_status on public.tasks (status);
create index if not exists idx_recurrence_rules_org_active on public.recurrence_rules (organization_id, is_active);
create index if not exists idx_attendance_org_work_date on public.attendance_entries (organization_id, work_date);
create index if not exists idx_attendance_user_work_date on public.attendance_entries (user_id, work_date);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', '')
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = case
          when excluded.full_name = '' then public.profiles.full_name
          else excluded.full_name
        end;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create or replace function public.current_org_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select organization_id
  from public.profiles
  where id = auth.uid()
$$;

drop function if exists public.get_invitation_by_token(text);
create or replace function public.get_invitation_by_token(invite_token text)
returns table (
  id uuid,
  organization_id uuid,
  email text,
  token text,
  invite_type text,
  accepted_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz,
  organization_name text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    oi.id,
    oi.organization_id,
    oi.email,
    oi.token,
    oi.invite_type,
    oi.accepted_at,
    oi.expires_at,
    oi.created_at,
    o.name as organization_name
  from public.organization_invitations oi
  join public.organizations o on o.id = oi.organization_id
  where oi.token = invite_token
    and oi.accepted_at is null
    and oi.expires_at > timezone('utc', now())
  limit 1
$$;

create or replace function public.create_organization_for_current_user(org_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_org_id uuid;
  current_user_id uuid;
begin
  current_user_id := auth.uid();

  if current_user_id is null then
    raise exception 'Not authenticated';
  end if;

  insert into public.organizations (name, created_by)
  values (org_name, current_user_id)
  returning id into new_org_id;

  update public.profiles
  set organization_id = new_org_id
  where id = current_user_id;

  return new_org_id;
end;
$$;

drop function if exists public.accept_invitation_for_current_user(text, text);
create or replace function public.accept_invitation_for_current_user(invite_token text, invite_email text)
returns table (
  organization_id uuid,
  access_level text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  target_org_id uuid;
  target_invitation_id uuid;
  target_invite_type text;
  current_user_id uuid;
begin
  current_user_id := auth.uid();

  if current_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select oi.id, oi.organization_id, oi.invite_type
  into target_invitation_id, target_org_id, target_invite_type
  from public.organization_invitations oi
  where oi.token = invite_token
    and lower(oi.email) = lower(invite_email)
    and oi.accepted_at is null
    and oi.expires_at > timezone('utc', now())
  limit 1;

  if target_org_id is null then
    raise exception 'Invitation is invalid, expired, or does not match this email';
  end if;

  update public.profiles
  set organization_id = target_org_id,
      access_level = case
        when target_invite_type = 'summary_viewer' then 'summary_viewer'
        else 'member'
      end
  where id = current_user_id;

  update public.organization_invitations
  set accepted_at = timezone('utc', now())
  where id = target_invitation_id;

  organization_id := target_org_id;
  access_level := case
    when target_invite_type = 'summary_viewer' then 'summary_viewer'
    else 'member'
  end;
  return next;
end;
$$;

alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.organization_invitations enable row level security;
alter table public.recurrence_rules enable row level security;
alter table public.tasks enable row level security;
alter table public.attendance_entries enable row level security;

drop policy if exists "org members can read organization" on public.organizations;
create policy "org members can read organization"
on public.organizations for select
using (id = public.current_org_id());

drop policy if exists "authenticated users can create organizations" on public.organizations;
create policy "authenticated users can create organizations"
on public.organizations for insert
with check (auth.uid() is not null and created_by = auth.uid());

drop policy if exists "org members can update organization" on public.organizations;
create policy "org members can update organization"
on public.organizations for update
using (id = public.current_org_id())
with check (id = public.current_org_id());

drop policy if exists "users can read profiles in own org" on public.profiles;
create policy "users can read profiles in own org"
on public.profiles for select
using (
  id = auth.uid()
  or organization_id = public.current_org_id()
);

drop policy if exists "users can insert their own profile" on public.profiles;
create policy "users can insert their own profile"
on public.profiles for insert
with check (id = auth.uid());

drop policy if exists "users can update their own profile" on public.profiles;
create policy "users can update their own profile"
on public.profiles for update
using (id = auth.uid())
with check (
  id = auth.uid()
  and (
    organization_id is null
    or organization_id = public.current_org_id()
    or public.current_org_id() is null
  )
);

drop policy if exists "org members can read invitations" on public.organization_invitations;
create policy "org members can read invitations"
on public.organization_invitations for select
using (organization_id = public.current_org_id());

drop policy if exists "org members can create invitations" on public.organization_invitations;
create policy "org members can create invitations"
on public.organization_invitations for insert
with check (
  organization_id = public.current_org_id()
  and invited_by = auth.uid()
);

drop policy if exists "org members can update invitations" on public.organization_invitations;
create policy "org members can update invitations"
on public.organization_invitations for update
using (organization_id = public.current_org_id())
with check (organization_id = public.current_org_id());

drop policy if exists "org members can read recurrence rules" on public.recurrence_rules;
create policy "org members can read recurrence rules"
on public.recurrence_rules for select
using (organization_id = public.current_org_id());

drop policy if exists "org members can create recurrence rules" on public.recurrence_rules;
create policy "org members can create recurrence rules"
on public.recurrence_rules for insert
with check (
  organization_id = public.current_org_id()
  and created_by = auth.uid()
);

drop policy if exists "org members can update recurrence rules" on public.recurrence_rules;
create policy "org members can update recurrence rules"
on public.recurrence_rules for update
using (organization_id = public.current_org_id())
with check (organization_id = public.current_org_id());

drop policy if exists "org members can delete recurrence rules" on public.recurrence_rules;
create policy "org members can delete recurrence rules"
on public.recurrence_rules for delete
using (organization_id = public.current_org_id());

drop policy if exists "org members can read tasks" on public.tasks;
create policy "org members can read tasks"
on public.tasks for select
using (organization_id = public.current_org_id());

drop policy if exists "org members can create tasks" on public.tasks;
create policy "org members can create tasks"
on public.tasks for insert
with check (
  organization_id = public.current_org_id()
  and created_by = auth.uid()
);

drop policy if exists "org members can update tasks" on public.tasks;
create policy "org members can update tasks"
on public.tasks for update
using (organization_id = public.current_org_id())
with check (organization_id = public.current_org_id());

drop policy if exists "org members can delete tasks" on public.tasks;
create policy "org members can delete tasks"
on public.tasks for delete
using (organization_id = public.current_org_id());

drop policy if exists "org members can read attendance" on public.attendance_entries;
create policy "org members can read attendance"
on public.attendance_entries for select
using (organization_id = public.current_org_id());

drop policy if exists "users can create own attendance" on public.attendance_entries;
create policy "users can create own attendance"
on public.attendance_entries for insert
with check (
  organization_id = public.current_org_id()
  and user_id = auth.uid()
);

drop policy if exists "users can update own attendance" on public.attendance_entries;
create policy "users can update own attendance"
on public.attendance_entries for update
using (
  organization_id = public.current_org_id()
  and user_id = auth.uid()
)
with check (
  organization_id = public.current_org_id()
  and user_id = auth.uid()
);
