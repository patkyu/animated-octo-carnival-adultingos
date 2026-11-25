-- Phase 4 expansion tables. Created now so the data model is stable, but the
-- matching app screens stay behind disabled feature flags until released.

create table public.savings_goals (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  goal_type text not null default 'custom' check (goal_type in ('emergency_fund', 'travel', 'education', 'custom')),
  target_minor bigint not null check (target_minor between 1 and 99999999999),
  currency text not null default 'PHP' check (currency in ('PHP', 'USD')),
  target_date date,
  archived_at timestamptz
);
select public.make_syncable('public.savings_goals');
select public.apply_owner_rls('public.savings_goals');

create table public.savings_contributions (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  goal_id uuid not null references public.savings_goals (id) on delete cascade,
  amount_minor bigint not null check (amount_minor between -99999999999 and 99999999999 and amount_minor <> 0),
  contributed_on date not null,
  note text not null default ''
);
select public.make_syncable('public.savings_contributions');
select public.apply_owner_rls('public.savings_contributions');

create table public.life_event_templates (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  introduction text not null default '',
  tasks jsonb not null default '[]'::jsonb,
  related_guide_slugs text[] not null default '{}',
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  updated_at timestamptz not null default now()
);
alter table public.life_event_templates enable row level security;
create policy let_read on public.life_event_templates for select to anon, authenticated
  using (status = 'published' or public.has_admin_role('content_editor', 'content_reviewer'));
create policy let_write on public.life_event_templates for all to authenticated
  using (public.has_admin_role('content_editor', 'content_reviewer')) with check (public.has_admin_role('content_editor', 'content_reviewer'));
grant select on public.life_event_templates to anon, authenticated;
grant insert, update, delete on public.life_event_templates to authenticated;

create table public.user_life_events (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  template_slug text not null,
  title text not null,
  started_on date not null,
  completed_on date
);
select public.make_syncable('public.user_life_events');
select public.apply_owner_rls('public.user_life_events');

create table public.life_event_tasks (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  life_event_id uuid not null references public.user_life_events (id) on delete cascade,
  obligation_id uuid references public.obligations (id) on delete set null,
  required boolean not null default true
);
select public.make_syncable('public.life_event_tasks');
select public.apply_owner_rls('public.life_event_tasks');

-- Households: shared data lives only in household_* tables. Members never see
-- each other's private obligations, documents or bills.
create table public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 60),
  created_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
create table public.household_members (
  household_id uuid not null references public.households (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  primary key (household_id, user_id)
);
create or replace function public.is_household_member(p_household uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from household_members where household_id = p_household and user_id = auth.uid())
$$;
create table public.household_tasks (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  title text not null,
  assignee_id uuid references auth.users (id) on delete set null,
  due_date date,
  recurrence jsonb not null default '{"freq":"none","interval":1}'::jsonb,
  done boolean not null default false,
  created_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now()
);
create table public.grocery_lists (
  id uuid primary key default gen_random_uuid(),
  household_id uuid references public.households (id) on delete cascade,
  user_id uuid references auth.users (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  check ((household_id is null) <> (user_id is null))
);
create table public.grocery_items (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references public.grocery_lists (id) on delete cascade,
  name text not null,
  quantity text not null default '',
  checked boolean not null default false
);

alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.household_tasks enable row level security;
alter table public.grocery_lists enable row level security;
alter table public.grocery_items enable row level security;
create policy hh_read on public.households for select to authenticated using (public.is_household_member(id));
create policy hh_create on public.households for insert to authenticated with check (created_by = auth.uid());
create policy hhm_read on public.household_members for select to authenticated using (public.is_household_member(household_id));
create policy hhm_leave on public.household_members for delete to authenticated using (user_id = auth.uid());
create policy hht_all on public.household_tasks for all to authenticated
  using (public.is_household_member(household_id)) with check (public.is_household_member(household_id));
create policy gl_all on public.grocery_lists for all to authenticated
  using (user_id = auth.uid() or public.is_household_member(household_id))
  with check (user_id = auth.uid() or public.is_household_member(household_id));
create policy gi_all on public.grocery_items for all to authenticated
  using (exists (select 1 from public.grocery_lists l where l.id = list_id and (l.user_id = auth.uid() or public.is_household_member(l.household_id))))
  with check (exists (select 1 from public.grocery_lists l where l.id = list_id and (l.user_id = auth.uid() or public.is_household_member(l.household_id))));
grant select, insert, update, delete on public.households, public.household_members, public.household_tasks, public.grocery_lists, public.grocery_items to authenticated;

create table public.routines (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  kind text not null default 'custom' check (kind in ('morning', 'evening', 'break', 'hydration', 'rest', 'journaling', 'digital_detox', 'weekly_reflection', 'custom')),
  schedule jsonb not null default '{}'::jsonb,
  enabled boolean not null default true
);
select public.make_syncable('public.routines');
select public.apply_owner_rls('public.routines');

create table public.routine_completions (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  routine_id uuid not null references public.routines (id) on delete cascade,
  completed_on date not null,
  unique (routine_id, completed_on)
);
select public.make_syncable('public.routine_completions');
select public.apply_owner_rls('public.routine_completions');
