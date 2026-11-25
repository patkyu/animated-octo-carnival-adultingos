-- Guides (curated content with a review workflow), knowledge chunks for
-- retrieval, AI conversations, action proposals and reports.

create table public.guides (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  title text not null,
  category text not null check (category in ('government', 'employment', 'independent_living', 'freelancing', 'life_events')),
  agency text,
  jurisdiction text not null default 'PH',
  audience text not null default '',
  summary text not null default '',
  eligibility_caveats text not null default '',
  helpful_notes text not null default '',
  -- Only filled when verified against an official source; otherwise null and the app says so.
  fees_text text,
  processing_time_text text,
  related_slugs text[] not null default '{}',
  status text not null default 'draft' check (status in ('draft', 'in_review', 'approved', 'published', 'needs_update', 'archived')),
  content_version integer not null default 0,
  last_verified_on date,
  published_at timestamptz,
  created_by uuid references auth.users (id) on delete set null,
  updated_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.guide_steps (
  id uuid primary key default gen_random_uuid(),
  guide_id uuid not null references public.guides (id) on delete cascade,
  position integer not null,
  title text not null,
  body text not null default '',
  is_optional boolean not null default false,
  -- Suggested days after "start" when added to Tasks (user can change).
  suggested_offset_days integer not null default 0,
  unique (guide_id, position)
);

create table public.guide_requirements (
  id uuid primary key default gen_random_uuid(),
  guide_id uuid not null references public.guides (id) on delete cascade,
  position integer not null,
  text text not null,
  unique (guide_id, position)
);

-- Sources are stored separately so verification can be audited independently of content.
create table public.guide_sources (
  id uuid primary key default gen_random_uuid(),
  guide_id uuid not null references public.guides (id) on delete cascade,
  title text not null,
  url text not null check (url ~ '^https://'),
  publisher text not null,
  is_official boolean not null default true,
  verified_on date,
  verified_by uuid references auth.users (id) on delete set null,
  notes text not null default ''
);

create table public.guide_versions (
  id uuid primary key default gen_random_uuid(),
  guide_id uuid not null references public.guides (id) on delete cascade,
  version integer not null,
  snapshot jsonb not null,
  published_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (guide_id, version)
);

create table public.knowledge_chunks (
  id uuid primary key default gen_random_uuid(),
  guide_id uuid not null references public.guides (id) on delete cascade,
  guide_version integer not null,
  chunk_index integer not null,
  heading text not null,
  content text not null,
  tsv tsvector generated always as (to_tsvector('english', heading || ' ' || content)) stored,
  unique (guide_id, guide_version, chunk_index)
);
create index knowledge_chunks_tsv_idx on public.knowledge_chunks using gin (tsv);

create or replace function public.tg_touch_guide()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  new.updated_by := coalesce(auth.uid(), new.updated_by);
  -- Publishing only happens through publish_guide(); block direct status jumps.
  if new.status = 'published' and (tg_op = 'INSERT' or old.status <> 'published')
     and coalesce(current_setting('adultingos.publishing', true), '') <> 'on' then
    raise exception 'Use publish_guide() to publish' using errcode = '42501';
  end if;
  return new;
end;
$$;
create trigger touch_guide before insert or update on public.guides for each row execute function public.tg_touch_guide();

-- RLS: the public can read published guides; content staff can read and edit all.
alter table public.guides enable row level security;
alter table public.guide_steps enable row level security;
alter table public.guide_requirements enable row level security;
alter table public.guide_sources enable row level security;
alter table public.guide_versions enable row level security;
alter table public.knowledge_chunks enable row level security;

create policy guides_public_read on public.guides for select to anon, authenticated
  using (status in ('published', 'needs_update') or public.has_admin_role('content_editor', 'content_reviewer'));
create policy guides_staff_write on public.guides for insert to authenticated
  with check (public.has_admin_role('content_editor', 'content_reviewer'));
create policy guides_staff_update on public.guides for update to authenticated
  using (public.has_admin_role('content_editor', 'content_reviewer'))
  with check (public.has_admin_role('content_editor', 'content_reviewer'));
create policy guides_staff_delete on public.guides for delete to authenticated using (public.has_admin_role('super_admin'));

do $$
declare t text;
begin
  foreach t in array array['guide_steps', 'guide_requirements', 'guide_sources', 'knowledge_chunks', 'guide_versions'] loop
    execute format($f$create policy %1$s_read on public.%1$s for select to anon, authenticated using (
      exists (select 1 from public.guides g where g.id = guide_id and (g.status in ('published', 'needs_update')
              or public.has_admin_role('content_editor', 'content_reviewer'))))$f$, t);
    if t not in ('knowledge_chunks', 'guide_versions') then
      execute format($f$create policy %1$s_write on public.%1$s for all to authenticated
        using (public.has_admin_role('content_editor', 'content_reviewer'))
        with check (public.has_admin_role('content_editor', 'content_reviewer'))$f$, t);
    end if;
  end loop;
end $$;

grant select on public.guides, public.guide_steps, public.guide_requirements, public.guide_sources, public.guide_versions, public.knowledge_chunks to anon, authenticated;
grant insert, update, delete on public.guides, public.guide_steps, public.guide_requirements, public.guide_sources to authenticated;

-- Workflow transitions available to staff (not publishing).
create or replace function public.set_guide_status(p_guide uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare cur text;
begin
  select status into cur from guides where id = p_guide for update;
  if cur is null then raise exception 'guide not found'; end if;
  if p_status = 'published' then raise exception 'Use publish_guide()'; end if;
  if p_status in ('in_review', 'draft', 'needs_update') and not has_admin_role('content_editor', 'content_reviewer') then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if p_status in ('approved', 'archived') and not has_admin_role('content_reviewer') then
    raise exception 'Only reviewers can approve or archive' using errcode = '42501';
  end if;
  if p_status = 'approved' and cur <> 'in_review' then
    raise exception 'Only guides in review can be approved';
  end if;
  update guides set status = p_status where id = p_guide;
  perform log_audit('guide.status', 'guide', p_guide, jsonb_build_object('from', cur, 'to', p_status), 'admin');
end;
$$;
revoke all on function public.set_guide_status(uuid, text) from public, anon;
grant execute on function public.set_guide_status(uuid, text) to authenticated;

-- Publishing: reviewer-only, requires an approved guide with at least one
-- official, verified source. Snapshots a version and rebuilds retrieval chunks.
create or replace function public.publish_guide(p_guide uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  g guides%rowtype;
  v integer;
  snap jsonb;
  step record;
  idx integer := 0;
begin
  if not has_admin_role('content_reviewer') then
    raise exception 'Only reviewers can publish' using errcode = '42501';
  end if;
  select * into g from guides where id = p_guide for update;
  if g.id is null then raise exception 'guide not found'; end if;
  if g.status not in ('approved', 'needs_update') then
    raise exception 'Guide must be approved before publishing (status: %)', g.status;
  end if;
  if not exists (select 1 from guide_sources s where s.guide_id = p_guide and s.is_official and s.verified_on is not null) then
    raise exception 'At least one official source must be verified before publishing';
  end if;

  v := g.content_version + 1;
  snap := jsonb_build_object(
    'guide', to_jsonb(g) - 'status',
    'requirements', coalesce((select jsonb_agg(to_jsonb(r) order by r.position) from guide_requirements r where r.guide_id = p_guide), '[]'),
    'steps', coalesce((select jsonb_agg(to_jsonb(s) order by s.position) from guide_steps s where s.guide_id = p_guide), '[]'),
    'sources', coalesce((select jsonb_agg(to_jsonb(s)) from guide_sources s where s.guide_id = p_guide), '[]'));
  insert into guide_versions (guide_id, version, snapshot, published_by) values (p_guide, v, snap, auth.uid());

  delete from knowledge_chunks where guide_id = p_guide;
  insert into knowledge_chunks (guide_id, guide_version, chunk_index, heading, content)
    values (p_guide, v, idx, g.title || ' — overview', concat_ws(E'\n', g.summary, 'Who it is for: ' || nullif(g.audience, ''), 'Caveats: ' || nullif(g.eligibility_caveats, ''), 'Notes: ' || nullif(g.helpful_notes, '')));
  idx := idx + 1;
  insert into knowledge_chunks (guide_id, guide_version, chunk_index, heading, content)
    select p_guide, v, idx, g.title || ' — requirements', string_agg('- ' || text, E'\n' order by position)
    from guide_requirements where guide_id = p_guide having count(*) > 0;
  idx := idx + 1;
  for step in select * from guide_steps where guide_id = p_guide order by position loop
    insert into knowledge_chunks (guide_id, guide_version, chunk_index, heading, content)
      values (p_guide, v, idx, g.title || ' — step ' || step.position || ': ' || step.title, step.body);
    idx := idx + 1;
  end loop;

  perform set_config('adultingos.publishing', 'on', true);
  update guides set status = 'published', content_version = v, published_at = now(),
    last_verified_on = (select max(verified_on) from guide_sources where guide_id = p_guide and is_official)
  where id = p_guide;
  perform set_config('adultingos.publishing', 'off', true);
  perform log_audit('guide.publish', 'guide', p_guide, jsonb_build_object('version', v), 'admin');
  return v;
end;
$$;
revoke all on function public.publish_guide(uuid) from public, anon;
grant execute on function public.publish_guide(uuid) to authenticated;

-- Full-text retrieval over published guides (pgvector can be layered on later).
create or replace function public.search_knowledge(p_query text, p_limit integer default 6)
returns table (guide_id uuid, slug text, guide_title text, heading text, content text, rank real, last_verified_on date)
language sql
stable
security invoker
set search_path = public
as $$
  select c.guide_id, g.slug, g.title, c.heading, c.content,
         ts_rank(c.tsv, q) as rank, g.last_verified_on
  from knowledge_chunks c
  join guides g on g.id = c.guide_id and g.status in ('published', 'needs_update')
  cross join lateral websearch_to_tsquery('english', p_query) q
  where c.tsv @@ q
  order by rank desc
  limit least(greatest(p_limit, 1), 12)
$$;
grant execute on function public.search_knowledge(text, integer) to anon, authenticated;

-- User reports of outdated guide content.
create table public.content_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  guide_id uuid not null references public.guides (id) on delete cascade,
  reason text not null check (reason in ('outdated', 'incorrect', 'broken_link', 'unclear', 'other')),
  details text not null default '' check (char_length(details) <= 1000),
  status text not null default 'open' check (status in ('open', 'triaged', 'resolved', 'dismissed')),
  created_at timestamptz not null default now()
);
alter table public.content_reports enable row level security;
create policy content_reports_insert on public.content_reports for insert to authenticated with check (user_id = auth.uid());
create policy content_reports_own on public.content_reports for select to authenticated
  using (user_id = auth.uid() or public.has_admin_role('content_editor', 'content_reviewer', 'support_operator'));
create policy content_reports_staff on public.content_reports for update to authenticated
  using (public.has_admin_role('content_editor', 'content_reviewer', 'support_operator'));
grant select, insert, update on public.content_reports to authenticated;

-- ---------------------------------------------------------------------------
-- AI assistant. Conversations are private: no admin policy grants access.
-- ---------------------------------------------------------------------------
create table public.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null default 'New conversation' check (char_length(title) <= 80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
select public.apply_owner_rls('public.ai_conversations');

create table public.ai_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.ai_conversations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null check (char_length(content) <= 8000),
  grounding text check (grounding in ('verified_guides', 'unverified', 'user_records', 'refused')),
  citations jsonb not null default '[]'::jsonb,
  model text,
  input_tokens integer,
  output_tokens integer,
  created_at timestamptz not null default now()
);
create index ai_messages_conv_idx on public.ai_messages (conversation_id, created_at);
create index ai_messages_user_day_idx on public.ai_messages (user_id, created_at) where role = 'user';
select public.apply_owner_rls('public.ai_messages');
-- Messages are written by the AI gateway (service role) only; users may read and delete.
drop policy owner_insert on public.ai_messages;
drop policy owner_update on public.ai_messages;
revoke insert, update on public.ai_messages from authenticated;

create table public.ai_action_proposals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  conversation_id uuid references public.ai_conversations (id) on delete cascade,
  message_id uuid references public.ai_messages (id) on delete cascade,
  kind text not null check (kind in ('create_tasks')),
  payload jsonb not null,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'cancelled', 'expired')),
  result jsonb,
  expires_at timestamptz not null default now() + interval '7 days',
  decided_at timestamptz,
  created_at timestamptz not null default now()
);
select public.apply_owner_rls('public.ai_action_proposals');
drop policy owner_insert on public.ai_action_proposals;
drop policy owner_update on public.ai_action_proposals;
revoke insert, update on public.ai_action_proposals from authenticated;

