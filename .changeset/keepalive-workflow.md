---
'@linkcharsoft/cms': minor
---

`linkchar-cms routes` (and `init`) writes `.github/workflows/supabase-keepalive.yml`: a GitHub Actions cron every three days that reads `published_documents` with the repository variables `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` (the ones the CI build already uses) and fails when the answer is not 200, so a free Supabase project never reaches the week without requests after which it pauses. The file carries the package's marker and `--check` reports it like a route; a file without the marker belongs to the project. `doctor` warns while the workflow is missing. How long ago the database was last reached is not measured: the keepalive's read leaves no trace in any table.

To update a project: run `linkchar-cms routes` and commit the workflow; set `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` as repository variables if the CI does not have them yet.
