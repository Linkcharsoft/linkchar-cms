begin;
create extension if not exists pgtap with schema extensions;

select plan(13);

insert into auth.users (id, email) values ('80000000-0000-0000-0000-00000000000c', 'publisher-slugs@test.local');
update public.profiles set can_publish = true where id = '80000000-0000-0000-0000-00000000000c';

insert into public.documents (id, type, key, slug, slugs, data) values
  ('80000000-0000-0000-0000-0000000000d1', 'ls.posts', null, 'casa', '{"es": "casa", "en": "house"}', '{"title": "Casa"}'),
  ('80000000-0000-0000-0000-0000000000d2', 'ls.posts', null, 'otra', '{"es": "otra", "en": "house"}', '{"title": "Otra"}'),
  ('80000000-0000-0000-0000-0000000000d3', 'ls.projects', null, 'norte', '{"es": "norte", "en": "north"}', '{"name": "Norte"}'),
  ('80000000-0000-0000-0000-0000000000d4', 'ls.about', 'ls.about', null, '{}', '{"title": "Estudio"}');

create function pg_temp.publish (doc uuid, urls jsonb)
returns jsonb language sql as $$
  select public.publish_site(jsonb_build_array(jsonb_build_object('id', d.id, 'revision', d.revision, 'urls', urls)), '{}')
  from public.documents d where d.id = doc
$$;

create function pg_temp.blog () returns jsonb language sql as $$
  select '{"es": {"prefix": "/ls/", "primary": true}, "en": {"prefix": "/en/ls/", "primary": false}}'::jsonb
$$;

create function pg_temp.redirects ()
returns table (from_path text, to_path text) language sql as $$
  select r.from_path, r.to_path from public.redirects r where r.from_path like '%/ls/%' or r.from_path like '/ls-%' order by r.from_path
$$;

-- The DETAIL of a taken slug or URL, as JSON.
create function pg_temp.publish_detail (doc uuid, urls jsonb)
returns jsonb language plpgsql as $$
declare detail text;
begin
  perform pg_temp.publish(doc, urls);
  return null;
exception when unique_violation then
  get stacked diagnostics detail = pg_exception_detail;
  return detail::jsonb;
end
$$;

grant execute on all functions in schema pg_temp to authenticated;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "80000000-0000-0000-0000-00000000000c", "role": "authenticated"}', true);

select pg_temp.publish('80000000-0000-0000-0000-0000000000d1', pg_temp.blog());
select is(
  (select paths from public.published_documents where id = '80000000-0000-0000-0000-0000000000d1'),
  '{"es": "/ls/casa", "en": "/en/ls/house"}'::jsonb,
  'publishing keeps the URL of each locale'
);

select throws_ok(
  $$ select pg_temp.publish('80000000-0000-0000-0000-0000000000d2', pg_temp.blog()) $$,
  '23505', null, 'a slug taken in one locale of the collection blocks the publish'
);
select is(
  pg_temp.publish_detail('80000000-0000-0000-0000-0000000000d2', pg_temp.blog()),
  '{"id": "80000000-0000-0000-0000-0000000000d2", "takenBy": "80000000-0000-0000-0000-0000000000d1", "locale": "en", "value": "house"}'::jsonb,
  'the error names the document that holds the slug'
);

reset role;
update public.documents set slugs = '{"es": "casa", "en": "home"}' where id = '80000000-0000-0000-0000-0000000000d1';
set local role authenticated;

select is(
  (select array[status, slugs ->> 'en', published_slugs ->> 'en'] from public.document_status where id = '80000000-0000-0000-0000-0000000000d1'),
  array['changed', 'home', 'house'],
  'a new slug in one locale is a pending change, and the view shows both'
);
select is(
  (select (pg_temp.publish('80000000-0000-0000-0000-0000000000d1', pg_temp.blog()) ->> 'redirects')::int),
  1,
  'only the locale whose slug changed gets a redirect'
);
select results_eq(
  $$ select * from pg_temp.redirects() $$,
  $$ values ('/en/ls/house', '/en/ls/home') $$,
  'the old English URL redirects to the new one'
);

select lives_ok(
  $$ select pg_temp.publish('80000000-0000-0000-0000-0000000000d3', '{"es": {"prefix": "/ls-proyectos/", "primary": true}, "en": {"prefix": "/en/ls-projects/", "primary": false}}') $$,
  'another collection publishes under its own prefix'
);

reset role;
insert into public.documents (id, type, slug, slugs, data)
values ('80000000-0000-0000-0000-0000000000d5', 'ls.other', 'norte', '{"es": "norte"}', '{"title": "Choca"}');
set local role authenticated;

select throws_ok(
  $$ select pg_temp.publish('80000000-0000-0000-0000-0000000000d5', '{"es": {"prefix": "/ls-proyectos/", "primary": true}}') $$,
  '23505', null, 'two entries cannot end on the same URL'
);

select pg_temp.publish('80000000-0000-0000-0000-0000000000d4', '{"es": {"path": "/ls-estudio"}, "en": {"path": "/en/ls-studio"}}');

reset role;
update public.documents set data = '{"title": "Estudio Norte"}' where id = '80000000-0000-0000-0000-0000000000d4';
set local role authenticated;

select pg_temp.publish('80000000-0000-0000-0000-0000000000d4', '{"es": {"path": "/ls-nosotros"}, "en": {"path": "/en/ls-studio"}}');
select results_eq(
  $$ select from_path, to_path from public.redirects where from_path = '/ls-estudio' $$,
  $$ values ('/ls-estudio', '/ls-nosotros') $$,
  'a page whose URL changed redirects from the old one'
);

select throws_ok(
  $$ select pg_temp.publish('80000000-0000-0000-0000-0000000000d4', '{"es": {"path": "https://evil.com"}}') $$,
  '22023', null, 'a page URL must be a path on the site'
);

select throws_ok(
  $$ select pg_temp.publish('80000000-0000-0000-0000-0000000000d4', '{"es-": {"path": "/x"}}') $$,
  '22023', null, 'locales are checked'
);

select lives_ok(
  $$ select pg_temp.publish('80000000-0000-0000-0000-0000000000d3', '{"es": {"prefix": "/es/ls-proyectos/", "primary": true}, "en": {"prefix": "/en/ls-projects/", "primary": false}}') $$,
  'the default locale can carry its own prefix (prefixDefaultLocale)'
);
select results_eq(
  $$ select from_path, to_path from public.redirects where to_path like '/es/ls-proyectos/%' $$,
  $$ values ('/ls-proyectos/norte', '/es/ls-proyectos/norte') $$,
  'turning the prefix on redirects the unprefixed URL on the next publish'
);

select * from finish();
rollback;
