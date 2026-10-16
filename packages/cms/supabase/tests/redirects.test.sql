begin;
create extension if not exists pgtap with schema extensions;

select plan(16);

insert into auth.users (id, email) values
  ('30000000-0000-0000-0000-00000000000c', 'publisher-red@test.local'),
  ('30000000-0000-0000-0000-00000000000e', 'editor-red@test.local');

update public.profiles set can_publish = true where id = '30000000-0000-0000-0000-00000000000c';

insert into public.documents (id, type, slug, data) values
  ('30000000-0000-0000-0000-0000000000d1', 'red.posts', 'a', '{"title": "A"}'),
  ('30000000-0000-0000-0000-0000000000d2', 'red.posts', 'nuevo', '{"title": "Nuevo"}');

insert into public.published_documents (id, type, slug, data) values
  ('30000000-0000-0000-0000-0000000000d1', 'red.posts', 'a', '{"title": "A"}');

create function pg_temp.publish (doc uuid, prefix text default '/red/')
returns jsonb language sql as $$
  select public.publish_site(
    jsonb_build_array(jsonb_strip_nulls(jsonb_build_object('id', d.id, 'revision', d.revision, 'redirectPrefix', prefix))),
    '{}'
  )
  from public.documents d where d.id = doc
$$;

create function pg_temp.redirects ()
returns table (from_path text, to_path text, status smallint) language sql as $$
  select r.from_path, r.to_path, r.status from public.redirects r where r.from_path like '/red/%' order by r.from_path
$$;

grant execute on all functions in schema pg_temp to authenticated;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "30000000-0000-0000-0000-00000000000c", "role": "authenticated"}', true);

select lives_ok($$ select pg_temp.publish('30000000-0000-0000-0000-0000000000d2') $$, 'first publication of a document');
select is_empty($$ select * from pg_temp.redirects() $$, 'a first publication creates no redirect');

reset role;
update public.documents set slug = 'b' where id = '30000000-0000-0000-0000-0000000000d1';
set local role authenticated;

select is(
  (select published_slug from public.document_status where id = '30000000-0000-0000-0000-0000000000d1'),
  'a',
  'the status view exposes the live slug while the new one is pending'
);
select is(
  (select (pg_temp.publish('30000000-0000-0000-0000-0000000000d1') ->> 'redirects')::int),
  1,
  'publishing a new slug reports one redirect'
);
select results_eq(
  $$ select * from pg_temp.redirects() $$,
  $$ values ('/red/a', '/red/b', 301::smallint) $$,
  'the old URL redirects to the new one with a 301'
);

reset role;
update public.documents set slug = 'c' where id = '30000000-0000-0000-0000-0000000000d1';
set local role authenticated;
select pg_temp.publish('30000000-0000-0000-0000-0000000000d1');

select results_eq(
  $$ select from_path, to_path from pg_temp.redirects() $$,
  $$ values ('/red/a', '/red/c'), ('/red/b', '/red/c') $$,
  'chains are flattened to the latest URL'
);

reset role;
update public.documents set slug = 'a' where id = '30000000-0000-0000-0000-0000000000d1';
set local role authenticated;
select pg_temp.publish('30000000-0000-0000-0000-0000000000d1');

select results_eq(
  $$ select from_path, to_path from pg_temp.redirects() $$,
  $$ values ('/red/b', '/red/a'), ('/red/c', '/red/a') $$,
  'going back to an old slug removes its redirect and leaves no loop'
);

reset role;
update public.documents set slug = 'd' where id = '30000000-0000-0000-0000-0000000000d1';
set local role authenticated;

select throws_ok(
  $$ select pg_temp.publish('30000000-0000-0000-0000-0000000000d1', 'https://evil.com/') $$,
  '22023', null, 'an external prefix is rejected'
);
select throws_ok(
  $$ select pg_temp.publish('30000000-0000-0000-0000-0000000000d1', '//evil.com/') $$,
  '22023', null, 'a protocol-relative prefix is rejected'
);
select is(
  (select slug from public.published_documents where id = '30000000-0000-0000-0000-0000000000d1'),
  'a',
  'a rejected redirect publishes nothing'
);

reset role;
update public.documents set slug = 'x/../y' where id = '30000000-0000-0000-0000-0000000000d1';
set local role authenticated;

select throws_ok(
  $$ select pg_temp.publish('30000000-0000-0000-0000-0000000000d1') $$,
  '22023', null, 'a malformed slug cannot become a redirect'
);

reset role;
update public.documents set slug = 'e' where id = '30000000-0000-0000-0000-0000000000d1';
set local role authenticated;

select lives_ok(
  $$ select pg_temp.publish('30000000-0000-0000-0000-0000000000d1', null) $$,
  'without a prefix the document still publishes'
);
select is(
  (select count(*) from pg_temp.redirects() where to_path = '/red/e'),
  0::bigint,
  'and no redirect is created'
);

reset role;
insert into public.documents (id, type, slug, data)
values ('30000000-0000-0000-0000-0000000000d3', 'red.posts', 'c', '{"title": "Otro con el slug viejo"}');
set local role authenticated;

select lives_ok(
  $$ select pg_temp.publish('30000000-0000-0000-0000-0000000000d3') $$,
  'a new document can take a URL that still had a redirect'
);
select results_eq(
  $$ select from_path, to_path from pg_temp.redirects() $$,
  $$ values ('/red/b', '/red/a') $$,
  'and that redirect is dropped so it does not hide the new page'
);

reset role;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "30000000-0000-0000-0000-00000000000e", "role": "authenticated"}', true);
update public.redirects set to_path = '/hackeado' where from_path = '/red/b';
reset role;

select is(
  (select to_path from public.redirects where from_path = '/red/b'),
  '/red/a',
  'an editor cannot change an existing redirect'
);

select * from finish();
rollback;
