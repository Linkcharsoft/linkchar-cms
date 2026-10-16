---
'@linkcharsoft/cms': minor
---

Editor panel, theme and texts.

- `@linkcharsoft/cms/panel`: the whole panel from Hologramas: overview, pages and collections, the editor (autosave with merge, conflicts, history, preview, a language selector for translated texts), media library, publishing, trash, account with two-step verification, users, activity, guided tours and the help menu. `@linkcharsoft/cms/panel/routes/*` are route factories that take the project's `cms` instance; `createCmsClient` mounts the panel providers (PrimeReact unstyled with its passthrough, toasts, confirmation, motion).
- `linkchar-cms routes [--check]` writes the panel wiring under `basePath` (screens, layouts, handlers, `src/cms/actions.ts`), scaffolds the root layout and `src/cms/client.ts` once, and checks the proxy matcher. `cms.proxy` keeps signed-out users on the sign-in screens.
- Theme: `@linkcharsoft/cms/tailwind` preset with `cms-*` tokens derived from `--cms-primary`, `--cms-sidebar` and `--cms-on-primary` through `color-mix()`, fixed neutrals and states, fonts by variable; `@linkcharsoft/cms/panel/styles.css`.
- Texts: the panel, statuses, roles, activity and tours in the `es` and `en` catalogs (`panelLocale`), overridable with `messages`; tour ids are neutral (`welcome`, `pages`, `page-editor`…).
- Config: configurable panel segments (`paths`, Spanish by default), `site: { url, titleTemplate }` and `extensions` (menu items with the project's own screens or links).
- Project field kinds register their panel input in `createCmsClient({ inputs })`; built-in kinds keep their inputs in the panel, out of the core.
- Draft Mode handlers (`cms.handlers.draft`, `disableDraft`) for the panel preview; `formatDate` in the site time zone.
