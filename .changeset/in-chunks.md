---
'@linkcharsoft/cms': patch
---

Documents of a large collection no longer lose their images. `cms.site.listDocuments()` asked for the media of the whole page in one `in()`, which supabase-js sends as the query string of a GET: past about 280 ids (a collection of 21 documents with logos, covers, videos with posters and galleries) the Supabase gateway answered `414 URI too long`, the readers took the empty answer as "no rows" and every image, video and PDF of the page resolved to `null` while the build passed. The readers, `getMediaByIds`, the poster lookups, the missing-content check, the relation labels, the publish screens, the import and `media:pull` now read ids in chunks of 100 (`inChunks` in `@linkcharsoft/cms/core`), and a reference read that fails makes the site readers throw instead of rendering a page without its media.

To update a project: `pnpm up @linkcharsoft/cms@0.19.1`; nothing else. A project that paginated `listDocuments` to work around it can drop the workaround.
