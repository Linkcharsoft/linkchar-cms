---
'@linkcharsoft/cms': patch
---

On a hosted Supabase project created with "Default privileges for new entities" off, the secret key could not read or write any package table: `linkchar-cms admin` failed with "permission denied for table profiles" and left the user as editor, and the build webhook, the publish retry and the trash purges failed the same way. The new migration `20261027000000_service_role_grants.sql` grants `service_role` select, insert, update and delete on the package tables and select on `document_status`; on projects created with the toggle on it changes nothing. The playground and CI now run with `auto_expose_new_tables = false`, and a pgTAP suite (`service_role.test.sql`) covers what the package does with the secret key.

To update a project: `linkchar-cms migrations sync`, then `supabase db push`. If `linkchar-cms admin` failed before, run it again: it promotes the existing user.
