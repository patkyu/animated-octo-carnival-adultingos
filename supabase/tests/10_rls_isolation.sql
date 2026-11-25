-- Cross-user isolation: user B can never read or change user A's records.
begin;
insert into auth.users (id, email) values
  ('aaaaaaaa-0000-4000-8000-000000000001', 'a@test.invalid'),
  ('bbbbbbbb-0000-4000-8000-000000000002', 'b@test.invalid');

-- Profiles were created by the sign-up trigger.
do $$ begin
  assert (select count(*) from public.profiles) = 2, 'profiles created on sign-up';
  assert (select count(*) from public.notification_preferences) = 2, 'notification prefs created';
end $$;

-- ---- as user A: create one of everything ----
set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-4000-8000-000000000001', true);
insert into public.obligations (id, user_id, kind, title, recurrence) values
  ('a0000000-0000-4000-8000-000000000001', auth.uid(), 'bill', 'Electricity', '{"freq":"monthly","interval":1,"anchorDay":15}');
insert into public.obligation_occurrences (id, user_id, obligation_id, scheduled_date, due_date) values
  ('a0000000-0000-4000-8000-000000000002', auth.uid(), 'a0000000-0000-4000-8000-000000000001', '2026-12-15', '2026-12-15');
insert into public.bills (id, user_id, obligation_id, bill_category, amount_minor) values
  ('a0000000-0000-4000-8000-000000000003', auth.uid(), 'a0000000-0000-4000-8000-000000000001', 'electricity', 210000);
insert into public.documents (id, user_id, template_key, name, expiry_date, reference_last4) values
  ('a0000000-0000-4000-8000-000000000004', auth.uid(), 'passport', 'Passport', '2027-03-01', '9012');
insert into public.consent_records (user_id, consent_type, granted, policy_version) values (auth.uid(), 'ai_processing', true, '2026-11');

do $$ begin
  assert (select count(*) from public.obligations) = 1, 'A sees own obligation';
  assert (select count(*) from public.profiles) = 1, 'A sees only own profile';
end $$;

-- ---- as user B ----
select set_config('request.jwt.claim.sub', 'bbbbbbbb-0000-4000-8000-000000000002', true);
do $$
declare n integer;
begin
  assert (select count(*) from public.obligations) = 0, 'B cannot read A obligations';
  assert (select count(*) from public.obligation_occurrences) = 0, 'B cannot read A occurrences';
  assert (select count(*) from public.bills) = 0, 'B cannot read A bills';
  assert (select count(*) from public.documents) = 0, 'B cannot read A documents';
  assert (select count(*) from public.consent_records) = 0, 'B cannot read A consents';
  assert (select count(*) from public.profiles) = 1, 'B sees only own profile';

  update public.obligations set title = 'hacked' where id = 'a0000000-0000-4000-8000-000000000001';
  get diagnostics n = row_count;
  assert n = 0, 'B cannot update A obligation';
  delete from public.documents where id = 'a0000000-0000-4000-8000-000000000004';
  get diagnostics n = row_count;
  assert n = 0, 'B cannot delete A document';

  begin
    insert into public.obligations (id, user_id, title) values (gen_random_uuid(), 'aaaaaaaa-0000-4000-8000-000000000001', 'spoof');
    raise exception 'B inserted a row owned by A';
  exception when insufficient_privilege then null;
  end;

  -- B attaches an occurrence (owned by B) to A's obligation → rejected by ownership trigger.
  begin
    insert into public.obligation_occurrences (id, user_id, obligation_id, scheduled_date, due_date)
      values (gen_random_uuid(), auth.uid(), 'a0000000-0000-4000-8000-000000000001', '2027-01-15', '2027-01-15');
    raise exception 'B linked to A obligation';
  exception when insufficient_privilege then null;
  end;

  -- B cannot export A's data.
  assert jsonb_array_length(public.export_my_data() -> 'data' -> 'obligations') = 0, 'export is scoped to caller';
end $$;

-- ---- anon ----
reset role;
set local role anon;
select set_config('request.jwt.claim.sub', '', true);
do $$ begin
  begin
    perform count(*) from public.obligations;
    raise exception 'anon read obligations';
  exception when insufficient_privilege then null;
  end;
  begin
    perform count(*) from public.guides;
    raise exception 'anon read live guide tables';
  exception when insufficient_privilege then null;
  end;
  assert (select count(*) from public.published_guides()) >= 1, 'anon can read published guide snapshots';
  assert (select count(*) from public.published_guides() where status = 'in_review') = 0, 'drafts never exposed';
end $$;

-- Sensitive-number guard on documents.
reset role;
do $$ begin
  begin
    insert into public.documents (id, user_id, template_key, name, reference_last4)
      values (gen_random_uuid(), 'aaaaaaaa-0000-4000-8000-000000000001', 'sss', 'SSS', '3412345678');
    raise exception 'full ID number stored';
  exception when check_violation then null;
  end;
end $$;
rollback;
