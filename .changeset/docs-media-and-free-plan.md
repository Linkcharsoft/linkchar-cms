---
'@linkcharsoft/cms': patch
---

The README now says how to show a decorative image (keep its alt text in Media and render `alt=''` for that use), where the project's own videos go (`public/` or a CDN, not Media), and that a route with `dynamicParams = false` still previews a document never published, since Draft Mode renders a slug outside `generateStaticParams`. The deploy guide has a Free plan section: the plan's limits, what breaks while a free Supabase project is paused, and a daily keepalive query, since the weekly build is not enough to keep it awake.

To update a project: nothing.
