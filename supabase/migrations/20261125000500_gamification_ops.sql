-- Mascots, achievements, notification logs, feedback.

create table public.mascots (
  id text primary key check (id in ('adu', 'doki', 'piso', 'tiki', 'homi', 'sunny')),
  name text not null,
  role text not null,
  phrase text not null,
  released boolean not null default true
);
alter table public.mascots enable row level security;
create policy mascots_read on public.mascots for select to anon, authenticated using (true);
grant select on public.mascots to anon, authenticated;

create table public.user_mascots (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  mascot_id text not null references public.mascots (id),
  unlocked_at timestamptz not null default now(),
  unique (user_id, mascot_id)
);
select public.make_syncable('public.user_mascots');
select public.apply_owner_rls('public.user_mascots');

create table public.achievements (
  key text primary key,
  title text not null,
  description text not null,
  mascot_id text not null references public.mascots (id),
  xp integer not null default 0,
  released boolean not null default true
);
alter table public.achievements enable row level security;
create policy achievements_read on public.achievements for select to anon, authenticated using (true);
grant select on public.achievements to anon, authenticated;

create table public.user_achievements (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  achievement_key text not null references public.achievements (key),
  unlocked_at timestamptz not null default now(),
  unique (user_id, achievement_key)
);
select public.make_syncable('public.user_achievements');
select public.apply_owner_rls('public.user_achievements');

-- Server-sent notifications only (local reminders are device-side). No content stored.
create table public.notification_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null,
  channel text not null default 'push' check (channel in ('push', 'email')),
  status text not null check (status in ('sent', 'failed', 'skipped')),
  created_at timestamptz not null default now()
);
alter table public.notification_logs enable row level security;
create policy notification_logs_own on public.notification_logs for select to authenticated using (user_id = auth.uid());
grant select on public.notification_logs to authenticated;

create table public.feedback_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  kind text not null check (kind in ('bug', 'feature', 'support', 'other')),
  message text not null check (char_length(message) between 1 and 4000),
  app_version text,
  platform text,
  status text not null default 'open' check (status in ('open', 'triaged', 'resolved', 'dismissed')),
  created_at timestamptz not null default now()
);
alter table public.feedback_reports enable row level security;
create policy feedback_insert on public.feedback_reports for insert to authenticated with check (user_id = auth.uid());
create policy feedback_read on public.feedback_reports for select to authenticated
  using (user_id = auth.uid() or public.has_admin_role('support_operator'));
create policy feedback_update on public.feedback_reports for update to authenticated using (public.has_admin_role('support_operator'));
grant select, insert, update on public.feedback_reports to authenticated;

-- Aggregate-only usage view for the admin portal (no per-user rows exposed).
create or replace function public.admin_usage_summary()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not has_admin_role('super_admin', 'support_operator', 'content_reviewer', 'content_editor') then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'users_total', (select count(*) from profiles),
    'users_onboarded', (select count(*) from profiles where onboarding_completed_at is not null),
    'obligations_active', (select count(*) from obligations where deleted_at is null and archived_at is null),
    'occurrences_completed_7d', (select count(*) from obligation_occurrences where status = 'done' and completed_on > current_date - 7),
    'documents_tracked', (select count(*) from documents where deleted_at is null),
    'ai_questions_7d', (select count(*) from ai_messages where role = 'user' and created_at > now() - interval '7 days'),
    'open_content_reports', (select count(*) from content_reports where status = 'open'),
    'open_ai_reports', (select count(*) from ai_content_reports where status = 'open'),
    'open_feedback', (select count(*) from feedback_reports where status = 'open'));
end;
$$;
revoke all on function public.admin_usage_summary() from public, anon;
grant execute on function public.admin_usage_summary() to authenticated;
