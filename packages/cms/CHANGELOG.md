# @linkcharsoft/cms

## 0.8.0

### Minor Changes

- 254ca8a: Project tables in the Supabase types: a project registers its generated `Database` (its own tables next to the CMS ones) as `Register.database`, and two new server functions use it: `await cms.supabase()`, the request's session client (RLS applies, the same one the panel uses), and `cms.supabaseAdmin()`, the secret-key client for after `requireRole`. The package keeps typing its own queries against its `Database`, so project types that fall behind don't break it. `ProjectDatabaseOf` and `ProjectClientType` are exported from `@linkcharsoft/cms/server`.
  
  To update a project with its own Supabase clients for its tables: register `database: Database` in the `Register` interface next to `config`, use `cms.supabase()` / `cms.supabaseAdmin()` and delete those clients.
- 9eef7be: `DraftRefresh` in `@linkcharsoft/cms/site`: rendered in Draft Mode, it refreshes the previewed page after each autosave (`cms:refresh`), scrolls to the section being edited (`cms:scroll`) and shows the exit link to `/api/cms/disable-draft`. The link text comes from the package catalogs (`site.draftExit`, `locale` prop) and `label`/`className` replace its text and look.
  
  To update a project: replace its own preview listener with `{(await draftMode()).isEnabled && <DraftRefresh locale={locale} />}` in the site layout.
- 3fd5632: schema.org helpers in `@linkcharsoft/cms/site`: `organization`, `website`, `breadcrumbs`, `blogPosting`, `openingHoursSpecification` (from an `openingHours` value) and `jsonLdGraph`, which joins nodes, arrays and `cms.site.jsonLd()` results in one `@graph`. They take the site's name, origin and locale (`inLanguage`), and leave empty values out.
  
  To update a project: replace its own copies of these helpers with the package's; pass `locale` in the site info (`inLanguage` used to be fixed in the copies).
- 22fa575: Site defaults for page metadata: `site.defaults: { entry, description?, image? }` in `defineCmsConfig` names text/textarea and image fields of a page or singleton (typed against the schema, checked when the config is defined). When a page's SEO leaves the description or the share image empty, `cms.site.metadata()` takes them from those fields in the page's language, as drafts in Draft Mode. The page's own values always win, and the defaults entry is read only when there is a gap.
  
  `cms.site.metadata()` is now async.
  
  To update a project: `generateMetadata` that returns `cms.site.metadata(...)` keeps working; code that spreads or edits its result needs `await` first. A project that added its own defaults (e.g. a `withSiteDefaults` wrapper) can replace it with `site.defaults`.
- b2ab0c0: `cms.site.sitemap()` dates a page by the newest of its own publish and the last publish of the entries its sections declare in `uses`: a blog page listing posts changes `lastModified` with each new post, a home showing services with each service. Still one query.

## 0.7.2

### Patch Changes

- 0aeb222: The site reads drafts in Draft Mode only for a signed-in, active panel user past the second factor, the same check `/api/cms/draft` makes before enabling the preview. Before, a deactivated user (or one with a revoked session or a pending second factor) whose Draft Mode cookie was still alive kept reading drafts; now they get the published site.
- 96ba1b8: The `focalX`/`focalY` doc of `SiteImageType` now says what they are: a 0–1 ratio (0.5 is the center), as stored and as `imageProps()` reads them. It said 0–100, so code that built `object-position` by hand from it showed the corner of the image.

## 0.7.1

### Patch Changes

- b21af49: The editor shows the "Vista previa" button for an entry that has a `previewPath` but no `path` of its own; 0.7.0 only showed it for entries with a `path`.

## 0.7.0

### Minor Changes

- fdcdd1e: Entries that live inside another page can be previewed: `previewPath: '/'` (with `anchor`) on a singleton or page tells the panel where to open the preview without giving the entry a URL of its own, so several entries may share it and it never reaches the sitemap, the redirects or `publish_site`. `defineCmsConfig` checks it like a path, except for uniqueness.

### Patch Changes

- b2db206: `@tiptap/core` is a declared dependency of the package, so the rich text editor always types against the tiptap version the package ships. A project with an older `@tiptap/core` of its own used to break the package's `RichTextEditor` in `tsc`.
- e8cad00: The package's `redirect()` calls type-check in projects with `typedRoutes: true`: they used to fail the project's `tsc` because the paths were plain strings.
- 7d1537c: `withCms` keeps `next dev` running when the published redirects cannot be read (the local Supabase is off): it warns and starts without them. A production build still fails, as before.

## 0.6.2

### Patch Changes

- ef273b2: `RichText` gave two marked texts in the same paragraph the same React key (the index of their mark instead of their own), so React warned about duplicate keys and could drop or repeat one of them on a re-render. Each text now carries its own key.

## 0.6.1

### Patch Changes

