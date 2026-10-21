---
'@linkcharsoft/cms': patch
---

The package's `redirect()` calls type-check in projects with `typedRoutes: true`: they used to fail the project's `tsc` because the paths were plain strings.
