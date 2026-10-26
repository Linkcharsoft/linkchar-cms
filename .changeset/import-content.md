---
'@linkcharsoft/cms': minor
---

Content imports, for projects that migrate from Strapi or from content in code. `linkchar-cms import <script.ts> --email … [--otp …] [--no-publish]` loads the project's script with jiti (with its `tsconfig` paths, outside Next) and runs its default export with a session signed in as that panel user, so every write goes through RLS and the activity log. The session (`createImportSession` from `@linkcharsoft/cms/import`, a new export without `server-only`) has `media()`, which processes images like the panel's uploader (upright, without metadata, within 2560 px, WebP, blur preview, SHA-256 dedupe), `upsert()`, which writes a page, singleton or collection document and finds it again by its default-locale slug (new documents go visible, at the end of the list), and `publish()`, which publishes everything the import touched in one build and lists the documents still missing content. `sharp` is a new optional peer dependency, only for importing images. The server also exports `addDocument`, `createDocument` without the redirect.

To update a project: nothing. To import images, `pnpm add -D sharp`; the password goes in `CMS_IMPORT_PASSWORD`.
