---
'@linkcharsoft/cms': minor
---

New helpers in `@linkcharsoft/cms/core` for what keeps a document out of the publication: `missingContent` lists required values, translations and alt texts with their field and locale (`{ path: 'hero.title.en', field: 'hero.title', locale: 'en', kind: 'field' }`), `splitLocale` separates a data path from its locale, `countByLocale` and `countBySectionAndLocale` count them, and `missingAltLocales` names the locales a media item still lacks an alt text in. The editor and the publish list use the same function, so they always agree.
