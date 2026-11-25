-- Accounts, preferences, devices, consent, deletion requests.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  user_id uuid generated always as (id) stored,
  preferred_name text check (char_length(preferred_name) <= 40),
  country text not null default 'PH' check (country ~ '^[A-Z]{2}$'),
  language text not null default 'en' check (language in ('en', 'fil')),
  timezone text not null default 'Asia/Manila',
  employment_status text check (employment_status in ('student', 'fresh_graduate', 'employed', 'freelancer', 'self_employed', 'looking_for_work', 'prefer_not_to_say')),
  living_arrangement text check (living_arrangement in ('with_family', 'renting', 'own_place', 'dorm', 'abroad', 'prefer_not_to_say')),
  responsibility_areas text[] not null default '{}',
  favorite_mascot text not null default 'adu' check (favorite_mascot in ('adu', 'doki', 'piso', 'tiki', 'homi', 'sunny')),
  avatar text not null default 'adu',
  onboarding_completed_at timestamptz
);
select public.make_syncable('public.profiles');
select public.apply_owner_rls('public.profiles');

create table public.user_preferences (
  user_id uuid primary key references auth.users (id) on delete cascade,
  theme text not null default 'system' check (theme in ('light', 'dark', 'system')),
  reduced_motion boolean not null default false,
  show_mascots boolean not null default true,
  mascot_animations boolean not null default true,
  gamification_enabled boolean not null default true,
  ai_include_records boolean not null default false
);
select public.make_syncable('public.user_preferences');
select public.apply_owner_rls('public.user_preferences');

create table public.notification_preferences (
  user_id uuid primary key references auth.users (id) on delete cascade,
  enabled boolean not null default true,
  categories jsonb not null default '{"task":true,"bill":true,"document":true,"subscription":true,"weekly_summary":true}'::jsonb,
  reminder_time time not null default '09:00',
  quiet_hours_enabled boolean not null default true,
  quiet_start time not null default '22:00',
  quiet_end time not null default '07:00',
  weekly_summary_day smallint not null default 0 check (weekly_summary_day between 0 and 6),
  show_details_on_lock_screen boolean not null default false,
  mascot_notifications boolean not null default true
);
select public.make_syncable('public.notification_preferences');
select public.apply_owner_rls('public.notification_preferences');

create table public.user_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  platform text not null check (platform in ('android', 'ios', 'web')),
  push_token text,
  app_version text,
  last_seen_at timestamptz not null default now(),
  unique (user_id, push_token)
);
select public.apply_owner_rls('public.user_devices');

-- Append-only consent history.
create table public.consent_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  consent_type text not null check (consent_type in ('terms', 'privacy_policy', 'ai_processing', 'analytics', 'ai_record_access')),
  granted boolean not null,
  policy_version text not null,
  created_at timestamptz not null default now()
);
create index consent_records_user_idx on public.consent_records (user_id, consent_type, created_at desc);
alter table public.consent_records enable row level security;
alter table public.consent_records force row level security;
create policy consent_select on public.consent_records for select to authenticated using (user_id = auth.uid());
create policy consent_insert on public.consent_records for insert to authenticated with check (user_id = auth.uid());
grant select, insert on public.consent_records to authenticated;

create or replace function public.has_consent(p_user uuid, p_type text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select granted from public.consent_records
                   where user_id = p_user and consent_type = p_type
                   order by created_at desc limit 1), false)
$$;
revoke all on function public.has_consent(uuid, text) from public, anon;
grant execute on function public.has_consent(uuid, text) to authenticated, service_role;

-- Deletion requests outlive the account (user_id nulls on delete) so we can
-- prove a deletion happened without keeping who it was. The e-mail is stored
-- only as a salted hash for web requests, and cleared after completion.
create table public.account_deletion_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  source text not null check (source in ('in_app', 'web')),
  email_hash text,
  status text not null default 'pending' check (status in ('pending', 'verifying', 'completed', 'rejected')),
  requested_at timestamptz not null default now(),
  completed_at timestamptz
);
alter table public.account_deletion_requests enable row level security;
alter table public.account_deletion_requests force row level security;
create policy deletion_select on public.account_deletion_requests for select to authenticated using (user_id = auth.uid());
grant select on public.account_deletion_requests to authenticated;

-- Create profile + preference rows on sign-up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id) on conflict do nothing;
  insert into public.user_preferences (user_id) values (new.id) on conflict do nothing;
  insert into public.notification_preferences (user_id) values (new.id) on conflict do nothing;
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();
