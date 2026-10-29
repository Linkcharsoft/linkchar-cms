---
'@linkcharsoft/cms': minor
---

`doctor` checks the migrations a database has applied, not only the files of the project. A migration adds `cms_migrations()`, a function only the secret key may call that lists `supabase_migrations.schema_migrations`; `doctor` calls it through PostgREST, local or hosted (`--env-file`), compares the result with the migrations of the package and of the project's `supabase/migrations`, and fails naming the versions the database lacks with the command that applies them. A database without the function gets a warning that says which migration adds it.

To update a project: `linkchar-cms migrations sync`, then `supabase migration up` locally and `supabase db push` on the hosted project.
