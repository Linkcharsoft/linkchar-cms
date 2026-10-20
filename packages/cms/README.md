# @linkcharsoft/cms

Linkchar's CMS for Next.js projects: a content schema in code, Supabase storage, an editor panel and site readers. The package ships TypeScript source; the project compiles it.

> 0.5.x ships the core, the server layer (Supabase queries and actions), publishing (Amplify and a local mock), the migrations, the editor panel with its theme and catalogs (`es`, `en`) and its per-language editing, the site readers (`cms.site`, `@linkcharsoft/cms/site`), `withCms` (`@linkcharsoft/cms/next`) and the `linkchar-cms` CLI.

## Install

The package lives in GitHub Packages. The project's `.npmrc` only names the registry:

```ini
@linkcharsoft:registry=https://npm.pkg.github.com
```

The token goes in the user-level config, never in the project: pnpm 11 does not expand `${…}` in credentials from a project `.npmrc`. It needs `read:packages` on the Linkcharsoft organization.

```bash
# once per machine
pnpm config set //npm.pkg.github.com/:_authToken <token> --location global

# in CI or Amplify, before installing (GITHUB_PACKAGES_TOKEN as a secret)
echo "//npm.pkg.github.com/:_authToken=${GITHUB_PACKAGES_TOKEN}" >> ~/.npmrc
```

Then:

```bash
pnpm add @linkcharsoft/cms
```

```ts
// next.config.ts: compiles the package with the project (see "Next config")
import { withCms } from '@linkcharsoft/cms/next'

export default withCms({})
```

The panel is styled with Tailwind 3 and Sass, compiled by the project (`tailwindcss`, `postcss` and `sass` are peer dependencies). The preset brings the panel tokens; presets can't add `content`, so the project spreads the package sources into it:

```js
// tailwind.config.js
import cmsPreset, { cmsContent } from '@linkcharsoft/cms/tailwind'

export default { presets: [cmsPreset], content: ['./src/**/*.{ts,tsx}', ...cmsContent()] }
```

## Configure

```ts
// cms.config.ts
import { defineCmsConfig } from '@linkcharsoft/cms/core'
import { openingHours } from '@linkcharsoft/cms/core/opening-hours'
import { schema } from './src/cms/schema'

const cmsConfig = defineCmsConfig({
  schema,
  locales: ['es', 'en'],
  defaultLocale: 'es',
  branding: { name: 'Acme' },
  mediaFolders: [{ value: 'site', label: 'Sitio' }],
  fields: [openingHours]
})

declare module '@linkcharsoft/cms/core' {
  interface Register { config: typeof cmsConfig }
}

export default cmsConfig
```

Registering the config types everything from the schema: `ContentOf<'home'>['hero']['title']` is `string`, `EntryIdType` lists the entries and `LocaleType` the locales.

## Schema texts

`label`, `help` and option labels take a string, one text per language (`{ es: 'Título', en: 'Title' }`) or a package message (`msg('seo.title')`). The panel shows them in its language (`panelLocale`, Spanish by default), and a project can override any package text with `messages: { es: { collection: { new: 'Nueva {name}' } } }`.

## Localized content

Text kinds keep one value per locale, `{ es: 'Hola', en: 'Hello' }`, even with a single locale. Images, galleries and files keep the original and, only when someone sets one, a version per locale; an empty one (`null`, `[]`) reuses the original. Everything else is shared. A field can opt out or in with `localized: false | true`.

- `withDefaults(config, fields, data)` repairs stored content into that shape.
- `resolveContent(config, fields, data, locale)` gives the site plain values for one locale.
- `missingContent(config, fields, data, { mediaAlt })` lists what keeps a document out of the publication, each item with its field and locale (`{ path: 'hero.title.en', field: 'hero.title', locale: 'en', kind: 'field' }`): required values, texts filled in the default locale but empty in another, and the alt texts of the images in use. The editor and Publish use it; `countByLocale` and `countBySectionAndLocale` count it, `splitLocale` separates a path from its locale and `missingAltLocales(config, alt)` names the locales a file still lacks an alt text in.
- `missingTranslations(config, fields, data, { mediaAlt })` is the translations-only part.

## URLs per locale

An entry's `path` is one pattern for every locale or one per locale; collections end in `:slug`. The default locale has no prefix and the others get theirs:

```ts
about: page('Estudio', { /* … */ }, { path: { es: '/estudio', en: '/studio' } })      // /estudio, /en/studio
posts: collection('Blog', { /* … */ }, { slugField: 'slug', path: '/blog/:slug' })   // /blog/casa, /en/blog/house
```

