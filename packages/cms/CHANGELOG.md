# @linkcharsoft/cms

## 0.4.0

### Minor Changes

- 6ae2596: Links and buttons point to pages and documents of the site. A new link type, `entry`, stores the schema entry, the document id for collections and an optional section anchor (`{ type: 'entry', entry: 'posts', id, anchor }`), so the site resolves it to the right URL in every language and removing the document warns about the link. It is the default type of new links; paths typed by hand stay valid as "Other address" (`type: 'internal'`) and are not translated. In the panel, "Site page" picks the page or searches the collection, and lists the page's sections to land on.
- 27187ed: Entry paths per locale. `path` takes one pattern for every locale or one per locale (`{ es: '/proyectos/:slug', en: '/projects/:slug' }`); locales other than the default one get their prefix (`/en/projects/house`). `defineCmsConfig` checks the patterns: one per locale, `:slug` only at the end of collection paths, no two entries on one URL. New helpers in `@linkcharsoft/cms/core`: `entryPath`, `entryUrls`, `slugsOf`, `slugPrefixFor`, `publishUrls`, `localePrefix`, `alternates` and `absoluteUrl`. They replace `resolveEntryPath` and `slugPrefix`, which are removed. The editor preview and the Google preview now follow the language being edited.
- 068f5cc: Slugs and URLs per locale. Documents keep `slugs` (`{ es: 'casa', en: 'house' }`) next to `slug`, which stays as the default locale's copy; published documents also keep `paths`, the live URL of each locale. `publish_site` takes `urls` per locale instead of `redirectPrefix`, refuses a slug taken in the same collection and locale or a URL taken by another document, and leaves a 301 for every locale whose URL changed, pages included. Saving checks the slug of every locale like the default one: an automatic slug that another document has gets a free variant, one typed by hand stays as it was and the field says so. Duplicating finds a free slug in every locale. Documents published before this keep their redirects: the default locale's old URL comes from `slug`.
  
  To update a project: run `linkchar-cms migrations sync` and `supabase db push` (new migration `20261022000000_locale_slugs.sql` and pgTAP suite `locale_slugs.test.sql`).
