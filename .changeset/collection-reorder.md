---
'@linkcharsoft/cms': patch
---

Manual order of an `orderable` collection: each row has "Subir" and "Bajar" buttons next to the drag handle, so the order can be changed from the keyboard; a refused save puts the rows back in their previous order instead of leaving the screen out of sync with the server; manual order shows 100 items per page (`ORDERABLE_PAGE_SIZE`) and says "Se reordena dentro de esta página…" when there are more; and while a search, a status filter or another sort hides the handle, the list says why and offers "Ver en orden manual". `listCollection` now returns `pageSize`.

To update a project: nothing.
