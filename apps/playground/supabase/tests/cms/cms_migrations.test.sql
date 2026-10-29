begin;
create extension if not exists pgtap with schema extensions;

select plan(4);

select has_function('public', 'cms_migrations', 'the applied migrations can be listed');

set local role service_role;

select isnt_empty('select * from public.cms_migrations()', 'the secret key lists the applied migrations');
select results_eq(
  $$ select count(*) from public.cms_migrations() where cms_migrations = '20261029110000' $$,
  $$ values (1::bigint) $$,
  'the list has this migration'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000000a1", "role": "authenticated"}', true);

select throws_ok(
  'select * from public.cms_migrations()',
  '42501',
  'permission denied for function cms_migrations',
  'panel users cannot list the applied migrations'
);

select * from finish();
rollback;
