---
'@linkcharsoft/cms': minor
---

Site readers. The project's `cms` instance now has `cms.site`, typed from the schema and read per locale: `getEntryContent(id, { locale })` for pages and singletons, `getDocumentBySlug`, `listDocuments` and `getDocuments` for collections, `staticParams` for `generateStaticParams`, `sitemap()` with every published URL and its languages, and `metadata(document)` / `jsonLd(document)` for `generateMetadata` and schema.org. Content comes ready to render: images with their alt text in the locale, links and buttons with their URL in the locale, rich text with its images and links resolved. In Draft Mode with a panel session the readers return drafts; otherwise they read the published copy without touching cookies, so pages stay static. New entry point `@linkcharsoft/cms/site` with `<RichText>`, `<JsonLd>`, `imageProps` for next/image and the site types. Collections take `sitemap: { priority, changeFrequency }` or `false`.
