# @linkcharsoft/cms

## 0.13.0

### Minor Changes

- f26492b: The invitation and recovery emails land on a page with a button instead of a route handler that spent the token on arrival: mail scanners open links before people do, and the token was gone by the time they pressed it. The page explains what the link does, "Continuar" verifies the token (the new `confirmLink` action) and goes on to the invitation or new-password form; a spent or broken link is explained on the same page. `linkchar-cms routes` replaces `auth/confirm/route.ts` with `(auth)/auth/confirm/page.tsx` and adds the action; the handler `cms.handlers.authConfirm` keeps working for a project that has not regenerated its routes.
  
  To update a project: run `linkchar-cms routes` (and commit the generated files); the email templates do not change.
- e28db2c: `doctor` checks the migrations a database has applied, not only the files of the project. A migration adds `cms_migrations()`, a function only the secret key may call that lists `supabase_migrations.schema_migrations`; `doctor` calls it through PostgREST, local or hosted (`--env-file`), compares the result with the migrations of the package and of the project's `supabase/migrations`, and fails naming the versions the database lacks with the command that applies them. A database without the function gets a warning that says which migration adds it.
  
  To update a project: `linkchar-cms migrations sync`, then `supabase migration up` locally and `supabase db push` on the hosted project.
- 4023c41: An import finds a collection document after editors renamed its slug. `upsert(entry, { data, match: { key } })` stores the script's `key` with the document (in `documents.key`, the column singletons use) and looks it up by that key before the slug; a document found by slug adopts the key the script passes. The result gains `matchedBy` (`'id' | 'key' | 'slug'`, null when created). The CLI ends with what it updated and created, and warns about every document created in a collection that already had documents, naming what it looked for (`givxo (slug not found)`); `--no-create` (`create: false` in `createImportSession`) makes `upsert` throw instead of creating. Before, a seed whose slug an editor had shortened in the panel created a second, visible document and nothing said so.
  
  To update a project: add `match: { key: '…' }` to every `upsert` of a collection document in the import script (the next run adopts the keys), and check the run's closing lines for unexpected creations.
- 0ae3546: `linkchar-cms import … --password-stdin` reads the password from the first line of stdin, so it stays out of the shell history and CI logs; `CMS_IMPORT_PASSWORD` and `--password` keep working.
  
  To update a project: nothing.
- aeea2b2: `createImportSession().transform({ entry, map, dryRun })` rewrites every document of an entry through the same validation and save as an import (RLS, activity log, conflicts): `map(data, { id, slug })` returns the data to save or `null` to leave the document alone, and the report lists `changed`, `unchanged` and the `invalid` documents, which keep their stored data. It is the way to move stored values when a field changes kind (a `select` that becomes `color()`); the README has the recipe under "Changing a field's kind".
  
  To update a project: nothing.
- 22380c2: `createImportSession().media()` takes mp4 and webm files: they go up as they are, within 25 MB, with their duration and size read from the file, and an mp4 that is not faststart is refused with the ffmpeg flag that fixes it. `poster` takes the id of an image already imported, so the video arrives ready to publish.
  
  To update a project: nothing.
- 193eeb8: The publish history tells a simulated build apart, and whoever publishes learns when the site never confirmed a build. A publish reported by the mock build (its `job_id` starts with `mock-`) carries a "Simulada" tag and `PublishRecordType.simulated`. `cms.queries.getPublishCircuit()` reads the log as `unused`, `unconfirmed` (publishes exist, but no success came from a real build) or `confirmed`; the publish page shows a warning to users who can publish while it is `unconfirmed`, and `doctor` warns with the same meaning, both pointing at `linkchar-cms publish:ping`.
  
  To update a project: nothing.
- 4130b81: `linkchar-cms publish:ping [--timeout 20] [--env-file .env.local]` verifies the publish circuit end to end without the AWS console: it logs an empty publish with the secret key, fires `CMS_BUILD_HOOK_URL` as "Publicar" does, and waits for the site's webhook to report the build back, printing each status change and exiting with 0 only when the site confirmed it. A hook that answers but never reports points at the EventBridge rule, the API destination or `CMS_BUILD_WEBHOOK_SECRET`; a refused hook points at the hook URL. It refuses while a publish is still building, costs one Amplify build and takes the 30-minute publish lock like any publish.
  
  To update a project: run it once against the hosted project (`--env-file .env.remote`) after the Amplify setup; nothing else.
- 2842790: The simulated build runs only against a local Supabase. `publishTargetFromEnv(env)` from `@linkcharsoft/cms/publish` picks the project's publish target the way the import CLI already did: Amplify when `CMS_BUILD_HOOK_URL` is set, `mockBuild()` when `NEXT_PUBLIC_SUPABASE_URL` is `127.0.0.1` or `localhost`, and none otherwise, so a hosted project without a hook records `target_missing` instead of a "Publicado" nobody built. The server adds the same guard for a project that wires the targets itself: a local-only target (the mock) against a hosted project counts as no target and the logger says why once, unless it was made with `mockBuild({ allowRemote: true })`. The starter `server.ts` and the README use the helper; `@linkcharsoft/cms/publish` also exports `amplify`, `mockBuild`, `isLocalSupabaseUrl` and the target types.
  
  To update a project: in `src/cms/server.ts`, replace the `CMS_BUILD_HOOK_URL ? amplify(…) : mockBuild()` ternary with `publishTarget: publishTargetFromEnv(env)` (keep `mock: { result, seconds }` options if the project passed them).
- c9b219b: A `select` shown as cards takes CSS grid lines in its mosaic previews: a cell's `column` and `row` accept what `grid-column` and `grid-row` take (`'1 / 4'`, `'2 / span 2'`) besides a line number with `columnSpan` and `rowSpan`. `defineCmsConfig` still rejects a cell outside its grid and now names a line it can't read. `gridLines` and `gridPlacement` are exported from the core for project inputs.
  
  To update a project: nothing.
