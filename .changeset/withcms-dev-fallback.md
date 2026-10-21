---
'@linkcharsoft/cms': patch
---

`withCms` keeps `next dev` running when the published redirects cannot be read (the local Supabase is off): it warns and starts without them. A production build still fails, as before.
