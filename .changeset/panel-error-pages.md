---
'@linkcharsoft/cms': minor
---

`linkchar-cms routes` now writes the panel's own `error.tsx` and `not-found.tsx` under `(panel)`, plus a `[...notFound]` catch-all in the workspace: a screen that throws shows "Algo salió mal" with "Probar de nuevo" inside the panel layout instead of the site's `global-error`, and an unknown panel URL or a missing document shows "No encontramos esta pantalla" with a link to the overview instead of Next's bare 404. The editors (pages, documents, site entries) get their own `loading.tsx` with a skeleton of labels and inputs; the lists keep the table rows. `@linkcharsoft/cms/panel/routes/{error,not-found,loading-editor}` are the new route modules.

To update a project: `linkchar-cms routes` (it adds the files; `routes --check` fails until then).
