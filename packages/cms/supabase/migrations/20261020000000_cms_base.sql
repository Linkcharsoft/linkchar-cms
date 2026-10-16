-- Declaration order is the hierarchy: role >= 'admin' means admin or superadmin.
create type public.app_role as enum ('editor', 'admin', 'superadmin');

-- Not exposed by the Data API: holds RLS helpers and trigger functions.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null default '',
  avatar text,
  role public.app_role not null default 'editor',
  can_publish boolean not null default false,
  active boolean not null default true,
  -- Ids of the panel's guided tours the user already finished or dismissed.
  seen_tours text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Both columns are writable by the user through the Data API: keep them to what the panel itself writes.
  constraint profiles_avatar_own_folder
    check (avatar is null or avatar ~ ('^avatars/' || id::text || '/[0-9a-f-]{36}\.(jpg|png|webp)$')),
  constraint profiles_seen_tours_size
    check (cardinality(seen_tours) <= 20)
);

alter table public.profiles enable row level security;

-- With a verified MFA factor, only a session that passed the second step (aal2) gets a role.
create function private.mfa_satisfied ()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select auth.jwt() ->> 'aal'), 'aal1') = 'aal2'
    or not exists (
      select 1 from auth.mfa_factors
      where user_id = (select auth.uid()) and status = 'verified'
    )
$$;

create function private.user_role ()
returns public.app_role
language sql
stable
security definer
set search_path = ''
as $$
  select role from public.profiles
  where id = (select auth.uid()) and active and private.mfa_satisfied()
$$;

create function private.has_role (min_role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(private.user_role() >= min_role, false)
$$;

create function private.can_publish ()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and active and (role >= 'admin' or can_publish)
  ) and private.mfa_satisfied()
$$;

create function private.set_updated_at ()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end
$$;

create function private.handle_new_user ()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Role always starts as editor: user metadata is client-writable, so it never grants privileges.
  insert into public.profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'name', ''));
  return new;
end
$$;

create function private.guard_profile_privileges ()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_role public.app_role;
begin
  if new.role is not distinct from old.role
    and new.can_publish is not distinct from old.can_publish
    and new.active is not distinct from old.active then
    return new;
  end if;

  -- No JWT subject: service role key, migrations or SQL editor.
  if (select auth.uid()) is null then
    return new;
  end if;

  if new.id = (select auth.uid()) then
    raise exception 'Cannot change your own role or permissions' using errcode = '42501';
  end if;

  actor_role := private.user_role();

  if actor_role is null or actor_role < 'admin' then
    raise exception 'Only admins can change roles or permissions' using errcode = '42501';
  end if;

  if (old.role = 'superadmin' or new.role = 'superadmin') and actor_role <> 'superadmin' then
    raise exception 'Only superadmins can manage superadmins' using errcode = '42501';
  end if;

  return new;
end
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

create trigger guard_profile_privileges
  before update on public.profiles
  for each row execute function private.guard_profile_privileges();

create trigger set_updated_at
  before update on public.profiles
  for each row execute function private.set_updated_at();

create policy "profiles_select_own_or_admin" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or private.has_role('admin'));

create policy "profiles_update_own_or_admin" on public.profiles
  for update to authenticated
  using ((id = (select auth.uid()) and private.has_role('editor')) or private.has_role('admin'))
  with check ((id = (select auth.uid()) and private.has_role('editor')) or private.has_role('admin'));

revoke all on public.profiles from anon, authenticated;
grant select, update (name, avatar, role, can_publish, active, seen_tours) on public.profiles to authenticated;

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  key text,
  slug text,
  data jsonb not null default '{}'::jsonb,
  revision integer not null default 1,
  sort_order integer not null default 0,
  -- "Publicar cambios" only takes the visible ones; collection documents start hidden.
  visible boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  updated_at timestamptz not null default now(),
  updated_by uuid default auth.uid() references public.profiles (id) on delete set null,
  deleted_at timestamptz
);

create unique index documents_type_key_unique on public.documents (type, key)
  where key is not null and deleted_at is null;
create unique index documents_type_slug_unique on public.documents (type, slug)
  where slug is not null and deleted_at is null;
create index documents_type_idx on public.documents (type, sort_order) where deleted_at is null;

create function private.touch_document ()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- Only content changes bump the revision, so reordering a list never raises an edit conflict.
  new.revision := case
    when new.data is distinct from old.data
      or new.key is distinct from old.key
      or new.slug is distinct from old.slug
    then old.revision + 1
    else old.revision
  end;
  new.updated_at := now();
  new.updated_by := coalesce((select auth.uid()), old.updated_by);
  return new;
