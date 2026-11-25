-- AI proposals: only the gateway writes them; confirmation is owner-only and exactly-once.
begin;
insert into auth.users (id, email) values
  ('aaaaaaaa-0000-4000-8000-000000000001', 'a@test.invalid'),
  ('bbbbbbbb-0000-4000-8000-000000000002', 'b@test.invalid');

-- Gateway (service role) records a conversation, messages and a proposal.
set local role service_role;
insert into public.ai_conversations (id, user_id, title) values ('10000000-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001', 'First job');
insert into public.ai_messages (id, conversation_id, user_id, role, content) values
  ('10000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001', 'user', 'What do I need for my first job?'),
  ('10000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001', 'assistant', 'Here is a checklist…');
insert into public.ai_action_proposals (id, user_id, conversation_id, message_id, kind, payload) values
  ('10000000-0000-4000-8000-000000000004', 'aaaaaaaa-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000003',
   'create_tasks', '{"tasks":[{"title":"Ask HR for requirements","category":"work"},{"title":"Check SSS number","category":"government","dueDate":"2026-12-05"},{"title":"Organize folder","category":"personal"}]}');
do $$ begin assert public.ai_messages_today('aaaaaaaa-0000-4000-8000-000000000001') = 1, 'quota counts user messages'; end $$;
reset role;

set local role authenticated;
-- User B cannot see or confirm A's proposal.
select set_config('request.jwt.claim.sub', 'bbbbbbbb-0000-4000-8000-000000000002', true);
do $$ begin
  assert (select count(*) from public.ai_messages) = 0, 'B cannot read A messages';
  begin
    perform public.confirm_ai_proposal('10000000-0000-4000-8000-000000000004', array[0, 1]);
    raise exception 'B confirmed A proposal';
  exception when no_data_found then null;
  end;
end $$;

select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-4000-8000-000000000001', true);
do $$
declare r1 jsonb; r2 jsonb;
begin
  -- Users cannot forge messages or proposals.
  begin
    insert into public.ai_messages (conversation_id, user_id, role, content) values ('10000000-0000-4000-8000-000000000001', auth.uid(), 'assistant', 'fake');
    raise exception 'user forged assistant message';
  exception when insufficient_privilege then null;
  end;

  assert (select count(*) from public.obligations) = 0, 'nothing created before confirmation';
  r1 := public.confirm_ai_proposal('10000000-0000-4000-8000-000000000004', array[0, 1]);
  r2 := public.confirm_ai_proposal('10000000-0000-4000-8000-000000000004', array[0, 1, 2]);
  assert r1 = r2, 'second confirmation returns first result';
  assert (select count(*) from public.obligations where source = 'ai') = 2, 'exactly the 2 selected tasks created once';
  assert (select count(*) from public.obligation_occurrences) = 2, 'one occurrence per task';
  assert (select due_date from public.obligation_occurrences o join public.obligations b on b.id = o.obligation_id where b.title = 'Check SSS number') = '2026-12-05', 'proposed due date used';
  assert (select status from public.ai_action_proposals) = 'confirmed', 'proposal marked confirmed';

  -- Deleting AI history removes conversations, messages and proposals but keeps created tasks.
  assert public.delete_my_ai_history() = 1, 'one conversation deleted';
  assert (select count(*) from public.ai_messages) = 0, 'messages deleted';
  assert (select count(*) from public.obligations) = 2, 'confirmed tasks are kept';
end $$;
rollback;
