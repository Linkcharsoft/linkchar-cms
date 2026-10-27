begin;
create extension if not exists pgtap with schema extensions;

select plan(9);

insert into auth.users (id, email, raw_user_meta_data) values
  ('70000000-0000-0000-0000-00000000000a', 'first-admin@test.local', '{"name": "Primera"}');

insert into public.documents (id, type, data, deleted_at) values
  ('70000000-0000-0000-0000-0000000000d1', 'sr.posts', '{"title": "En la papelera"}', now() - interval '60 days');
insert into public.media (id, path, mime, size, deleted_at) values
  ('70000000-0000-0000-0000-0000000000e1', 'sr/vieja.webp', 'image/webp', 100, now() - interval '60 days');
insert into public.activity_log (user_id, action, created_at) values
  ('70000000-0000-0000-0000-00000000000a', 'auth.login', now() - interval '400 days');

-- The secret key: no JWT subject, so only grants (not RLS) decide

set local role service_role;

select is_empty(
  $$ select t, p
     from unnest(array['profiles', 'documents', 'published_documents', 'document_versions', 'redirects', 'media',
       'activity_log', 'publish_log']) t
     cross join unnest(array['select', 'insert', 'update', 'delete']) p
     where not has_table_privilege('service_role', 'public.' || t, p) $$,
  'the secret key reads and writes every table of the package'
);

select results_eq(
  $$ update public.profiles set role = 'superadmin', can_publish = true where id = '70000000-0000-0000-0000-00000000000a'
     returning role::text, can_publish $$,
  $$ values ('superadmin', true) $$,
  'linkchar-cms admin promotes the first superadmin'
);

select results_eq(
  $$ select status from public.document_status where id = '70000000-0000-0000-0000-0000000000d1' $$,
  $$ values ('hidden') $$,
  'the trash purge reads document_status'
);
select lives_ok(
  $$ delete from public.documents where id = '70000000-0000-0000-0000-0000000000d1' $$,
  'the trash purge deletes documents'
);

select results_eq(
  $$ select path from public.media where id = '70000000-0000-0000-0000-0000000000e1' $$,
  $$ values ('sr/vieja.webp') $$,
  'the media purge reads the trash'
);
select lives_ok(
  $$ delete from public.media where id = '70000000-0000-0000-0000-0000000000e1' $$,
  'the media purge deletes media'
);

select lives_ok(
  $$ delete from public.activity_log where created_at < now() - interval '365 days' $$,
  'the activity purge deletes old entries'
);

select lives_ok(
  $$ insert into public.publish_log (requested_by, job_id) values ('70000000-0000-0000-0000-00000000000a', 'sr-job') $$,
  'a retry inserts into publish_log'
);
select results_eq(
  $$ update public.publish_log set build_status = 'success', finished_at = now() where job_id = 'sr-job' returning build_status $$,
  $$ values ('success') $$,
  'the build webhook updates publish_log'
);

select * from finish();
rollback;
