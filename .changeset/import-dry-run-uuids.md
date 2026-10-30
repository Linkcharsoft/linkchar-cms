---
'@linkcharsoft/cms': patch
---

The dry run of an import gives what it would create a placeholder UUID instead of `dry-run-<entry>-N`. A new collection document is validated before the plan, and the media and relation fields take only UUIDs, so a first seed that linked a file it uploads or a document it creates in the same run (`cover: { es: file.id }`, `category: category.id`) failed with "Archivo inválido" or "Referencia inválida" before showing anything. The plan is unchanged; `summary().created[].id` and the ids `upsert()` and `media()` answer are UUIDs nothing is stored under.

To update a project: nothing, unless a script told the placeholders apart by their `dry-run-` prefix; `created: true` and `summary().dryRun` say the same.
