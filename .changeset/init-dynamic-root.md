---
'@linkcharsoft/cms': patch
---

`linkchar-cms init` recognizes a site whose root layout lives under a dynamic segment (`app/[lang]/layout.tsx`): it no longer writes `app/(site)/`, whose `[...notFound]` catch-all next to `[lang]` broke `next build` ("different slug names for the same dynamic path"). It sets `prefixDefaultLocale: true` in the new `cms.config.ts` and lists where `DraftRefresh` and the catch-all go.

To update a project: nothing. A project that ran `init` 0.9.0 with an `app/[lang]` root deletes `src/app/(site)/`.
