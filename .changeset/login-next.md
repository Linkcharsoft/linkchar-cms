---
'@linkcharsoft/cms': patch
---

A signed-out visit to a panel screen (an expired session, a link someone shared) comes back to that screen after signing in: the proxy sends the browser to `login?next=/dashboard/paginas/home?locale=en` and the sign-in screen, and the second step when the user has two-step verification, follow it. `next` is accepted only when it is a panel path on the same origin and not a guest screen (`safePanelPath` in `@linkcharsoft/cms/core`); anything else lands on the panel home as before.

To update a project: nothing; the proxy and the generated routes are the same.