- f4d091b: Documentation release. The README is rewritten by sections for a project adopting 0.6: install with pnpm 12 (pinned version, `minimumReleaseAgeExclude`, the peers and the Tailwind 3 tooling), a schema and config that compile, a Supabase section (migrations, `config.toml` keys, the invitation and recovery email templates the panel needs, the first superadmin, adopting an existing database), `logger` and `build_cancelled` in the server, the site's app structure and `SiteDocumentType`, the playground's color kind verbatim, Amplify setup (EventBridge rule and API destination) and the upgrade steps. `docs/decisions.md` lists the decisions behind the package's shape and `.changeset/README.md` the changeset convention. No code changes.

## 0.6.0

### Minor Changes

- 0690617: A build cancelled in Amplify now ends the publish as failed with its own reason, `build_cancelled` ("La actualización del sitio se canceló antes de terminar."), so the panel offers "Reintentar" instead of leaving it "sin confirmar" for 30 minutes. The webhook used to answer 400 to `CANCELLED` events. `mockBuild({ result: 'cancelled' })` reproduces it locally.
- 83bcaa0: The header's "Publicar" counter shows the changes the next publish takes, like the publish screen; incomplete documents no longer count, and when every pending change is incomplete the button stays secondary and explains it ("2 cambios incompletos: no salen hasta completarlos"). The overview's pending count follows the same rule, and the header refreshes its count each time the editor saves. New query `getPendingCounts()` returning `{ ready, incomplete }`; `getPublishStatus()` returns `{ latest, counts }` instead of `{ latest, pendingCount }`; `DashboardLayout` takes `pendingCounts`.
- 83bcaa0: A document that missing content keeps out of the publication now reads "Incompleto" instead of "Listo para publicar" or "Cambios sin publicar": in the editor header, in the collection tables (with its own filter), in the pages list and in the overview. New in `@linkcharsoft/cms/core`: `DocumentDisplayStatusType`, `displayStatus(status, incomplete)` and `isDisplayStatus`. `CollectionItemType.status`, `PageListItemType.status` and `CollectionQueryType.status` take the display status, and `getDocumentState` returns `incomplete`. Filtering a table by "Incompleto", "Listo para publicar" or "Cambios sin publicar" reads up to 200 candidates and pages them in memory, because the database view doesn't know about missing content.
- 2d3d393: Uploading a file that is already in the library says so ("Ya existe en la librería como …") and offers that file instead of a copy, or "Subir igual"; the upload button waits for that decision. The panel hashes the file as picked (SHA-256) and asks the new action `findMediaByHash`; `registerMedia` stores the hash in the new nullable column `media.hash`. Files uploaded before this release have no hash and are never matched.
  
  To update a project: run `linkchar-cms migrations sync` and `supabase db push` (new migration `20261023000000_media_hash.sql` and pgTAP suite `media_hash.test.sql`), and `linkchar-cms routes` so `src/cms/actions.ts` exports `findMediaByHash`.
- 69fe5a5: Publicar lets the user choose which changes go out: every change the publish can take has a checkbox, ticked by default, with "Marcar todos" / "Desmarcar todos" per group. Leaving one out updates the button, the confirmation and the warnings: a picked item that was unticked ("'Reseñas' (categoría) no está marcado para publicar") or a live page that keeps using a removed item because its fix was unticked. Pending changes carry `pendingRefs` and `fixedUsers` for that, and `selectionWarnings(change, selected, t)` in `@linkcharsoft/cms/core` computes the warnings of a selection.
- 5f2bff1: `createCmsServer({ logger })` takes where the server reports the failures it swallows (best-effort writes, the build hook, activity rows): `{ error(message, detail?) }`, the console by default. The context carries it as `ctx.logger`, publish targets receive it in their trigger context, and `logActivity` now takes the context instead of a client.
  
  To update a project: nothing, unless it builds contexts or publish targets by hand; those get `logger` as a new field.
- fc54172: `cms.site.sitemap()` now fails with a clear message when the config has no `site.url`. Without it the sitemap came out with relative URLs, which search engines reject, and nothing said so.
  
  To update a project: set `site: { url: 'https://acme.com' }` in `cms.config.ts` (the playground reads it from `NEXT_PUBLIC_SITE_URL`).

### Patch Changes

