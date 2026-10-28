---
'@linkcharsoft/cms': patch
---

Relation fields (`relation`, `relations`) and the document picker of links lost their value on a plain focus and blur: PrimeReact's forced selection compared the shown label against an empty list of suggestions and cleared it. They now list the first options as soon as they get the focus (the text is selected, so typing replaces it), keep what the editor types while answers arrive, ignore answers that come back out of order, and on blur put the chosen item back when the typed text matched nothing; an emptied field clears the choice, as before. The document picker says "No hay resultados" when there are none, and the "Nuevo …" button opens the dialog with an empty name instead of the last search.

To update a project: nothing.
