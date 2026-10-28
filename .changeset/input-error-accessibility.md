---
'@linkcharsoft/cms': minor
---

Field errors are tied to their inputs for assistive technology: the message `InputContainer` shows has an id, the package's inputs list it in `aria-describedby` while it shows and set `aria-invalid`, switches show the required asterisk and their own error, the "Borrar la búsqueda" icon of search boxes is a real button, and the character counter has a spoken "12 de 80 caracteres". `errorId(name)` is exported from `@linkcharsoft/cms/panel` for project inputs.

To update a project: nothing; a project input may add `errorId(name)` to its `aria-describedby`.