- 968906b: The publish list names what is missing per language ("Title (English)") and the alt texts missing in another language for the files a document uses, which now keep it out of the publication too. Pending changes carry `missing` (data path, locale and label of each item), `urls` (the document's URL per locale) and `urlChanges` (one per locale whose live URL changes) instead of `redirectPrefix` and `urlChange`.
- b603513: Rich text images keep only their media id: the URL, size and alt text come from Media when the text is read, so fixing an alt text in Media fixes it in every article and in every language, and a new Supabase URL doesn't break them. Images without a media id are dropped when the text is saved again. Rich text links can point to a page or document of the site, like link fields ("Site page" or "Other address" in the link dialog). The images and linked documents of a text count as its references: Media's "Where it's used", the usage warnings and the alt texts missing in another language include them. New dependency: `@tiptap/extension-link`.
- 3bdf637: Site readers. The project's `cms` instance now has `cms.site`, typed from the schema and read per locale: `getEntryContent(id, { locale })` for pages and singletons, `getDocumentBySlug`, `listDocuments` and `getDocuments` for collections, `staticParams` for `generateStaticParams`, `sitemap()` with every published URL and its languages, and `metadata(document)` / `jsonLd(document)` for `generateMetadata` and schema.org. Content comes ready to render: images with their alt text in the locale, links and buttons with their URL in the locale, rich text with its images and links resolved. In Draft Mode with a panel session the readers return drafts; otherwise they read the published copy without touching cookies, so pages stay static. New entry point `@linkcharsoft/cms/site` with `<RichText>`, `<JsonLd>`, `imageProps` for next/image and the site types. Collections take `sitemap: { priority, changeFrequency }` or `false`.
- 04fef8f: `withCms(nextConfig)` from the new entry point `@linkcharsoft/cms/next`: adds the package to `transpilePackages`, allows images from the project's Supabase bucket (and from a local Supabase), and adds the 301s that publishing leaves to `redirects()`, read once per build with the public key. A build fails if the redirects can't be read; `withCms(config, { redirects: false })` skips them.

### Patch Changes

- d068236: Dependencies: `motion` 14, `driver.js` 1.10, Tiptap 3.32 and `primelocale` 2.6. Peer ranges are unchanged.
- 47e8fcb: Removing an item others use now warns. Sending a document to the trash lists the items that pick it, and the publish screen names the live pages that still use an item leaving the site, unless they leave too or go out without it in the same publish. New SQL function `document_usage` (same search as `media_usage`) and server action `getDocumentUsage`.
  
  To update a project: run `linkchar-cms migrations sync` and `supabase db push` (new migration `20261021000100_document_usage.sql` and pgTAP suite `document_usage.test.sql`), and `linkchar-cms routes` so `src/cms/actions.ts` exports `getDocumentUsage`.
- 5c7b075: A user sent back from a screen their role can't open lands on the overview with a notice ("You don't have access to that screen") instead of no explanation. `requireRole` now redirects to the panel home with `?error=sin-permiso`.
- b757471: With the local mock build, publishing revalidates the running site's pages, so `next start` shows what was just published without a new build. Publish targets can opt in with `revalidateOnPublish`.
- 2c92edd: Accessibility fixes found with axe, now checked by the E2E suite: dropdowns hide their native select and their trigger from screen readers (the focusable input already names them), switches no longer nest a checkbox role around the switch input, the page outline title reaches AA contrast, and the account button, heading buttons and numbered list button include their visible text in their accessible name.
- 6769ed7: The header shows "Publishing" and the new pending count after a project's first publish too; it used to keep the old values until the build finished.
- 0156649: Relation fields end their suggestion list with a "Create …" option named after the search, so the list no longer hides the way to add a new item while typing.
- 165146b: A failed build can be retried: the latest publish shows "Retry" when its build failed, for users who can publish. The retry runs the build again over what is already live, in its own `publish_log` row (`retry_of`), and is logged as `site.retry`. New server action `retryPublish`.
  
  To update a project: run `linkchar-cms migrations sync` and `supabase db push` (new migration `20261021000000_publish_retry.sql`), and `linkchar-cms routes` so `src/cms/actions.ts` exports `retryPublish`.
- 4103c2a: The rich text toolbar shows its bold, italic and underline buttons again: they used icons PrimeIcons 7 doesn't have and rendered empty. They now show "B", "I" and "U" in their own format, like the strikethrough "S".
- 7fae71f: A URL another document already uses no longer throws away the rest of the save. When the URL follows the title, the editor gets a free one ("casa-2"); when it was typed by hand, everything else is saved, the field keeps its "already in use" error and the save status says "Saved, except the URL". `saveDocument` returns `adjusted` and `errors` on a `saved` result for these cases.

## 0.3.0

### Minor Changes

- 55c2bf5: Editor panel, theme and texts.
  
  - `@linkcharsoft/cms/panel`: the whole panel from Hologramas: overview, pages and collections, the editor (autosave with merge, conflicts, history, preview, a language selector for translated texts), media library, publishing, trash, account with two-step verification, users, activity, guided tours and the help menu. `@linkcharsoft/cms/panel/routes/*` are route factories that take the project's `cms` instance; `createCmsClient` mounts the panel providers (PrimeReact unstyled with its passthrough, toasts, confirmation, motion).
  - `linkchar-cms routes [--check]` writes the panel wiring under `basePath` (screens, layouts, handlers, `src/cms/actions.ts`), scaffolds the root layout and `src/cms/client.ts` once, and checks the proxy matcher. `cms.proxy` keeps signed-out users on the sign-in screens.
  - Theme: `@linkcharsoft/cms/tailwind` preset with `cms-*` tokens derived from `--cms-primary`, `--cms-sidebar` and `--cms-on-primary` through `color-mix()`, fixed neutrals and states, fonts by variable; `@linkcharsoft/cms/panel/styles.css`.
  - Texts: the panel, statuses, roles, activity and tours in the `es` and `en` catalogs (`panelLocale`), overridable with `messages`; tour ids are neutral (`welcome`, `pages`, `page-editor`…).
  - Config: configurable panel segments (`paths`, Spanish by default), `site: { url, titleTemplate }` and `extensions` (menu items with the project's own screens or links).
  - Project field kinds register their panel input in `createCmsClient({ inputs })`; built-in kinds keep their inputs in the panel, out of the core.
  - Draft Mode handlers (`cms.handlers.draft`, `disableDraft`) for the panel preview; `formatDate` in the site time zone.

## 0.2.0

### Minor Changes

- Database and publishing.
  
  - `@linkcharsoft/cms/server`: the Supabase queries and actions for documents, versions, trash, media, publishing, users, account and sign-in. Each takes the config and clients through a context; `createCmsServer` binds them to Next (cookies, redirects, revalidation) from the project's own environment. Errors are catalog keys (`errors.*`), never prose.
  - `PublishTarget` with `@linkcharsoft/cms/publish/amplify` (build hook + EventBridge webhook, matching an unknown job only to an open publish of the last 30 minutes, failures stored as `error_code`) and `@linkcharsoft/cms/publish/mock` for local development.
  - `publishTarget` moved from `defineCmsConfig` to `createCmsServer`: the config is imported by the browser and must not carry secrets.
  - Base migration `20261020000000_cms_base.sql` (alt text and caption per locale in `media`) and the generic pgTAP suites, copied into a project with `linkchar-cms migrations sync`.
  - Form validators for sign-in, account and users that return catalog messages, shared by the panel and the server.

## 0.1.0

### Minor Changes

- First release: the CMS core, extracted from Hologramas.
  
  - `defineCmsConfig` with the project's types registered through `Register`.
  - Field kinds on a registry (`defineField`): one place per kind for its default, validation, references, diff summary, localization and input. Projects add their own; `openingHours` is opt-in.
  - Validation without Yup: issue codes translated by the catalogs, plus per-field `validate` and `component`.
  - Catalogs (`es`, `en`) with `t()` and `Intl.PluralRules`; schema labels accept a text, `{ es, en }` or `msg()`.
  - Localized values: one value per locale for texts, inherited images with per-locale overrides, `resolveContent` for the site and `missingTranslations` for publishing.
