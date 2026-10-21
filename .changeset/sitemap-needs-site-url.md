---
'@linkcharsoft/cms': minor
---

`cms.site.sitemap()` now fails with a clear message when the config has no `site.url`. Without it the sitemap came out with relative URLs, which search engines reject, and nothing said so.

To update a project: set `site: { url: 'https://acme.com' }` in `cms.config.ts` (the playground reads it from `NEXT_PUBLIC_SITE_URL`).
