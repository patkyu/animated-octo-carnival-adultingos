-- Content workflow: only reviewers publish, and only with a verified official source.
begin;
insert into auth.users (id, email) values
  ('e0000000-0000-4000-8000-00000000000e', 'editor@test.invalid'),
  ('f0000000-0000-4000-8000-00000000000f', 'reviewer@test.invalid'),
  ('aaaaaaaa-0000-4000-8000-000000000001', 'user@test.invalid');
insert into public.admin_roles (user_id, role) values
  ('e0000000-0000-4000-8000-00000000000e', 'content_editor'),
  ('f0000000-0000-4000-8000-00000000000f', 'content_reviewer');

set local role authenticated;

-- Regular users cannot edit guides or see drafts.
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-4000-8000-000000000001', true);
do $$
declare n integer;
begin
  assert (select count(*) from public.guides where slug = 'nbi-clearance') = 0, 'drafts hidden from users';
  update public.guides set title = 'x' where slug = 'first-job-requirements';
  get diagnostics n = row_count;
  assert n = 0, 'users cannot edit guides';
  assert (select count(*) from public.audit_events) = 0, 'users cannot read audit log';
end $$;

-- Editor: can edit and submit for review, cannot approve or publish.
select set_config('request.jwt.claim.sub', 'e0000000-0000-4000-8000-00000000000e', true);
do $$
declare gid uuid := (select id from public.guides where slug = 'nbi-clearance');
begin
  assert gid is not null, 'editor sees drafts';
  update public.guides set summary = summary || ' (edited)' where id = gid;
  begin
    perform public.set_guide_status(gid, 'approved');
    raise exception 'editor approved';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.guides set status = 'published' where id = gid;
    raise exception 'direct publish allowed';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.publish_guide(gid);
    raise exception 'editor published';
  exception when insufficient_privilege then null;
  end;
end $$;

-- Reviewer: approve, but publishing still needs a verified official source.
select set_config('request.jwt.claim.sub', 'f0000000-0000-4000-8000-00000000000f', true);
do $$
declare gid uuid := (select id from public.guides where slug = 'nbi-clearance'); v integer;
begin
  perform public.set_guide_status(gid, 'approved');
  begin
    perform public.publish_guide(gid);
    raise exception 'published without verified source';
  exception when raise_exception then
    if sqlerrm not like '%verified%' then raise; end if;
  end;
  update public.guide_sources set verified_on = '2026-11-25', verified_by = auth.uid() where guide_id = gid;
  v := public.publish_guide(gid);
  assert v = 1, 'first version published';
  assert (select status from public.guides where id = gid) = 'published', 'status published';
  assert (select last_verified_on from public.guides where id = gid) = '2026-11-25', 'verification date recorded';
  assert (select count(*) from public.guide_versions where guide_id = gid) = 1, 'version snapshot stored';
  assert (select count(*) from public.knowledge_chunks where guide_id = gid) >= 3, 'retrieval chunks built';
end $$;

-- Now visible to users and retrievable.
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-4000-8000-000000000001', true);
do $$ begin
  assert (select count(*) from public.guides where slug = 'nbi-clearance') = 1, 'published guide visible';
  assert exists (select 1 from public.search_knowledge('NBI clearance appointment') where slug = 'nbi-clearance'), 'search finds published chunk';
  assert not exists (select 1 from public.search_knowledge('SSS number') where slug = 'sss-membership'), 'unpublished guides are not retrievable';
  insert into public.content_reports (user_id, guide_id, reason, details)
    values (auth.uid(), (select id from public.guides where slug = 'nbi-clearance'), 'outdated', 'Link changed');
end $$;
reset role;
do $$ begin
  assert (select count(*) from public.audit_events where target_id = (select id from public.guides where slug = 'nbi-clearance')
          and action in ('guide.status', 'guide.publish')) = 2, 'approve + publish audited';
end $$;
rollback;
