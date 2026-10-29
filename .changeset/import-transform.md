---
'@linkcharsoft/cms': minor
---

`createImportSession().transform({ entry, map, dryRun })` rewrites every document of an entry through the same validation and save as an import (RLS, activity log, conflicts): `map(data, { id, slug })` returns the data to save or `null` to leave the document alone, and the report lists `changed`, `unchanged` and the `invalid` documents, which keep their stored data. It is the way to move stored values when a field changes kind (a `select` that becomes `color()`); the README has the recipe under "Changing a field's kind".

To update a project: nothing.
