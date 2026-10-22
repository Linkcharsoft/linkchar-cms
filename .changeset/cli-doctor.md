---
'@linkcharsoft/cms': minor
---

`linkchar-cms doctor [--config] [--src] [--dir] [--env-file .env.local]` checks a project in one go and exits with 1 on a failure: the config loads, panel routes and proxy, migrations and email templates are up to date (the `--check` of each command), the Supabase variables and `site.url` are set, Supabase answers with the package tables and a superadmin, the GitHub Packages token and pnpm's `minimumReleaseAgeExclude` are there, and, on Windows, no Supabase port falls in a range the system reserves (ports at 49152 and above get a warning: Windows can reserve them after a restart).
