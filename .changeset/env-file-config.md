---
'@linkcharsoft/cms': patch
---

`doctor`, `publish:ping` and `import` hand the env file they read (`--env-file`, or `.env.local` and `.env`) to `cms.config.ts` before loading it, so `site.url` built from `DOMAIN` or `NEXT_PUBLIC_SITE_URL` is the hosted one and the build stamp is asked at the right site; variables already in the shell still win. Both commands print the URL they ask.

To update a project: nothing; exporting `DOMAIN` in the shell before `doctor --env-file .env.remote` is no longer needed.
