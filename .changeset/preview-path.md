---
'@linkcharsoft/cms': minor
---

Entries that live inside another page can be previewed: `previewPath: '/'` (with `anchor`) on a singleton or page tells the panel where to open the preview without giving the entry a URL of its own, so several entries may share it and it never reaches the sitemap, the redirects or `publish_site`. `defineCmsConfig` checks it like a path, except for uniqueness.
