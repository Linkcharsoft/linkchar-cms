---
'@linkcharsoft/cms': patch
---

The Supabase keepalive reads three times a day (`17 */8 * * *`) instead of every three days. A free project whose keepalive had run green every three days, with a 200 and a row each time, was paused anyway: Supabase counts database activity over the week and asks for a few requests each day. `doctor` now expects a green run in the last 24 hours instead of four days. A run takes a few seconds but GitHub bills each one as a minute, so the workflow costs about 90 Actions minutes a month per project.

To update a project: `pnpm up @linkcharsoft/cms@0.19.3`, then `linkchar-cms routes` rewrites `.github/workflows/supabase-keepalive.yml` (it carries the marker); commit it. A paused project comes back with Restore in the Supabase dashboard first.
