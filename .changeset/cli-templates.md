---
'@linkcharsoft/cms': minor
---

`linkchar-cms templates [--config cms.config.ts] [--dir supabase] [--check]` writes the invitation and recovery emails (`supabase/templates/{invite,recovery}.html`) linking to the panel's confirm route under `basePath`, in the panel language (new `emails.*` catalog keys, which `messages` can override), and adds their `[auth.email.template.*]` blocks to `config.toml`. An existing template is the project's and is only checked: `--check` exits with 1 while one is missing or does not link to `<basePath>/auth/confirm`.

To update a project: add `linkchar-cms templates --check` to its check script; the templates it already wrote by hand pass when they link to the confirm route.
