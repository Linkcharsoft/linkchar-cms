---
'@linkcharsoft/cms': minor
---

schema.org helpers in `@linkcharsoft/cms/site`: `organization`, `website`, `breadcrumbs`, `blogPosting`, `openingHoursSpecification` (from an `openingHours` value) and `jsonLdGraph`, which joins nodes, arrays and `cms.site.jsonLd()` results in one `@graph`. They take the site's name, origin and locale (`inLanguage`), and leave empty values out.

To update a project: replace its own copies of these helpers with the package's; pass `locale` in the site info (`inLanguage` used to be fixed in the copies).
