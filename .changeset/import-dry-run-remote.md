---
'@linkcharsoft/cms': patch
---

`import --dry-run` reads a hosted Supabase without `--allow-remote`, on purpose: it writes nothing, and the plan is what one wants to see against production before deciding. It now ends with `Nothing was written (--dry-run).`, and the README and `--help` say which flag means what.

To update a project: nothing.