- d1f78ba: Videos join Media, within the Supabase Free plan. `videoFile({ label: 'Video', folder: 'proyectos' })` is a built-in field kind that stores a video of the library like `file` stores a PDF. The uploader takes mp4 and webm up to 25 MB (the bucket now allows the 50 MB the Free plan does per file; images and PDFs keep their 10 MB), reads their size and duration in the browser, and turns away an mp4 that is not faststart, with the ffmpeg flag that fixes it, because the browser would download the whole file before showing a frame. The library filters by "Videos" and shows each video by its poster with its duration; the details play the file, say what a thousand full plays cost in egress, and let the editor pick the poster from the images of Media or capture a frame, which becomes an image of the library in the video's folder. A video without a poster is missing content ("Portada del video de …"), so publishing waits for it, and the poster of a live video can't go to the trash (the panel names the video, the database refuses it too). The migration adds `duration` and `poster_id` to `media` and the video mime types to the bucket. On the site, a `videoFile` field resolves to a `SiteVideoType` with its `poster` as a `SiteImageType`, and `<Video video={clip} />` from `@linkcharsoft/cms/site` renders a `<video>` with `preload="metadata"`, `playsInline`, controls and the poster through the image optimizer; `autoplay` plays it muted and looping. `core` exports `videoFile`, `VideoFileField`, `VIDEO_MIME_TYPES`, `MAX_VIDEO_BYTES`, `isVideoMime`, `mediaTypeOf`, `formatDuration`, `egressGigabytes` and `readMp4Head`; `MediaItemType` gains `duration`, `posterId` and `posterUrl`, `MediaUsageType` a `kind` (`document` or `poster`), `updateMedia` takes `posterId` and `MissingItemType.kind` can be `poster`. Media is for the videos editors rotate; a site's own hero loop stays in `public/`, since Storage serves a video whole on every play.
  
  To update a project: `linkchar-cms migrations sync` and `supabase db push`; then use `videoFile()` where the schema needs it and render it with `<Video>`.

### Patch Changes

- 57efe8c: `withCms` and `doctor` also look for the product icon under `public/seo/` (after `public/`): `icon.svg`, `favicon.svg`, the largest favicon PNG, then `favicon.ico`.
  
  To update a project: nothing.
- 74c567b: The page outline of the editor sits 16 px under the sticky editor bar instead of behind its bottom row, on desktop and in its tablet form, whatever the bar's height (a long title, wrapped actions): the editor measures the bar and the outline, the preview pane and the section anchors follow it.
  
  To update a project: nothing.
- f4c6578: The panel applies PrimeReact's language before its first render in the browser, so a dropdown with a clear icon no longer logs a hydration mismatch ("Limpiar" on the server, "Clear" on the client) in development.
  
  To update a project: nothing.
- 1df7453: A guide counts only the steps it shows: a step whose anchor is not on the screen (the sidebar on a phone, a section without tabs) no longer leaves a hole in "2 de 7" nor inflates the total.
  
  To update a project: nothing.

## 0.12.1

### Patch Changes

- 5231fe1: A static build reads the content published since the previous build. Next keeps the site's reads in `.next/cache/fetch-cache` for a year and Amplify restores that folder before every build, so a build after a publish rendered the content of the build before it. Every read of the server now carries a stamp of the build (`withCms` sets one for the build and its workers), which keys the fetch cache: a build never reuses the entries of another one, and the reads of one build still dedupe within it. `doctor` warns while `amplify.yml` keeps `.next/cache` without dropping `fetch-cache`, and the deploy guide adds the `preBuild` line that drops it, so the cache does not grow with every build. CI proves it: the English build of the playground starts on the fetch cache of the Spanish one after a published row changed, and renders the change.
  
  To update a project: nothing for the fix; add `- rm -rf .next/cache/fetch-cache` to `preBuild` in `amplify.yml` (see docs/deploy.md).
- 93aa46f: `doctor` names the env file it read when the Supabase variables are missing and points at `--env-file`, instead of always saying `.env.local`.
  
  To update a project: nothing.

## 0.12.0

### Minor Changes