end
$$;

create trigger touch_document
  before update on public.documents
  for each row execute function private.touch_document();

alter table public.documents enable row level security;

create policy "documents_select_editors" on public.documents
  for select to authenticated
  using (private.has_role('editor'));

create policy "documents_insert_editors" on public.documents
  for insert to authenticated
  with check (private.has_role('editor'));

create policy "documents_update_editors" on public.documents
  for update to authenticated
  using (private.has_role('editor'))
  with check (private.has_role('editor'));

create policy "documents_delete_admins" on public.documents
  for delete to authenticated
  using (private.has_role('admin'));

revoke all on public.documents from anon, authenticated;
grant select, delete on public.documents to authenticated;
grant insert (type, key, slug, data, sort_order, visible) on public.documents to authenticated;
grant update (key, slug, data, sort_order, visible, deleted_at) on public.documents to authenticated;

create table public.published_documents (
  id uuid primary key references public.documents (id) on delete cascade,
  type text not null,
  key text,
  slug text,
  data jsonb not null,
  sort_order integer not null default 0,
  published_at timestamptz not null default now(),
  published_by uuid references public.profiles (id) on delete set null
);

create unique index published_documents_type_key_unique on public.published_documents (type, key)
  where key is not null;
create unique index published_documents_type_slug_unique on public.published_documents (type, slug)
  where slug is not null;

alter table public.published_documents enable row level security;

-- Write access only through publish_site() (security definer).
create policy "published_documents_select_all" on public.published_documents
  for select to anon, authenticated
  using (true);

revoke all on public.published_documents from anon, authenticated;
grant select on public.published_documents to anon, authenticated;

create table public.document_versions (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents (id) on delete cascade,
  data jsonb not null,
  reason text not null check (reason in ('publish', 'restore', 'discard', 'conflict', 'checkpoint')),
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid() references public.profiles (id) on delete set null
);

create index document_versions_document_idx on public.document_versions (document_id, created_at desc);

alter table public.document_versions enable row level security;

create policy "document_versions_select_editors" on public.document_versions
  for select to authenticated
  using (private.has_role('editor'));

create policy "document_versions_insert_editors" on public.document_versions
  for insert to authenticated
  with check (private.has_role('editor') and created_by = (select auth.uid()));

revoke all on public.document_versions from anon, authenticated;
grant select on public.document_versions to authenticated;
grant insert (document_id, data, reason) on public.document_versions to authenticated;

-- Keeps the draft as it was before an editing burst, so a mistake can be undone before publishing.
create function private.checkpoint_document ()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  latest jsonb;
begin
  if new.data is not distinct from old.data then
    return null;
  end if;

  -- A conflict copy holds what an editor tried to save, not what was stored, so it doesn't count.
  if exists (
    select 1 from public.document_versions
    where document_id = old.id
      and reason <> 'conflict'
      and created_at > now() - interval '15 minutes'
  ) then
    return null;
  end if;

  select data into latest from public.document_versions
  where document_id = old.id and reason <> 'conflict'
  order by created_at desc
  limit 1;

  if latest is not distinct from old.data then
    return null;
  end if;

  insert into public.document_versions (document_id, data, reason, created_by)
  values (old.id, old.data, 'checkpoint', (select auth.uid()));

  delete from public.document_versions
  where id in (
    select id from public.document_versions
    where document_id = old.id and reason = 'checkpoint'
    order by created_at desc
    offset 20
  );

  return null;
end
$$;

create trigger checkpoint_document
  after update of data on public.documents
  for each row execute function private.checkpoint_document();

create table public.redirects (
  id uuid primary key default gen_random_uuid(),
  from_path text not null unique check (from_path like '/%'),
  to_path text not null check (to_path like '/%' or to_path ~ '^https?://'),
  status smallint not null default 301 check (status in (301, 302)),
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid() references public.profiles (id) on delete set null
);

alter table public.redirects enable row level security;

create policy "redirects_select_all" on public.redirects
  for select to anon, authenticated
  using (true);

-- Editors only create the automatic 301 on slug change; manual management is admin+.
create policy "redirects_insert_editors" on public.redirects
  for insert to authenticated
  with check (private.has_role('editor'));

create policy "redirects_update_admins" on public.redirects
  for update to authenticated
  using (private.has_role('admin'))
  with check (private.has_role('admin'));

