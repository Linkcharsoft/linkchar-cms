---
'@linkcharsoft/cms': minor
---

Project tables in the Supabase types: a project registers its generated `Database` (its own tables next to the CMS ones) as `Register.database`, and two new server functions use it: `await cms.supabase()`, the request's session client (RLS applies, the same one the panel uses), and `cms.supabaseAdmin()`, the secret-key client for after `requireRole`. The package keeps typing its own queries against its `Database`, so project types that fall behind don't break it. `ProjectDatabaseOf` and `ProjectClientType` are exported from `@linkcharsoft/cms/server`.

To update a project with its own Supabase clients for its tables: register `database: Database` in the `Register` interface next to `config`, use `cms.supabase()` / `cms.supabaseAdmin()` and delete those clients.
