---
'@linkcharsoft/cms': minor
---

`cms.site.sitemap()` dates a page by the newest of its own publish and the last publish of the entries its sections declare in `uses`: a blog page listing posts changes `lastModified` with each new post, a home showing services with each service. Still one query.