create policy "redirects_delete_admins" on public.redirects
  for delete to authenticated
  using (private.has_role('admin'));

revoke all on public.redirects from anon, authenticated;
grant select on public.redirects to anon, authenticated;
grant delete on public.redirects to authenticated;
grant insert (from_path, to_path, status) on public.redirects to authenticated;
grant update (from_path, to_path, status) on public.redirects to authenticated;

create table public.media (
  id uuid primary key default gen_random_uuid(),
  path text not null unique,
  filename text not null default '',
  folder text not null default '',
  -- Per locale, { "es": "…", "en": "…" }: a missing locale blocks publishing the pages that use the file.
  alt jsonb not null default '{}'::jsonb check (jsonb_typeof(alt) = 'object'),
  caption jsonb not null default '{}'::jsonb check (jsonb_typeof(caption) = 'object'),
  focal_x real check (focal_x between 0 and 1),
  focal_y real check (focal_y between 0 and 1),
  width integer,
  height integer,
  blur_data_url text,
  mime text not null,
  size bigint not null,
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index media_folder_idx on public.media (folder, created_at desc) where deleted_at is null;

create trigger set_updated_at
  before update on public.media
  for each row execute function private.set_updated_at();

alter table public.media enable row level security;

create policy "media_select_not_deleted" on public.media
  for select to anon, authenticated
  using (deleted_at is null);

create policy "media_select_editors" on public.media
  for select to authenticated
  using (private.has_role('editor'));

create policy "media_insert_editors" on public.media
  for insert to authenticated
  with check (private.has_role('editor'));

create policy "media_update_editors" on public.media
  for update to authenticated
  using (private.has_role('editor'))
  with check (private.has_role('editor'));

create policy "media_delete_admins" on public.media
  for delete to authenticated
  using (private.has_role('admin'));

revoke all on public.media from anon, authenticated;
grant select on public.media to anon, authenticated;
grant delete on public.media to authenticated;
grant insert (path, filename, folder, alt, caption, focal_x, focal_y, width, height, blur_data_url, mime, size)
  on public.media to authenticated;
grant update (folder, alt, caption, focal_x, focal_y, width, height, blur_data_url, deleted_at)
  on public.media to authenticated;

-- SVG is left out on purpose: it can carry scripts.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'media',
  'media',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif', 'application/pdf']
)
on conflict (id) do nothing;

-- Public bucket: files are served by URL without a select policy; listing stays editor-only.
create policy "media_bucket_select_editors" on storage.objects
  for select to authenticated
  using (bucket_id = 'media' and private.has_role('editor'));

create policy "media_bucket_insert_editors" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'media' and private.has_role('editor'));

create policy "media_bucket_update_editors" on storage.objects
  for update to authenticated
  using (bucket_id = 'media' and private.has_role('editor'))
  with check (bucket_id = 'media' and private.has_role('editor'));

create policy "media_bucket_delete_admins" on storage.objects
  for delete to authenticated
  using (bucket_id = 'media' and private.has_role('admin'));

-- A file is used wherever its id appears as a string in a draft or in the published copy: image and file fields,
-- galleries and images inside rich text alike, without knowing the schema. Media ids never match document ids.
create function public.media_usage (ids uuid[])
returns table (
  media_id uuid,
  document_id uuid,
  type text,
  data jsonb,
  -- Top-level keys that hold it (page sections, document fields).
  keys text[],
  published boolean,
  trashed boolean
)
language sql
stable
set search_path = ''
as $$
  with targets as (select id, jsonb_build_object('id', id::text) as vars from unnest(ids) as t (id))
  select t.id, d.id, d.type, d.data,
    array(select e.key from jsonb_each(d.data) as e where jsonb_path_exists(e.value, '$.** ? (@ == $id)', t.vars)),
    false, d.deleted_at is not null
  from targets t
  join public.documents d on jsonb_path_exists(d.data, '$.** ? (@ == $id)', t.vars)
  union all
  select t.id, p.id, p.type, p.data,
    array(select e.key from jsonb_each(p.data) as e where jsonb_path_exists(e.value, '$.** ? (@ == $id)', t.vars)),
    true, false
  from targets t
  join public.published_documents p on jsonb_path_exists(p.data, '$.** ? (@ == $id)', t.vars)
$$;

revoke execute on function public.media_usage (uuid[]) from public, anon;
grant execute on function public.media_usage (uuid[]) to authenticated, service_role;

