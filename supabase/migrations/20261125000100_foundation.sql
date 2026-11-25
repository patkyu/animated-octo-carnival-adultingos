-- AdultingOS — foundation: extensions, enums, sync helpers, admin roles, audit.
-- Target: Supabase Postgres 15+. Relies on Supabase's auth schema (auth.users, auth.uid())
-- and the anon / authenticated / service_role roles.

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------------
-- Sync model
--  * Every syncable row carries server_seq (monotonic, assigned by the server
--    on every write). Clients pull "where server_seq > cursor" — no clock skew.
--  * client_updated_at is the device time of the edit. A write older than the
--    stored row is ignored (last-writer-wins), so a stale offline edit can't
--    clobber a newer one from another device.
--  * deleted_at is a tombstone so deletions propagate; purged after 90 days.
-- ---------------------------------------------------------------------------
create sequence if not exists public.sync_seq as bigint;

create or replace function public.tg_sync_row()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'UPDATE' then
    -- Ownership can never change through an update.
    if to_jsonb(new) ? 'user_id' and (to_jsonb(new)->>'user_id') is distinct from (to_jsonb(old)->>'user_id') then
      raise exception 'user_id is immutable' using errcode = '42501';
    end if;
    -- Last-writer-wins: silently skip stale writes.
    if new.client_updated_at < old.client_updated_at then
      return null;
    end if;
    new.created_at := old.created_at;
  end if;
  new.server_seq := nextval('public.sync_seq');
  new.updated_at := now();
  return new;
end;
$$;

-- Attach standard sync columns + trigger + owner-only RLS to a table.
create or replace function public.make_syncable(p_table regclass)
returns void
language plpgsql
as $$
declare
  t text := p_table::text;
begin
  execute format('alter table %s add column if not exists created_at timestamptz not null default now()', t);
  execute format('alter table %s add column if not exists updated_at timestamptz not null default now()', t);
  execute format('alter table %s add column if not exists client_updated_at timestamptz not null default now()', t);
  execute format('alter table %s add column if not exists deleted_at timestamptz', t);
  execute format('alter table %s add column if not exists server_seq bigint not null default 0', t);
  execute format('drop trigger if exists sync_row on %s', t);
  execute format('create trigger sync_row before insert or update on %s for each row execute function public.tg_sync_row()', t);
  execute format('create index if not exists %s on %s (user_id, server_seq)', replace(t, 'public.', '') || '_sync_idx', t);
end;
$$;

-- Owner-only RLS: authenticated users see and change only their own rows.
create or replace function public.apply_owner_rls(p_table regclass, p_owner_col text default 'user_id')
returns void
language plpgsql
as $$
declare
  t text := p_table::text;
begin
  execute format('alter table %s enable row level security', t);
  execute format('alter table %s force row level security', t);
  execute format('drop policy if exists owner_select on %s', t);
  execute format('drop policy if exists owner_insert on %s', t);
  execute format('drop policy if exists owner_update on %s', t);
  execute format('drop policy if exists owner_delete on %s', t);
  execute format('create policy owner_select on %s for select to authenticated using (%I = auth.uid())', t, p_owner_col);
  execute format('create policy owner_insert on %s for insert to authenticated with check (%I = auth.uid())', t, p_owner_col);
  execute format('create policy owner_update on %s for update to authenticated using (%I = auth.uid()) with check (%I = auth.uid())', t, p_owner_col, p_owner_col);
  execute format('create policy owner_delete on %s for delete to authenticated using (%I = auth.uid())', t, p_owner_col);
  execute format('grant select, insert, update, delete on %s to authenticated', t);
  execute format('revoke all on %s from anon', t);
end;
$$;

-- ---------------------------------------------------------------------------
-- Administrative roles (content portal). No role grants access to private
-- user records; see docs/privacy/admin-access.md.
-- ---------------------------------------------------------------------------
create table public.admin_roles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role text not null check (role in ('super_admin', 'content_editor', 'content_reviewer', 'support_operator')),
  granted_by uuid references auth.users (id) on delete set null,
  granted_at timestamptz not null default now()
);
alter table public.admin_roles enable row level security;
alter table public.admin_roles force row level security;

create or replace function public.admin_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.admin_roles where user_id = auth.uid()
$$;

create or replace function public.has_admin_role(variadic roles text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admin_roles where user_id = auth.uid() and (role = any(roles) or role = 'super_admin'))
$$;

create policy admin_roles_self on public.admin_roles for select to authenticated
  using (user_id = auth.uid() or public.has_admin_role('super_admin'));
create policy admin_roles_manage on public.admin_roles for all to authenticated
  using (public.has_admin_role('super_admin')) with check (public.has_admin_role('super_admin'));
grant select, insert, update, delete on public.admin_roles to authenticated;

-- ---------------------------------------------------------------------------
-- Audit log. Metadata must never contain personal data or content.
-- ---------------------------------------------------------------------------
create table public.audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users (id) on delete set null,
  actor_kind text not null default 'user' check (actor_kind in ('user', 'admin', 'system', 'ai')),
  action text not null,
  target_type text,
  target_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index audit_events_created_idx on public.audit_events (created_at desc);
alter table public.audit_events enable row level security;
alter table public.audit_events force row level security;
create policy audit_read on public.audit_events for select to authenticated using (public.has_admin_role('super_admin'));
grant select on public.audit_events to authenticated;

create or replace function public.log_audit(p_action text, p_target_type text, p_target_id uuid, p_metadata jsonb default '{}'::jsonb, p_kind text default 'user')
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.audit_events (actor_id, actor_kind, action, target_type, target_id, metadata)
  values (auth.uid(), p_kind, p_action, p_target_type, p_target_id, coalesce(p_metadata, '{}'::jsonb));
$$;
revoke all on function public.log_audit(text, text, uuid, jsonb, text) from public, anon;
grant execute on function public.log_audit(text, text, uuid, jsonb, text) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Feature flags (readable by everyone, writable by super admins).
-- ---------------------------------------------------------------------------
create table public.feature_flags (
  key text primary key check (key ~ '^[a-z0-9_]+$'),
  enabled boolean not null default false,
  description text not null default '',
  updated_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now()
);
alter table public.feature_flags enable row level security;
create policy flags_read on public.feature_flags for select to anon, authenticated using (true);
create policy flags_write on public.feature_flags for all to authenticated
  using (public.has_admin_role('super_admin')) with check (public.has_admin_role('super_admin'));
grant select on public.feature_flags to anon, authenticated;
grant insert, update, delete on public.feature_flags to authenticated;
