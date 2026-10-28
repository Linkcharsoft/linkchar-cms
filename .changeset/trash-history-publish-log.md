---
'@linkcharsoft/cms': patch
---

The trash is paged (50 per page) and searchable by title instead of capped at 200 rows; "Restaurar" shows a spinner and the row's buttons share one size. The version history loads 50 versions and offers "Cargar más" for older ones, and says "No pudimos cargar el historial." with "Reintentar" instead of spinning forever when the request fails (`listVersions` now returns `{ items, more }` and takes a `before` date). The publish history links to Activity filtered to publishes for admins, its rows say how long a build has been running ("Publicando · hace 7 min") instead of "~5 min", and "Reintentar" is offered for an unconfirmed build and no longer for a publish that failed because no publish target is configured (`retryPublish` follows the same rule).

To update a project: nothing.
