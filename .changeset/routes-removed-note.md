---
'@linkcharsoft/cms': patch
---

`linkchar-cms routes` says, when it deletes a route the package no longer generates, that `.next/types` keeps a validator for it until `next typegen` or `next build` runs, which is why `tsc --noEmit` fails right after.

To update a project: nothing.
