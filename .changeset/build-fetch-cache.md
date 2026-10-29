---
'@linkcharsoft/cms': patch
---

A static build reads the content published since the previous build. Next keeps the site's reads in `.next/cache/fetch-cache` for a year and Amplify restores that folder before every build, so a build after a publish rendered the content of the build before it. Every read of the server now carries a stamp of the build (`withCms` sets one for the build and its workers), which keys the fetch cache: a build never reuses the entries of another one, and the reads of one build still dedupe within it. `doctor` warns while `amplify.yml` keeps `.next/cache` without dropping `fetch-cache`, and the deploy guide adds the `preBuild` line that drops it, so the cache does not grow with every build. CI proves it: the English build of the playground starts on the fetch cache of the Spanish one after a published row changed, and renders the change.

To update a project: nothing for the fix; add `- rm -rf .next/cache/fetch-cache` to `preBuild` in `amplify.yml` (see docs/deploy.md).
