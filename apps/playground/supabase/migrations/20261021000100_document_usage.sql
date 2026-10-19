-- Same search as media_usage: a document is used wherever its id appears in another one's content.
create function public.document_usage (ids uuid[])
returns table (
  target_id uuid,
  document_id uuid,
  type text,
  data jsonb,
  keys text[],
  published boolean,
  trashed boolean
)
language sql
stable
set search_path = ''
as $$
  with targets as (select id, jsonb_build_object('id', id::text) as vars from unnest(ids) as t (id))
  select t.id, d.id, d.type, d.data,
    array(select e.key from jsonb_each(d.data) as e where jsonb_path_exists(e.value, '$.** ? (@ == $id)', t.vars)),
    false, d.deleted_at is not null
  from targets t
  join public.documents d on d.id <> t.id and jsonb_path_exists(d.data, '$.** ? (@ == $id)', t.vars)
  union all
  select t.id, p.id, p.type, p.data,
    array(select e.key from jsonb_each(p.data) as e where jsonb_path_exists(e.value, '$.** ? (@ == $id)', t.vars)),
    true, false
  from targets t
  join public.published_documents p on p.id <> t.id and jsonb_path_exists(p.data, '$.** ? (@ == $id)', t.vars)
$$;

revoke execute on function public.document_usage (uuid[]) from public, anon;
grant execute on function public.document_usage (uuid[]) to authenticated, service_role;
