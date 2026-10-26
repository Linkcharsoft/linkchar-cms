---
'@linkcharsoft/cms': minor
---

`prefixDefaultLocale: true` in `defineCmsConfig` gives the default locale its prefix too: `/es/blog/casa` and `/en/blog/house`, the home at `/es` and `/en`, for sites whose pages live under `app/[lang]`. `entryPath`, `entryUrls`, `slugPrefixFor`, `publishUrls`, `alternates`, the sitemap, the panel preview and the redirects of `publish_site` all follow it; the database needs no migration. With the option on, `defineCmsConfig` rejects patterns that start with a locale code (`/es/estudio` would end up as `/es/es/estudio`).

To update a project: nothing; without the option every URL stays as it was. A live site that turns it on publishes every page and document again: each publish leaves the 301 from the unprefixed URL.