/*
 * Confirms (a subset of) an AI proposal and creates the tasks — exactly once.
 * Row lock + status check make concurrent or repeated calls safe: the second
 * call returns the first call's result. Task ids are derived from the proposal
 * id and item index, so even a partially-failed retry cannot duplicate.
 */
create or replace function public.confirm_ai_proposal(p_proposal uuid, p_selected integer[], p_due_dates jsonb default '{}'::jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  pr ai_action_proposals%rowtype;
  item jsonb;
  i integer;
  ob_id uuid;
  due date;
  created uuid[] := '{}';
  res jsonb;
begin
  select * into pr from ai_action_proposals where id = p_proposal and user_id = auth.uid() for update;
  if pr.id is null then raise exception 'proposal not found' using errcode = 'P0002'; end if;
  if pr.status = 'confirmed' then return pr.result; end if;
  if pr.status <> 'pending' then raise exception 'proposal is %', pr.status; end if;
  if pr.expires_at < now() then
    update ai_action_proposals set status = 'expired', decided_at = now() where id = pr.id;
    raise exception 'proposal expired';
  end if;

  for i in 0 .. jsonb_array_length(pr.payload -> 'tasks') - 1 loop
    continue when not (i = any(p_selected));
    item := pr.payload -> 'tasks' -> i;
    ob_id := (substr(md5(pr.id::text || ':' || i), 1, 8) || '-' || substr(md5(pr.id::text || ':' || i), 9, 4) || '-4' ||
              substr(md5(pr.id::text || ':' || i), 14, 3) || '-a' || substr(md5(pr.id::text || ':' || i), 18, 3) || '-' ||
              substr(md5(pr.id::text || ':' || i), 21, 12))::uuid;
    due := coalesce(nullif(p_due_dates ->> i::text, '')::date, nullif(item ->> 'dueDate', '')::date,
                    (now() at time zone coalesce((select timezone from profiles where id = auth.uid()), 'Asia/Manila'))::date + 7);
    insert into obligations (id, user_id, kind, title, category, notes, source, source_ref, reminder_offsets)
      values (ob_id, auth.uid(), 'task', left(item ->> 'title', 120), coalesce(nullif(item ->> 'category', ''), 'personal'),
              left(coalesce(item ->> 'notes', ''), 2000), 'ai', pr.id::text, '{1,0}')
      on conflict (id) do nothing;
    insert into obligation_occurrences (id, user_id, obligation_id, scheduled_date, due_date)
      values (gen_random_uuid(), auth.uid(), ob_id, due, due)
      on conflict (obligation_id, scheduled_date) do nothing;
    created := created || ob_id;
  end loop;

  if cardinality(created) = 0 then raise exception 'select at least one task'; end if;
  res := jsonb_build_object('obligationIds', to_jsonb(created));
  update ai_action_proposals set status = 'confirmed', result = res, decided_at = now() where id = pr.id;
  perform log_audit('ai.proposal.confirm', 'ai_action_proposal', pr.id, jsonb_build_object('count', cardinality(created)), 'user');
  return res;
end;
$$;
revoke all on function public.confirm_ai_proposal(uuid, integer[], jsonb) from public, anon;
grant execute on function public.confirm_ai_proposal(uuid, integer[], jsonb) to authenticated;

create or replace function public.cancel_ai_proposal(p_proposal uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update ai_action_proposals set status = 'cancelled', decided_at = now()
  where id = p_proposal and user_id = auth.uid() and status = 'pending';
$$;
revoke all on function public.cancel_ai_proposal(uuid) from public, anon;
grant execute on function public.cancel_ai_proposal(uuid) to authenticated;

-- Reports of AI responses. The reporter explicitly shares the question and
-- answer excerpt with reviewers; that excerpt is the only AI content staff see.
create table public.ai_content_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  message_id uuid references public.ai_messages (id) on delete set null,
  reason text not null check (reason in ('inaccurate', 'offensive', 'unsafe', 'privacy', 'other')),
  details text not null default '' check (char_length(details) <= 1000),
  shared_excerpt text not null default '' check (char_length(shared_excerpt) <= 4000),
  status text not null default 'open' check (status in ('open', 'triaged', 'resolved', 'dismissed')),
  created_at timestamptz not null default now()
);
alter table public.ai_content_reports enable row level security;
create policy ai_reports_insert on public.ai_content_reports for insert to authenticated with check (user_id = auth.uid());
create policy ai_reports_read on public.ai_content_reports for select to authenticated
  using (user_id = auth.uid() or public.has_admin_role('support_operator', 'content_reviewer'));
create policy ai_reports_update on public.ai_content_reports for update to authenticated
  using (public.has_admin_role('support_operator', 'content_reviewer'));
grant select, insert, update on public.ai_content_reports to authenticated;

-- Daily AI quota, checked by the gateway.
create or replace function public.ai_messages_today(p_user uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::integer from ai_messages
  where user_id = p_user and role = 'user' and created_at > now() - interval '24 hours'
$$;
revoke all on function public.ai_messages_today(uuid) from public, anon, authenticated;
grant execute on function public.ai_messages_today(uuid) to service_role;
