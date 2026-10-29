---
'@linkcharsoft/cms': patch
---

Without `--env-file`, `admin`, `doctor`, `import` and `publish:ping` read `.env.local` and then `.env`, as Next does, instead of `.env.local` alone; their messages name the file(s) read, `publish:ping` included when `CMS_BUILD_HOOK_URL` is missing.

To update a project: nothing.
