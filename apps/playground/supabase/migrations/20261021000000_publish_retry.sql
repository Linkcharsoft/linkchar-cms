-- A retry runs the build again over what is already live: it publishes nothing, so it has its own row.
alter table public.publish_log
  add column retry_of bigint references public.publish_log (id) on delete set null;
