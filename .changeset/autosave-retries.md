---
'@linkcharsoft/cms': patch
---

A save that failed (no network, a server error) is tried again on its own after 3, 6, 12 and 24 seconds, and the status shows "No se pudo guardar" with a "Reintentar" button meanwhile; before, nothing happened until the editor typed again. The status also stops reading every "Cambios sin guardar" and "Guardando…" to screen readers: only the outcome of a save is announced.

To update a project: nothing.
