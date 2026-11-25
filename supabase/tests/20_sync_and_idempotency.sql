-- Sync semantics (LWW, server_seq) and exactly-once recurrence/payment rows.
begin;
insert into auth.users (id, email) values ('aaaaaaaa-0000-4000-8000-000000000001', 'a@test.invalid');
set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-4000-8000-000000000001', true);

insert into public.obligations (id, user_id, kind, title, client_updated_at) values
  ('c0000000-0000-4000-8000-000000000001', auth.uid(), 'bill', 'Internet', '2026-11-25T10:00:00Z');

do $$
declare seq1 bigint; seq2 bigint;
begin
  select server_seq into seq1 from public.obligations where id = 'c0000000-0000-4000-8000-000000000001';
  assert seq1 > 0, 'server_seq assigned';

  -- Newer edit wins.
  update public.obligations set title = 'Fiber internet', client_updated_at = '2026-11-25T11:00:00Z'
   where id = 'c0000000-0000-4000-8000-000000000001';
  select server_seq into seq2 from public.obligations where id = 'c0000000-0000-4000-8000-000000000001';
  assert seq2 > seq1, 'server_seq increases on write';

  -- Stale offline edit (older device timestamp) is ignored.
  update public.obligations set title = 'Stale title', client_updated_at = '2026-11-25T10:30:00Z'
   where id = 'c0000000-0000-4000-8000-000000000001';
  assert (select title from public.obligations where id = 'c0000000-0000-4000-8000-000000000001') = 'Fiber internet', 'LWW keeps newer write';

  -- Upsert (what clients send) behaves the same.
  insert into public.obligations (id, user_id, kind, title, client_updated_at)
    values ('c0000000-0000-4000-8000-000000000001', auth.uid(), 'bill', 'Older upsert', '2026-11-25T09:00:00Z')
    on conflict (id) do update set title = excluded.title, client_updated_at = excluded.client_updated_at;
  assert (select title from public.obligations where id = 'c0000000-0000-4000-8000-000000000001') = 'Fiber internet', 'stale upsert ignored';

  -- Ownership is immutable even for the owner.
  begin
    update public.obligations set user_id = gen_random_uuid(), client_updated_at = now() where id = 'c0000000-0000-4000-8000-000000000001';
    raise exception 'user_id changed';
  exception when insufficient_privilege then null;
  end;
end $$;

-- Completing an occurrence on two devices: both compute the same deterministic
-- next-occurrence id; the second upsert merges instead of duplicating.
insert into public.obligation_occurrences (id, user_id, obligation_id, scheduled_date, due_date, status, completed_on, client_updated_at) values
  ('d0000000-0000-4000-8000-000000000001', auth.uid(), 'c0000000-0000-4000-8000-000000000001', '2026-11-30', '2026-11-30', 'done', '2026-11-29', '2026-11-29T01:00:00Z');
insert into public.obligation_occurrences (id, user_id, obligation_id, scheduled_date, due_date, client_updated_at) values
  ('d0000000-0000-4000-8000-000000000002', auth.uid(), 'c0000000-0000-4000-8000-000000000001', '2026-12-30', '2026-12-30', '2026-11-29T01:00:00Z')
  on conflict (id) do update set due_date = excluded.due_date, client_updated_at = excluded.client_updated_at;
insert into public.obligation_occurrences (id, user_id, obligation_id, scheduled_date, due_date, client_updated_at) values
  ('d0000000-0000-4000-8000-000000000002', auth.uid(), 'c0000000-0000-4000-8000-000000000001', '2026-12-30', '2026-12-30', '2026-11-29T01:05:00Z')
  on conflict (id) do update set due_date = excluded.due_date, client_updated_at = excluded.client_updated_at;

do $$ begin
  assert (select count(*) from public.obligation_occurrences where obligation_id = 'c0000000-0000-4000-8000-000000000001' and scheduled_date = '2026-12-30') = 1,
    'exactly one next occurrence';
  -- A different id for the same scheduled date is rejected outright.
  begin
    insert into public.obligation_occurrences (id, user_id, obligation_id, scheduled_date, due_date)
      values (gen_random_uuid(), auth.uid(), 'c0000000-0000-4000-8000-000000000001', '2026-12-30', '2026-12-30');
    raise exception 'duplicate occurrence accepted';
  exception when unique_violation then null;
  end;
  -- Done must have a completion date (and vice versa).
  begin
    insert into public.obligation_occurrences (id, user_id, obligation_id, scheduled_date, due_date, status)
      values (gen_random_uuid(), auth.uid(), 'c0000000-0000-4000-8000-000000000001', '2027-01-30', '2027-01-30', 'done');
    raise exception 'done without completed_on';
  exception when check_violation then null;
  end;
end $$;

-- One payment per occurrence.
insert into public.bills (id, user_id, obligation_id, amount_minor) values ('e0000000-0000-4000-8000-000000000001', auth.uid(), 'c0000000-0000-4000-8000-000000000001', 159900);
insert into public.bill_payments (id, user_id, bill_id, occurrence_id, paid_on, amount_minor) values
  ('f0000000-0000-4000-8000-000000000001', auth.uid(), 'e0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', '2026-11-29', 159900);
do $$ begin
  begin
    insert into public.bill_payments (id, user_id, bill_id, occurrence_id, paid_on, amount_minor) values
      (gen_random_uuid(), auth.uid(), 'e0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', '2026-11-29', 159900);
    raise exception 'double payment accepted';
  exception when unique_violation then null;
  end;
  assert (select sum(amount_minor) from public.bill_payments) = 159900, 'payment total exact';
end $$;

-- Deleting an obligation cascades to occurrences, bill and payments.
delete from public.obligations where id = 'c0000000-0000-4000-8000-000000000001';
do $$ begin
  assert (select count(*) from public.obligation_occurrences) = 0, 'occurrences cascade';
  assert (select count(*) from public.bill_payments) = 0, 'payments cascade';
end $$;
rollback;
