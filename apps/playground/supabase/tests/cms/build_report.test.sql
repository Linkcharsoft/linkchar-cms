begin;
create extension if not exists pgtap with schema extensions;

select plan(5);

insert into public.publish_log (id, documents_count, removed_count, items, build_status)
overriding system value
values (90001, 1, 0, '[]', 'building');

select has_column('public', 'publish_log', 'build_stamp', 'publish_log keeps the stamp the built site serves');
select has_column('public', 'publish_log', 'built_at', 'publish_log keeps when the build ended');
select columns_are('public', 'publish_log', array[
  'id', 'requested_by', 'requested_at', 'documents_count', 'removed_count', 'items', 'build_status', 'job_id',
  'finished_at', 'error_code', 'error_detail', 'retry_of', 'build_stamp', 'built_at', 'app_id', 'branch', 'region', 'commit'
], 'publish_log has the columns the build report writes');

-- The build reports with the secret key

set local role service_role;

select lives_ok(
  $$ update public.publish_log
     set build_status = 'built', build_stamp = 'd1.main.7', built_at = now(), job_id = '7', app_id = 'd1', branch = 'main',
       region = 'us-east-1', commit = 'abc'
     where id = 90001 $$,
  'build:report --ok leaves the publish built, with its job and stamp'
);
select throws_ok(
  $$ update public.publish_log set build_status = 'deploying' where id = 90001 $$,
  '23514', null, 'an unknown build status is refused'
);

select * from finish();
rollback;
