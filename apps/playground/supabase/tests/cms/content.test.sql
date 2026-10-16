begin;
create extension if not exists pgtap with schema extensions;

select plan(46);

insert into auth.users (id, email, raw_user_meta_data) values
  ('30000000-0000-0000-0000-00000000000a', 'super-content@test.local', '{"name": "Super"}'),
  ('30000000-0000-0000-0000-00000000000b', 'admin-content@test.local', '{"name": "Admin"}'),
  ('30000000-0000-0000-0000-00000000000c', 'editor-content@test.local', '{"name": "Editor"}'),
  ('30000000-0000-0000-0000-00000000000d', 'inactive-content@test.local', '{"name": "Inactivo"}'),
  ('30000000-0000-0000-0000-00000000000e', 'inactive-admin@test.local', '{"name": "Admin inactivo"}'),
  ('30000000-0000-0000-0000-00000000000f', 'publisher-off@test.local', '{"name": "Publica inactivo"}');

update public.profiles set role = 'superadmin' where id = '30000000-0000-0000-0000-00000000000a';
update public.profiles set role = 'admin' where id = '30000000-0000-0000-0000-00000000000b';
update public.profiles set active = false where id = '30000000-0000-0000-0000-00000000000d';
update public.profiles set role = 'admin', active = false where id = '30000000-0000-0000-0000-00000000000e';
update public.profiles set can_publish = true, active = false where id = '30000000-0000-0000-0000-00000000000f';

insert into public.documents (id, type, key, slug, data) values
  ('30000000-0000-0000-0000-0000000000d1', 'ct.page', 'ct.page', null, '{"title": "Sección"}'),
  ('30000000-0000-0000-0000-0000000000d2', 'ct.posts', null, 'nota', '{"title": "Nota"}');
insert into public.media (id, path, mime, size) values
  ('30000000-0000-0000-0000-0000000000e1', 'ct/2026/visible.webp', 'image/webp', 100);
insert into public.media (path, mime, size, deleted_at) values ('ct/2026/papelera.webp', 'image/webp', 100, now());
insert into public.publish_log (requested_by) values ('30000000-0000-0000-0000-00000000000b');

-- Editor: drafts

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "30000000-0000-0000-0000-00000000000c", "role": "authenticated"}', true);

select throws_ok(
  $$ insert into public.documents (type, key) values ('ct.page', 'ct.page') $$,
  '23505', null, 'a page key is unique'
);
select throws_ok(
  $$ insert into public.documents (type, slug) values ('ct.posts', 'nota') $$,
  '23505', null, 'a slug is unique inside its collection'
);
update public.documents set deleted_at = now() where id = '30000000-0000-0000-0000-0000000000d2';
select lives_ok(
  $$ insert into public.documents (type, slug) values ('ct.posts', 'nota') $$,
  'a trashed document frees its slug'
);
select throws_ok(
  $$ update public.documents set revision = 50 where id = '30000000-0000-0000-0000-0000000000d1' $$,
  '42501', null, 'the revision is not writable'
);
update public.documents set sort_order = 3 where id = '30000000-0000-0000-0000-0000000000d1';
select is(
  (select revision from public.documents where id = '30000000-0000-0000-0000-0000000000d1'),
  1, 'reordering does not bump the revision'
);
update public.documents set data = '{"title": "Otra"}' where id = '30000000-0000-0000-0000-0000000000d1';
select is(
  (select revision from public.documents where id = '30000000-0000-0000-0000-0000000000d1'),
  2, 'editing the content bumps the revision'
);

-- Editor: versions

select lives_ok(
  $$ insert into public.document_versions (document_id, data, reason) values ('30000000-0000-0000-0000-0000000000d1', '{}', 'conflict') $$,
  'editors save conflict copies'
);
select is(
  (select created_by::text from public.document_versions where document_id = '30000000-0000-0000-0000-0000000000d1' and reason = 'conflict'),
  '30000000-0000-0000-0000-00000000000c', 'a version is signed by whoever saved it'
);
select isnt_empty('select * from public.document_versions', 'editors read the history');
select throws_ok(
  $$ insert into public.document_versions (document_id, data, reason) values ('30000000-0000-0000-0000-0000000000d1', '{}', 'capricho') $$,
  '23514', null, 'only known reasons are accepted'
);
select throws_ok(
  $$ insert into public.document_versions (document_id, data, reason, created_by) values ('30000000-0000-0000-0000-0000000000d1', '{}', 'restore', '30000000-0000-0000-0000-00000000000a') $$,
  '42501', null, 'nobody signs a version as someone else'
);
select throws_ok(
  $$ update public.document_versions set data = '{}' $$,
  '42501', null, 'versions cannot be rewritten'
);
select throws_ok(
  $$ delete from public.document_versions $$,
  '42501', null, 'versions cannot be deleted'
);

