-- No-sign-in accounts: the app creates a Supabase *anonymous* user per
-- installation (no e-mail, no password, no SMTP). Such an account cannot be
-- recovered once its device session is lost, so accounts with no activity for
-- 12 months are deleted (same cascade as a user-requested deletion).
create or replace function public.run_retention()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare t text; n integer;
begin
  foreach t in array array['categories', 'obligations', 'obligation_occurrences', 'task_checklist_items', 'documents',
    'document_renewals', 'bills', 'bill_payments', 'subscriptions', 'savings_goals', 'savings_contributions', 'routines', 'routine_completions'] loop
    execute format('delete from public.%I where deleted_at < now() - interval ''90 days''', t);
  end loop;
  update ai_action_proposals set status = 'expired' where status = 'pending' and expires_at < now();
  delete from ai_conversations where updated_at < now() - interval '12 months';
  delete from notification_logs where created_at < now() - interval '90 days';
  delete from audit_events where created_at < now() - interval '24 months';
  update account_deletion_requests set email_hash = null where status = 'completed' and email_hash is not null;

  -- Inactive anonymous accounts (no sign-in or token refresh for 12 months).
  -- Checked dynamically so this also runs where auth has no such columns.
  if exists (select 1 from information_schema.columns where table_schema = 'auth' and table_name = 'users' and column_name = 'is_anonymous') then
    execute $q$
      with gone as (
        delete from auth.users u
        where u.is_anonymous
          and coalesce(u.last_sign_in_at, u.created_at) < now() - interval '12 months'
          and not exists (
            select 1 from auth.sessions s
            where s.user_id = u.id and coalesce(s.refreshed_at, s.updated_at, s.created_at) > now() - interval '12 months')
        returning u.id)
      select count(*) from gone $q$ into n;
    if n > 0 then
      insert into audit_events (actor_id, actor_kind, action, metadata)
      values (null, 'system', 'account.expired_anonymous', jsonb_build_object('count', n));
    end if;
  end if;
end;
$$;
revoke all on function public.run_retention() from public, anon, authenticated;
