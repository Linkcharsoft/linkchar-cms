---
'@linkcharsoft/cms': minor
---

`createCmsServer({ logger })` takes where the server reports the failures it swallows (best-effort writes, the build hook, activity rows): `{ error(message, detail?) }`, the console by default. The context carries it as `ctx.logger`, publish targets receive it in their trigger context, and `logActivity` now takes the context instead of a client.

To update a project: nothing, unless it builds contexts or publish targets by hand; those get `logger` as a new field.