-- Second layer behind the panel: a file in use can't go to the trash or be deleted.
create function private.guard_media_in_use ()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (select 1 from public.media_usage(array[old.id])) then
    raise exception 'media % is in use', old.id using errcode = 'CM003';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end
$$;

create trigger guard_media_trash
  before update of deleted_at on public.media
  for each row
  when (old.deleted_at is null and new.deleted_at is not null)
  execute function private.guard_media_in_use();

create trigger guard_media_delete
  before delete on public.media
  for each row execute function private.guard_media_in_use();

create table public.activity_log (
  id bigint generated always as identity primary key,
  user_id uuid default auth.uid() references public.profiles (id) on delete set null,
  action text not null,
  document_id uuid references public.documents (id) on delete set null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index activity_log_created_idx on public.activity_log (created_at desc);

alter table public.activity_log enable row level security;

create policy "activity_log_select_admins" on public.activity_log
  for select to authenticated
  using (private.has_role('admin'));

create policy "activity_log_insert_own" on public.activity_log
  for insert to authenticated
  with check (private.has_role('editor') and user_id = (select auth.uid()));

revoke all on public.activity_log from anon, authenticated;
grant select on public.activity_log to authenticated;
grant insert (action, document_id, details) on public.activity_log to authenticated;

create table public.publish_log (
  id bigint generated always as identity primary key,
  requested_by uuid references public.profiles (id) on delete set null,
  requested_at timestamptz not null default now(),
  documents_count integer not null default 0,
  removed_count integer not null default 0,
  items jsonb not null default '[]'::jsonb,
  build_status text not null default 'pending'
    check (build_status in ('pending', 'building', 'success', 'failed')),
  job_id text,
  finished_at timestamptz,
  -- A code the panel translates (target_missing, hook_refused, hook_unreachable, build_failed), never prose.
  error_code text,
  -- What support needs next to the code, e.g. the HTTP status the build hook answered.
  error_detail text
);

create index publish_log_requested_idx on public.publish_log (requested_at desc);
create index publish_log_active_idx on public.publish_log (requested_at)
  where build_status in ('pending', 'building');

alter table public.publish_log enable row level security;

-- Written only by publish_site() and the build webhook (service role).
create policy "publish_log_select_editors" on public.publish_log
  for select to authenticated
  using (private.has_role('editor'));

revoke all on public.publish_log from anon, authenticated;
grant select on public.publish_log to authenticated;

-- Compares content, not timestamps: reordering touches updated_at without changing what is live.
create view public.document_status
with (security_invoker = true)
as
select
  d.id,
  d.type,
  d.key,
  d.slug,
  d.data,
  d.revision,
  d.sort_order,
  d.visible,
  d.created_at,
  d.updated_at,
  d.updated_by,
  d.deleted_at,
  p.published_at,
  p.published_by,
  s.status,
  s.status in ('new', 'changed', 'unpublishing') as pending,
  p.slug as published_slug
from public.documents d
left join public.published_documents p on p.id = d.id
cross join lateral (
  select case
    when p.id is null then
      case when d.visible and d.deleted_at is null then 'new' else 'hidden' end
    when d.deleted_at is not null or not d.visible then 'unpublishing'
    when d.data is distinct from p.data
      or d.slug is distinct from p.slug
      or d.key is distinct from p.key
      or d.sort_order <> p.sort_order then 'changed'
    else 'published'
  end as status
) s;

revoke all on public.document_status from anon, authenticated;
grant select on public.document_status to authenticated;

-- RLS on profiles hides other users from editors; history and logs still need their names.
create function public.author_names (ids uuid[])
returns table (id uuid, name text)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.name from public.profiles p
  where p.id = any (ids) and private.has_role('editor')
$$;

revoke execute on function public.author_names (uuid[]) from public, anon;
grant execute on function public.author_names (uuid[]) to authenticated;

-- p_publish: [{ id, revision, redirectPrefix? }] exactly as validated by the server; a newer revision aborts
-- everything. With a prefix ("/blog/"), publishing a new slug of a live document creates the 301 from its old
-- URL. Paths are built here from real slugs, never sent in.
create function public.publish_site (p_publish jsonb, p_remove uuid[] default '{}')
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  item jsonb;
  doc public.documents;
  removed_id uuid;
  prefix text;
  old_slug text;
  old_path text;
  new_path text;
  published_count integer := 0;
  removed_count integer := 0;
  redirect_count integer := 0;
  log_items jsonb := '[]'::jsonb;
  publish_id bigint;
begin
  if actor is null or not private.can_publish() then
    raise exception 'Not allowed to publish' using errcode = '42501';
  end if;

  if jsonb_typeof(coalesce(p_publish, '[]'::jsonb)) <> 'array' then
    raise exception 'p_publish must be an array' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtext('public.publish_site'));

  -- Removals first, so a slug they release can be taken by a document published in the same run.
  foreach removed_id in array coalesce((select array_agg(distinct r) from unnest(p_remove) r), '{}') loop
    select * into doc from public.documents where id = removed_id for update;

    if not found
      or not exists (select 1 from public.published_documents where id = removed_id)
      or (doc.deleted_at is null and doc.visible) then
      raise exception 'Document % cannot be unpublished', removed_id using errcode = 'CM001';
    end if;

    delete from public.published_documents where id = removed_id;
    removed_count := removed_count + 1;
    log_items := log_items || jsonb_build_object('id', doc.id, 'type', doc.type, 'action', 'unpublish');
  end loop;

  for item in select distinct value from jsonb_array_elements(coalesce(p_publish, '[]'::jsonb)) loop
    select * into doc from public.documents where id = (item ->> 'id')::uuid for update;

    if not found
      or doc.deleted_at is not null
      or not doc.visible
      or doc.revision is distinct from (item ->> 'revision')::integer then
      raise exception 'Document % changed before publishing', item ->> 'id' using errcode = 'CM001';
    end if;

    continue when exists (
      select 1 from public.published_documents p
      where p.id = doc.id
        and p.data = doc.data
        and p.slug is not distinct from doc.slug
        and p.key is not distinct from doc.key
        and p.sort_order = doc.sort_order
    );

    prefix := item ->> 'redirectPrefix';
    old_slug := (select p.slug from public.published_documents p where p.id = doc.id);

    if prefix is not null and doc.slug is not null then
      if prefix !~ '^/([a-z0-9-]+/)*$'
        or doc.slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$'
        or (old_slug is not null and old_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$') then
        raise exception 'Invalid redirect for document %', doc.id using errcode = '22023';
      end if;

      new_path := prefix || doc.slug;

      if old_slug is not null and old_slug <> doc.slug then
        old_path := prefix || old_slug;

        -- Older URLs jump straight to the new one.
        update public.redirects set to_path = new_path where to_path = old_path;

        insert into public.redirects (from_path, to_path, status, created_by)
        values (old_path, new_path, 301, actor)
        on conflict (from_path) do update set to_path = excluded.to_path, status = 301;

        redirect_count := redirect_count + 1;
      end if;

      -- Next runs redirects before pages: one left on this URL would hide the document being published.
      delete from public.redirects where from_path = new_path or from_path = to_path;
    end if;

    insert into public.published_documents (id, type, key, slug, data, sort_order, published_at, published_by)
    values (doc.id, doc.type, doc.key, doc.slug, doc.data, doc.sort_order, now(), actor)
    on conflict (id) do update set
      type = excluded.type,
      key = excluded.key,
      slug = excluded.slug,
      data = excluded.data,
      sort_order = excluded.sort_order,
      published_at = excluded.published_at,
      published_by = excluded.published_by;

    insert into public.document_versions (document_id, data, reason, created_by)
    values (doc.id, doc.data, 'publish', actor);

    published_count := published_count + 1;
    log_items := log_items || jsonb_build_object('id', doc.id, 'type', doc.type, 'action', 'publish');
  end loop;

  if published_count + removed_count = 0 then
    raise exception 'Nothing to publish' using errcode = 'CM002';
  end if;

  insert into public.publish_log (requested_by, documents_count, removed_count, items)
  values (actor, published_count, removed_count, log_items)
  returning id into publish_id;

  insert into public.activity_log (user_id, action, details)
  values (actor, 'site.publish', jsonb_build_object(
    'publishId', publish_id, 'published', published_count, 'removed', removed_count, 'redirects', redirect_count
  ));

  return jsonb_build_object(
    'publishId', publish_id, 'published', published_count, 'removed', removed_count, 'redirects', redirect_count
  );
end
$$;

revoke execute on function public.publish_site (jsonb, uuid[]) from public, anon;
grant execute on function public.publish_site (jsonb, uuid[]) to authenticated;

revoke execute on all functions in schema private from public;
grant execute on function private.user_role () to authenticated;
grant execute on function private.has_role (public.app_role) to authenticated;
grant execute on function private.can_publish () to authenticated;
