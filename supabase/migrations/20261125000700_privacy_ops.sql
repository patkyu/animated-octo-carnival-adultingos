-- Data export, AI history deletion, retention jobs.

/*
 * Returns every record the caller owns as one JSON document
 * (format documented in docs/privacy/data-export-format.md).
 * SECURITY INVOKER: RLS guarantees only the caller's rows are read.
 */
create or replace function public.export_my_data()
returns jsonb
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  t text;
  rows jsonb;
  data jsonb := '{}'::jsonb;
begin
  if uid is null then raise exception 'not authenticated' using errcode = '42501'; end if;
  foreach t in array array[
    'profiles', 'user_preferences', 'notification_preferences', 'consent_records', 'categories', 'obligations',
    'obligation_occurrences', 'task_checklist_items', 'documents', 'document_renewals', 'bills', 'bill_payments',
    'subscriptions', 'user_achievements', 'user_mascots', 'savings_goals', 'savings_contributions', 'user_life_events',
    'life_event_tasks', 'routines', 'routine_completions', 'ai_conversations', 'ai_messages', 'ai_action_proposals',
    'feedback_reports', 'content_reports', 'ai_content_reports'] loop
    execute format('select coalesce(jsonb_agg(to_jsonb(x) - ''server_seq'' - ''client_updated_at'' - ''user_id''), ''[]''::jsonb) from public.%I x where x.user_id = $1', t)
      into rows using uid;
    data := data || jsonb_build_object(t, rows);
  end loop;
  perform log_audit('privacy.export', 'user', uid, '{}'::jsonb, 'user');
  return jsonb_build_object('format', 'adultingos-export', 'formatVersion', 1, 'exportedAt', now(), 'data', data);
end;
$$;
revoke all on function public.export_my_data() from public, anon;
grant execute on function public.export_my_data() to authenticated;

-- Deletes all AI conversations (messages and pending proposals cascade).
create or replace function public.delete_my_ai_history()
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare n integer;
begin
  delete from ai_conversations where user_id = auth.uid();
  get diagnostics n = row_count;
  perform log_audit('privacy.delete_ai_history', 'user', auth.uid(), jsonb_build_object('conversations', n), 'user');
  return n;
end;
$$;
revoke all on function public.delete_my_ai_history() from public, anon;
grant execute on function public.delete_my_ai_history() to authenticated;

-- Retention housekeeping (scheduled below when pg_cron is available).
create or replace function public.run_retention()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare t text;
begin
  -- Sync tombstones: 90 days is long enough for every device to pull them.
  foreach t in array array['categories', 'obligations', 'obligation_occurrences', 'task_checklist_items', 'documents',
    'document_renewals', 'bills', 'bill_payments', 'subscriptions', 'savings_goals', 'savings_contributions', 'routines', 'routine_completions'] loop
    execute format('delete from public.%I where deleted_at < now() - interval ''90 days''', t);
  end loop;
  update ai_action_proposals set status = 'expired' where status = 'pending' and expires_at < now();
  -- AI conversations idle for 12 months are deleted (see docs/privacy/retention-schedule.md).
  delete from ai_conversations where updated_at < now() - interval '12 months';
  delete from notification_logs where created_at < now() - interval '90 days';
  delete from audit_events where created_at < now() - interval '24 months';
  update account_deletion_requests set email_hash = null where status = 'completed' and email_hash is not null;
end;
$$;
revoke all on function public.run_retention() from public, anon, authenticated;

do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;
    perform cron.schedule('adultingos-retention', '17 3 * * *', 'select public.run_retention()');
  else
    raise notice 'pg_cron not available; schedule public.run_retention() externally';
  end if;
end $$;
