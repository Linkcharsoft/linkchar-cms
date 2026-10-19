---
'@linkcharsoft/cms': minor
---

Entry paths per locale. `path` takes one pattern for every locale or one per locale (`{ es: '/proyectos/:slug', en: '/projects/:slug' }`); locales other than the default one get their prefix (`/en/projects/house`). `defineCmsConfig` checks the patterns: one per locale, `:slug` only at the end of collection paths, no two entries on one URL. New helpers in `@linkcharsoft/cms/core`: `entryPath`, `entryUrls`, `slugsOf`, `slugPrefixFor`, `publishUrls`, `localePrefix`, `alternates` and `absoluteUrl`. They replace `resolveEntryPath` and `slugPrefix`, which are removed. The editor preview and the Google preview now follow the language being edited.
