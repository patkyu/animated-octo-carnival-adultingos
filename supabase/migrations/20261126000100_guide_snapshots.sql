-- Users see only reviewer-published guide snapshots; source verification is reviewer-only.
--
-- Before: the app read guides/steps/requirements/sources live, so an editor's
-- edit to a published guide reached users without review, and any editor could
-- set guide_sources.verified_on.

-- 1. Public reads go through published snapshots only.
create or replace function public.published_guides()
returns table (id uuid, slug text, status text, content_version integer, last_verified_on date, snapshot jsonb)
language sql
stable
security definer
set search_path = public
as $$
  select g.id, g.slug, g.status, v.version, g.last_verified_on, v.snapshot
  from guides g
  join lateral (
    select version, snapshot from guide_versions gv where gv.guide_id = g.id order by version desc limit 1
  ) v on true
  where g.status in ('published', 'needs_update')
$$;
revoke all on function public.published_guides() from public;
grant execute on function public.published_guides() to anon, authenticated;

-- Retrieval only ever indexed published snapshots; make it independent of table visibility.
alter function public.search_knowledge(text, integer) security definer;

-- Live content tables become staff-only.
drop policy if exists guides_public_read on public.guides;
create policy guides_staff_read on public.guides for select to authenticated
  using (public.has_admin_role('content_editor', 'content_reviewer', 'support_operator'));

do $$
declare t text;
begin
  foreach t in array array['guide_steps', 'guide_requirements', 'guide_sources', 'knowledge_chunks', 'guide_versions'] loop
    execute format('drop policy if exists %1$s_read on public.%1$s', t);
    execute format($f$create policy %1$s_read on public.%1$s for select to authenticated
      using (public.has_admin_role('content_editor', 'content_reviewer', 'support_operator'))$f$, t);
  end loop;
end $$;
revoke select on public.guides, public.guide_steps, public.guide_requirements, public.guide_sources, public.guide_versions, public.knowledge_chunks from anon;

-- Content reports reference a guide the reporter can't read directly; validate it is published.
drop policy if exists content_reports_insert on public.content_reports;
create policy content_reports_insert on public.content_reports for insert to authenticated
  with check (user_id = auth.uid() and exists (select 1 from public.published_guides() pg where pg.id = guide_id));

-- 2. Only reviewers may verify sources; changing a verified source un-verifies it.
-- SECURITY INVOKER on purpose: current_user must be the caller (authenticated /
-- service_role / owner), not the function owner. has_admin_role() is itself definer.
create or replace function public.tg_guide_source_verification()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare reviewer boolean := has_admin_role('content_reviewer') or current_user in ('postgres', 'service_role', 'supabase_admin');
begin
  if tg_op = 'UPDATE' and (new.url, new.title, new.publisher, new.is_official) is distinct from (old.url, old.title, old.publisher, old.is_official)
     and new.verified_on is not distinct from old.verified_on then
    -- Content of the source changed without a fresh verification.
    new.verified_on := null;
    new.verified_by := null;
  end if;
  if (new.verified_on is distinct from (case when tg_op = 'UPDATE' then old.verified_on end)
      or new.verified_by is distinct from (case when tg_op = 'UPDATE' then old.verified_by end))
     and new.verified_on is not null and not reviewer then
    raise exception 'Only content reviewers can verify sources' using errcode = '42501';
  end if;
  if new.verified_on is not null and new.verified_by is null and auth.uid() is not null then
    new.verified_by := auth.uid();
  end if;
  return new;
end;
$$;
drop trigger if exists guide_source_verification on public.guide_sources;
create trigger guide_source_verification before insert or update on public.guide_sources
  for each row execute function public.tg_guide_source_verification();
