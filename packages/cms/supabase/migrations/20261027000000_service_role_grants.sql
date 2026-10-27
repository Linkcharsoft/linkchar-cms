-- Hosted projects created with "Default privileges for new entities" off grant service_role nothing on its own.
grant select, insert, update, delete on
  public.profiles,
  public.documents,
  public.published_documents,
  public.document_versions,
  public.redirects,
  public.media,
  public.activity_log,
  public.publish_log
to service_role;

grant select on public.document_status to service_role;