`defineCmsConfig` checks the patterns. Slugs are translated like any text, and each locale's slug must be unique in its collection: saving gives an automatic slug a free variant ("casa-2") and keeps a typed one with an error. Publishing stores the live URL of every locale and leaves a 301 from the old one when it changes, pages included. Changing a pattern in code doesn't create the 301 until the page or document is published again.

`entryPath(config, entry, { locale, slug })`, `entryUrls`, `slugsOf`, `localePrefix`, `alternates` and `absoluteUrl` build the same URLs anywhere (the panel preview, the site, a sitemap).

## Links

A `link` field, a button's link and a rich text link point to a page or document of the site (`{ type: 'entry', entry: 'posts', id, anchor }`), so the site writes its URL in each language and removing the document warns about the link. "Other address" (`type: 'internal'`) keeps a path typed by hand, the same in every language, for screens the CMS doesn't manage. Rich text images keep only their media id: URL, size and alt text come from Media when the text is read.

## Database

The package ships its migrations and pgTAP suites. Copy them into the project and push them as usual:

```bash
pnpm exec linkchar-cms migrations sync          # copies what supabase/migrations lacks, never rewrites a file
pnpm exec linkchar-cms migrations sync --check  # CI: exit 1 when the project is behind the package
supabase db push
supabase test db                                # the package suites land in supabase/tests/cms
```

The project's own migrations go with later timestamps. The base migration (`20261020000000_cms_base.sql`) holds roles, content, media (alt text and caption per locale), logs, publishing, checkpoints and `media_usage`.

## Server

The project owns one server instance: it reads its environment and passes everything in. Nothing in the package reads `process.env`.

```ts
// src/cms/server.ts
import 'server-only'
import { amplify } from '@linkcharsoft/cms/publish/amplify'
import { mockBuild } from '@linkcharsoft/cms/publish/mock'
import { createCmsServer } from '@linkcharsoft/cms/server'
import cmsConfig from '../../cms.config'

export const cms = createCmsServer({
  config: cmsConfig,
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    publishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    secretKey: process.env.SUPABASE_SECRET_KEY
  },
  publishTarget: process.env.CMS_BUILD_HOOK_URL
    ? amplify({ hookUrl: process.env.CMS_BUILD_HOOK_URL, webhookSecret: process.env.CMS_BUILD_WEBHOOK_SECRET })
    : mockBuild()
})
```

```ts
// src/proxy.ts: refreshes the session and keeps signed-out users on the sign-in screens.
// Next reads the matcher statically, so it stays a literal: `linkchar-cms routes --check` compares it with basePath.
export const proxy = cms.proxy
export const config = { matcher: ['/dashboard/:path*'] }
```