- 4628555: The version history groups versions by day ("Hoy", "Ayer", then the date) in the site's time zone and shows the time of each one, so a long history reads at a glance. New `dayOf(value, timeZone)` in `@linkcharsoft/cms/core`.
- 7061d24: `mediaItemFrom` (a `media` row into a `MediaItemType`) now lives in `@linkcharsoft/cms/core` with the structural `MediaRowLikeType`, so the site readers no longer import a value from the server layer. `@linkcharsoft/cms/server` keeps exporting it.
- bbea0fd: Mi cuenta shows the password rules under the new password field ("Al menos 10 caracteres, con letras y números.") before someone tries one that fails them.
- 1f59a82: On screens narrower than 1280 px the preview opens below the form and scrolls into view, instead of pushing the fields a full screen down in a scaled desktop frame. On wide screens nothing changes: form on the left, preview on the right.
- dd3e686: A draft created with "Nuevo …" and never touched disappears after a day: opening a collection list removes its untouched drafts (revision 1, still the schema defaults, never published, picked nowhere), so the lists and Publish stop filling with "Artículo sin título". New query `purgeUntouchedDrafts(entryId)`.
- e83a0af: The panel starts with a "Saltar al contenido" link, visible when it receives the focus, so keyboard users reach the content without tabbing through the menu. Every panel screen already has the `main` landmark it jumps to.
- 4f2e71f: The overview warns about hidden collection drafts nobody touched for two weeks ("'Casa' lleva 20 días como borrador sin publicar. Publicalo o mandalo a la papelera."), five at most, oldest first. New query `getStaleDrafts(limit)` and alert code `stale`; `overviewAlerts` takes them as its fifth argument.
- 1e2c775: Guided tours no longer start while a field has the focus (typing into a new document used to end up in the guide's popover, and closing it marked the guide as seen). The guide waits for the next screen, and "Ver la guía de esta pantalla" in Ayuda still opens it.
- 1739cdf: `withCms` no longer reads the redirects while `next typegen` runs, so `pnpm type-check` (and the pre-commit hook) work with the local Supabase stopped. `next build` still reads them and fails if it can't.

## 0.5.0

### Minor Changes

- b584b61: Image fields, galleries and rich text say which files still lack their alt text in the language being edited ("The alt text in English is missing."), and "Fill in" opens the file's details on that language's alt text. `MediaDetails` takes `focusLocale` for that.
- e8f6b12: The editor's language selector says what is missing in each language ("English · 3 missing", "Spanish · complete"), counting required values, translations and the alt texts of the files in use; shared values count in the default language. The "To publish, fill in" notice lists what can be filled in the language on screen first, alt texts included, and each link switches to the language it names.
- 97e316a: Media shows the alt text each image still lacks per language: its card says "No alt: EN", its details mark the empty language as "Missing", and a new filter lists the images without alt text in a language (`searchMedia({ missingAlt: 'en' })`, `MediaQueryType.missingAlt`).
- dc7dd63: Images, galleries and PDFs per language in the editor. In another language than the default one they show the original with "Same as in Spanish", and "Use another image for English" gives that language its own; "Back to the original" drops it again. A gallery of its own starts as a copy of the original and goes back to it once emptied. The site already read these values: `resolveContent` and `leafVariants` now also treat an empty override (`null` or `[]`) as reusing the original, so a language never shows an empty gallery by mistake. New `inheritsOriginal` in `@linkcharsoft/cms/core` and `useMediaVariant(name)` in `@linkcharsoft/cms/panel`.
- 384a0c9: New helpers in `@linkcharsoft/cms/core` for what keeps a document out of the publication: `missingContent` lists required values, translations and alt texts with their field and locale (`{ path: 'hero.title.en', field: 'hero.title', locale: 'en', kind: 'field' }`), `splitLocale` separates a data path from its locale, `countByLocale` and `countBySectionAndLocale` count them, and `missingAltLocales` names the locales a media item still lacks an alt text in. The editor and the publish list use the same function, so they always agree.
- 92a72d4: With more than one language, the page outline and each section header count what is missing per language ("ES 1 · EN 3"), the language being edited highlighted, so it shows at a glance which sections still need a translation. Screen readers hear "3 missing in English". Single-language projects keep the dot and the "Incomplete" mark.
- 3e657bd: Each missing item in Publish links to its field: "Title (English)" opens the editor in English with that field in view and focused, and an alt text opens the image field in its language. Pending changes' `missing` items carry that `href`, built with the new `paths.field(kind, entryId, id, { field, locale })` (`/dashboard/paginas/home?locale=en#hero.title`). The editor opens any field named in the URL hash, and the overview's "View" on an incomplete item goes to the first missing field. The `publishPanel.problems` text is now only the lead ("Not published until these are filled in: "), followed by the links.
- 7424335: While editing another language than the default one, each translated field shows the default language's text above it ("Spanish: Architecture to live in"; rich text as plain text, long ones cut with "Show all") and each shared value says "Same in every language": emails, numbers, options, links, a button's style and link, opening hours' days. Lists and blocks warn that adding, removing or reordering items changes every language. Project inputs get the same with `useLocaleNote(name, field, part?)` from `@linkcharsoft/cms/panel` (`{ badge, note, describedBy }`, for the new `badge` and `note` props of `InputContainer`), plus `SharedBadge` and `useEditingTranslation`. `describedBy` takes extra ids.

### Patch Changes

- 63bbe92: The preview names the language it shows, and when a language still has no URL (an empty slug in English) the disabled preview button says which language needs it.
- 211dce8: The editor's "To publish, fill in" links focus the field they name in every language: translated fields ("Title (English)") and required values of the default language used to open the section and switch language without reaching the input. Fields inside a closed list or blocks item open it first.
- ff8fc3e: `imageProps` turns the focal point into `object-position` in percent. Media stores it as a 0–1 ratio, so images on the site were placed at "0.3%" instead of "30%".

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
