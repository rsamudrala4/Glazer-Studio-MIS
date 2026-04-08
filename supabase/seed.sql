-- Demo data seed
-- Replace the placeholder UUIDs below with real auth user IDs from your Supabase project.

-- Example users
-- manager@acme.local  -> 11111111-1111-1111-1111-111111111111
-- employee1@acme.local -> 22222222-2222-2222-2222-222222222222
-- employee2@acme.local -> 33333333-3333-3333-3333-333333333333

insert into public.organizations (id, name, created_by)
values (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'Acme Operations',
  '11111111-1111-1111-1111-111111111111'
)
on conflict (id) do nothing;

insert into public.profiles (id, organization_id, full_name, email)
values
  ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Operations Manager', 'manager@acme.local'),
  ('22222222-2222-2222-2222-222222222222', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Employee A', 'employee1@acme.local'),
  ('33333333-3333-3333-3333-333333333333', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Employee B', 'employee2@acme.local')
on conflict (id) do update
set organization_id = excluded.organization_id,
    full_name = excluded.full_name,
    email = excluded.email;

insert into public.tasks (
  organization_id,
  title,
  description,
  assigned_to,
  created_by,
  due_date,
  due_time,
  status
)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Call vendor for pricing', 'Confirm revised annual pricing sheet', '22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', current_date, '10:30', 'pending'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Prepare dispatch summary', 'Email final dispatch count to manager', '33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', current_date, '15:00', 'completed'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Review aging payments', 'Flag overdue invoices', '11111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', current_date + 1, '11:00', 'pending');

insert into public.recurrence_rules (
  organization_id,
  title,
  description,
  assigned_to,
  created_by,
  start_date,
  end_date,
  due_time,
  frequency,
  interval_value,
  weekdays
)
values (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'Daily standup update',
  'Share progress in the morning sync',
  '22222222-2222-2222-2222-222222222222',
  '11111111-1111-1111-1111-111111111111',
  current_date,
  current_date + 14,
  '09:30',
  'daily',
  1,
  '{}'
);
