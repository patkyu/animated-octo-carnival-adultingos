-- Personal organization: obligations (tasks, bills, subscriptions), their
-- occurrences, checklists, documents, bills, payments, subscriptions.

create table public.categories (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 40),
  color text not null default 'mint',
  icon text not null default 'tag'
);
select public.make_syncable('public.categories');
select public.apply_owner_rls('public.categories');

-- An obligation is the definition ("Pay Meralco, monthly on the 15th").
-- Each concrete instance is an obligation_occurrence.
create table public.obligations (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null default 'task' check (kind in ('task', 'bill', 'subscription')),
  title text not null check (char_length(title) between 1 and 120),
  description text not null default '' check (char_length(description) <= 2000),
  category text not null default 'personal' check (char_length(category) <= 60),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  due_time time,
  -- {"freq":"monthly","interval":1,"anchorDay":31} — see packages/shared/src/recurrence.ts
  recurrence jsonb not null default '{"freq":"none","interval":1}'::jsonb
    check (recurrence ? 'freq' and recurrence->>'freq' in ('none', 'daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'custom')),
  reminder_offsets smallint[] not null default '{0}' check (cardinality(reminder_offsets) <= 6),
  tags text[] not null default '{}' check (cardinality(tags) <= 10),
  notes text not null default '' check (char_length(notes) <= 2000),
  source text not null default 'user' check (source in ('user', 'guide', 'ai', 'template')),
  source_ref text,
  archived_at timestamptz
);
select public.make_syncable('public.obligations');
select public.apply_owner_rls('public.obligations');
create index obligations_user_kind_idx on public.obligations (user_id, kind) where deleted_at is null;

create table public.obligation_occurrences (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  obligation_id uuid not null references public.obligations (id) on delete cascade,
  -- The date the recurrence rule produced; never changes. Rescheduling moves due_date only.
  scheduled_date date not null,
  due_date date not null,
  status text not null default 'open' check (status in ('open', 'done', 'skipped')),
  completed_on date,
  -- Variable bills: amount for this occurrence (minor units). Null → use bill default.
  amount_minor bigint check (amount_minor is null or amount_minor between 0 and 99999999999),
  snoozed_until timestamptz,
  -- Guarantees exactly one occurrence per scheduled date, whichever device or retry creates it.
  unique (obligation_id, scheduled_date),
  check ((status = 'done') = (completed_on is not null))
);
select public.make_syncable('public.obligation_occurrences');
select public.apply_owner_rls('public.obligation_occurrences');
create index occurrences_due_idx on public.obligation_occurrences (user_id, due_date) where deleted_at is null and status = 'open';

create table public.task_checklist_items (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  obligation_id uuid not null references public.obligations (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  done boolean not null default false,
  position integer not null default 0
);
select public.make_syncable('public.task_checklist_items');
select public.apply_owner_rls('public.task_checklist_items');

-- Server-side push reminders (weekly summary and future remote reminders).
-- Per-item reminders are scheduled on-device from occurrences/documents.
create table public.reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('weekly_summary', 'task', 'bill', 'document', 'subscription')),
  target_id uuid,
  fire_at timestamptz not null,
  status text not null default 'scheduled' check (status in ('scheduled', 'sent', 'cancelled', 'failed')),
  created_at timestamptz not null default now(),
  unique (user_id, kind, target_id, fire_at)
);
select public.apply_owner_rls('public.reminders');

create table public.documents (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  template_key text not null check (char_length(template_key) <= 40),
  name text not null check (char_length(name) between 1 and 120),
  issuer text not null default '' check (char_length(issuer) <= 120),
  stage text not null default 'obtained' check (stage in ('not_obtained', 'in_progress', 'obtained')),
  issue_date date,
  expiry_date date,
  -- Never store full ID numbers: last four characters only.
  reference_last4 text not null default '' check (reference_last4 ~ '^[A-Za-z0-9]{0,4}$'),
  official_url text not null default '' check (official_url = '' or official_url ~ '^https://'),
  reminder_offsets smallint[] not null default '{90,30,7}' check (cardinality(reminder_offsets) <= 6),
  notes text not null default '' check (char_length(notes) <= 2000),
  archived_at timestamptz,
  check (issue_date is null or expiry_date is null or issue_date <= expiry_date)
);
select public.make_syncable('public.documents');
select public.apply_owner_rls('public.documents');
create index documents_expiry_idx on public.documents (user_id, expiry_date) where deleted_at is null;

create table public.document_renewals (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  document_id uuid not null references public.documents (id) on delete cascade,
  previous_issue_date date,
  previous_expiry_date date,
  new_issue_date date,
  new_expiry_date date,
  renewed_on date not null,
  note text not null default '' check (char_length(note) <= 500)
);
select public.make_syncable('public.document_renewals');
select public.apply_owner_rls('public.document_renewals');

create table public.bills (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  obligation_id uuid not null unique references public.obligations (id) on delete cascade,
  provider text not null default '' check (char_length(provider) <= 80),
  bill_category text not null default 'other' check (bill_category in ('electricity', 'water', 'internet', 'mobile', 'rent', 'insurance', 'credit_card', 'loan', 'tuition', 'membership', 'gov_contribution', 'other')),
  amount_minor bigint check (amount_minor is null or amount_minor between 0 and 99999999999),
  variable_amount boolean not null default false,
  currency text not null default 'PHP' check (currency in ('PHP', 'USD'))
);
select public.make_syncable('public.bills');
select public.apply_owner_rls('public.bills');

create table public.bill_payments (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  bill_id uuid not null references public.bills (id) on delete cascade,
  -- One payment record per occurrence: retries and second devices can't double-pay.
  occurrence_id uuid not null unique references public.obligation_occurrences (id) on delete cascade,
  paid_on date not null,
  amount_minor bigint not null check (amount_minor between 0 and 99999999999),
  currency text not null default 'PHP' check (currency in ('PHP', 'USD')),
  note text not null default '' check (char_length(note) <= 200)
);
select public.make_syncable('public.bill_payments');
select public.apply_owner_rls('public.bill_payments');
create index bill_payments_paid_idx on public.bill_payments (user_id, paid_on);

create table public.subscriptions (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  obligation_id uuid not null unique references public.obligations (id) on delete cascade,
  sub_category text not null default 'other' check (sub_category in ('streaming', 'music', 'software', 'gym', 'cloud', 'ai', 'mobile_plan', 'other')),
  amount_minor bigint not null check (amount_minor between 0 and 99999999999),
  currency text not null default 'PHP' check (currency in ('PHP', 'USD')),
  trial_ends_on date,
  status text not null default 'active' check (status in ('active', 'canceled')),
  -- Recorded by the user. AdultingOS never cancels external services.
  canceled_on date
);
select public.make_syncable('public.subscriptions');
select public.apply_owner_rls('public.subscriptions');

-- Cross-table ownership guard: a child row must belong to the same user as its parent.
create or replace function public.tg_same_owner()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  parent_table text := tg_argv[0];
  parent_col text := tg_argv[1];
  parent_id uuid;
  parent_owner uuid;
begin
  parent_id := (to_jsonb(new) ->> parent_col)::uuid;
  execute format('select user_id from public.%I where id = $1', parent_table) into parent_owner using parent_id;
  if parent_owner is null or parent_owner <> new.user_id then
    raise exception 'parent % does not belong to this user', parent_table using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger same_owner before insert or update on public.obligation_occurrences for each row execute function public.tg_same_owner('obligations', 'obligation_id');
create trigger same_owner before insert or update on public.task_checklist_items for each row execute function public.tg_same_owner('obligations', 'obligation_id');
create trigger same_owner before insert or update on public.document_renewals for each row execute function public.tg_same_owner('documents', 'document_id');
create trigger same_owner before insert or update on public.bills for each row execute function public.tg_same_owner('obligations', 'obligation_id');
create trigger same_owner before insert or update on public.bill_payments for each row execute function public.tg_same_owner('bills', 'bill_id');
create trigger same_owner_occ before insert or update on public.bill_payments for each row execute function public.tg_same_owner('obligation_occurrences', 'occurrence_id');
create trigger same_owner before insert or update on public.subscriptions for each row execute function public.tg_same_owner('obligations', 'obligation_id');
