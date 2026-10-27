---
'@linkcharsoft/cms': patch
---

`upsert()` of an import rejected list and block items without a `_key` ("Valor inválido" on every item), which the README never asked for. An item without one now takes the key of the stored item in the same place (of the same block type), or a new one when there is none, so running the import again writes the same JSON and leaves published content unchanged instead of pending. Keys the script sets are kept. Core exports `withItemKeys`.

To update a project: nothing. Scripts that set their own `_key`s keep them.
