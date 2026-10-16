begin;
create extension if not exists pgtap with schema extensions;

select plan(27);

insert into auth.users (id, email, raw_user_meta_data) values
  ('20000000-0000-0000-0000-00000000000a', 'admin-pub@test.local', '{"name": "Admin Pub"}'),
  ('20000000-0000-0000-0000-00000000000b', 'editor-pub@test.local', '{"name": "Editor Pub"}'),
  ('20000000-0000-0000-0000-00000000000c', 'publisher-pub@test.local', '{"name": "Publisher Pub"}'),
  ('20000000-0000-0000-0000-00000000000d', 'inactive-pub@test.local', '{"name": "Inactive Pub"}');

update public.profiles set role = 'admin' where id = '20000000-0000-0000-0000-00000000000a';
update public.profiles set can_publish = true where id = '20000000-0000-0000-0000-00000000000c';
update public.profiles set role = 'admin', active = false where id = '20000000-0000-0000-0000-00000000000d';

insert into public.documents (id, type, key, slug, data, visible, deleted_at) values
  ('20000000-0000-0000-0000-0000000000d1', 'pub.page', 'pub.page', null, '{"title": "Nueva"}', true, null),
  ('20000000-0000-0000-0000-0000000000d2', 'pub.posts', null, 'igual', '{"title": "Igual"}', true, null),
  ('20000000-0000-0000-0000-0000000000d3', 'pub.posts', null, 'cambiado', '{"title": "Cambiado"}', true, null),
  ('20000000-0000-0000-0000-0000000000d4', 'pub.posts', null, 'oculto', '{"title": "Oculto"}', false, null),
  ('20000000-0000-0000-0000-0000000000d5', 'pub.posts', null, 'papelera', '{"title": "Papelera"}', true, now()),
  ('20000000-0000-0000-0000-0000000000d6', 'pub.posts', null, 'despublicar', '{"title": "Despublicar"}', false, null);

insert into public.published_documents (id, type, key, slug, data) values
  ('20000000-0000-0000-0000-0000000000d2', 'pub.posts', null, 'igual', '{"title": "Igual"}'),
  ('20000000-0000-0000-0000-0000000000d3', 'pub.posts', null, 'cambiado', '{"title": "Viejo"}'),
  ('20000000-0000-0000-0000-0000000000d5', 'pub.posts', null, 'papelera', '{"title": "Papelera"}'),
  ('20000000-0000-0000-0000-0000000000d6', 'pub.posts', null, 'despublicar', '{"title": "Despublicar"}');

-- Anonymous

set local role anon;

select throws_ok(
  $$ select public.publish_site('[]', '{}') $$,
  '42501', null, 'anon cannot publish'
);
select throws_ok('select * from public.document_status', '42501', null, 'anon cannot read the document status');
select throws_ok(
  $$ select * from public.author_names(array['20000000-0000-0000-0000-00000000000a'::uuid]) $$,
  '42501', null, 'anon cannot read author names'
);

reset role;

-- Editor without can_publish

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "20000000-0000-0000-0000-00000000000b", "role": "authenticated"}', true);

select results_eq(
  $$ select id::text, status from public.document_status where type like 'pub.%' order by id $$,
  $$ values
    ('20000000-0000-0000-0000-0000000000d1', 'new'),
    ('20000000-0000-0000-0000-0000000000d2', 'published'),
    ('20000000-0000-0000-0000-0000000000d3', 'changed'),
    ('20000000-0000-0000-0000-0000000000d4', 'hidden'),
    ('20000000-0000-0000-0000-0000000000d5', 'unpublishing'),
    ('20000000-0000-0000-0000-0000000000d6', 'unpublishing') $$,
  'document_status compares drafts against published content'
);
select is(
  (select count(*) from public.document_status where type like 'pub.%' and pending),
  4::bigint,
  'new, changed and unpublishing documents are pending'
);
select results_eq(
  $$ select name from public.author_names(array['20000000-0000-0000-0000-00000000000a'::uuid]) $$,
  $$ values ('Admin Pub') $$,
  'editor reads other authors names'
);
select throws_ok(
  $$ select public.publish_site('[{"id": "20000000-0000-0000-0000-0000000000d1", "revision": 1}]', '{}') $$,
  '42501', null, 'an editor without can_publish cannot publish'
);
select throws_ok(
  $$ update public.publish_log set build_status = 'success' $$,
  '42501', null, 'editor cannot write the publish log'
);

reset role;

-- Inactive admin

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "20000000-0000-0000-0000-00000000000d", "role": "authenticated"}', true);

select throws_ok(
  $$ select public.publish_site('[{"id": "20000000-0000-0000-0000-0000000000d1", "revision": 1}]', '{}') $$,
  '42501', null, 'an inactive admin cannot publish'
);

reset role;

-- Editor with can_publish

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "20000000-0000-0000-0000-00000000000c", "role": "authenticated"}', true);

