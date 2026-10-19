begin;
create extension if not exists pgtap with schema extensions;

select plan(5);

insert into auth.users (id, email, raw_user_meta_data) values
  ('70000000-0000-0000-0000-00000000000c', 'editor-docusage@test.local', '{"name": "Editor"}');

insert into public.documents (id, type, key, data) values
  ('70000000-0000-0000-0000-0000000000a1', 'du.team', null, '{"name": "Ana"}'),
  ('70000000-0000-0000-0000-0000000000a2', 'du.team', null, '{"name": "Sin uso"}'),
  ('70000000-0000-0000-0000-0000000000d1', 'du.posts', null,
    '{"title": "Nota", "author": "70000000-0000-0000-0000-0000000000a1"}'),
  ('70000000-0000-0000-0000-0000000000d2', 'du.page', 'du.page',
    '{"team": {"members": ["70000000-0000-0000-0000-0000000000a1"]}}'),
  ('70000000-0000-0000-0000-0000000000d3', 'du.posts', null, '{"title": "Otra"}');
insert into public.published_documents (id, type, data) values
  ('70000000-0000-0000-0000-0000000000d3', 'du.posts', '{"title": "Otra", "author": "70000000-0000-0000-0000-0000000000a1"}'),
  ('70000000-0000-0000-0000-0000000000a1', 'du.team', '{"name": "Ana", "self": "70000000-0000-0000-0000-0000000000a1"}');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "70000000-0000-0000-0000-00000000000c", "role": "authenticated"}', true);

select results_eq(
  $$ select document_id, keys, published from public.document_usage(array['70000000-0000-0000-0000-0000000000a1'::uuid])
     where not published order by document_id $$,
  $$ values ('70000000-0000-0000-0000-0000000000d1'::uuid, array['author'], false),
            ('70000000-0000-0000-0000-0000000000d2'::uuid, array['team'], false) $$,
  'drafts that pick a document are found, with the keys that hold it'
);
select results_eq(
  $$ select document_id from public.document_usage(array['70000000-0000-0000-0000-0000000000a1'::uuid]) where published $$,
  $$ values ('70000000-0000-0000-0000-0000000000d3'::uuid) $$,
  'the published copy counts even when the draft dropped it'
);
select is_empty(
  $$ select 1 from public.document_usage(array['70000000-0000-0000-0000-0000000000a1'::uuid])
     where document_id = '70000000-0000-0000-0000-0000000000a1' $$,
  'a document never counts as using itself'
);
select is_empty(
  $$ select 1 from public.document_usage(array['70000000-0000-0000-0000-0000000000a2'::uuid]) $$,
  'an unused document has no usages'
);

set local role anon;
select throws_ok(
  $$ select public.document_usage(array['70000000-0000-0000-0000-0000000000a1'::uuid]) $$,
  '42501', null, 'visitors cannot ask where documents are used'
);

select * from finish();
rollback;