-- Editor: checkpoints

select is(
  (select data from public.document_versions where document_id = '30000000-0000-0000-0000-0000000000d1' and reason = 'checkpoint'),
  '{"title": "Sección"}'::jsonb, 'the first edit keeps a checkpoint of the draft before it'
);
update public.documents set data = '{"title": "Tercera"}' where id = '30000000-0000-0000-0000-0000000000d1';
select is(
  (select count(*) from public.document_versions where document_id = '30000000-0000-0000-0000-0000000000d1' and reason = 'checkpoint'),
  1::bigint, 'no new checkpoint within 15 minutes'
);
reset role;
update public.document_versions set created_at = now() - interval '20 minutes' where document_id = '30000000-0000-0000-0000-0000000000d1';
set local role authenticated;
update public.documents set data = '{"title": "Cuarta"}' where id = '30000000-0000-0000-0000-0000000000d1';
select is(
  (select count(*) from public.document_versions where document_id = '30000000-0000-0000-0000-0000000000d1' and reason = 'checkpoint'),
  2::bigint, 'editing again after 15 minutes keeps another checkpoint'
);
select is(
  (select created_by::text from public.document_versions where document_id = '30000000-0000-0000-0000-0000000000d1' and reason = 'checkpoint' order by created_at desc limit 1),
  '30000000-0000-0000-0000-00000000000c', 'a checkpoint is signed by whoever edited'
);
reset role;
insert into public.document_versions (document_id, data, reason, created_at)
select '30000000-0000-0000-0000-0000000000d1', jsonb_build_object('n', g), 'checkpoint', now() - interval '1 day' - g * interval '1 minute'
from generate_series(1, 25) g;
insert into public.document_versions (document_id, data, reason, created_at)
values ('30000000-0000-0000-0000-0000000000d1', '{}', 'publish', now() - interval '2 days');
update public.document_versions set created_at = created_at - interval '1 hour' where document_id = '30000000-0000-0000-0000-0000000000d1';
update public.documents set data = '{"title": "Quinta"}' where id = '30000000-0000-0000-0000-0000000000d1';
select is(
  (select count(*) from public.document_versions where document_id = '30000000-0000-0000-0000-0000000000d1' and reason = 'checkpoint'),
  20::bigint, 'only the 20 newest checkpoints are kept'
);
select is(
  (select count(*) from public.document_versions where document_id = '30000000-0000-0000-0000-0000000000d1' and reason = 'publish'),
  1::bigint, 'pruning never touches published versions'
);
set local role authenticated;

-- Editor: media

select is((select count(*) from public.media where path like 'ct/%'), 2::bigint, 'editors also see trashed media');
update public.media set deleted_at = now() where id = '30000000-0000-0000-0000-0000000000e1';
select isnt_empty(
  $$ select 1 from public.media where id = '30000000-0000-0000-0000-0000000000e1' and deleted_at is not null $$,
  'editors send files to the trash'
);
update public.media set deleted_at = null where id = '30000000-0000-0000-0000-0000000000e1';
select isnt_empty(
  $$ select 1 from public.media where id = '30000000-0000-0000-0000-0000000000e1' and deleted_at is null $$,
  'editors restore files from the trash'
);
select throws_ok(
  $$ update public.media set path = 'otro.webp' $$,
  '42501', null, 'the file path is fixed'
);
select throws_ok(
  $$ update public.media set focal_x = 2 where id = '30000000-0000-0000-0000-0000000000e1' $$,
  '23514', null, 'the focal point stays inside the image'
);
select throws_ok(
  $$ update public.media set alt = '"Solo texto"' where id = '30000000-0000-0000-0000-0000000000e1' $$,
  '23514', null, 'the alt text is a map by locale'
);
select throws_ok(
  $$ update public.media set caption = '[]' where id = '30000000-0000-0000-0000-0000000000e1' $$,
  '23514', null, 'the caption is a map by locale'
);
update public.media set alt = '{"es": "Fachada", "en": "Facade"}' where id = '30000000-0000-0000-0000-0000000000e1';
select is(
  (select alt ->> 'en' from public.media where id = '30000000-0000-0000-0000-0000000000e1'),
  'Facade', 'editors write the alt text of each locale'
);
delete from public.media where id = '30000000-0000-0000-0000-0000000000e1';

