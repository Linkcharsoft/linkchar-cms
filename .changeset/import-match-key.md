---
'@linkcharsoft/cms': minor
---

An import finds a collection document after editors renamed its slug. `upsert(entry, { data, match: { key } })` stores the script's `key` with the document (in `documents.key`, the column singletons use) and looks it up by that key before the slug; a document found by slug adopts the key the script passes. The result gains `matchedBy` (`'id' | 'key' | 'slug'`, null when created). The CLI ends with what it updated and created, and warns about every document created in a collection that already had documents, naming what it looked for (`givxo (slug not found)`); `--no-create` (`create: false` in `createImportSession`) makes `upsert` throw instead of creating. Before, a seed whose slug an editor had shortened in the panel created a second, visible document and nothing said so.

To update a project: add `match: { key: '…' }` to every `upsert` of a collection document in the import script (the next run adopts the keys), and check the run's closing lines for unexpected creations.
