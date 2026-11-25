-- Export contents and full account deletion.
begin;
insert into auth.users (id, email) values
  ('aaaaaaaa-0000-4000-8000-000000000001', 'a@test.invalid'),
  ('bbbbbbbb-0000-4000-8000-000000000002', 'b@test.invalid');

set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-4000-8000-000000000001', true);
insert into public.obligations (id, user_id, title) values ('a1000000-0000-4000-8000-000000000001', auth.uid(), 'Renew lease');
insert into public.obligation_occurrences (id, user_id, obligation_id, scheduled_date, due_date) values
  ('a1000000-0000-4000-8000-000000000002', auth.uid(), 'a1000000-0000-4000-8000-000000000001', '2027-01-01', '2027-01-01');
insert into public.documents (id, user_id, template_key, name) values ('a1000000-0000-4000-8000-000000000003', auth.uid(), 'nbi_clearance', 'NBI clearance');
insert into public.feedback_reports (user_id, kind, message) values (auth.uid(), 'bug', 'Calendar scroll glitch');

select set_config('request.jwt.claim.sub', 'bbbbbbbb-0000-4000-8000-000000000002', true);
insert into public.obligations (id, user_id, title) values ('b1000000-0000-4000-8000-000000000001', auth.uid(), 'B task');

select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-4000-8000-000000000001', true);
do $$
declare e jsonb := public.export_my_data();
begin
  assert e ->> 'format' = 'adultingos-export', 'export format tag';
  assert jsonb_array_length(e -> 'data' -> 'obligations') = 1, 'own obligation exported';
  assert jsonb_array_length(e -> 'data' -> 'documents') = 1, 'document exported';
  assert jsonb_array_length(e -> 'data' -> 'profiles') = 1, 'profile exported';
  assert not (e::text like '%B task%'), 'no other user data in export';
  assert not ((e -> 'data' -> 'obligations' -> 0) ? 'server_seq'), 'internal columns stripped';
end $$;

-- Account deletion (what the delete-account Edge Function does with the service role).
reset role;
insert into public.account_deletion_requests (user_id, source) values ('aaaaaaaa-0000-4000-8000-000000000001', 'in_app');
delete from auth.users where id = 'aaaaaaaa-0000-4000-8000-000000000001';
do $$ begin
  assert (select count(*) from public.profiles where id = 'aaaaaaaa-0000-4000-8000-000000000001') = 0, 'profile deleted';
  assert (select count(*) from public.obligations where user_id = 'aaaaaaaa-0000-4000-8000-000000000001') = 0, 'obligations deleted';
  assert (select count(*) from public.obligation_occurrences where user_id = 'aaaaaaaa-0000-4000-8000-000000000001') = 0, 'occurrences deleted';
  assert (select count(*) from public.documents where user_id = 'aaaaaaaa-0000-4000-8000-000000000001') = 0, 'documents deleted';
  assert (select count(*) from public.notification_preferences where user_id = 'aaaaaaaa-0000-4000-8000-000000000001') = 0, 'preferences deleted';
  assert (select count(*) from public.feedback_reports where user_id is null and message like 'Calendar%') = 1, 'feedback kept anonymised';
  assert (select count(*) from public.account_deletion_requests where user_id is null) = 1, 'deletion record kept without identity';
  assert (select count(*) from public.obligations where user_id = 'bbbbbbbb-0000-4000-8000-000000000002') = 1, 'other users untouched';
end $$;

-- Retention job runs cleanly.
select public.run_retention();
rollback;
