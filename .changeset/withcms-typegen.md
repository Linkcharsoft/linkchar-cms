---
'@linkcharsoft/cms': patch
---

`withCms` no longer reads the redirects while `next typegen` runs, so `pnpm type-check` (and the pre-commit hook) work with the local Supabase stopped. `next build` still reads them and fails if it can't.
