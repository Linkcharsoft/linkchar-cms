---
'@linkcharsoft/cms': minor
---

A `select` shown as cards takes CSS grid lines in its mosaic previews: a cell's `column` and `row` accept what `grid-column` and `grid-row` take (`'1 / 4'`, `'2 / span 2'`) besides a line number with `columnSpan` and `rowSpan`. `defineCmsConfig` still rejects a cell outside its grid and now names a line it can't read. `gridLines` and `gridPlacement` are exported from the core for project inputs.

To update a project: nothing.
