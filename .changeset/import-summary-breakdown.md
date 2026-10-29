---
'@linkcharsoft/cms': minor
---

The import's closing lines say how it found what it updated (`15 updated (14 by key, 1 by slug, 1 key adopted)`), so the first run after adding `match: { key }` shows the keys being adopted instead of needing a query on `documents.key`, and list the hidden documents of the collections it wrote that it never touched and nobody published: a draft someone started in the panel under the same name is the duplicate the import can't see. `summary()` is now async and returns `matched`, `adopted` and `untouched` next to `created` and `updated`.

To update a project: a script that calls `summary()` awaits it; nothing else.
