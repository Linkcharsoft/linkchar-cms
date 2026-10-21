---
'@linkcharsoft/cms': minor
---

A document that missing content keeps out of the publication now reads "Incompleto" instead of "Listo para publicar" or "Cambios sin publicar": in the editor header, in the collection tables (with its own filter), in the pages list and in the overview. New in `@linkcharsoft/cms/core`: `DocumentDisplayStatusType`, `displayStatus(status, incomplete)` and `isDisplayStatus`. `CollectionItemType.status`, `PageListItemType.status` and `CollectionQueryType.status` take the display status, and `getDocumentState` returns `incomplete`. Filtering a table by "Incompleto", "Listo para publicar" or "Cambios sin publicar" reads up to 200 candidates and pages them in memory, because the database view doesn't know about missing content.
