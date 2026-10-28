---
'@linkcharsoft/cms': patch
---

In a file's details, a failed "Dónde se usa" lookup shows "No pudimos ver dónde se usa." with "Reintentar" instead of a loader that never ends, and the trash button is enabled (the server still refuses to trash a file in use). The trash and restore button locks while the move runs, so a double click can't send it twice; "Borrar para siempre" confirms with a toast; and a clipboard that refuses to copy the address says so instead of failing silently.

To update a project: nothing.
