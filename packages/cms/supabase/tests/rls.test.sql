begin;
create extension if not exists pgtap with schema extensions;

select plan(43);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'superadmin@test.local', '{"name": "Super"}'),
  ('00000000-0000-0000-0000-00000000000b', 'admin@test.local', '{"name": "Admin"}'),
  ('00000000-0000-0000-0000-00000000000c', 'editor@test.local', '{"name": "Editor"}'),
  ('00000000-0000-0000-0000-00000000000d', 'editor2@test.local', '{"name": "Editor 2"}'),
  ('00000000-0000-0000-0000-00000000000e', 'inactive@test.local', '{"name": "Inactivo"}'),
  ('00000000-0000-0000-0000-00000000000f', 'sneaky@test.local', '{"name": "Sneaky", "role": "superadmin"}');

update public.profiles set role = 'superadmin' where id = '00000000-0000-0000-0000-00000000000a';
update public.profiles set role = 'admin' where id = '00000000-0000-0000-0000-00000000000b';
update public.profiles set active = false where id = '00000000-0000-0000-0000-00000000000e';

insert into public.documents (id, type, key, data)
values ('00000000-0000-0000-0000-0000000000d1', 'rls.home', 'rls.home', '{"hero": {"title": "Borrador"}}');
insert into public.published_documents (id, type, key, data)
values ('00000000-0000-0000-0000-0000000000d1', 'rls.home', 'rls.home', '{"hero": {"title": "Publicado"}}');
insert into public.document_versions (document_id, data, reason)
values ('00000000-0000-0000-0000-0000000000d1', '{}', 'publish');
insert into public.redirects (from_path, to_path) values ('/viejo', '/nuevo');
insert into public.media (path, mime, size) values ('visible.webp', 'image/webp', 100);
insert into public.media (path, mime, size, deleted_at) values ('papelera.webp', 'image/webp', 100, now());
insert into public.activity_log (user_id, action) values ('00000000-0000-0000-0000-00000000000b', 'login');
insert into public.publish_log (requested_by) values ('00000000-0000-0000-0000-00000000000b');

-- Profiles are created by the auth trigger, always as editor

select is((select count(*) from public.profiles where id::text like '00000000-0000-0000-0000-00000000000_'), 6::bigint, 'every auth user gets a profile');
select is(
  (select role from public.profiles where id = '00000000-0000-0000-0000-00000000000f'),
  'editor'::public.app_role,
  'user metadata cannot grant a role'
);
select is(
  (select name from public.profiles where id = '00000000-0000-0000-0000-00000000000c'),
  'Editor',
  'profile name comes from user metadata'
);

-- Anonymous

set local role anon;

select throws_ok('select * from public.documents', '42501', null, 'anon cannot read drafts');
select throws_ok('select * from public.document_versions', '42501', null, 'anon cannot read versions');
select throws_ok('select * from public.profiles', '42501', null, 'anon cannot read profiles');
select throws_ok('select * from public.activity_log', '42501', null, 'anon cannot read the activity log');
select throws_ok('select * from public.publish_log', '42501', null, 'anon cannot read the publish log');
select results_eq(
  $$ select data #>> '{hero,title}' from public.published_documents where id = '00000000-0000-0000-0000-0000000000d1' $$,
  $$ values ('Publicado') $$,
  'anon reads published content'
);
select isnt_empty('select * from public.redirects', 'anon reads redirects');
select results_eq(
  $$ select path from public.media where path in ('visible.webp', 'papelera.webp') $$,
  $$ values ('visible.webp') $$,
  'anon reads only media outside the trash'
);
select throws_ok(
  $$ insert into public.documents (type, key) values ('rls.blog', 'rls.blog') $$,
  '42501', null, 'anon cannot create drafts'
);
select throws_ok(
  $$ insert into public.published_documents (id, type, data) values (gen_random_uuid(), 'rls.home', '{}') $$,
  '42501', null, 'anon cannot publish'
);
select throws_ok(
  $$ insert into public.redirects (from_path, to_path) values ('/a', '/b') $$,
  '42501', null, 'anon cannot create redirects'
);
select throws_ok(
  $$ insert into public.media (path, mime, size) values ('x.webp', 'image/webp', 1) $$,
  '42501', null, 'anon cannot register media'
);
select throws_ok(
  $$ insert into storage.objects (bucket_id, name) values ('media', 'anon.webp') $$,
  '42501', null, 'anon cannot upload to the media bucket'
);

reset role;

-- Editor

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-00000000000c", "role": "authenticated"}', true);

