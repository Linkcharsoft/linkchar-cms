---
'@linkcharsoft/cms': patch
---

A user sent back from a screen their role can't open lands on the overview with a notice ("You don't have access to that screen") instead of no explanation. `requireRole` now redirects to the panel home with `?error=sin-permiso`.
