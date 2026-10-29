---
'@linkcharsoft/cms': minor
---

The invitation and recovery emails land on a page with a button instead of a route handler that spent the token on arrival: mail scanners open links before people do, and the token was gone by the time they pressed it. The page explains what the link does, "Continuar" verifies the token (the new `confirmLink` action) and goes on to the invitation or new-password form; a spent or broken link is explained on the same page. `linkchar-cms routes` replaces `auth/confirm/route.ts` with `(auth)/auth/confirm/page.tsx` and adds the action; the handler `cms.handlers.authConfirm` keeps working for a project that has not regenerated its routes.

To update a project: run `linkchar-cms routes` (and commit the generated files); the email templates do not change.
