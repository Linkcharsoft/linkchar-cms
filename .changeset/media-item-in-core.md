---
'@linkcharsoft/cms': patch
---

`mediaItemFrom` (a `media` row into a `MediaItemType`) now lives in `@linkcharsoft/cms/core` with the structural `MediaRowLikeType`, so the site readers no longer import a value from the server layer. `@linkcharsoft/cms/server` keeps exporting it.
