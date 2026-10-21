---
'@linkcharsoft/cms': patch
---

A draft created with "Nuevo …" and never touched disappears after a day: opening a collection list removes its untouched drafts (revision 1, still the schema defaults, never published, picked nowhere), so the lists and Publish stop filling with "Artículo sin título". New query `purgeUntouchedDrafts(entryId)`.
