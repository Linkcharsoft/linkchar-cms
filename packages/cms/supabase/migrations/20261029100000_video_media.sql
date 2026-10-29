-- Videos join Media: mp4 and webm up to the 50 MB the Free plan allows per file, with their duration and poster.
update storage.buckets
set
  file_size_limit = 52428800,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif', 'application/pdf', 'video/mp4', 'video/webm']
where id = 'media';

alter table public.media
  add column duration real check (duration is null or duration >= 0),
  add column poster_id uuid references public.media (id) on delete set null;

create index media_poster_idx on public.media (poster_id) where poster_id is not null;

grant insert (duration) on public.media to authenticated;
grant update (poster_id) on public.media to authenticated;

-- An image that is the poster of a live video is in use: it can't go to the trash or be deleted either.
create or replace function private.guard_media_in_use ()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (select 1 from public.media_usage(array[old.id]))
    or exists (select 1 from public.media where poster_id = old.id and deleted_at is null) then
    raise exception 'media % is in use', old.id using errcode = 'CM003';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end
$$;
