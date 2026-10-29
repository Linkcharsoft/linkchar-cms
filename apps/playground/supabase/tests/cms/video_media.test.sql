begin;
create extension if not exists pgtap with schema extensions;

select plan(9);

insert into auth.users (id, email, raw_user_meta_data) values
  ('62000000-0000-0000-0000-00000000000c', 'editor-video@test.local', '{"name": "Editor"}');

select results_eq(
  $$ select file_size_limit, 'video/mp4' = any(allowed_mime_types) and 'video/webm' = any(allowed_mime_types) from storage.buckets where id = 'media' $$,
  $$ values (52428800::bigint, true) $$,
  'the media bucket takes mp4 and webm up to 50 MB'
);
select has_column('public', 'media', 'duration', 'media keeps the duration of a video');
select has_column('public', 'media', 'poster_id', 'media keeps the poster of a video');

insert into public.media (id, path, mime, size, alt) values
  ('62000000-0000-0000-0000-0000000000e1', 'vm/clip.mp4', 'video/mp4', 2000, '{}'),
  ('62000000-0000-0000-0000-0000000000e2', 'vm/poster.webp', 'image/webp', 100, '{"es": "Portada"}');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "62000000-0000-0000-0000-00000000000c", "role": "authenticated"}', true);

select lives_ok(
  $$ insert into public.media (path, mime, size, duration, width, height) values ('vm/otro.mp4', 'video/mp4', 2000, 12.5, 1280, 720) $$,
  'an editor registers a video with its duration'
);
select throws_ok(
  $$ insert into public.media (path, mime, size, duration) values ('vm/neg.mp4', 'video/mp4', 2000, -1) $$,
  '23514', null,
  'a negative duration is refused'
);
select lives_ok(
  $$ update public.media set poster_id = '62000000-0000-0000-0000-0000000000e2' where id = '62000000-0000-0000-0000-0000000000e1' $$,
  'an editor sets the poster of a video'
);
select throws_ok(
  $$ update public.media set deleted_at = now() where id = '62000000-0000-0000-0000-0000000000e2' $$,
  'CM003', null,
  'the poster of a live video can''t go to the trash'
);
select lives_ok(
  $$ update public.media set deleted_at = now() where id = '62000000-0000-0000-0000-0000000000e1' $$,
  'the video itself can go to the trash'
);
select lives_ok(
  $$ update public.media set deleted_at = now() where id = '62000000-0000-0000-0000-0000000000e2' $$,
  'once the video is in the trash its poster can follow'
);

select * from finish();
rollback;