The server actions, the build status webhook and the panel routes are generated (see [Panel](#panel)).

- `cms.actions` check the user's role, write through RLS and return catalog keys as errors (`errors.publish.stale`), never prose.
- `cms.queries` read for panel pages (`cms.queries.requireRole('admin')` redirects whoever may not see one).
- The server functions also take the context directly (`saveDocument(ctx, input)`), which is how the tests run them.

Publishing calls the `PublishTarget`. With Amplify, the build hook queues a build and the EventBridge rule reports its status with `Authorization: Bearer <CMS_BUILD_WEBHOOK_SECRET>`. A status event for an unknown job goes to the oldest open publish of the last 30 minutes. A failed build stores `publish_log.error_code` (`target_missing`, `hook_refused`, `hook_unreachable`, `build_failed`), which the panel translates (`errors.build.*`). The mock build reports `started` and then the result in-process.

## Site

`cms.site` reads content per locale, typed from the schema and ready to render: images with their alt text in the locale, links and buttons with their URL in the locale, rich text with its images and links resolved.

```tsx
// src/app/(en)/en/blog/[slug]/page.tsx
import { imageProps, JsonLd, RichText } from '@linkcharsoft/cms/site'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { cms } from '@/cms/server'

type Props = { params: Promise<{ slug: string }> }

const read = async ({ params }: Props) => cms.site.getDocumentBySlug('posts', (await params).slug, { locale: 'en' })

export const generateStaticParams = () => cms.site.staticParams('posts', { locale: 'en' })
export const generateMetadata = async (props: Props) => {
  const post = await read(props)
  return post ? cms.site.metadata(post) : {}
}

const PostPage = async (props: Props) => {
  const post = await read(props)
  if (!post) notFound()
  const { title, cover, body } = post.content
  return (
    <article>
      <JsonLd data={cms.site.jsonLd(post)} />
      <h1>{title}</h1>
      {cover && <Image {...imageProps(cover, { sizes: '100vw' })} />}
      <RichText value={body} />
    </article>
  )
}

export default PostPage
```

- `getEntryContent(id, { locale })` reads a page or singleton; before its first publish it reads as the schema defaults.
- `getDocumentBySlug`, `listDocuments` and `getDocuments` (in the order of a relation field) read collections.
- Every document carries `urls` with its URL in each locale, for the language switch.
- `sitemap()` lists every published URL with its languages: `export default () => cms.site.sitemap()` in `src/app/sitemap.ts`.
- `metadata(document)` gives the title with `site.titleTemplate`, the canonical URL, hreflang and Open Graph; `site.url` makes them absolute.

In Draft Mode (the panel preview) with a panel session the readers return drafts. Otherwise they read the published copy without touching cookies, so the pages stay static and each publish rebuilds the site.

## Next config

```ts
// next.config.ts
import { withCms } from '@linkcharsoft/cms/next'

export default withCms({ reactStrictMode: true })
```

`withCms` compiles the package with the project, allows images from the Supabase bucket and adds the 301s publishing left to `redirects()`, read once per build with `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. The build fails if they can't be read; `withCms(config, { redirects: false })` skips them.

## Field kinds

Every kind is one `defineField` call: default, normalization, emptiness, validation, references, diff summary, localization and the panel input. A project adds its own:

```ts
declare module '@linkcharsoft/cms/core' {
  interface FieldTypes<F> { color: { field: ColorField, value: string, localize: false } }
}

export const color = defineField({ kind: 'color', localize: false, defaultValue: () => '', /* … */ })
// cms.config.ts: fields: [color]; in the schema: color({ label: 'Color' })
```

Leaving out a part, or returning the wrong value type, is a type error. A schema that uses a kind the config does not register fails when `defineCmsConfig` runs.

Per field, `validate` adds a rule (sync or async) and `component` replaces the panel input.

The panel input of a project kind is registered on the client, never in the config (the config also reaches the proxy and the site, which must not bundle panel code). It is a `'use client'` component that receives `{ name, field }` and binds with the package's Formik helpers:

```tsx
// src/cms/fields/ColorInput.tsx
'use client'
import { fieldId, InputContainer, useField, useFieldError, useFieldLabel } from '@linkcharsoft/cms/panel'
import type { FieldInputPropsType } from '@linkcharsoft/cms/panel'

const ColorInput = ({ name, field }: FieldInputPropsType<ColorField>) => {
  const label = useFieldLabel()
  const [{ value }, , { setValue }] = useField<string>(name)
  return (
    <InputContainer label={label(field)} htmlFor={fieldId(name)} error={useFieldError(name)}>
      <input id={fieldId(name)} type='color' value={value} onChange={event => setValue(event.target.value)} />
    </InputContainer>
  )
}

export default ColorInput

// src/cms/client.ts: createCmsClient({ config, actions, inputs: { color: () => import('./fields/ColorInput') } })
```

A field's own `component` wins over the project's input for its kind, which wins over the package's. A kind without an input fails in the panel with a message that says where to add it. For translated fields, bind with `useValuePath(name, field)`: it points at `name.<locale>` for the language being edited.

To show what the package's inputs show while translating, pass `useLocaleNote(name, field)` to `InputContainer`: `badge` is "Same in every language" for a shared value, `note` the default language's text above a translation, and `describedBy` its id for the input (`describedBy(name, field, note.describedBy)`). `useEditingTranslation()` says whether another language than the default one is on screen; `useMediaVariant(name)` gives a file-like value its own version per language.

## Panel

The panel lives in the project's app as small generated files that import the package and the project's `cms` instance:

```bash
pnpm exec linkchar-cms routes          # writes the panel wiring under src/app/(cms)/<basePath>
pnpm exec linkchar-cms routes --check  # CI: exit 1 when a file is missing or stale, or the proxy matcher misses basePath
```

- `src/app/(cms)/<basePath>/…`: one file per screen (`export default route.Page`), the layouts, `loading.tsx`, and the email link and sign-out handlers.
- `src/app/api/cms/{build-status,draft,disable-draft}/route.ts`: the build webhook and the preview's Draft Mode.
- `src/cms/actions.ts`: `'use server'`, re-exports every action the browser calls.
- Created once and then owned by the project: `src/app/(cms)/layout.tsx` (the panel's root layout, where the theme CSS and fonts go) and `src/cms/client.ts` (`createCmsClient`, where project inputs are registered).

The command only rewrites or deletes files that start with its marker line, and reads `cms.config.ts` to know `basePath` and `paths`. A file without the marker belongs to the project and is never touched. Re-run it after upgrading the package or changing `basePath`/`paths`.

The URL segments are configurable and default to Spanish: `paths: { pages: 'paginas', publish: 'publicar', trash: 'papelera', … }` (see `DEFAULT_PANEL_SEGMENTS`).

`createCmsClient` mounts the panel's own providers: PrimeReact in unstyled mode with the panel passthrough (whatever the site configures), toasts, the confirmation dialog and motion. Panel screens render inside `CmsClient`; outside it, panel components throw.

The editor shows a language selector when the config has more than one locale, with what is missing in each language ("English · 3 missing"). Translated texts are edited per language (`?locale=en` in the URL), with the default language's text above each one; shared values say "Same in every language". Images, galleries and PDFs reuse the original until someone picks "Use another image for English", and "Back to the original" drops it. The page outline and each section count what is missing per language (`ES 1 · EN 3`), and Media marks and filters the images without alt text in a language.

Each missing item in Publish links to its field: `paths.field(kind, entryId, id, { field, locale })` builds `/dashboard/paginas/home?locale=en#hero.title`, and the editor opens and focuses any field named in the hash (`#services` alone still opens the section).

## Theme

Three variables re-style the whole panel, PrimeReact included. Set them on `:root` in the project's CSS, imported from the panel's root layout:

```css
:root {
  --cms-primary: #0f7a5c;
  --cms-sidebar: #12302a;     /* optional: by default, the primary darkened */
  --cms-on-primary: #ffffff;  /* optional */
}
.CmsRoot {
  --cms-font-sans: var(--font-inter), system-ui, sans-serif;  /* next/font variables live on <body> */
  --cms-font-display: var(--font-manrope), sans-serif;
}
```

Hovers, tints, rings and the sidebar states derive from those with `color-mix()`; neutrals and the error, warning and success colors are fixed. Every derived value is also a variable (`--cms-primary-50`, `--cms-sidebar-hover`…), so a project can pin one. The root layout passes classes to `<body>` with `rootLayout(cms, CmsClient, { className: inter.variable })`.

## Panel texts

The panel speaks `panelLocale` (`'es'` by default, `'en'` complete). A project overrides any text with `messages`, per language and key:

```ts
messages: { es: { shell: { tagline: 'Panel de Acme' } } }
```

Activity labels, document and publish statuses, roles and tour steps are catalog keys too.

## Extensions

`extensions` adds the project's own screens and links to the menu, with the panel layout:

```ts
extensions: [
  { id: 'stats', label: { es: 'Estadísticas', en: 'Statistics' }, icon: 'pi-chart-bar', group: 'admin', path: 'estadisticas' },
  { id: 'guide', label: 'Guía de marca', icon: 'pi-book', href: 'https://acme.com/marca' }
]
```

A `path` item is a route the project adds next to the generated ones (`src/app/(cms)/dashboard/(panel)/(admin)/estadisticas/page.tsx` for an admin screen, `(workspace)` otherwise). It reads its data with `cms.queries` and renders with the package's primitives:

```tsx
import { PanelScreen } from '@linkcharsoft/cms/panel'

const StatsPage = async () => {
  await cms.queries.requireRole('admin')
  return <PanelScreen title='Estadísticas'>{/* … */}</PanelScreen>
}
```

`group` is `content` (default), `site` or `admin` (admins only); `minRole` narrows any item.

## Development

This repo is a pnpm workspace: `packages/cms` and `apps/playground`, a Next app with a studio schema used by the tests.

```bash
pnpm install
pnpm verify                        # lint, types, unit tests
pnpm --filter playground db:start  # local Supabase on 5442x, with the QA users of supabase/seed.sql
pnpm --filter playground db:test   # pgTAP
pnpm --filter @linkcharsoft/cms test:db   # integration suite against that database
pnpm --filter playground dev       # http://localhost:3100/dashboard (qa-super@local.test / QaLocal12345)
pnpm --filter playground routes    # regenerates the playground's panel routes
```

The end-to-end suite (`apps/playground/e2e`, Playwright) runs against `next start` of two builds: the panel in Spanish on :3100 and in English on :3101. It needs the local Supabase and resets the QA users before running:

```bash
pnpm --filter playground build
NEXT_PUBLIC_CMS_PANEL_LOCALE=en NEXT_DIST_DIR=.next-en pnpm --filter playground build
pnpm --filter playground test:e2e
```

`PLAYWRIGHT_CHROMIUM_PATH` points it to an already installed Chromium instead of the one Playwright downloads.

`apps/playground/.env.example` lists the variables; `pnpm --filter playground db:status` prints the local keys. After changing a migration, `pnpm db:types` regenerates `src/server/database.ts`.

Releases use changesets: add one with `pnpm changeset`. Merging to `main` opens the version PR, and merging that PR publishes to GitHub Packages.
