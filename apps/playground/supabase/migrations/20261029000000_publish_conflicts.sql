-- A taken slug or URL says which document holds it (DETAIL as JSON: id, takenBy, locale, value), so the panel can
-- point at both. Documents are published in the order given: the server puts the ones freeing a URL first.

-- p_publish: [{ id, revision, urls }] as validated by the server; urls per locale: { prefix, primary } or { path }.
create or replace function public.publish_site (p_publish jsonb, p_remove uuid[] default '{}')
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  item jsonb;
  doc public.documents;
  live public.published_documents;
  removed_id uuid;
  url record;
  locale_slug record;
  new_path text;
  old_path text;
  new_paths jsonb;
  taken_by uuid;
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

  -- Removals first, so a slug or URL they release can be taken by a document published in the same run.
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

  for item in select value from jsonb_array_elements(coalesce(p_publish, '[]'::jsonb)) with ordinality order by ordinality loop
    select * into doc from public.documents where id = (item ->> 'id')::uuid for update;

    if not found
      or doc.deleted_at is not null
      or not doc.visible
      or doc.revision is distinct from (item ->> 'revision')::integer then
      raise exception 'Document % changed before publishing', item ->> 'id' using errcode = 'CM001';
    end if;

    for locale_slug in select key, value from jsonb_each_text(doc.slugs) loop
      if locale_slug.value !~ '^[a-z0-9]+(-[a-z0-9]+)*$' then
        raise exception 'Invalid slug for document %', doc.id using errcode = '22023';
      end if;
      select p.id into taken_by from public.published_documents p
      where p.type = doc.type and p.id <> doc.id and p.slugs @> jsonb_build_object(locale_slug.key, locale_slug.value)
      limit 1;
      if taken_by is not null then
        raise exception 'Slug % is taken in %', locale_slug.value, locale_slug.key using errcode = '23505',
          detail = jsonb_build_object('id', doc.id, 'takenBy', taken_by, 'locale', locale_slug.key, 'value', locale_slug.value)::text;
      end if;
    end loop;

    new_paths := '{}'::jsonb;
    for url in select key, value from jsonb_each(coalesce(item -> 'urls', '{}'::jsonb)) loop
      if url.key !~ '^[a-z]{2,3}(-[A-Z]{2})?$' then
        raise exception 'Invalid locale for document %', doc.id using errcode = '22023';
      end if;

      if url.value ? 'prefix' then
        if url.value ->> 'prefix' !~ '^/([A-Za-z0-9-]+/)*$' then
          raise exception 'Invalid URL prefix for document %', doc.id using errcode = '22023';
        end if;
        continue when coalesce(doc.slugs ->> url.key, '') = '';
        new_path := (url.value ->> 'prefix') || (doc.slugs ->> url.key);
      else
        new_path := url.value ->> 'path';
        if new_path is null or new_path !~ '^/([A-Za-z0-9-]+(/[A-Za-z0-9-]+)*)?$' then
          raise exception 'Invalid URL for document %', doc.id using errcode = '22023';
        end if;
      end if;

      select p.id into taken_by from public.published_documents p
      where p.id <> doc.id and jsonb_path_exists(p.paths, '$.* ? (@ == $path)', jsonb_build_object('path', new_path))
      limit 1;
      if taken_by is not null then
        raise exception 'URL % is taken', new_path using errcode = '23505',
          detail = jsonb_build_object('id', doc.id, 'takenBy', taken_by, 'locale', url.key, 'value', new_path)::text;
      end if;

      new_paths := new_paths || jsonb_build_object(url.key, new_path);
    end loop;

    select * into live from public.published_documents where id = doc.id;

    continue when live.id is not null
      and live.data = doc.data
      and live.slug is not distinct from doc.slug
      and live.slugs = doc.slugs
      and live.paths = new_paths
      and live.key is not distinct from doc.key
      and live.sort_order = doc.sort_order;

    if live.id is not null then
      for url in select key, value from jsonb_each(new_paths) loop
        new_path := url.value #>> '{}';
        old_path := live.paths ->> url.key;

        -- Published before slugs per locale: the default locale's old URL comes from the single slug.
        if old_path is null and live.slug is not null and coalesce((item -> 'urls' -> url.key ->> 'primary')::boolean, false) then
          old_path := (item -> 'urls' -> url.key ->> 'prefix') || live.slug;
        end if;

        if old_path is not null and old_path <> new_path then
          -- Older URLs jump straight to the new one.
          update public.redirects set to_path = new_path where to_path = old_path;

          insert into public.redirects (from_path, to_path, status, created_by)
          values (old_path, new_path, 301, actor)
          on conflict (from_path) do update set to_path = excluded.to_path, status = 301;

          redirect_count := redirect_count + 1;
        end if;
      end loop;
    end if;

    -- Next runs redirects before pages: one left on a live URL would hide the document being published.
    delete from public.redirects r
    where r.from_path = r.to_path
      or r.from_path in (select value from jsonb_each_text(new_paths));

    insert into public.published_documents (id, type, key, slug, slugs, paths, data, sort_order, published_at, published_by)
    values (doc.id, doc.type, doc.key, doc.slug, doc.slugs, new_paths, doc.data, doc.sort_order, now(), actor)
    on conflict (id) do update set
      type = excluded.type,
      key = excluded.key,
      slug = excluded.slug,
      slugs = excluded.slugs,
      paths = excluded.paths,
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
