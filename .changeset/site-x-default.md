---
'@linkcharsoft/cms': minor
---

`site.xDefault` picks the locale hreflang's `x-default` points to in `cms.site.metadata()`, the sitemap and `alternates()`. It defaults to `defaultLocale`, which is the language editors write first (required alt texts, the original above each translation); a site written in Spanish whose foreign visitors should land in English sets `site: { xDefault: 'en' }`. `defineCmsConfig` rejects a locale that is not in `locales`.

To update a project: nothing.