select results_eq(
  $$ select data #>> '{hero,title}' from public.documents where id = '00000000-0000-0000-0000-0000000000d1' $$,
  $$ values ('Borrador') $$,
  'editor reads drafts'
);
select lives_ok(
  $$ insert into public.documents (type, key, data) values ('rls.servicios', 'rls.servicios', '{}') $$,
  'editor creates drafts'
);
select lives_ok(
  $$ update public.documents set data = '{"hero": {"title": "Editado"}}' where id = '00000000-0000-0000-0000-0000000000d1' $$,
  'editor edits drafts'
);
select is(
  (select revision from public.documents where id = '00000000-0000-0000-0000-0000000000d1'),
  2,
  'editing content bumps the revision'
);
select lives_ok(
  $$ delete from public.documents where id = '00000000-0000-0000-0000-0000000000d1' $$,
  'editor hard delete runs without error'
);
select is((select count(*) from public.profiles), 1::bigint, 'editor only sees their own profile');
select lives_ok(
  $$ update public.profiles set name = 'Editor renombrado' where id = '00000000-0000-0000-0000-00000000000c' $$,
  'editor edits their own name'
);
select throws_ok(
  $$ update public.profiles set role = 'admin' where id = '00000000-0000-0000-0000-00000000000c' $$,
  '42501', null, 'editor cannot change their own role'
);
select throws_ok(
  $$ update public.profiles set can_publish = true where id = '00000000-0000-0000-0000-00000000000c' $$,
  '42501', null, 'editor cannot grant themselves publishing'
);
select lives_ok(
  $$ update public.profiles set role = 'admin', name = 'Hacked' where id = '00000000-0000-0000-0000-00000000000d' $$,
  'editor update on another profile runs without error'
);
select is_empty('select * from public.activity_log', 'editor cannot read the activity log');
select throws_ok(
  $$ insert into public.published_documents (id, type, data) values (gen_random_uuid(), 'rls.home', '{}') $$,
  '42501', null, 'editor cannot write published content directly'
);
select throws_ok(
  $$ insert into public.publish_log (documents_count) values (1) $$,
  '42501', null, 'editor cannot write the publish log'
);
select lives_ok(
  $$ insert into storage.objects (bucket_id, name) values ('media', 'editor.webp') $$,
  'editor uploads to the media bucket'
);

reset role;

select is(
  (select count(*) from public.documents where id = '00000000-0000-0000-0000-0000000000d1'),
  1::bigint,
  'editor hard delete had no effect'
);
select results_eq(
  $$ select role::text, name from public.profiles where id = '00000000-0000-0000-0000-00000000000d' $$,
  $$ values ('editor', 'Editor 2') $$,
  'editor cannot manage other users'
);

-- Inactive editor

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-00000000000e", "role": "authenticated"}', true);

select is_empty('select * from public.documents', 'inactive user cannot read drafts');
select throws_ok(
  $$ insert into public.documents (type, key) values ('rls.blog', 'rls.blog') $$,
  '42501', null, 'inactive user cannot create drafts'
);

reset role;

-- Admin

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-00000000000b", "role": "authenticated"}', true);

select is((select count(*) from public.profiles where id::text like '00000000-0000-0000-0000-00000000000_'), 6::bigint, 'admin lists every profile');
select lives_ok(
  $$ update public.profiles set can_publish = true where id = '00000000-0000-0000-0000-00000000000d' $$,
  'admin grants publishing to an editor'
);
select lives_ok(
  $$ update public.profiles set role = 'admin' where id = '00000000-0000-0000-0000-00000000000d' $$,
  'admin promotes an editor to admin'
);
select throws_ok(
  $$ update public.profiles set role = 'superadmin' where id = '00000000-0000-0000-0000-00000000000c' $$,
  '42501', null, 'admin cannot promote to superadmin'
);
select throws_ok(
  $$ update public.profiles set active = false where id = '00000000-0000-0000-0000-00000000000a' $$,
  '42501', null, 'admin cannot deactivate a superadmin'
);
select throws_ok(
  $$ update public.profiles set active = false where id = '00000000-0000-0000-0000-00000000000b' $$,
  '42501', null, 'admin cannot deactivate themselves'
);
select isnt_empty('select * from public.activity_log', 'admin reads the activity log');

reset role;

-- Superadmin

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-00000000000a", "role": "authenticated"}', true);

select lives_ok(
  $$ update public.profiles set role = 'superadmin' where id = '00000000-0000-0000-0000-00000000000d' $$,
  'superadmin promotes to superadmin'
);

reset role;

select results_eq(
  $$ select role::text, can_publish from public.profiles where id = '00000000-0000-0000-0000-00000000000d' $$,
  $$ values ('superadmin', true) $$,
  'role changes by admins and superadmins are persisted'
);

select * from finish();
rollback;
