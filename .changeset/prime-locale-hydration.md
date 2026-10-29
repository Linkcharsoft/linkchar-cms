---
'@linkcharsoft/cms': patch
---

The panel applies PrimeReact's language before its first render in the browser, so a dropdown with a clear icon no longer logs a hydration mismatch ("Limpiar" on the server, "Clear" on the client) in development.

To update a project: nothing.
