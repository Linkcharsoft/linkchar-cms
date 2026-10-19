---
'@linkcharsoft/cms': patch
---

Removing an item others use now warns. Sending a document to the trash lists the items that pick it, and the publish screen names the live pages that still use an item leaving the site, unless they leave too or go out without it in the same publish. New SQL function `document_usage` (same search as `media_usage`) and server action `getDocumentUsage`.

To update a project: run `linkchar-cms migrations sync` and `supabase db push` (new migration `20261021000100_document_usage.sql` and pgTAP suite `document_usage.test.sql`), and `linkchar-cms routes` so `src/cms/actions.ts` exports `getDocumentUsage`.
