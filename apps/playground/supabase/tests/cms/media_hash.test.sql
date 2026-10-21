begin;
create extension if not exists pgtap with schema extensions;

select plan(6);

insert into auth.users (id, email, raw_user_meta_data) values
  ('61000000-0000-0000-0000-00000000000c', 'editor-hash@test.local', '{"name": "Editor"}');

select has_column('public', 'media', 'hash', 'media keeps the hash of the uploaded bytes');
select has_index('public', 'media', 'media_hash_idx', 'the hash is indexed for the duplicate lookup');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "61000000-0000-0000-0000-00000000000c", "role": "authenticated"}', true);

select lives_ok(
  $$ insert into public.media (path, mime, size, hash) values ('mh/foto.webp', 'image/webp', 100, repeat('ab', 32)) $$,
  'an editor registers a file with its hash'
);
select lives_ok(
  $$ insert into public.media (path, mime, size) values ('mh/sin.pdf', 'application/pdf', 100) $$,
  'the hash is optional: files uploaded before it have none'
);
select throws_ok(
  $$ insert into public.media (path, mime, size, hash) values ('mh/raro.webp', 'image/webp', 100, 'xyz') $$,
  '23514', null,
  'only a hex SHA-256 is accepted'
);
select throws_ok(
  $$ update public.media set hash = repeat('cd', 32) where path = 'mh/foto.webp' $$,
  '42501', null,
  'the hash never changes once registered'
);

select * from finish();
rollback;
