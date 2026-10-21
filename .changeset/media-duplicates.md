---
'@linkcharsoft/cms': minor
---

Uploading a file that is already in the library says so ("Ya existe en la librería como …") and offers that file instead of a copy, or "Subir igual". The panel hashes the file as picked (SHA-256) and asks the new action `findMediaByHash`; `registerMedia` stores the hash in the new nullable column `media.hash`. Files uploaded before this release have no hash and are never matched.

To update a project: run `linkchar-cms migrations sync` and `supabase db push` (new migration `20261023000000_media_hash.sql` and pgTAP suite `media_hash.test.sql`), and `linkchar-cms routes` so `src/cms/actions.ts` exports `findMediaByHash`.
