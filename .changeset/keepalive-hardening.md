---
'@linkcharsoft/cms': patch
---

The generated keepalive workflow runs with `permissions: {}` and `timeout-minutes: 5`: a cron job needs no token and must not hang.

To update a project: `linkchar-cms routes` rewrites `.github/workflows/supabase-keepalive.yml` (it carries the marker); commit it.
