---
'@linkcharsoft/cms': minor
---

Publicar lets the user choose which changes go out: every change the publish can take has a checkbox, ticked by default, with "Marcar todos" / "Desmarcar todos" per group. Leaving one out updates the button, the confirmation and the warnings: a picked item that was unticked ("'Reseñas' (categoría) no está marcado para publicar") or a live page that keeps using a removed item because its fix was unticked. Pending changes carry `pendingRefs` and `fixedUsers` for that, and `selectionWarnings(change, selected, t)` in `@linkcharsoft/cms/core` computes the warnings of a selection.
