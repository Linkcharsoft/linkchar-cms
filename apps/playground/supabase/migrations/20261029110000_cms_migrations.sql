-- The migrations a database has applied, for `linkchar-cms doctor` to compare with the package's through PostgREST.
-- plpgsql, so the function is created even where the migrations table appears later than this file.
create function public.cms_migrations ()
returns setof text
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  return query select version from supabase_migrations.schema_migrations order by version;
end
$$;

revoke execute on function public.cms_migrations () from public, anon, authenticated;
grant execute on function public.cms_migrations () to service_role;