-- Editor: logs and redirects

select lives_ok(
  $$ insert into public.activity_log (action) values ('document.create') $$,
  'editors log their own actions'
);
select is(
  (select user_id::text from public.activity_log where action = 'document.create' order by id desc limit 1),
  null, 'editors cannot read the log back (admins only)'
);
select throws_ok(
  $$ insert into public.activity_log (action, user_id) values ('auth.login', '30000000-0000-0000-0000-00000000000a') $$,
  '42501', null, 'nobody logs actions as someone else'
);
select throws_ok($$ update public.activity_log set action = 'x' $$, '42501', null, 'the log cannot be rewritten');
select throws_ok($$ delete from public.activity_log $$, '42501', null, 'the log cannot be deleted');
select isnt_empty('select * from public.publish_log', 'editors see the publish history');
select throws_ok(
  $$ insert into public.redirects (from_path, to_path) values ('sin-barra', '/destino') $$,
  '23514', null, 'redirects start with a slash'
);
select throws_ok(
  $$ insert into public.redirects (from_path, to_path, status) values ('/a', '/b', 307) $$,
  '23514', null, 'redirects are 301 or 302'
);
select lives_ok(
  $$ insert into public.redirects (from_path, to_path) values ('/viejo-ct', 'https://otro.example') $$,
  'editors create redirects, also to external sites'
);
delete from public.redirects where from_path = '/viejo-ct';

reset role;

select isnt_empty($$ select 1 from public.media where id = '30000000-0000-0000-0000-0000000000e1' $$, 'editors cannot delete library entries');
select isnt_empty($$ select 1 from public.redirects where from_path = '/viejo-ct' $$, 'editors cannot delete redirects');
select is(
  (select user_id::text from public.activity_log where action = 'document.create' order by id desc limit 1),
  '30000000-0000-0000-0000-00000000000c', 'the log entry is signed with the session user'
);

-- Admin

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "30000000-0000-0000-0000-00000000000b", "role": "authenticated"}', true);

delete from public.media where id = '30000000-0000-0000-0000-0000000000e1';
update public.profiles set active = true where id = '30000000-0000-0000-0000-00000000000d';
update public.profiles set name = 'Renombrado' where id = '30000000-0000-0000-0000-00000000000c';
select throws_ok(
  $$ update public.profiles set role = 'editor' where id = '30000000-0000-0000-0000-00000000000a' $$,
  '42501', null, 'admins cannot demote a superadmin'
);

reset role;

select is_empty($$ select 1 from public.media where id = '30000000-0000-0000-0000-0000000000e1' $$, 'admins delete library entries');
select is((select active from public.profiles where id = '30000000-0000-0000-0000-00000000000d'), true, 'admins reactivate users');
select is((select name from public.profiles where id = '30000000-0000-0000-0000-00000000000c'), 'Renombrado', 'admins rename other users');

-- Inactive and self-service limits

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "30000000-0000-0000-0000-00000000000e", "role": "authenticated"}', true);
update public.profiles set role = 'admin' where id = '30000000-0000-0000-0000-00000000000c';
reset role;
select is((select role from public.profiles where id = '30000000-0000-0000-0000-00000000000c'), 'editor'::public.app_role, 'an inactive admin manages nobody');
set local role authenticated;

select set_config('request.jwt.claims', '{"sub": "30000000-0000-0000-0000-00000000000a", "role": "authenticated"}', true);
select throws_ok(
  $$ update public.profiles set role = 'admin' where id = '30000000-0000-0000-0000-00000000000a' $$,
  '42501', null, 'not even a superadmin changes their own role'
);

select set_config('request.jwt.claims', '{"sub": "30000000-0000-0000-0000-00000000000f", "role": "authenticated"}', true);
select throws_ok(
  $$ select public.publish_site('[]', '{}') $$,
  '42501', null, 'an inactive editor with publish permission cannot publish'
);

select * from finish();
rollback;
