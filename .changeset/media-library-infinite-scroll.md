---
'@linkcharsoft/cms': patch
---

The media library and the picker load the next page as the end of the list comes into view; "Cargar más" stays as a fallback. A search that fails no longer leaves the loader spinning: it shows "No pudimos cargar los archivos." with "Reintentar". A response that arrives after a newer search is ignored instead of replacing its results, and the picker shows a skeleton grid during its first load instead of a blank area. The number of results is announced to screen readers ("45 archivos") from a text outside the grid, instead of reading the whole grid on every change.

To update a project: nothing.
