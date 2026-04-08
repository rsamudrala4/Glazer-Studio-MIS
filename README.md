# Team Task Manager

Simple internal task management MVP built with Next.js 14 App Router, TypeScript, Tailwind CSS, and Supabase.

## What this app does

- Email/password authentication with Supabase Auth
- Organization creation and employee invite links
- Shared-permission task management inside one organization
- One-off and recurring tasks
- Real task instances generated for recurring schedules
- Personal dashboard with today, overdue, and upcoming sections
- Team daily summary with copy-friendly manager report text
- Supabase Row Level Security to block cross-organization access

## Tech choices

- Next.js App Router for page structure and server actions
- Supabase for auth, Postgres, and RLS
- Tailwind CSS for a simple office-friendly UI
- Recurring tasks are generated lazily on server-side page loads and writes

## Assumptions

- This is an internal MVP with one organization per user.
- All organization members have equal permissions.
- Invite flow is link-based instead of email-delivery-based to keep the setup light.
- Supabase email confirmation should be disabled for the cleanest MVP signup flow, or you should adapt the auth flow for confirmed-email onboarding.
- Recurring tasks are generated for the next 8 weeks whenever task-heavy pages are opened or recurrence rules are created. This avoids requiring a cron job for the MVP while still producing real instances.

## Project structure

```text
app/
  actions/                 Server actions for auth, orgs, and tasks
  dashboard/               Personal dashboard
  login/                   Email/password login
  settings/                Organization setup and invites
  signup/                  Account creation / invite join flow
  tasks/                   Task CRUD and recurring task setup
  team-summary/            Date-based employee summary report
components/                Reusable UI pieces
lib/                       Supabase helpers, auth guards, queries, recurrence logic
supabase/
  schema.sql               Database schema + RLS policies
  seed.sql                 Optional demo data after creating auth users
```

## Environment variables

Create `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
APP_TIME_ZONE=Asia/Kolkata
```

## Supabase setup

1. Create a new Supabase project.
2. In Authentication settings, enable Email auth.
3. For the smoothest MVP flow, disable email confirmation while testing internally.
4. Run [`supabase/schema.sql`](/Users/glazergames/Documents/Task management/supabase/schema.sql) in the SQL editor.
5. Optionally create demo users in Supabase Auth, then replace the placeholder UUIDs and run [`supabase/seed.sql`](/Users/glazergames/Documents/Task management/supabase/seed.sql).

## Local run

1. Install dependencies:

```bash
npm install
```

2. Start the app:

```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000)

## Recurring task model

Recurring rules are stored separately from tasks in `recurrence_rules`, but each actual due occurrence becomes a row in `tasks`.

- `daily`: generates by day interval
- `weekly`: generates on selected weekdays
- `monthly`: generates once per month using the start date as the anchor day

This keeps completion per day explicit and queryable.

## Database relationships

- `auth.users` -> `profiles`
  Each authenticated user gets one profile row.
- `organizations` -> `profiles`
  A profile belongs to one organization.
- `organizations` -> `organization_invitations`
  Invite links are scoped to one organization.
- `organizations` -> `tasks`
  Every task belongs to one organization.
- `recurrence_rules` -> `tasks`
  Recurring schedules generate many concrete task instances.
- `profiles` -> `tasks`
  Tasks track both `assigned_to` and `created_by`.

## Security notes

RLS policies ensure that users can only:

- read organization data for their own organization
- see profiles, invitations, tasks, and recurrence rules in their own organization
- create and modify tasks only within their own organization

Cross-organization access is blocked at the database layer.

## Suggested production improvements

- Add email delivery for invite links
- Add edit/delete controls for recurrence rules
- Add pagination if task volume grows
- Add a background job or Supabase scheduled function to pre-generate future recurring tasks
- Add toast notifications and optimistic UI polish

## Notes for extension

- Task filters already support employee, date, status, and title search.
- The navigation header shows a simple overdue badge.
- Team summary text is copy-ready for email or chat updates.
