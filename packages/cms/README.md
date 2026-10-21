# @linkcharsoft/cms

Linkchar's CMS for Next.js projects: a content schema in code, Supabase storage, an editor panel and site readers. The package ships TypeScript source; the project compiles it.

> 0.6.x ships the core, the server layer (Supabase queries and actions, with a `logger` the project provides), publishing (Amplify and a local mock), the migrations, the editor panel with its theme and catalogs (`es`, `en`) and its per-language editing, the site readers (`cms.site`, `@linkcharsoft/cms/site`), `withCms` (`@linkcharsoft/cms/next`) and the `linkchar-cms` CLI. The changes of each version are in [CHANGELOG.md](./CHANGELOG.md), which ships with the package.

Sections: [Install](#install) · [Configure](#configure) · [Schema texts](#schema-texts) · [Localized content](#localized-content) · [URLs per locale](#urls-per-locale) · [Links](#links) · [Database](#database) · [Supabase](#supabase) · [Server](#server) · [Site](#site) · [Next config](#next-config) · [Field kinds](#field-kinds) · [Panel](#panel) · [Theme](#theme) · [Panel texts](#panel-texts) · [Extensions](#extensions) · [Amplify setup](#amplify-setup) · [Upgrade](#upgrade) · [Development](#development)

## Install

The package lives in GitHub Packages. The project's `.npmrc` only names the registry:

```ini
@linkcharsoft:registry=https://npm.pkg.github.com
```

The token goes in the user-level config, never in the project: pnpm does not expand `${…}` in credentials from a project `.npmrc`. It needs `read:packages` on the Linkcharsoft organization.

```bash
# once per machine
pnpm config set //npm.pkg.github.com/:_authToken <token> --location global

# in CI or Amplify, before installing (GITHUB_PACKAGES_TOKEN as a secret)
echo "//npm.pkg.github.com/:_authToken=${GITHUB_PACKAGES_TOKEN}" >> ~/.npmrc
```

The project needs pnpm 12 and Node 24. Install the package with its peers, pinned (the project's `package.json` keeps exact versions; the package declares its peers as ranges):

```bash
pnpm add @linkcharsoft/cms@0.6.1 @supabase/ssr @supabase/supabase-js server-only
pnpm add -D sass tailwindcss@3 postcss autoprefixer supabase
```

pnpm 12 holds back versions published less than a day ago (`minimumReleaseAge`): the day a version comes out, `pnpm add @linkcharsoft/cms` resolves an older one. Name the version, as above, and exclude the package from the hold. The Supabase CLI also needs its build script allowed:

```yaml
# pnpm-workspace.yaml
allowBuilds:
  supabase: true
minimumReleaseAgeExclude:
  - '@linkcharsoft/cms'
```

The panel is styled with Tailwind 3 and Sass, compiled by the project (`tailwindcss` and `sass` are peer dependencies; `postcss` and `autoprefixer` are Tailwind's own requirement). The preset brings the panel tokens; presets can't add `content`, so the project spreads the package sources into it:

```js
// tailwind.config.js
import cmsPreset, { cmsContent } from '@linkcharsoft/cms/tailwind'

export default { presets: [cmsPreset], content: ['./src/**/*.{ts,tsx}', ...cmsContent()] }
```

```js
// postcss.config.js
module.exports = { plugins: { tailwindcss: {}, autoprefixer: {} } }
```

Tailwind 4 is not supported: the preset and the panel classes are Tailwind 3.

## Configure

The schema is code. A page has sections, a collection has a title field and a slug; everything else is a field kind:

```ts
// src/cms/schema.ts
import { collection, defineSchema, image, page, richText, section, slug, text, textarea } from '@linkcharsoft/cms/core'

export const schema = defineSchema({
  home: page({ es: 'Inicio', en: 'Home' }, {
    hero: section('Portada', {
      title: text({ label: 'Título', required: true, maxLength: 80 }),
      intro: textarea({ label: 'Introducción', rows: 3 }),
      cover: image({ label: 'Imagen de portada', required: true, folder: 'sitio' })
    }, { anchor: 'inicio', icon: 'pi-home' })
  }),
  posts: collection('Blog', {
    title: text({ label: 'Título', required: true, maxLength: 120 }),
    slug: slug({ label: 'Dirección', from: 'title', required: true }),
    body: richText({ label: 'Texto', required: true, headings: [2, 3, 4] })
  }, { singularLabel: { es: 'Artículo', en: 'Post' }, titleField: 'title', slugField: 'slug', path: '/blog/:slug', icon: 'pi-book' })
})
```

The config takes the schema, the languages, the panel's path and what the site needs to build absolute URLs:

```ts
// cms.config.ts
import { defineCmsConfig } from '@linkcharsoft/cms/core'
import { openingHours } from '@linkcharsoft/cms/core/opening-hours'
import { schema } from './src/cms/schema'

const cmsConfig = defineCmsConfig({
  schema,
  basePath: '/dashboard',
  locales: ['es', 'en'],
  defaultLocale: 'es',
  timeZone: 'America/Argentina/Buenos_Aires',
  branding: { name: 'Acme' },
  mediaFolders: [{ value: 'sitio', label: 'Sitio' }],
  fields: [openingHours],
  site: { url: process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000', titleTemplate: '%s | Acme' }
})

declare module '@linkcharsoft/cms/core' {
  interface Register { config: typeof cmsConfig }
}

export default cmsConfig
```

Registering the config types everything from the schema: `ContentOf<'home'>['hero']['title']` is `string`, `EntryIdType` lists the entries and `LocaleType` the locales. `site.url` is required for the sitemap and makes canonical URLs, hreflang and Open Graph absolute; `timeZone` is the zone the panel shows dates in. The config is imported by the browser, the proxy and the site, so it holds no secrets and no server code.

## Schema texts

`label`, `help` and option labels take a string, one text per language (`{ es: 'Título', en: 'Title' }`) or a package message (`msg('seo.title')`). The panel shows them in its language (`panelLocale`, Spanish by default), and a project can override any package text with `messages: { es: { collection: { new: 'Nueva {name}' } } }`.

## Localized content

Text kinds keep one value per locale, `{ es: 'Hola', en: 'Hello' }`, even with a single locale. Images, galleries and files keep the original and, only when someone sets one, a version per locale; an empty one (`null`, `[]`) reuses the original. Everything else is shared. A field can opt out or in with `localized: false | true`.

- `withDefaults(config, fields, data)` repairs stored content into that shape.
- `resolveContent(config, fields, data, locale)` gives the site plain values for one locale.
- `missingContent(config, fields, data, { mediaAlt })` lists what keeps a document out of the publication, each item with its field and locale (`{ path: 'hero.title.en', field: 'hero.title', locale: 'en', kind: 'field' }`): required values, texts filled in the default locale but empty in another, and the alt texts of the images in use. The editor, the lists and Publish use it; `countByLocale` and `countBySectionAndLocale` count it, `splitLocale` separates a path from its locale and `missingAltLocales(config, alt)` names the locales a file still lacks an alt text in.
- `missingTranslations(config, fields, data, { mediaAlt })` is the translations-only part.
- `displayStatus(status, incomplete)` turns a stored status into what the panel shows: a `new` or `changed` document with missing content reads "Incompleto" (`incomplete`) instead of "Listo para publicar" or "Cambios sin publicar".

## URLs per locale

An entry's `path` is one pattern for every locale or one per locale; collections end in `:slug`. The default locale has no prefix and the others get theirs:

```ts
about: page('Estudio', { /* … */ }, { path: { es: '/estudio', en: '/studio' } })      // /estudio, /en/studio
posts: collection('Blog', { /* … */ }, { slugField: 'slug', path: '/blog/:slug' })   // /blog/casa, /en/blog/house
```

`defineCmsConfig` checks the patterns. An entry that lives inside another page (the footer, the menu) has no path; `previewPath: '/'` with an `anchor` says where the panel previews it, and several entries may share it. Slugs are translated like any text, and each locale's slug must be unique in its collection: saving gives an automatic slug a free variant ("casa-2") and keeps a typed one with an error. Publishing stores the live URL of every locale and leaves a 301 from the old one when it changes, pages included. Changing a pattern in code doesn't create the 301 until the page or document is published again.

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

`sync` never rewrites a file it already copied; a migration the project edited shows as `!` in its output and stays as it is. The project's own migrations go with later timestamps. The base migration (`20261020000000_cms_base.sql`) holds roles, content, media (alt text and caption per locale), logs, publishing, checkpoints and `media_usage`; later ones add per-locale slugs, `document_usage`, `publish_log.retry_of` and `media.hash`.

## Supabase

A new project starts from the Supabase CLI and the package's migrations:

```bash
supabase init
pnpm exec linkchar-cms migrations sync
supabase start      # local: pnpm exec supabase status prints the keys
supabase db push    # hosted: after supabase link
```

`supabase/config.toml` needs, under `[auth]`, the panel's origin and the password rules the panel states ("Al menos 10 caracteres, con letras y números."):

```toml
[auth]
site_url = "http://127.0.0.1:3000"
additional_redirect_urls = ["http://localhost:3000"]
minimum_password_length = 10
password_requirements = "letters_digits"
```

Hosted projects set the same values in the dashboard (Authentication → URL configuration and Sign In / Providers → Email).

**Email templates.** Supabase's default invitation and recovery emails link to `/auth/v1/verify?token=…&redirect_to=<site_url>`; the panel only accepts `/dashboard/auth/confirm?token_hash=…&type=…`, so without templates nobody can accept an invitation or reset a password. Each project ships its own, with `{{ .SiteURL }}` and its `basePath`:

```toml
[auth.email.template.invite]
subject = "Te invitaron al panel de contenido"
content_path = "./supabase/templates/invite.html"

[auth.email.template.recovery]
subject = "Elegí una contraseña nueva"
content_path = "./supabase/templates/recovery.html"
```

```html
<!-- supabase/templates/invite.html -->
<h2>Te invitaron al panel de contenido</h2>
<p>Para crear tu usuario, elegí tu contraseña desde este link:</p>
<p><a href="{{ .SiteURL }}/dashboard/auth/confirm?token_hash={{ .TokenHash }}&amp;type=invite">Crear mi usuario</a></p>
```

The recovery template is the same link with `type=recovery`. `config.toml` templates apply to the local Supabase after `supabase stop && supabase start`; the hosted project takes them from Authentication → Emails (the CLI pushes them with `supabase config push`). Locally, Mailpit shows every email at the `MAILPIT_URL` that `supabase status` prints.

**First superadmin.** Invitations come from the panel, so the first user is promoted by hand after signing up or being invited from the Supabase dashboard:

```sql
update public.profiles set role = 'superadmin', can_publish = true
where id = (select id from auth.users where email = 'ana@acme.com');
```

**Adopting an existing database.** A project that already had the tables before the package compares its schema with the package's migrations and marks them as applied instead of running them:

```bash
pnpm exec linkchar-cms migrations sync
supabase db diff --linked -f cms_parity    # review: what the project still lacks (columns, views, function signatures)
supabase migration repair --status applied <timestamp>…
supabase db push                           # applies the parity migration and whatever comes after
```

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
    : mockBuild(),
  logger: { error: (message, detail) => console.error('[cms]', message, detail) }
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
- `logger` is where the server reports the failures it swallows (best-effort writes, the build hook, activity rows): `{ error(message, detail?) }`, the console by default. It reaches every server function as `ctx.logger` and the publish targets as part of their trigger context.

Publishing calls the `PublishTarget`. With Amplify, the build hook queues a build and the EventBridge rule reports its status with `Authorization: Bearer <CMS_BUILD_WEBHOOK_SECRET>` (see [Amplify setup](#amplify-setup)). A status event for an unknown job goes to the oldest open publish of the last 30 minutes. A failed build stores `publish_log.error_code` (`target_missing`, `hook_refused`, `hook_unreachable`, `build_failed`, `build_cancelled`), which the panel translates (`errors.build.*`) and offers to retry. The mock build reports `started` and then the result in-process: `mockBuild({ result: 'failed' | 'cancelled', seconds })` reproduces the failures locally.

## Site

`cms.site` reads content per locale, typed from the schema and ready to render: images with their alt text in the locale, links and buttons with their URL in the locale, rich text with its images and links resolved. A page reads as a `SiteDocumentType`: the content under `.content`, its URL in every language under `.urls`.

```tsx
// src/screens/HomeScreen.tsx, rendered by src/app/(es)/page.tsx and src/app/(en)/en/page.tsx
import { imageProps, JsonLd } from '@linkcharsoft/cms/site'
import Image from 'next/image'
import { cms } from '@/cms/server'
import type { LocaleType } from '@linkcharsoft/cms/core'
import type { Metadata } from 'next'

export const homeMetadata = async (locale: LocaleType): Promise<Metadata> =>
  cms.site.metadata(await cms.site.getEntryContent('home', { locale }))

const HomeScreen = async ({ locale }: { locale: LocaleType }) => {
  const home = await cms.site.getEntryContent('home', { locale })
  const { hero } = home.content
  return (
    <main>
      <JsonLd data={cms.site.jsonLd(home)} />
      <h1>{hero.title}</h1>
      {hero.intro && <p>{hero.intro}</p>}
      {hero.cover?.width && hero.cover.height && <Image {...imageProps(hero.cover, { sizes: '100vw' })} priority />}
    </main>
  )
}

export default HomeScreen
```

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
- `sitemap()` lists every published URL with its languages: `export default () => cms.site.sitemap()` in `src/app/sitemap.ts`. It throws when the config has no `site.url`; `absoluteUrl` alone still returns relative paths.
- `metadata(document)` gives the title with `site.titleTemplate`, the canonical URL, hreflang and Open Graph; `site.url` makes them absolute.

**App structure.** The panel's root layout (`src/app/(cms)/layout.tsx`) renders its own `<html>`, so the site lives in route groups with their own root layout: `src/app/(es)/layout.tsx` with `page.tsx`, `blog/…` for the default locale and `src/app/(en)/layout.tsx` with `en/page.tsx`, `en/blog/…` for the others. Shared screens (`src/screens/*`) take the locale as a prop.

In Draft Mode (the panel preview) with an active panel user the readers return drafts. Otherwise they read the published copy without touching cookies, so the pages stay static and each publish rebuilds the site.

**Preview.** Render `DraftRefresh` in Draft Mode from the site's layout or frame: it refreshes the page after each autosave, scrolls to the section being edited and shows the exit link (`/api/cms/disable-draft`). `locale` picks the language of the link; `label` and `className` replace its text and look.

```tsx
import { DraftRefresh } from '@linkcharsoft/cms/site'
import { draftMode } from 'next/headers'

// inside an async layout or frame component
{(await draftMode()).isEnabled && <DraftRefresh locale={locale} />}
```

## Next config

```ts
// next.config.ts
import { withCms } from '@linkcharsoft/cms/next'

export default withCms({ reactStrictMode: true })
```

`withCms` compiles the package with the project, allows images from the Supabase bucket and adds the 301s publishing left to `redirects()`, read once per build with `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. The build fails if they can't be read; `withCms(config, { redirects: false })` skips them. `next typegen` (and so `tsc` after it) does not read them, so type checks work with the database off.

## Field kinds

Every kind is one `defineField` call: default, normalization, emptiness, validation, references, diff summary and localization. A project adds its own; this is the playground's color kind, complete:

```ts
// src/cms/fields/color.ts
import { defineField, issue, noReferences } from '@linkcharsoft/cms/core'
import type { BaseOptions } from '@linkcharsoft/cms/core'

export interface ColorField extends BaseOptions<string> {
  kind: 'color'
  swatches?: readonly string[]
}

declare module '@linkcharsoft/cms/core' {
  interface FieldTypes<F> {
    color: { field: ColorField, value: string, localize: false }
  }
}

const HEX = /^#[0-9a-f]{6}$/i

export const color = defineField({
  kind: 'color',
  localize: false,
  defaultValue: () => '',
  normalize: value => (typeof value === 'string' && HEX.test(value) ? value.toLowerCase() : ''),
  isEmpty: value => typeof value !== 'string' || !value,
  validate: (value, _field, ctx) => {
    if (value === null || value === undefined || value === '') return ctx.required ? [issue('required')] : []
    return typeof value === 'string' && HEX.test(value) ? [] : [{ ...issue('pattern'), message: { es: 'Usá un color como #1f5fa8', en: 'Use a color like #1f5fa8' } }]
  },
  references: noReferences,
  summarize: value => String(value).toUpperCase()
})
```

`cms.config.ts` registers it with `fields: [color]` and the schema uses it as `color({ label: 'Color de marca', default: '#1f5fa8' })`. Leaving out a part, or returning the wrong value type, is a type error. A schema that uses a kind the config does not register fails when `defineCmsConfig` runs. Per field, `validate` adds a rule (sync or async) and `component` replaces the panel input.

The panel input of a project kind is registered on the client, never in the config (the config also reaches the proxy and the site, which must not bundle panel code). It is a `'use client'` component that receives `{ name, field }` and binds with the package's Formik helpers:

```tsx
// src/cms/fields/ColorInput.tsx
'use client'
import { describedBy, fieldId, InputContainer, useField, useFieldError, useFieldLabel, useText } from '@linkcharsoft/cms/panel'
import type { ColorField } from './color'
import type { FieldInputPropsType } from '@linkcharsoft/cms/panel'

const ColorInput = ({ name, field }: FieldInputPropsType<ColorField>) => {
  const text = useText()
  const label = useFieldLabel()
  const [{ value, onBlur }, , { setValue }] = useField<string>(name)
  const error = useFieldError(name)
  const id = fieldId(name)

  return (
    <InputContainer label={label(field)} htmlFor={id} error={error} help={text(field.help)}>
      <div className='flex items-center gap-3'>
        <input
          type='color'
          aria-label={label(field)}
          className='h-11 w-14 cursor-pointer rounded-lg border border-cms-border-strong bg-cms-surface'
          value={value || '#000000'}
          onChange={event => setValue(event.target.value)}
        />
        <input
          id={id}
          name={name}
          value={value ?? ''}
          placeholder='#1f5fa8'
          autoComplete='off'
          aria-describedby={describedBy(name, field)}
          className='h-11 flex-1 rounded-lg border border-cms-border-strong px-3 cms-text-regular-14'
          onBlur={onBlur}
          onChange={event => setValue(event.target.value)}
        />
      </div>
    </InputContainer>
  )
}

export default ColorInput
```

```ts
// src/cms/client.ts
'use client'
import { createCmsClient } from '@linkcharsoft/cms/panel/client'
import cmsConfig from '../../cms.config'
import * as actions from './actions'

export const CmsClient = createCmsClient({ config: cmsConfig, actions, inputs: { color: () => import('./fields/ColorInput') } })
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

A document with missing content reads "Incompleto" in the editor, the tables (which filter by it) and the overview; the header's "Publicar" counter only counts the changes the next publish takes, and refreshes with each save. Publish lets the user tick which changes go out. Each missing item in Publish links to its field: `paths.field(kind, entryId, id, { field, locale })` builds `/dashboard/paginas/home?locale=en#hero.title`, and the editor opens and focuses any field named in the hash (`#services` alone still opens the section).

Uploading a file the library already has (same bytes, SHA-256 of the original file) offers the existing one instead of a copy. Drafts created with "Nuevo …" and never touched disappear after a day; the overview warns about hidden drafts nobody touched for two weeks.

## Theme

Three variables re-style the whole panel, PrimeReact included. Set them on `:root` in the project's CSS, imported from the panel's root layout:

```css
:root {
  --cms-primary: #0f7a5c;
  --cms-sidebar: #12302a;     /* optional: by default, the primary darkened */
  --cms-on-primary: #ffffff;  /* optional: text on the primary; keep it at 4.5:1 against --cms-primary */
}
.CmsRoot {
  --cms-font-sans: var(--font-inter), system-ui, sans-serif;  /* next/font variables live on <body> */
  --cms-font-display: var(--font-manrope), sans-serif;
}
```

Hovers, tints, rings and the sidebar states derive from those with `color-mix()`; neutrals and the error, warning and success colors are fixed. Every derived value is also a variable (`--cms-primary-50`, `--cms-sidebar-hover`…), so a project can pin one. The root layout passes classes to `<body>` with `rootLayout(cms, CmsClient, { className: inter.variable })`. The theme is Tailwind 3 only.

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

## Amplify setup

Publishing on Amplify is a build hook plus one EventBridge rule that reports the build's end to the project.

1. **Environment variables** of the Amplify app: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `NEXT_PUBLIC_SITE_URL`, `CMS_BUILD_HOOK_URL` (the app's incoming webhook for the branch) and `CMS_BUILD_WEBHOOK_SECRET` (any long random string). `GITHUB_PACKAGES_TOKEN` for the install, written to `~/.npmrc` in the build's `preBuild`.
2. **EventBridge rule** on the default bus with this pattern, so only this app and branch count:

   ```json
   { "source": ["aws.amplify"], "detail-type": ["Amplify Deployment Status Change"], "detail": { "appId": ["<appId>"], "branchName": ["main"] } }
   ```

3. **API destination** as the rule's target: endpoint `https://<site>/api/cms/build-status`, method `POST`, with a **Connection** of type API key, key `Authorization`, value `Bearer <CMS_BUILD_WEBHOOK_SECRET>`. No input transformer: the handler reads Amplify's own event (`jobId`, `jobStatus`).
4. The handler maps `SUCCEED`, `FAILED` and `CANCELLED` to the publish log; an event for a job the panel didn't start matches the oldest open publish of the last 30 minutes. A publish without an answer after 30 minutes reads "sin confirmar" and can be retried.

A weekly scheduled build (Amplify's own, or a cron hitting the hook) keeps the site's static pages from drifting from drafts nobody published.

## Upgrade

```bash
pnpm up @linkcharsoft/cms@<version>
pnpm exec linkchar-cms migrations sync && supabase db push   # when the version brings migrations
pnpm exec linkchar-cms routes                                # when it brings actions, routes or handlers
pnpm type-check
```

[CHANGELOG.md](./CHANGELOG.md) says, per version, what a project has to run ("To update a project: …") and which exports changed. `routes --check` and `migrations sync --check` in CI catch a project that forgot a step.

## Development

This repo is a pnpm workspace: `packages/cms` and `apps/playground`, a Next app with a studio schema used by the tests.

```bash
pnpm install
pnpm verify                        # lint, types, unit tests; works with the database off
pnpm --filter playground db:start  # local Supabase on 5442x, with the QA users of supabase/seed.sql
pnpm --filter playground db:test   # pgTAP
pnpm --filter @linkcharsoft/cms test:db   # integration suite against that database
pnpm --filter playground dev       # http://localhost:3100/dashboard (qa-super@local.test / QaLocal12345)
pnpm --filter playground routes    # regenerates the playground's panel routes
```

The package is five layers, and ESLint zones keep them apart: `core` (schema, validation, URLs, catalogs; imports no other layer and no framework), `publish` (imports `core`), `site` (imports `core` and `publish`), `server` (imports any of them) and `panel` (never imports the server's values, types aside; only its `routes/**` import the `cms` instance). `server-only` is declared once, in `server/index.ts`.

The end-to-end suite (`apps/playground/e2e`, Playwright) runs against `next start` of two builds: the panel in Spanish on :3100 and in English on :3101. It needs the local Supabase and resets the QA users before running:

```bash
pnpm --filter playground build
NEXT_PUBLIC_CMS_PANEL_LOCALE=en NEXT_DIST_DIR=.next-en pnpm --filter playground build
pnpm --filter playground test:e2e
```

`PLAYWRIGHT_CHROMIUM_PATH` points it to an already installed Chromium instead of the one Playwright downloads. The invitation and recovery tests read the local Mailpit.

`apps/playground/.env.example` lists the variables; `pnpm --filter playground db:status` prints the local keys. After changing a migration, `pnpm db:types` regenerates `src/server/database.ts`.

Releases use changesets (see [.changeset/README.md](../../.changeset/README.md)): every change adds one, merging to `main` opens the version PR, and merging that PR publishes to GitHub Packages, after CI builds and checks the tarball (`publint` and `scripts/check-pack.mjs`). The decisions behind the package's shape are in [docs/decisions.md](../../docs/decisions.md).
