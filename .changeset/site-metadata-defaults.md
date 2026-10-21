---
'@linkcharsoft/cms': minor
---

Site defaults for page metadata: `site.defaults: { entry, description?, image? }` in `defineCmsConfig` names text/textarea and image fields of a page or singleton (typed against the schema, checked when the config is defined). When a page's SEO leaves the description or the share image empty, `cms.site.metadata()` takes them from those fields in the page's language, as drafts in Draft Mode. The page's own values always win, and the defaults entry is read only when there is a gap.

`cms.site.metadata()` is now async.

To update a project: `generateMetadata` that returns `cms.site.metadata(...)` keeps working; code that spreads or edits its result needs `await` first. A project that added its own defaults (e.g. a `withSiteDefaults` wrapper) can replace it with `site.defaults`.
