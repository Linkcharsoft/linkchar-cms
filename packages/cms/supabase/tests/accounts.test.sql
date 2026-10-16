begin;
create extension if not exists pgtap with schema extensions;

select plan(19);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000a1', 'mfa-admin@test.local', '{"name": "Admin con MFA"}'),
  ('00000000-0000-0000-0000-0000000000a2', 'editor@test.local', '{"name": "Editor"}'),
  ('00000000-0000-0000-0000-0000000000a3', 'pending@test.local', '{"name": "MFA a medio configurar"}');

update public.profiles set role = 'admin' where id = '00000000-0000-0000-0000-0000000000a1';

insert into auth.mfa_factors (id, user_id, friendly_name, factor_type, status, created_at, updated_at) values
  (gen_random_uuid(), '00000000-0000-0000-0000-0000000000a1', 'Celular de Ana', 'totp', 'verified', now(), now()),
  (gen_random_uuid(), '00000000-0000-0000-0000-0000000000a3', 'Celular nuevo', 'totp', 'unverified', now(), now());

insert into public.documents (type, key, data) values ('acc.home', 'acc.home', '{"hero": {"title": "Borrador"}}');
insert into public.activity_log (user_id, action) values ('00000000-0000-0000-0000-0000000000a2', 'auth.login');

select is(
  (select seen_tours from public.profiles where id = '00000000-0000-0000-0000-0000000000a2'),
  '{}'::text[],
  'new profiles have not seen any tour'
);

-- Without MFA nothing changes

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000000a2", "role": "authenticated", "aal": "aal1"}', true);

select isnt_empty('select * from public.documents', 'a user without MFA works with a password-only session');

update public.profiles set seen_tours = array['welcome'] where id = '00000000-0000-0000-0000-0000000000a2';
select is(
  (select seen_tours from public.profiles where id = '00000000-0000-0000-0000-0000000000a2'),
  array['welcome'],
  'users record the tours they saw'
);

update public.profiles set seen_tours = array['welcome'] where id = '00000000-0000-0000-0000-0000000000a1';
select throws_ok(
  $$ update public.profiles set avatar = 'blog/2026/ajena.webp' where id = '00000000-0000-0000-0000-0000000000a2' $$,
  '23514', null, 'the avatar can only point inside the user folder'
);
select lives_ok(
  $$ update public.profiles set avatar = 'avatars/00000000-0000-0000-0000-0000000000a2/11111111-2222-3333-4444-555555555555.webp' where id = '00000000-0000-0000-0000-0000000000a2' $$,
  'an avatar in the own folder is accepted'
);
select throws_ok(
  $$ update public.profiles set seen_tours = array_fill('x'::text, array[21]) where id = '00000000-0000-0000-0000-0000000000a2' $$,
  '23514', null, 'seen tours cannot grow without limit'
);
reset role;
select is(
  (select seen_tours from public.profiles where id = '00000000-0000-0000-0000-0000000000a1'),
  '{}'::text[],
  'nobody marks tours for someone else'
);

-- A half-finished enrollment does not lock the user out

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000000a3", "role": "authenticated", "aal": "aal1"}', true);
select isnt_empty('select * from public.documents', 'an unverified factor does not require the second step');

-- With MFA, a password-only session gets no role

select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000000a1", "role": "authenticated", "aal": "aal1"}', true);

select is_empty('select * from public.documents', 'MFA user at aal1 reads no drafts');
select is_empty('select * from public.activity_log', 'MFA admin at aal1 reads no activity');
select throws_ok(
  $$ insert into public.documents (type, key) values ('acc.blog', 'acc.blog') $$,
  '42501', null, 'MFA user at aal1 cannot create drafts'
);
select is(private.has_role('editor'), false, 'MFA user at aal1 has no role');
select is(private.can_publish(), false, 'MFA admin at aal1 cannot publish');
select isnt_empty(
  $$ select 1 from public.profiles where id = '00000000-0000-0000-0000-0000000000a1' $$,
  'MFA user at aal1 still reads their own profile'
);

update public.profiles set name = 'Cambio sin MFA' where id = '00000000-0000-0000-0000-0000000000a1';
reset role;
select is(
  (select name from public.profiles where id = '00000000-0000-0000-0000-0000000000a1'),
  'Admin con MFA',
  'MFA user at aal1 cannot edit their profile'
);

-- After the second step everything is back

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000000a1", "role": "authenticated", "aal": "aal2"}', true);

select isnt_empty('select * from public.documents', 'MFA user at aal2 reads drafts');
select isnt_empty('select * from public.activity_log', 'MFA admin at aal2 reads activity');
select is(private.has_role('admin'), true, 'MFA admin at aal2 keeps the role');
select is(private.can_publish(), true, 'MFA admin at aal2 can publish');

select * from finish();
rollback;
