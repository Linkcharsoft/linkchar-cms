begin;
create extension if not exists pgtap with schema extensions;

select plan(10);

insert into auth.users (id, email, raw_user_meta_data) values
  ('60000000-0000-0000-0000-00000000000a', 'admin-usage@test.local', '{"name": "Admin"}'),
  ('60000000-0000-0000-0000-00000000000c', 'editor-usage@test.local', '{"name": "Editor"}');
update public.profiles set role = 'admin' where id = '60000000-0000-0000-0000-00000000000a';

insert into public.media (id, path, mime, size) values
  ('60000000-0000-0000-0000-0000000000e1', 'mu/campo.webp', 'image/webp', 100),
  ('60000000-0000-0000-0000-0000000000e2', 'mu/texto.webp', 'image/webp', 100),
  ('60000000-0000-0000-0000-0000000000e3', 'mu/publicada.webp', 'image/webp', 100),
  ('60000000-0000-0000-0000-0000000000e4', 'mu/libre.webp', 'image/webp', 100);

insert into public.documents (id, type, key, data) values
  ('60000000-0000-0000-0000-0000000000d1', 'mu.page', 'mu.page',
    '{"hero": {"title": "Hola", "image": "60000000-0000-0000-0000-0000000000e1"}, "seo": {}}'),
  ('60000000-0000-0000-0000-0000000000d2', 'mu.posts', null,
    '{"title": "Nota", "body": {"type": "doc", "content": [{"type": "image", "attrs": {"src": "x", "mediaId": "60000000-0000-0000-0000-0000000000e2"}}]}}'),
  ('60000000-0000-0000-0000-0000000000d3', 'mu.posts', null, '{"title": "Sin foto"}');
insert into public.published_documents (id, type, data) values
  ('60000000-0000-0000-0000-0000000000d3', 'mu.posts', '{"title": "Con foto", "cover": "60000000-0000-0000-0000-0000000000e3"}');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "60000000-0000-0000-0000-00000000000c", "role": "authenticated"}', true);

select results_eq(
  $$ select document_id, keys, published from public.media_usage(array['60000000-0000-0000-0000-0000000000e1'::uuid]) $$,
  $$ values ('60000000-0000-0000-0000-0000000000d1'::uuid, array['hero'], false) $$,
  'a field inside a page section is found with its section'
);
select results_eq(
  $$ select document_id from public.media_usage(array['60000000-0000-0000-0000-0000000000e2'::uuid]) $$,
  $$ values ('60000000-0000-0000-0000-0000000000d2'::uuid) $$,
  'an image inside rich text is found'
);
select results_eq(
  $$ select document_id, published from public.media_usage(array['60000000-0000-0000-0000-0000000000e3'::uuid]) $$,
  $$ values ('60000000-0000-0000-0000-0000000000d3'::uuid, true) $$,
  'the published copy counts even when the draft dropped it'
);
select is_empty(
  $$ select 1 from public.media_usage(array['60000000-0000-0000-0000-0000000000e4'::uuid]) $$,
  'an unused file has no usages'
);
select throws_ok(
  $$ update public.media set deleted_at = now() where id = '60000000-0000-0000-0000-0000000000e1' $$,
  'CM003', null, 'a file in use cannot go to the trash'
);
select lives_ok(
  $$ update public.media set deleted_at = now() where id = '60000000-0000-0000-0000-0000000000e4' $$,
  'an unused file goes to the trash'
);

select set_config('request.jwt.claims', '{"sub": "60000000-0000-0000-0000-00000000000a", "role": "authenticated"}', true);
select throws_ok(
  $$ delete from public.media where id = '60000000-0000-0000-0000-0000000000e3' $$,
  'CM003', null, 'a file in use cannot be deleted'
);
select lives_ok(
  $$ delete from public.media where id = '60000000-0000-0000-0000-0000000000e4' $$,
  'an unused file can be deleted'
);
update public.media set alt = '{"es": "Nuevo"}' where id = '60000000-0000-0000-0000-0000000000e1';
select is(
  (select alt from public.media where id = '60000000-0000-0000-0000-0000000000e1'), '{"es": "Nuevo"}'::jsonb,
  'other edits of a file in use still work'
);

set local role anon;
select throws_ok(
  $$ select public.media_usage(array['60000000-0000-0000-0000-0000000000e1'::uuid]) $$,
  '42501', null, 'visitors cannot ask where files are used'
);

select * from finish();
rollback;
