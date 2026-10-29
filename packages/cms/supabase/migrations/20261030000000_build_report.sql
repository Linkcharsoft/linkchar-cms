-- The site's build reports itself (linkchar-cms build:report): the Amplify job that took the publish, the stamp
-- the built runtime serves, and `built` between the build's end and the deploy the panel confirms by that stamp.
alter table public.publish_log
  drop constraint publish_log_build_status_check,
  add constraint publish_log_build_status_check
    check (build_status in ('pending', 'building', 'built', 'success', 'failed')),
  add column build_stamp text,
  add column built_at timestamptz,
  add column app_id text,
  add column branch text,
  add column region text,
  add column commit text;

drop index public.publish_log_active_idx;
create index publish_log_active_idx on public.publish_log (requested_at)
  where build_status in ('pending', 'building', 'built');
