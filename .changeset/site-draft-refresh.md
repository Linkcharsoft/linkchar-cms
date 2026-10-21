---
'@linkcharsoft/cms': minor
---

`DraftRefresh` in `@linkcharsoft/cms/site`: rendered in Draft Mode, it refreshes the previewed page after each autosave (`cms:refresh`), scrolls to the section being edited (`cms:scroll`) and shows the exit link to `/api/cms/disable-draft`. The link text comes from the package catalogs (`site.draftExit`, `locale` prop) and `label`/`className` replace its text and look.

To update a project: replace its own preview listener with `{(await draftMode()).isEnabled && <DraftRefresh locale={locale} />}` in the site layout.