- 9ea58be: `color()` is a built-in field kind: `color({ label: 'Color de marca', presets: ['#1f5fa8', '#0e0e13'] })` stores one `#rrggbb` in lower case (a stored `#1F5FA8` is repaired on read; `red` or `#abc` is "Usá un color como #1f5fa8", a new `validation.color` catalog key). The panel input is the browser's color picker next to the hex text, with `presets` as swatches the editor picks in one click, and the version history shows each color with its swatch. Imports take the same hex through `upsert()`. Core exports `color`, `ColorField`, `HEX_COLOR` and `isHexColor`. The README's example of a project kind is now `rating` (the playground's), since `color` no longer needs to be one.
  
  To update a project: a project with its own `color` kind removes it (`defineCmsConfig` rejects a kind defined twice), drops it from `fields` and from `createCmsClient({ inputs })`, and imports `color` from `@linkcharsoft/cms/core`; stored values stay valid.
- 7a5be20: Field errors are tied to their inputs for assistive technology: the message `InputContainer` shows has an id, the package's inputs list it in `aria-describedby` while it shows and set `aria-invalid`, switches show the required asterisk and their own error, the "Borrar la búsqueda" icon of search boxes is a real button, and the character counter has a spoken "12 de 80 caracteres". `errorId(name)` is exported from `@linkcharsoft/cms/panel` for project inputs.
  
  To update a project: nothing; a project input may add `errorId(name)` to its `aria-describedby`.
- 247094b: List and block items no longer start collapsed: they open while there are at most three, or when the item has an image field, and `list()`/`blocks()` take `open: true | false` to fix it. The legend gets "Expandir todo" / "Colapsar todo", items collapsed for a drag open again after the drop, and a collapsed item shows its image as a thumbnail (the item's first image field, or the one `thumbnail` names on `list()`; a block uses its own first image field) and a count of its fields with a problem. `list()` takes `singularLabel` ("servicio"): the button reads "Agregar servicio" and an untitled item "Servicio 3". With `min`, the legend reads "2 de 6, mínimo 1" and the last `min` items can't be removed; at `max`, "Agregar" and "Duplicar" stay disabled with the reason as their tooltip instead of disappearing. A block whose type left the schema used to be invisible but counted: it now shows as 'Bloque "x", que ya no existe en el esquema' with its remove button. `defineCmsConfig` rejects a `thumbnail` that is not an image field of the items.
  
  To update a project: nothing; set `open: false` on lists that should keep starting collapsed, and `singularLabel` where "Agregar" should name the item.
- 81ffb65: `linkchar-cms routes` now writes the panel's own `error.tsx` and `not-found.tsx` under `(panel)`, plus a `[...notFound]` catch-all in the workspace: a screen that throws shows "Algo salió mal" with "Probar de nuevo" inside the panel layout instead of the site's `global-error`, and an unknown panel URL or a missing document shows "No encontramos esta pantalla" with a link to the overview instead of Next's bare 404. The editors (pages, documents, site entries) get their own `loading.tsx` with a skeleton of labels and inputs; the lists keep the table rows. `@linkcharsoft/cms/panel/routes/{error,not-found,loading-editor}` are the new route modules.
  
  To update a project: `linkchar-cms routes` (it adds the files; `routes --check` fails until then).
- d620ad0: A URL another document still holds on the site no longer aborts the whole publish with a generic message. Publish now lists, on each change, the live document that holds its URL: when that document's own pending change frees it (its URL moved, or it is being removed), the item stays tickable and warns "La URL /blog/casa la usa "Casa" en el sitio: marcalo también para que salgan juntos." while the other is unticked; when nothing frees it, the item can't be ticked and says to change one of the two URLs. `publishChanges` refuses such a selection before touching the database and answers `conflicts: [{ id, takenBy }]`; the screen marks both documents and names them in the toast. Documents whose URL moves are published first, since `publish_site` now takes them in the given order, and the new migration `20261029000000_publish_conflicts.sql` makes it report the holder of a taken slug or URL in the error detail. The editor warns on save too: a slug free among drafts but live on another document shows "En el sitio, "Casa" todavía usa esta URL…" under the field (`saveDocument` returns it as `warnings`, the document is saved). `PendingChangeType.urlConflicts`, `unfreedConflicts` and `UrlConflictType` are new in `@linkcharsoft/cms/core`.
  
  To update a project: `linkchar-cms migrations sync`, then `supabase db push` (new migration `20261029000000_publish_conflicts.sql`).
- d53380d: `select({ display: 'cards', options: [{ value, label, preview }] })` shows one card per option instead of a dropdown, for choices that are easier to see than to read, like the layout of an image mosaic. `preview` is serializable, so the config still crosses to the browser: a PrimeIcons name (`{ icon: 'pi-th-large' }`), an image (`{ image: '/layouts/mosaic.svg' }`) or a mosaic sketch the panel draws (`{ grid: { columns, rows, cells: [{ column, row, columnSpan?, rowSpan? }] } }`, 1-based like CSS grid lines). The cards are an accessible radio group (arrows move between them, the chosen one has the brand border) and validate on each pick. `defineCmsConfig` rejects cards with an option that has no preview, previews without `display: 'cards'`, and a cell outside its grid; `multiSelect` has no cards. Core exports `SelectOptionType`, `SelectPreviewType`, `GridPreviewCellType` and `selectDisplayProblem`.
  
  To update a project: nothing; every `select` keeps its dropdown until it sets `display: 'cards'`.
- 3a970ee: `paths.siteHome` (from `panelPaths`) is the published site's front page: `/`, or the default locale's prefix (`/es`) under `prefixDefaultLocale`. The header's "Ver sitio" link opens it instead of a fixed `/`.
  
  To update a project: nothing.

### Patch Changes

- 1f2a225: Sign-in and account forms: the invitation screen shows the invited address ("Tu usuario", read-only, `autocomplete="username"`) and the password rules under the field; the password reset and change-password forms carry a hidden `username` input with the account's address, so password managers pair the new password with the right account; a submit button stays in its loading state after a successful sign-in, invitation, reset or code until the navigation completes instead of re-enabling itself for a moment; a wrong current password in "Cambiar contraseña" is shown under that field, with the focus on it, instead of only as a toast; after a failed submit, every field re-checks itself while typing (`validateOnChange`), so a corrected value drops its error without another submit; and the two-step verification screen has "No tengo el celular", which explains that an administrator can reset the verification from Users.
  
  To update a project: nothing.
- 0ab0566: The loading spinner of relation fields sat below the input's middle while it spun (the spin animation replaced the transform that centered it), and a multiple relation showed the browser's outline inside the field on top of the field's own focus ring. The spinner is centered with a margin and the inner input has no outline.
  
  To update a project: nothing.
- 39bc32a: A save that failed (no network, a server error) is tried again on its own after 3, 6, 12 and 24 seconds, and the status shows "No se pudo guardar" with a "Reintentar" button meanwhile; before, nothing happened until the editor typed again. The status also stops reading every "Cambios sin guardar" and "Guardando…" to screen readers: only the outcome of a save is announced.
  
  To update a project: nothing.
- f50faba: A collection list asked for a page past the end (`?page=9`, or the last item of a page just sent to the trash) showed "Todavía no hay contenido" with the create button as the only way out. It now shows the last page that exists, with the paginator on it.
  
  To update a project: nothing.
- aa2fc42: Manual order of an `orderable` collection: each row has "Subir" and "Bajar" buttons next to the drag handle, so the order can be changed from the keyboard; a refused save puts the rows back in their previous order instead of leaving the screen out of sync with the server; manual order shows 100 items per page (`ORDERABLE_PAGE_SIZE`) and says "Se reordena dentro de esta página…" when there are more; and while a search, a status filter or another sort hides the handle, the list says why and offers "Ver en orden manual". `listCollection` now returns `pageSize`.
  
  To update a project: nothing.
- d08b24e: The link, video and "Nuevo …" dialogs focus their first field when they open instead of the close button. Creating a related item that fails no longer leaves the "Crear" button spinning, and "Duplicar" is busy while the copy is made, so a double click can't make two.
  
  To update a project: nothing.
- c72bf33: Dialog widths no longer depend on the order of the CSS: the panel's dialogs (Media, the picker, the block picker, links, confirmations) set `--cms-dialog-width` and the Dialog passthrough reads it, where before each dialog's class competed with the passthrough's `w-[min(640px,…)]` at equal specificity and a build could leave the media dialogs at 640 px.
  
  To update a project: nothing.
- c91b231: The focal point picker sizes its box with the image's own ratio (up to 420px tall, centered), so a click on a vertical image is measured over the picture and not over the letterbox around it. Before, the saved point on a tall image was off by the empty margins.
  
  To update a project: nothing.
- de591c6: One focus indicator across the panel: a 2 px ring in the brand violet on light grounds and a 2 px magenta outline on the dark sidebar and the dark ground of the sign-in screens. Page outline, section headers, collection tabs and the sidebar used their own outlines, list handles, media tiles, the block picker and the focal point picker showed the ring and the browser's outline together, and plain links (missing-content links, media usage, the overview, publish, list titles, the preview link, the guide's buttons) showed only what the browser drew. The ring and outline are defined once (`FOCUS_RING`, `FOCUS_VISIBLE_RING` and `FOCUS_OUTLINE_DARK` in the passthrough, `focus-ring` and `focus-outline-dark` mixins in Sass, a base rule for anything else) and a unit test keeps every stylesheet on them.
  
  To update a project: nothing; a project input that still spells its own ring keeps working.
- c9a73a2: The focus ring (`--cms-primary-ring`) is now 65% of the brand violet instead of 55%: with the 0.11.0 palette the lighter mix reached 2.8:1 on white and 2.5:1 on the panel's grey, under the 3:1 WCAG asks of a non-text indicator; the new mix reaches 3.5:1 on white and 3.1:1 on the darkest ground an input sits on. The tokens test now resolves the `color-mix()` the way the browser does (`mixOklab` in core) and keeps the ring at 3:1 on the surface and both neutrals.
  
  To update a project: nothing.
- f4242a5: A gallery that gets more images than its `max` says how many fit instead of leaving the rest out silently, and removing an image from a gallery or the file of an image field asks first, as lists and blocks do. Link fields show their `help`, changing the type of a link clears the destination typed for the previous one, and "Abrir en una pestaña nueva" is gone for emails and phone numbers.
  
  To update a project: nothing.
- ffe283a: A collection document that is not shown on the site reads "Oculto" ("Hidden") in the editor, the lists and the overview instead of "Borrador": the panel already calls every unpublished edit a draft, so the same word for the visibility switch made editors think a hidden item would come out with the next publish.
  
  To update a project: nothing, unless its `messages` override `documentStatus.hidden`.
- 3a7ffc8: Lists of names in Publish (changed sections, missing fields), Pages ("Muestra también") and the overview's incomplete alerts are joined with `Intl.ListFormat` in the panel language ("Título, Dirección y Texto") instead of a hardcoded ", ", and the sentence punctuation moved into the catalog keys (`publishPanel.sectionsChanged` and `publishPanel.problems` now take `{sections}` / `{fields}`). `formatList` and `listParts` are exported from the core translator and `InlineList` from the panel. In Activity, picking one day and closing the calendar filters that day; before, the same day had to be clicked twice.
  
  To update a project: nothing, unless its `messages` override those two keys: they need the placeholder now.
- 629c694: Adding, duplicating, removing or reordering an item of a list or blocks field marked the whole array as touched, which hid the errors shown on the items inside ("Ingresá una URL que empiece con https://" went away as soon as another item was added), and the opening hours input did the same with each day, so a wrong time ("25:00") never showed its error. Touched is now kept per item and moves with it, the time inputs mark themselves on blur, and a list change validates the form at once.
  
  To update a project: nothing.
- a9327c5: A signed-out visit to a panel screen (an expired session, a link someone shared) comes back to that screen after signing in: the proxy sends the browser to `login?next=/dashboard/paginas/home?locale=en` and the sign-in screen, and the second step when the user has two-step verification, follow it. `next` is accepted only when it is a panel path on the same origin and not a guest screen (`safePanelPath` in `@linkcharsoft/cms/core`); anything else lands on the panel home as before.
  
  To update a project: nothing; the proxy and the generated routes are the same.
- 8e64416: In a file's details, a failed "Dónde se usa" lookup shows "No pudimos ver dónde se usa." with "Reintentar" instead of a loader that never ends, and the trash button is enabled (the server still refuses to trash a file in use). The trash and restore button locks while the move runs, so a double click can't send it twice; "Borrar para siempre" confirms with a toast; and a clipboard that refuses to copy the address says so instead of failing silently.
  
  To update a project: nothing.
- fe14aee: The media library and the picker load the next page as the end of the list comes into view; "Cargar más" stays as a fallback. A search that fails no longer leaves the loader spinning: it shows "No pudimos cargar los archivos." with "Reintentar". A response that arrives after a newer search is ignored instead of replacing its results, and the picker shows a skeleton grid during its first load instead of a blank area. The number of results is announced to screen readers ("45 archivos") from a text outside the grid, instead of reading the whole grid on every change.
  
  To update a project: nothing.
- fe14aee: The media picker's "Elegí un archivo / Usar archivo" bar is now the dialog's footer instead of a sticky strip inside the scrolling list: it no longer floats mid-dialog when the folder has few files, and the grid no longer shows through the gap under it. The dialog's content area grows to the dialog's height, so a fixed-height dialog scrolls its content instead of overflowing.
  
  To update a project: nothing.
- a69e62b: Thumbnails in the media library, the picker, the uploader queue, image fields and galleries show the whole image on a subtle checkerboard instead of cropping it to the tile: logos and screenshots are recognizable at a glance. Only the focal point picker keeps the image at its own ratio.
  
  To update a project: nothing.
- f3edbb8: A `row()` inside a list or block item overflowed its card on screens under 360px: its columns asked for 200px each even when the item was narrower. They now take the available width.
  
  To update a project: nothing.
- bcdba88: Opening hours accept a closing time past midnight (20:00 to 02:00): only the same opening and closing time is rejected ("El cierre no puede ser a la misma hora que la apertura"), and a day switched to closed keeps its hours without validating them. The switch's label is a fixed "Abierto" (the switch itself says whether the day is open), and a time typed halfway ("09:3") stays in the input on blur instead of being cleared.
  
  To update a project: nothing. `openingHoursSpecification` passes the times through as entered, which is how schema.org expresses hours that end the next day.
- 2bf7e04: The "Nuevo …" tasks of the overview were plain forms without a pending state, so a double click created two drafts. They now use the same button as the collection lists, which shows a spinner and ignores clicks while the draft is being created.
  
  To update a project: nothing.
- 7104d7f: On phones the menu opens as a full-screen drawer over the page instead of pushing the content down, and it closes with Escape (the focus goes back to the menu button), when the route changes and when the browser goes back.
  
  To update a project: nothing.
- d3e2cf5: Publishing while the site was still building the previous publish started another build of the same content: on Amplify the jobs piled up. Now `publishChanges` answers "El sitio todavía se está actualizando con la publicación anterior…" (`errors.publish.building`) while the latest publish is building, and the Publish screen says so ("El sitio se está actualizando con la publicación anterior (hace 3 minutos)…") with the button held until the build reports its end, or until the 30 minutes after which a build counts as unconfirmed.
  
  To update a project: nothing. A project without the build webhook (no EventBridge rule) waits those 30 minutes between publishes: wire the webhook as the Amplify setup describes.
- 0ab0566: Relation fields (`relation`, `relations`) and the document picker of links lost their value on a plain focus and blur: PrimeReact's forced selection compared the shown label against an empty list of suggestions and cleared it. They now list the first options as soon as they get the focus (the text is selected, so typing replaces it), keep what the editor types while answers arrive, ignore answers that come back out of order, and on blur put the chosen item back when the typed text matched nothing; an emptied field clears the choice, as before. The document picker says "No hay resultados" when there are none, and the "Nuevo …" button opens the dialog with an empty name instead of the last search.
  
  To update a project: nothing.
- 2ffd0b4: The rich text editor showed headings, lists, quotes, links and images as plain text since 0.10.0: their styles were nested under the inline variant by mistake. The editor now takes the same focus ring as every other input and says `aria-invalid` on its text when the field has an error, the toolbar no longer declares itself sticky (it never stuck, clipped by the editor's rounded border, and would sit under the document's own sticky bar), and "Rehacer" shows a redo arrow instead of a refresh icon.
  
  To update a project: nothing.
- dad8bba: The address of a published document (`slug`) no longer follows its title: retitling "Casa" to "Casa grande" used to change a live URL without a word. Once a document has been published, the address only changes by hand or with "Generar de nuevo", which now regenerates it once from the title and says that the old address will redirect to the new one. Drafts never published keep following the title.
  
  To update a project: nothing.
- c086416: The sidebar and the header stay on screen while the page scrolls. On desktop the sidebar is sticky and as tall as the viewport, its groups scroll inside it and the product footer is always visible at the bottom; the header, with "Publicar", "Ayuda" and "Ver sitio", sticks on every screen size, and the editor bar, the page outline, the section anchors and the preview pane sit below it. The preview pane also stops below the editor bar instead of under it, and its frame is never taller than what fits under both, so the bottom of the previewed page (the Draft Mode exit link) stays reachable on a short screen.
  
  To update a project: nothing.
- 1e4bc16: Guided tours anchor their cards to small elements, each with a fixed side: the first section's header or the first field instead of the whole form, the first row instead of the whole list, the summary and the history title on Publish, and the header buttons get their card right-aligned under them. Before, a wrapper taller than the viewport sent the card to the bottom center and the editor's sticky bar covered the top of the form. The unused `users-invite` anchor is gone.
  
  To update a project: nothing.
- 358a3ee: A tour looks its anchors up when each step shows, instead of once 700 ms after arriving: a button that re-mounts (the preview or publish button, when its tooltip appears) keeps its highlight instead of jumping to the corner, an anchor still loading gets up to 1.5 s, and one missing on this screen is skipped. A tour with nothing to show never starts nor counts as seen; from the Help menu it says "Esta guía no tiene nada para mostrar en esta pantalla todavía.". The stage hugs the element (4 px padding, 12 px radius), the close button reads "Cerrar la guía", the animations follow `prefers-reduced-motion`, the Help button exposes `aria-expanded`, and the highlight follows the element when it resizes.
  
  To update a project: nothing.
- c2b52fc: A guide that finds the focus in a field when the screen opens now waits and looks again every second until the field loses it, instead of giving up for that visit; a focused button inside the form no longer holds it back.
  
  To update a project: nothing.
- 17d4ba1: The trash is paged (50 per page) and searchable by title instead of capped at 200 rows; "Restaurar" shows a spinner and the row's buttons share one size. The version history loads 50 versions and offers "Cargar más" for older ones, and says "No pudimos cargar el historial." with "Reintentar" instead of spinning forever when the request fails (`listVersions` now returns `{ items, more }` and takes a `before` date). The publish history links to Activity filtered to publishes for admins, its rows say how long a build has been running ("Publicando · hace 7 min") instead of "~5 min", and "Reintentar" is offered for an unconfirmed build and no longer for a publish that failed because no publish target is configured (`retryPublish` follows the same rule).
  
  To update a project: nothing.
- ff35381: Dragging files over the uploader no longer flickers while the pointer crosses its children, and a file dropped anywhere else in the panel (or with the uploader closed) no longer opens in the tab and leaves the panel. The upload button counts only the files ready to go, the remove buttons are locked while an upload runs, and a file removed before its turn is skipped. The hint and the rejection message now say the real limits: images up to 50 MB (optimized in the browser) and PDFs up to 10 MB; `MAX_RAW_IMAGE_BYTES` is exported from `@linkcharsoft/cms/core`.
  
  To update a project: nothing.
- ff35381: The uploader stays open when some files failed or still wait for a duplicate decision, instead of closing as soon as one upload succeeded; a toast says how many went up and how many still need attention ("Se subió 1 archivo; quedan 2 con problemas."). `MediaUploader`'s `onUploaded` now receives the number of files left in the queue as a second argument.
  
  To update a project: nothing.
- e8c0190: Selects, dates, switches, relations, images, files and galleries revalidate as soon as a value is picked: the editor only validates on blur, which those inputs never get, so a corrected value kept showing its error until some other field lost the focus.
  
  To update a project: nothing.

## 0.11.0

### Minor Changes

- 54c5819: `linkchar-cms templates` writes the invitation and recovery emails with Inferencia's brand: a dark header with the star, the name and the product (`branding.name`), and a violet button, in tables with inline styles that email clients keep. A template still as 0.10 wrote it is rewritten (`updated`); one the project edited is kept, as before. `templates --check` and `doctor` fail while one is unbranded.
  
  To update a project: `linkchar-cms templates`, then `supabase stop && supabase start` locally and `supabase config push` (or paste them in Authentication → Emails) for the hosted project.
- 4d42f0d: The panel wears Inferencia's brand in every project instead of each project's colors: a dark sidebar (`#0e0e13`) with the magenta star as its accent, a light workspace with violet-tinted neutrals, and the brand violet `#6e14be` for buttons, links and focus rings. Text is Hanken Grotesk and headings Bricolage Grotesque, both SIL Open Font License and bundled through Fontsource (`@fontsource-variable/*`), so the panel no longer depends on the project's fonts. The tokens moved from `:where(:root)` to `.CmsRoot`, which leaves a project's `:root { --cms-primary }` without effect, and Tailwind gets `cms-accent`. `rootLayout(cms, CmsClient)` loses its third argument, which only passed font classes to `<body>`. Every text and ground pair of the palette reaches 4.5:1, and a unit test keeps it there.
  
  To update a project: delete `src/app/(cms)/theme.css` (or the stylesheet that set `--cms-*`) and its import in `src/app/(cms)/layout.tsx`, and call `rootLayout(cms, CmsClient)` without options; drop the `next/font` the panel layout loaded for it.
- 90dc842: What each project shows is now its product slot: `branding.name` and a square `branding.icon` at the top of the sidebar and on the sign-in screens, under the "Inferencia CMS" signature. `branding.logo` is now `branding.icon` and the config throws when it finds `logo`. Without `icon`, `withCms` takes the project's favicon at build (`app/icon.svg`, `icon.png`, `apple-icon.png`, then `public/icon.svg`, `favicon.svg`, the largest `favicon*.png`, then `favicon.ico`) and passes it as `CMS_BRAND_ICON`; `findBrandIcon` is exported from `@linkcharsoft/cms/next`, and `linkchar-cms doctor` says which file it found. With no icon at all, the sidebar shows the initials of the name. The sign-in screens moved to the dark brand ground, with the white card unchanged.
  
  To update a project: rename `branding.logo` to `branding.icon`, or remove it to use the favicon; set `icon` when the largest favicon is too small for 56px.
- 9b70068: The per-project theme is gone: `linkchar-cms contrast` and its `--on` flag are removed, `contrastRatio` and `MIN_TEXT_CONTRAST` are no longer exported from `@linkcharsoft/cms/core`, `init` no longer writes `src/app/(cms)/theme.css`, and the README's Theme section is now Brand.
  
  To update a project: remove `linkchar-cms contrast` from scripts and CI.

## 0.10.3

### Patch Changes

- 1fa3d8e: `linkchar-cms admin --password` on a user that already existed set the password but left an unconfirmed email unconfirmed, so a user first invited with `admin --email` alone still got "Email not confirmed" at sign-in. It now confirms the email along with the password.
- 7136055: The route handlers of the panel (email confirmation, sign-out, Draft Mode on and off) built their redirects from `request.url`, which behind a proxy such as Amplify Hosting carries the internal host: invitation and recovery links sent the browser to `https://localhost:3000/...`. They now answer with a relative `Location`, so the browser stays on the host it asked.
  
  To update a project: update the package; the generated routes stay the same.

## 0.10.2

### Patch Changes

- a40c886: `linkchar-cms doctor` reads every package table with the secret key and tells a missing table ("apply the migrations") apart from one the secret key may not read (the `service_role` grants of 0.10.2). Before, a permission error showed as "The profiles table is missing". `init` now lists `[api] auto_expose_new_tables = false` among the `config.toml` settings, so the local database behaves like a hosted project created today.
  
  To update a project: nothing; optionally set `auto_expose_new_tables = false` under `[api]` and give the project's own tables explicit grants.
- 140663e: On a hosted Supabase project created with "Default privileges for new entities" off, the secret key could not read or write any package table: `linkchar-cms admin` failed with "permission denied for table profiles" and left the user as editor, and the build webhook, the publish retry and the trash purges failed the same way. The new migration `20261027000000_service_role_grants.sql` grants `service_role` select, insert, update and delete on the package tables and select on `document_status`; on projects created with the toggle on it changes nothing. The playground and CI now run with `auto_expose_new_tables = false`, and a pgTAP suite (`service_role.test.sql`) covers what the package does with the secret key.
  
  To update a project: `linkchar-cms migrations sync`, then `supabase db push`. If `linkchar-cms admin` failed before, run it again: it promotes the existing user.

## 0.10.1

### Patch Changes

- 4ceac1a: `upsert()` of an import rejected list and block items without a `_key` ("Valor inválido" on every item), which the README never asked for. An item without one now takes the key of the stored item in the same place (of the same block type), or a new one when there is none, so running the import again writes the same JSON and leaves published content unchanged instead of pending. Keys the script sets are kept. Core exports `withItemKeys`.
  
  To update a project: nothing. Scripts that set their own `_key`s keep them.
- 5401194: `upsert()` of an import created a new collection document before saving its data, so data that failed validation left an empty draft without a slug: the next run couldn't find it and created another one. The data is now validated first (the same draft checks the save runs), and invalid data throws without creating anything or logging a `document.create`.
  
  To update a project: nothing. An empty draft a failed import left behind goes when someone opens that collection in the panel a day later, or delete it from the list.
- 3b355c5: `next build` failed on sites with their own Tailwind theme since 0.10.0, and `next dev` answered 500 on every route once the panel had been opened: Tailwind 3 keeps the `@config` of the panel stylesheet for every later stylesheet of the same PostCSS plugin, and Next runs every stylesheet through one, so site Sass modules compiled with the panel config (`The inf-xs:grid-cols-[…] class does not exist` for the project's own screens and colors under `@apply`), and site stylesheets compiled after the panel's could lose their utilities without an error. Which file failed changed from one build to the next. `@linkcharsoft/cms/tailwind/postcss` is the same Tailwind run per stylesheet, so the panel config stays in the panel stylesheet. `linkchar-cms doctor` fails while the project's PostCSS config runs `tailwindcss` directly, and `init` lists the change among the steps left by hand.
  
  To update a project: in `postcss.config.js`, replace `tailwindcss: {}` with `'@linkcharsoft/cms/tailwind/postcss': {}`. A project that patched `tailwindcss` with `pnpm patch` to get around it removes the patch (`pnpm patch-remove tailwindcss@3.4.19`).

## 0.10.0

### Minor Changes

- 26ff4d3: Content imports, for projects that migrate from Strapi or from content in code. `linkchar-cms import <script.ts> --email … [--otp …] [--no-publish]` loads the project's script with jiti (with its `tsconfig` paths, outside Next) and runs its default export with a session signed in as that panel user, so every write goes through RLS and the activity log. The session (`createImportSession` from `@linkcharsoft/cms/import`, a new export without `server-only`) has `media()`, which processes images like the panel's uploader (upright, without metadata, within 2560 px, WebP, blur preview, SHA-256 dedupe), `upsert()`, which writes a page, singleton or collection document and finds it again by its default-locale slug (new documents go visible, at the end of the list), and `publish()`, which publishes everything the import touched in one build and lists the documents still missing content. `sharp` is a new optional peer dependency, only for importing images. The server also exports `addDocument`, `createDocument` without the redirect.
  
  To update a project: nothing. To import images, `pnpm add -D sharp`; the password goes in `CMS_IMPORT_PASSWORD`.
- d22f135: Inline rich text, for a short text with a bold word or a link that goes inside the site's own `<p>` or card: `richText({ inline: true, marks: ['bold', 'link'] })` keeps one paragraph (blocks become lines, media is dropped), its editor offers only those marks and no headings, lists, images or videos, Enter can't split it and Shift+Enter breaks the line, and pasted paragraphs become lines. `<RichText value={lead} inline />` renders the text and its marks without `<p>` or a wrapper (a `<span>` when it gets a `className`). `marks` alone narrows the marks of a block text too; `defineCmsConfig` rejects an inline field with `headings`. Core exports `inlineRichText`, `keepMarks` and `RichTextMarkNameType`.
  
  To update a project: nothing; existing rich text fields keep every block and mark.
- 0fcff06: The panel stylesheet compiles with the package's own Tailwind config (`@config '../../../tailwind/panel.config.js'` in `styles.css`): the preset, the package sources and the project's panel code (`src/cms/**`, `src/app/(cms)/**`, or the same without `src/`). The project's `tailwind.config` no longer spreads `cmsContent()`, so its site CSS stops carrying the panel's utilities: on linkchar-page, the site's Tailwind output went from 30.6 KB to 10.2 KB minified (6.1 to 2.9 KB gzip). The panel CSS also stops carrying the site's utilities and plugins. `cmsContent()` stays exported.
  
  To update a project: remove `...cmsContent()` from `content` in `tailwind.config` and keep `presets: [cmsPreset]` (the package's Sass applies its tokens). Project panel inputs and extension screens must live under `src/cms/` or `src/app/(cms)/`; classes used only elsewhere stop reaching the panel.
- 567045c: `prefixDefaultLocale: true` in `defineCmsConfig` gives the default locale its prefix too: `/es/blog/casa` and `/en/blog/house`, the home at `/es` and `/en`, for sites whose pages live under `app/[lang]`. `entryPath`, `entryUrls`, `slugPrefixFor`, `publishUrls`, `alternates`, the sitemap, the panel preview and the redirects of `publish_site` all follow it; the database needs no migration. With the option on, `defineCmsConfig` rejects patterns that start with a locale code (`/es/estudio` would end up as `/es/es/estudio`).
  
  To update a project: nothing; without the option every URL stays as it was. A live site that turns it on publishes every page and document again: each publish leaves the 301 from the unprefixed URL.
- 2fbfb1f: `site.xDefault` picks the locale hreflang's `x-default` points to in `cms.site.metadata()`, the sitemap and `alternates()`. It defaults to `defaultLocale`, which is the language editors write first (required alt texts, the original above each translation); a site written in Spanish whose foreign visitors should land in English sets `site: { xDefault: 'en' }`. `defineCmsConfig` rejects a locale that is not in `locales`.
  
  To update a project: nothing.

### Patch Changes

- 86615af: The README now says how to show a decorative image (keep its alt text in Media and render `alt=''` for that use), where the project's own videos go (`public/` or a CDN, not Media), and that a route with `dynamicParams = false` still previews a document never published, since Draft Mode renders a slug outside `generateStaticParams`. The deploy guide has a Free plan section: the plan's limits, what breaks while a free Supabase project is paused, and a daily keepalive query, since the weekly build is not enough to keep it awake.
  
  To update a project: nothing.
- f35de4d: `linkchar-cms init` recognizes a site whose root layout lives under a dynamic segment (`app/[lang]/layout.tsx`): it no longer writes `app/(site)/`, whose `[...notFound]` catch-all next to `[lang]` broke `next build` ("different slug names for the same dynamic path"). It sets `prefixDefaultLocale: true` in the new `cms.config.ts` and lists where `DraftRefresh` and the catch-all go.
  
  To update a project: nothing. A project that ran `init` 0.9.0 with an `app/[lang]` root deletes `src/app/(site)/`.

## 0.9.0

### Minor Changes

- 06bcb4d: `linkchar-cms admin --email ana@acme.com [--password …] [--name "Ana"] [--env-file .env.local]` makes the first superadmin with `SUPABASE_SECRET_KEY`: with a password it creates a confirmed user, without one it sends the invitation email, and a user that already exists is only promoted (its password updated when one is given). The profile gets `superadmin`, `can_publish` and `active`. It replaces the SQL that promoted the first user by hand.
- dfe8bf1: `linkchar-cms contrast <primary> [--on #ffffff]` prints the contrast between a panel primary and the text on it and exits with 1 below 4.5:1: the check `contrastRatio` makes, usable from a project's shell or an agent without importing the package source.
- 7aa0325: `linkchar-cms doctor [--config] [--src] [--dir] [--env-file .env.local]` checks a project in one go and exits with 1 on a failure: the config loads, panel routes and proxy, migrations and email templates are up to date (the `--check` of each command), sign-ups off and two-step verification on in `config.toml`, the Supabase variables and `site.url` are set, Supabase answers with the package tables and a superadmin, the GitHub Packages token and pnpm's `minimumReleaseAgeExclude` are there, and, on Windows, no Supabase port falls in a range the system reserves (ports at 49152 and above get a warning: Windows can reserve them after a restart).
- b5ca2cd: `linkchar-cms init --name "Acme" [--base-path /dashboard] [--locales es,en] [--panel-locale es] [--site-url …]` starts a project: it writes the files a project owns where none exist (`cms.config.ts` with `site.defaults` and `Register.database`, `src/cms/{schema,server}.ts`, `src/types/supabase.ts`, the panel root layout with its theme, the `(site)` layout with `DraftRefresh`, home, 404 and catch-all, `sitemap.ts`, `proxy.ts`), then runs `templates`, `routes` and `migrations sync`, and lists what is left to wire by hand (`next.config`, Tailwind, env, an existing proxy or root layout). It never overwrites a file; the starter labels come from the new `starter.*` catalog keys. CI type-checks what it writes (`pnpm check:init`).
- df4aefe: `linkchar-cms templates [--config cms.config.ts] [--dir supabase] [--check]` writes the invitation and recovery emails (`supabase/templates/{invite,recovery}.html`) linking to the panel's confirm route under `basePath`, in the panel language (new `emails.*` catalog keys, which `messages` can override), and adds their `[auth.email.template.*]` blocks to `config.toml`. An existing template is the project's and is only checked: `--check` exits with 1 while one is missing or does not link to `<basePath>/auth/confirm`.
  
  To update a project: add `linkchar-cms templates --check` to its check script; the templates it already wrote by hand pass when they link to the confirm route.
- 8be0777: `contrastRatio(a, b)` and `MIN_TEXT_CONTRAST` (4.5) in `@linkcharsoft/cms/core`: the WCAG 2 contrast between two hex colors, to check a brand's `--cms-primary` against `--cms-on-primary` before setting the panel theme.

### Patch Changes

- 57bbb58: README: a "Start a project" section with `init`, `admin` and `doctor`, the CLI commands in the overview, and the install example pinned to 0.9.0. `docs/deploy.md` (in the repository) gathers the hosted Supabase and Amplify steps.
- 2deeb66: The README and `linkchar-cms doctor` now require Supabase sign-ups off (`enable_signup = false` under `[auth]`) and two-step verification on (`[auth.mfa.totp]` enroll and verify). Supabase lets anyone sign up by default with the publishable key, and every new user gets an active `editor` profile: with sign-ups on, a stranger could create a user and edit drafts.
  
  To update a project: set `enable_signup = false` and the `[auth.mfa.totp]` flags in `supabase/config.toml` and restart Supabase; on the hosted project, turn off Authentication → Sign In / Providers → "Allow new users to sign up" (or `supabase config push`). `linkchar-cms doctor` checks the local file.

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
