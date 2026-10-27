---
'@linkcharsoft/cms': patch
---

The route handlers of the panel (email confirmation, sign-out, Draft Mode on and off) built their redirects from `request.url`, which behind a proxy such as Amplify Hosting carries the internal host: invitation and recovery links sent the browser to `https://localhost:3000/...`. They now answer with a relative `Location`, so the browser stays on the host it asked.

To update a project: update the package; the generated routes stay the same.
