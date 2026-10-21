-- SHA-256 of the uploaded bytes, so the panel can offer the file that is already in the library instead of a copy.
alter table public.media
  add column hash text check (hash ~ '^[0-9a-f]{64}$');

create index media_hash_idx on public.media (hash) where hash is not null and deleted_at is null;

grant insert (hash) on public.media to authenticated;