select throws_ok(
  $$ select public.publish_site('[{"id": "20000000-0000-0000-0000-0000000000d1", "revision": 99}]', '{}') $$,
  'CM001', null, 'a stale revision aborts the publication'
);
select throws_ok(
  $$ select public.publish_site('[{"id": "20000000-0000-0000-0000-0000000000d4", "revision": 1}]', '{}') $$,
  'CM001', null, 'a hidden document cannot be published'
);
select throws_ok(
  $$ select public.publish_site('[{"id": "20000000-0000-0000-0000-0000000000d5", "revision": 1}]', '{}') $$,
  'CM001', null, 'a trashed document cannot be published'
);
select throws_ok(
  $$ select public.publish_site('[]', array['20000000-0000-0000-0000-0000000000d2'::uuid]) $$,
  'CM001', null, 'a visible document cannot be unpublished'
);
select throws_ok(
  $$ select public.publish_site('[]', '{}') $$,
  'CM002', null, 'publishing nothing is rejected'
);
select throws_ok(
  $$ select public.publish_site(
    '[{"id": "20000000-0000-0000-0000-0000000000d1", "revision": 1}, {"id": "20000000-0000-0000-0000-0000000000d3", "revision": 99}]',
    '{}'
  ) $$,
  'CM001', null, 'one stale document aborts the whole run'
);
select lives_ok(
  $$ select public.publish_site(
    '[{"id": "20000000-0000-0000-0000-0000000000d1", "revision": 1}, {"id": "20000000-0000-0000-0000-0000000000d3", "revision": 1}]',
    array['20000000-0000-0000-0000-0000000000d5'::uuid, '20000000-0000-0000-0000-0000000000d6'::uuid]
  ) $$,
  'an editor with can_publish publishes'
);

reset role;

select results_eq(
  $$ select data ->> 'title' from public.published_documents where id in (
    '20000000-0000-0000-0000-0000000000d1', '20000000-0000-0000-0000-0000000000d3'
  ) order by id $$,
  $$ values ('Nueva'), ('Cambiado') $$,
  'drafts are copied to published content'
);
select is(
  (select published_by from public.published_documents where id = '20000000-0000-0000-0000-0000000000d1'),
  '20000000-0000-0000-0000-00000000000c'::uuid,
  'published content records who published it'
);
select is_empty(
  $$ select 1 from public.published_documents where id in (
    '20000000-0000-0000-0000-0000000000d5', '20000000-0000-0000-0000-0000000000d6'
  ) $$,
  'trashed and hidden documents are unpublished'
);
select results_eq(
  $$ select document_id::text, reason, created_by::text from public.document_versions
     where document_id::text like '20000000-%' order by document_id $$,
  $$ values
    ('20000000-0000-0000-0000-0000000000d1', 'publish', '20000000-0000-0000-0000-00000000000c'),
    ('20000000-0000-0000-0000-0000000000d3', 'publish', '20000000-0000-0000-0000-00000000000c') $$,
  'each published document gets a version'
);
select results_eq(
  $$ select requested_by::text, documents_count, removed_count, build_status, jsonb_array_length(items)
     from public.publish_log where requested_by::text like '20000000-%' $$,
  $$ values ('20000000-0000-0000-0000-00000000000c', 2, 2, 'pending', 4) $$,
  'the publication is logged once, failed attempts left nothing'
);
select results_eq(
  $$ select action, (details ->> 'published')::int, (details ->> 'removed')::int
     from public.activity_log where user_id = '20000000-0000-0000-0000-00000000000c' $$,
  $$ values ('site.publish', 2, 2) $$,
  'the publication is in the activity log'
);
select results_eq(
  $$ select id::text, status from public.document_status where type like 'pub.%' order by id $$,
  $$ values
    ('20000000-0000-0000-0000-0000000000d1', 'published'),
    ('20000000-0000-0000-0000-0000000000d2', 'published'),
    ('20000000-0000-0000-0000-0000000000d3', 'published'),
    ('20000000-0000-0000-0000-0000000000d4', 'hidden'),
    ('20000000-0000-0000-0000-0000000000d5', 'hidden'),
    ('20000000-0000-0000-0000-0000000000d6', 'hidden') $$,
  'nothing is pending after publishing'
);

update public.documents set data = '{"title": "Igual editado"}' where id = '20000000-0000-0000-0000-0000000000d2';

-- Admin without the can_publish flag

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "20000000-0000-0000-0000-00000000000a", "role": "authenticated"}', true);

select lives_ok(
  $$ select public.publish_site('[{"id": "20000000-0000-0000-0000-0000000000d2", "revision": 2}]', '{}') $$,
  'an admin publishes without the can_publish flag'
);
select throws_ok(
  $$ select public.publish_site('[{"id": "20000000-0000-0000-0000-0000000000d2", "revision": 2}]', '{}') $$,
  'CM002', null, 'republishing unchanged content is rejected'
);
select throws_ok(
  $$ select public.publish_site('{"id": "20000000-0000-0000-0000-0000000000d2"}', '{}') $$,
  '22023', null, 'the list to publish must be an array'
);

reset role;

-- A draft can take a slug another document still holds on the site: publishing it alone must fail, not overwrite.
update public.documents set slug = 'igual-nuevo' where id = '20000000-0000-0000-0000-0000000000d2';
insert into public.documents (id, type, slug, data, visible)
values ('20000000-0000-0000-0000-0000000000d7', 'pub.posts', 'igual', '{"title": "Toma el slug"}', true);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "20000000-0000-0000-0000-00000000000a", "role": "authenticated"}', true);
select throws_ok(
  $$ select public.publish_site('[{"id": "20000000-0000-0000-0000-0000000000d7", "revision": 1}]', '{}') $$,
  '23505', null, 'two published documents never share a URL'
);

reset role;

select * from finish();
rollback;
