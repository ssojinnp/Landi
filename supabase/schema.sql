-- Landi shared plan schema for Supabase
create table if not exists public.plans (
  id text primary key,
  title text not null,
  data jsonb not null,
  owner_id uuid not null references auth.users(id) on delete cascade,
  owner_email text not null,
  access_emails text[] not null default '{}',
  members jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.plans enable row level security;

create policy "plan members can read"
on public.plans for select
to authenticated
using (
  owner_id = (select auth.uid())
  or lower((select auth.jwt() ->> 'email')) = any(access_emails)
);

create policy "owners can create plans"
on public.plans for insert
to authenticated
with check (owner_id = (select auth.uid()));

create policy "owners and editors can update plans"
on public.plans for update
to authenticated
using (
  owner_id = (select auth.uid())
  or exists (
    select 1
    from jsonb_to_recordset(members) as member(email text, role text)
    where lower(member.email) = lower((select auth.jwt() ->> 'email'))
      and member.role = 'editor'
  )
)
with check (
  owner_id = (select auth.uid())
  or exists (
    select 1
    from jsonb_to_recordset(members) as member(email text, role text)
    where lower(member.email) = lower((select auth.jwt() ->> 'email'))
      and member.role = 'editor'
  )
);

create policy "owners can delete plans"
on public.plans for delete
to authenticated
using (owner_id = (select auth.uid()));
