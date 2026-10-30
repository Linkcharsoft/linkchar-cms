# @linkcharsoft/cms

Linkchar's CMS for Next.js projects: a content schema in code, Supabase storage, an editor panel and site readers. The package ships TypeScript source; the project compiles it.

> The package ships the core, the server layer (Supabase queries and actions, with a `logger` the project provides), publishing (Amplify and a local mock), the migrations, the editor panel with its theme and catalogs (`es`, `en`) and its per-language editing, the site readers (`cms.site`, `@linkcharsoft/cms/site`), `withCms` (`@linkcharsoft/cms/next`) and the `linkchar-cms` CLI (`init`, `routes`, `migrations sync`, `templates`, `admin`, `doctor`, `import`, `publish:ping`, `build:report`). The changes of each version are in [CHANGELOG.md](./CHANGELOG.md), which ships with the package.

Sections: [Install](#install) · [Start a project](#start-a-project) · [Configure](#configure) · [Schema texts](#schema-texts) · [Localized content](#localized-content) · [URLs per locale](#urls-per-locale) · [Links](#links) · [Database](#database) · [Supabase](#supabase) · [Server](#server) · [Site](#site) · [Next config](#next-config) · [Field kinds](#field-kinds) · [Panel](#panel) · [Brand](#brand) · [Panel texts](#panel-texts) · [Extensions](#extensions) · [Amplify setup](#amplify-setup) · [Import content](#import-content) · [Upgrade](#upgrade) · [Development](#development)

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
pnpm add @linkcharsoft/cms@0.9.0 @supabase/ssr @supabase/supabase-js server-only
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

The panel is styled with Tailwind 3 and Sass, compiled by the project (`tailwindcss` and `sass` are peer dependencies; `postcss` and `autoprefixer` are Tailwind's own requirement). The panel stylesheet compiles with the package's own Tailwind config (`@config`), which scans the package and the project's panel code (`src/cms/**` and `src/app/(cms)/**`, where its inputs and extension screens live), so the site's CSS carries no panel classes. The project's config only adds the preset, whose tokens the package's Sass `@apply`:

```js
// tailwind.config.js
import cmsPreset from '@linkcharsoft/cms/tailwind'

export default { presets: [cmsPreset], content: ['./src/**/*.{ts,tsx}'] }
```

PostCSS runs Tailwind through `@linkcharsoft/cms/tailwind/postcss`, the same Tailwind run per stylesheet. With `tailwindcss: {}`, Tailwind 3 keeps the panel's `@config` for every stylesheet compiled after it, so the site's Sass compiles with the panel config: `@apply` of the project's own screens and colors fails (`The inf-xs:… class does not exist`), in `next build` on a different file each time and in `next dev` on every route once the panel has been opened.

```js
// postcss.config.js
module.exports = { plugins: { '@linkcharsoft/cms/tailwind/postcss': {}, autoprefixer: {} } }
```

Tailwind 4 is not supported: the preset and the panel classes are Tailwind 3.

## Start a project

With the package installed and a Supabase folder (`supabase init`), `init` writes the starting point:

```bash
pnpm exec linkchar-cms init --name "Acme" --base-path /cms --locales es,en --panel-locale es --site-url https://acme.com
```

It writes only the files that don't exist yet and never touches the rest:

- `cms.config.ts` with the site defaults (`site.defaults`) and `Register` (config and database types);
- `src/cms/schema.ts` (a `settings` singleton and a home page, to rewrite with the real schema) and `src/cms/server.ts` (`publishTargetFromEnv`: Amplify when `CMS_BUILD_HOOK_URL` is set, the simulated build against a local Supabase, no build otherwise);
- `src/types/supabase.ts`, which re-exports the package types until `supabase gen types` replaces it;
- the panel's root layout (`app/(cms)/layout.tsx`);
- the site under `app/(site)/`: a root layout that renders `DraftRefresh` in Draft Mode, the home, the 404 and the catch-all that makes unmatched URLs reach it, plus `app/sitemap.ts` and `proxy.ts`.

A project whose site already has its root layout under a dynamic segment (`app/[lang]/layout.tsx`) keeps it there: `init` writes nothing under `app/(site)/`, sets `prefixDefaultLocale: true` and says where `DraftRefresh` goes.

Then it runs `templates`, `routes` and `migrations sync`, and lists what each project wires its own way: `withCms` in `next.config.ts`, the Tailwind preset, the environment variables, and, when they already exist, the project's proxy (it must send `basePath` requests to `cms.proxy`) and its root layout (it moves into `app/(site)/`).

```bash
supabase start && supabase db reset                               # the package migrations
pnpm exec linkchar-cms admin --email ana@acme.com --password '…'  # the first superadmin
pnpm exec linkchar-cms doctor                                     # everything above, checked
```

`doctor` checks the config, routes, migrations and email templates, the variables and `site.url`, that Supabase answers with the package tables (readable with the secret key) and a superadmin, the GitHub Packages token and `minimumReleaseAgeExclude`, the Tailwind plugin in the PostCSS config, and on Windows the Supabase ports: keep them below 49152, because Windows reserves blocks of the ports above it (Hyper-V, WSL, Docker) and a reserved port leaves a container without its host port. The project's check script keeps the generated parts honest:

```json
"check": "… && linkchar-cms routes --check && linkchar-cms migrations sync --check && linkchar-cms templates --check"
```

Deploying is in [docs/deploy.md](https://github.com/Linkcharsoft/linkchar-cms/blob/main/docs/deploy.md).

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

With `prefixDefaultLocale: true` the default locale gets its prefix too (`/es/estudio`, `/en/studio`, the home at `/es` and `/en`), for a site under `app/[lang]`; patterns then never start with a locale code. Turning it on in a live site needs a publish of every page and document: each one leaves its 301 from the old URL, and the sitemap follows.

`defineCmsConfig` checks the patterns. An entry that lives inside another page (the footer, the menu) has no path; `previewPath: '/'` with an `anchor` says where the panel previews it, and several entries may share it. Slugs are translated like any text, and each locale's slug must be unique in its collection: saving gives an automatic slug a free variant ("casa-2") and keeps a typed one with an error. Publishing stores the live URL of every locale and leaves a 301 from the old one when it changes, pages included. Changing a pattern in code doesn't create the 301 until the page or document is published again.

hreflang's `x-default` points to the default locale's URL; `site: { xDefault: 'en' }` points it to another locale's, for a site written first in Spanish whose visitors from elsewhere should land in English.

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

`sync` never rewrites a file it already copied; a migration the project edited shows as `!` in its output and stays as it is. The project's own migrations go with later timestamps. `doctor` compares the migrations a database applied (local, or hosted with `--env-file`) with the files of the package and the project through `cms_migrations()`, a function only the secret key may call, and names the ones a database lacks.

**Project tables.** Generate the project's types (`supabase gen types typescript --local > src/types/supabase.ts`, which includes the CMS tables) and register them next to the config: `interface Register { config: typeof cmsConfig, database: Database }`. Then `await cms.supabase()` is the request's session client (RLS applies) and `cms.supabaseAdmin()` the secret-key one, both typed with the project's tables; call `cms.queries.requireRole()` first, as in [Extensions](#extensions). The package's own code keeps its own types, so stale project types never break it. The base migration (`20261020000000_cms_base.sql`) holds roles, content, media (alt text and caption per locale), logs, publishing, checkpoints and `media_usage`; later ones add per-locale slugs, `document_usage`, `publish_log.retry_of`, `media.hash`, the `service_role` grants and `cms_migrations()`.

## Supabase

A new project starts from the Supabase CLI and the package's migrations:

```bash
supabase init
pnpm exec linkchar-cms migrations sync
supabase start      # local: pnpm exec supabase status prints the keys
supabase db push    # hosted: after supabase link
```

`supabase/config.toml` needs, under `[auth]`, the panel's origin, sign-ups off, the password rules the panel states ("Al menos 10 caracteres, con letras y números.") and two-step verification on:

```toml
[auth]
site_url = "http://127.0.0.1:3000"
additional_redirect_urls = ["http://localhost:3000"]
enable_signup = false
minimum_password_length = 10
password_requirements = "letters_digits"

[auth.mfa.totp]
enroll_enabled = true
verify_enabled = true
```

**Sign-ups must be off.** Supabase lets anyone sign up by default, with the publishable key every visitor already has, and every new user gets a panel profile (`editor`, active): left on, a stranger can create a user and edit drafts. Users come only from invitations and `linkchar-cms admin`. `supabase init` writes `enable_signup = true` and hosted projects start with "Allow new users to sign up" on; `linkchar-cms doctor` fails until it is off.

Hosted projects set the same values in the dashboard (Authentication → URL configuration and Sign In / Providers → Email).

**Data API privileges.** Hosted projects created with "Default privileges for new entities" off give `anon`, `authenticated` and `service_role` nothing on new tables, not even the secret key. The package migrations grant every role they rely on, so they work with the toggle on or off, and turning it on later fixes nothing for tables that already exist. Set `auto_expose_new_tables = false` under `[api]` so the local database behaves like such a project: the project's own tables then need their own grants, locally and hosted alike. `linkchar-cms doctor` fails when the secret key cannot read a package table.

**Email templates.** Supabase's default invitation and recovery emails link to `/auth/v1/verify?token=…&redirect_to=<site_url>`; the panel only accepts `/dashboard/auth/confirm?token_hash=…&type=…`, so without templates nobody can accept an invitation or reset a password. That page shows what the link does and a "Continuar" button, and verifies the token only when it is pressed: mail scanners open links before people do, and a token spent on arrival left them with "El link venció". Each project ships its own, with `{{ .SiteURL }}` and its `basePath`. `linkchar-cms templates` writes both in the panel language (the `emails.*` catalog keys, so `messages` can reword them) with Inferencia's brand and the product name (`branding.name`), and adds them to `config.toml`. It never rewrites a template the project edited; one still as 0.10 wrote it takes the branded version. `--check` fails while one is missing, unbranded or links elsewhere. What it writes:

```toml
[auth.email.template.invite]
subject = "Te invitaron al panel de contenido"
content_path = "./supabase/templates/invite.html"

[auth.email.template.recovery]
subject = "Elegí una contraseña nueva"
content_path = "./supabase/templates/recovery.html"
```

`supabase/templates/invite.html` is a table with inline styles (email clients drop `<style>`, flexbox and SVG): the dark Inferencia header with the product name, the title, the text, a violet button to `{{ .SiteURL }}/dashboard/auth/confirm?token_hash={{ .TokenHash }}&amp;type=invite` and the note for who didn't expect it. The recovery template is the same with `type=recovery`. `config.toml` templates apply to the local Supabase after `supabase stop && supabase start`; the hosted project takes them from Authentication → Emails (the CLI pushes them with `supabase config push`). Locally, Mailpit shows every email at the `MAILPIT_URL` that `supabase status` prints.

**First superadmin.** Invitations come from the panel, so the first user comes from the CLI, with `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SECRET_KEY` from the environment or `--env-file` (`.env.local` by default):

```bash
pnpm exec linkchar-cms admin --email ana@acme.com --password '…' --name 'Ana'  # created, confirmed and promoted
pnpm exec linkchar-cms admin --email ana@acme.com                              # invited by email instead (needs SMTP)
```

An existing user is promoted; with `--password` it also gets that password and a confirmed email, so a pending invitation can sign in. By hand, the same promotion is:

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
import { publishTargetFromEnv } from '@linkcharsoft/cms/publish'
import { createCmsServer } from '@linkcharsoft/cms/server'
import cmsConfig from '../../cms.config'

export const cms = createCmsServer({
  config: cmsConfig,
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    publishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    secretKey: process.env.SUPABASE_SECRET_KEY
  },
  publishTarget: publishTargetFromEnv(process.env),
  logger: { error: (message, detail) => console.error('[cms]', message, detail) }
})
```

`publishTargetFromEnv` picks the target the way the CLI does: Amplify when `CMS_BUILD_HOOK_URL` is set, the simulated build (`mockBuild`) when `NEXT_PUBLIC_SUPABASE_URL` is a local Supabase, and none otherwise, so a hosted project without a hook records `target_missing` instead of a success nobody built. A project that wires the targets itself (`@linkcharsoft/cms/publish/amplify`, `@linkcharsoft/cms/publish/mock`) gets the same guard from the server: the mock against a hosted project counts as no target and logs why, unless it was made with `mockBuild({ allowRemote: true })`.

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

Publishing calls the `PublishTarget`. With Amplify, the build hook queues a build and the build reports itself from `amplify.yml` with `linkchar-cms build:report` (see [Amplify setup](#amplify-setup)): `--start` takes the oldest open publish of the last 30 minutes and records the job, `--ok` leaves it `built` with the stamp `withCms` gave the build, `--failed` closes it. The panel marks a `built` publish `success` when the site serves that stamp (`GET /api/cms/build-status`), checked whenever the publish log is read (the publish page, the header's poll, `getPublishCircuit()`); a `built` publish the site does not serve within 30 minutes reads "sin confirmar". An EventBridge rule reporting with `Authorization: Bearer <CMS_BUILD_WEBHOOK_SECRET>` still works where it exists (`POST /api/cms/build-status`; 404 without the secret), and its event for an unknown job goes to the oldest open publish of the last 30 minutes. A failed build stores `publish_log.error_code` (`target_missing`, `hook_refused`, `hook_unreachable`, `build_failed`, `build_cancelled`, and `unconfirmed` for a publish nothing confirmed in 30 minutes, which keeps reading "sin confirmar"), which the panel translates (`errors.build.*`) and offers to retry. The mock build reports `started` and then the result in-process: `mockBuild({ result: 'failed' | 'cancelled', seconds })` reproduces the failures locally; its publishes read "Simulada" in the history (`job_id` starts with `mock-`). `publishDisplayStatus(record)` and `headerPublishStatus(record)` in the core take the record (`buildStatus`, `requestedAt`, `builtAt`) and know `deploying`; `PublishRecordType` carries `builtAt` and `consoleUrl` (the deployment in the Amplify console, shown to whoever publishes).

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
- `<RichText value={body} />` renders the blocks inside a `<div className>`. A short text with a bold word or a link that goes inside the site's own `<p>` or card is an inline field, `richText({ label: 'Bajada', inline: true, marks: ['bold', 'link'] })`: one paragraph, no headings, lists or media, and the editor offers only those marks (`marks` also narrows a block text). `<RichText value={lead} inline />` renders its text and marks alone, each line after a `<br>`, inside a `<span>` only when it gets a `className`.
- `sitemap()` lists every published URL with its languages: `export default () => cms.site.sitemap()` in `src/app/sitemap.ts`. A page's `lastModified` is its own last publish or the last publish of the entries its sections declare in `uses`, whichever is newer (the blog page moves with each new post). It throws when the config has no `site.url`; `absoluteUrl` alone still returns relative paths.
- `await metadata(document)` gives the title with `site.titleTemplate`, the canonical URL, hreflang and Open Graph; `site.url` makes them absolute. With `site: { defaults: { entry: 'settings', description: 'tagline', image: 'shareImage' } }` in the config, a page whose SEO leaves the description or the share image empty takes them from those fields (text or textarea, image) of a page or singleton, in the page's language; its own values always win.
- `jsonLd(document)` gives a `WebPage` or `Article` node for one page. For the site as a whole, `@linkcharsoft/cms/site` has schema.org helpers that take the site's name, origin and locale: `organization`, `website`, `breadcrumbs`, `blogPosting`, `openingHoursSpecification` (from an `openingHours` field) and `jsonLdGraph`, which joins them (and `jsonLd()` nodes) in one script:

```tsx
import { breadcrumbs, jsonLdGraph, JsonLd, organization, website } from '@linkcharsoft/cms/site'

const site = { name: 'Norte', url: 'https://norte.com', locale: 'es', email: contact.email, sameAs: [contact.instagram] }
<JsonLd data={jsonLdGraph(organization(site), website(site), breadcrumbs(site, [{ name: 'Inicio', path: '/' }]), cms.site.jsonLd(home))} />
```

**App structure.** The panel's root layout (`src/app/(cms)/layout.tsx`) renders its own `<html>`, so the site lives in route groups with their own root layout: `src/app/(es)/layout.tsx` with `page.tsx`, `blog/…` for the default locale and `src/app/(en)/layout.tsx` with `en/page.tsx`, `en/blog/…` for the others. Shared screens (`src/screens/*`) take the locale as a prop.

In Draft Mode (the panel preview) with an active panel user the readers return drafts. Otherwise they read the published copy without touching cookies, so the pages stay static and each publish rebuilds the site. A route with `dynamicParams = false` still previews a document never published: Draft Mode renders a slug outside `generateStaticParams`, which stays a 404 for everyone else (checked on Next 16.4).

**Images and videos.** The alt text belongs to the file, in Media, and every image in use needs it in each language. Where the site shows an image as decoration (a mosaic, a background), it keeps the alt text and renders `<Image {...imageProps(image, { sizes })} alt='' />` for that use. A `videoFile` field resolves to a `SiteVideoType` (`src`, `mime`, `width`, `height`, `duration` and its `poster` as a `SiteImageType`) that `<Video video={clip} />` renders: a `<video>` with `preload="metadata"`, `playsInline`, controls, and the poster through the image optimizer, so it costs no Storage egress until the visitor presses play; `autoplay` plays it muted and looping, without controls; `<track>` elements and a fallback go as children. A `video` field takes YouTube and Vimeo links instead.

Storage serves a Media video whole on every play, and Supabase's Free plan has 10 GB of egress a month: Media is for the videos editors rotate (a project's clip, a testimonial), kept short and small; a site's own hero loop stays in `public/`, served by Amplify's CDN.

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

The package ships `text`, `textarea`, `email`, `phone`, `url`, `video`, `slug`, `richText`, `number`, `boolean`, `date`, `datetime`, `select`, `multiSelect`, `color`, `link`, `button`, `image`, `gallery`, `file`, `videoFile`, `relation` and `relations`, plus the structural `group`, `list` and `blocks`; `openingHours` is opt-in from `@linkcharsoft/cms/core/opening-hours`.

`videoFile({ label: 'Video', folder: 'proyectos' })` stores a video of Media like `file` stores a PDF. The uploader takes mp4 and webm up to 25 MB, reads their size and duration, and turns away an mp4 that is not faststart (its `moov` box after `mdat`: the browser would download the whole file before showing a frame). A video needs a poster to be published, chosen in its details from the images of Media or captured from a frame; the poster is an image of the library, so it goes through the image optimizer on the site and can't go to the trash while the video uses it. The details also say what a thousand full plays cost in egress. Export with ffmpeg: `ffmpeg -i in.mov -c:v libx264 -preset slow -crf 28 -vf scale=-2:720 -c:a aac -b:a 96k -movflags +faststart out.mp4` (about 1 MB every 10 seconds).

`color({ label: 'Color de marca', presets: ['#1f5fa8', '#0e0e13'] })` stores one `#rrggbb` in lower case (a stored `#1F5FA8` is repaired on read; `red` or `#abc` is "Usá un color como #1f5fa8"). The input is the browser's color picker next to the hex, and `presets` adds swatches the editor picks with one click; the version history shows each color with its swatch. Imports take the same hex.

`select` shows a dropdown, or one card per option with `display: 'cards'`: every option then needs a serializable `preview`, a PrimeIcons name (`{ icon: 'pi-th-large' }`), an image (`{ image: '/layouts/mosaic.svg' }`, a path or an https URL) or a mosaic sketch the panel draws (`{ grid: { columns, rows, cells: [{ column, row, columnSpan?, rowSpan? }] } }`, 1-based like CSS grid lines; `column` and `row` also take what `grid-column` and `grid-row` take, `'1 / 4'` or `'2 / span 2'`). `defineCmsConfig` rejects cards with an option that has no preview, a preview without `display: 'cards'`, a cell outside its grid and a line it can't read. `multiSelect` has no cards. A gallery block that lets the editor pick its layout:

```ts
layout: select({
  label: 'Disposición',
  display: 'cards',
  default: 'grid',
  options: [
    { label: 'Mosaico', value: 'mosaic', preview: { grid: { columns: 3, rows: 2, cells: [{ column: '1 / 3', row: '1 / 3' }, { column: 3, row: 1 }, { column: 3, row: 2 }] } } },
    { label: 'Grilla', value: 'grid', preview: { grid: { columns: 3, rows: 2, cells: [{ column: 1, row: 1 }, { column: 2, row: 1 }, { column: 3, row: 1 }, { column: 1, row: 2 }, { column: 2, row: 2 }, { column: 3, row: 2 }] } } }
  ]
})
```

The cards are a radio group: arrows move between them, the chosen one has the brand border.

Every kind is one `defineField` call: default, normalization, emptiness, validation, references, diff summary and localization. A project adds its own; this is the playground's rating kind, complete:

```ts
// src/cms/fields/rating.ts
import { defineField, issue, noReferences } from '@linkcharsoft/cms/core'
import type { BaseOptions } from '@linkcharsoft/cms/core'

export interface RatingField extends BaseOptions<number> {
  kind: 'rating'
  stars: number
}

declare module '@linkcharsoft/cms/core' {
  interface FieldTypes<F> {
    rating: { field: RatingField, value: number, localize: false }
  }
}

export const rating = defineField({
  kind: 'rating',
  localize: false,
  defaultValue: () => 0,
  normalize: value => (typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : 0),
  isEmpty: value => !value,
  validate: (value, field, ctx) => {
    if (value === null || value === undefined || value === 0) return ctx.required ? [issue('required')] : []
    if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) return [issue('number')]
    return value > field.stars ? [issue('max', { max: field.stars })] : []
  },
  references: noReferences,
  summarize: value => '★'.repeat(Number(value))
})
```

`cms.config.ts` registers it with `fields: [rating]` and the schema uses it as `rating({ label: 'Satisfacción del cliente', stars: 5 })`. Leaving out a part, or returning the wrong value type, is a type error. A schema that uses a kind the config does not register fails when `defineCmsConfig` runs. Per field, `validate` adds a rule (sync or async) and `component` replaces the panel input. An `issue(code)` names a message of the `validation.*` catalog (`required`, `number`, `max`…); `{ ...issue('pattern'), message: { es, en } }` carries its own text.

The panel input of a project kind is registered on the client, never in the config (the config also reaches the proxy and the site, which must not bundle panel code). It is a `'use client'` component that receives `{ name, field }` and binds with the package's Formik helpers:

```tsx
// src/cms/fields/RatingInput.tsx
'use client'
import { describedBy, fieldId, InputContainer, useField, useFieldError, useFieldLabel, useText } from '@linkcharsoft/cms/panel'
import type { RatingField } from './rating'
import type { FieldInputPropsType } from '@linkcharsoft/cms/panel'

const RatingInput = ({ name, field }: FieldInputPropsType<RatingField>) => {
  const text = useText()
  const label = useFieldLabel()
  const [{ value }, , { setValue, setTouched }] = useField<number>(name)
  const error = useFieldError(name)
  const id = fieldId(name)
  const stars = Array.from({ length: field.stars }, (_, index) => index + 1)

  const pick = (star: number) => {
    void setValue(star === value ? 0 : star, false)
    void setTouched(true, true)
  }

  return (
    <InputContainer label={label(field)} htmlFor={id} error={error} help={text(field.help)}>
      <div id={id} role='radiogroup' aria-label={text(field.label)} aria-describedby={describedBy(name, field)} className='flex gap-1'>
        {stars.map(star => (
          <button
            key={star}
            type='button'
            role='radio'
            aria-checked={star === value}
            aria-label={`${star} / ${field.stars}`}
            className='flex h-11 w-11 items-center justify-center rounded-lg text-xl text-cms-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-cms-primary-ring'
            onClick={() => pick(star)}
          >
            <i className={star <= value ? 'pi pi-star-fill' : 'pi pi-star'} aria-hidden='true' />
          </button>
        ))}
      </div>
    </InputContainer>
  )
}

export default RatingInput
```

```ts
// src/cms/client.ts
'use client'
import { createCmsClient } from '@linkcharsoft/cms/panel/client'
import cmsConfig from '../../cms.config'
import * as actions from './actions'

export const CmsClient = createCmsClient({ config: cmsConfig, actions, inputs: { rating: () => import('./fields/RatingInput') } })
```

A field's own `component` wins over the project's input for its kind, which wins over the package's. A kind without an input fails in the panel with a message that says where to add it. For translated fields, bind with `useValuePath(name, field)`: it points at `name.<locale>` for the language being edited.

To show what the package's inputs show while translating, pass `useLocaleNote(name, field)` to `InputContainer`: `badge` is "Same in every language" for a shared value, `note` the default language's text above a translation, and `describedBy` its id for the input (`describedBy(name, field, note.describedBy)`). `useEditingTranslation()` says whether another language than the default one is on screen; `useMediaVariant(name)` gives a file-like value its own version per language. `InputContainer` renders the error with the id `errorId(name)`: add it to `aria-describedby` and set `aria-invalid` while `useFieldError(name)` returns one.

### Lists and blocks

`list({ label, min, max, itemLabel, singularLabel, thumbnail, open }, fields)` holds repeated items of the same fields; `blocks({ label, min, max, open }, { texto: block('Texto', fields, { icon, description, thumbnail }) })` holds items of different kinds. In the panel, items start open while there are at most three or the item has an image field; `open: true` or `false` fixes it, and "Expandir todo" / "Colapsar todo" switches the whole list. A collapsed item shows the value of `itemLabel`, the count of its fields with a problem, and its image as a thumbnail (`thumbnail` names the image field; the first one by default; a block's own image field is used the same way, while `thumbnail` on `block()` is the picture the block picker shows). `singularLabel` names one item ("servicio"): the button reads "Agregar servicio" and an item without a title "Servicio 3". With `min`, the legend reads "2 de 6, mínimo 1" and the last `min` items can't be removed; at `max`, "Agregar" and "Duplicar" stay visible but disabled, with the reason as their tooltip.

## Panel

The panel lives in the project's app as small generated files that import the package and the project's `cms` instance:

```bash
pnpm exec linkchar-cms routes          # writes the panel wiring under src/app/(cms)/<basePath>
pnpm exec linkchar-cms routes --check  # CI: exit 1 when a file is missing or stale, or the proxy matcher misses basePath
```

`routes` also writes `.github/workflows/supabase-keepalive.yml` (see [Amplify setup](#amplify-setup)), with the same marker and `--check`. A route the package stops generating is deleted, and Next's `.next/types` keeps a validator for it until `next typegen` or `next build` runs: run one of them before the next type-check. On Windows, `pnpm exec` goes through cmd.exe: a path with parentheses (`src/app/(cms)/…`) must be quoted when it is an argument.

- `src/app/(cms)/<basePath>/…`: one file per screen (`export default route.Page`), the layouts, `loading.tsx` (a table skeleton for lists, fields for the editors), the panel's `error.tsx` and `not-found.tsx` (with a catch-all, so an unknown panel URL shows the panel's 404 instead of the site's), the page the invitation and recovery emails land on (`auth/confirm`, with the button that spends the token) and the sign-out handler.
- `src/app/api/cms/{build-status,draft,disable-draft}/route.ts`: the build stamp (GET) and the optional build webhook (POST), and the preview's Draft Mode.
- `src/cms/actions.ts`: `'use server'`, re-exports every action the browser calls.
- Created once and then owned by the project: `src/app/(cms)/layout.tsx` (the panel's root layout) and `src/cms/client.ts` (`createCmsClient`, where project inputs are registered).

The command only rewrites or deletes files that start with its marker line, and reads `cms.config.ts` to know `basePath` and `paths`. A file without the marker belongs to the project and is never touched. Re-run it after upgrading the package or changing `basePath`/`paths`.

The URL segments are configurable and default to Spanish: `paths: { pages: 'paginas', publish: 'publicar', trash: 'papelera', … }` (see `DEFAULT_PANEL_SEGMENTS`).

`createCmsClient` mounts the panel's own providers: PrimeReact in unstyled mode with the panel passthrough (whatever the site configures), toasts, the confirmation dialog and motion. Panel screens render inside `CmsClient`; outside it, panel components throw.

The editor shows a language selector when the config has more than one locale, with what is missing in each language ("English · 3 missing"). Translated texts are edited per language (`?locale=en` in the URL), with the default language's text above each one; shared values say "Same in every language". Images, galleries and PDFs reuse the original until someone picks "Use another image for English", and "Back to the original" drops it. The page outline and each section count what is missing per language (`ES 1 · EN 3`), and Media marks and filters the images without alt text in a language.

A document with missing content reads "Incompleto" in the editor, the tables (which filter by it) and the overview; the header's "Publicar" counter only counts the changes the next publish takes, and refreshes with each save. Publish lets the user tick which changes go out, and names the live document that still holds a URL a change would take (tick both so they go out together, or change one URL). Each missing item in Publish links to its field: `paths.field(kind, entryId, id, { field, locale })` builds `/dashboard/paginas/home?locale=en#hero.title`, and the editor opens and focuses any field named in the hash (`#services` alone still opens the section).

Uploading a file the library already has (same bytes, SHA-256 of the original file) offers the existing one instead of a copy. Drafts created with "Nuevo …" and never touched disappear after a day; the overview warns about hidden drafts nobody touched for two weeks.

## Brand

The panel is an Inferencia product and looks the same in every project: a dark sidebar signed "Inferencia CMS", a light workspace, the brand violet (`#6e14be`) for actions and the magenta star as the accent on dark. The tokens live on `.CmsRoot`, so a project's `:root` doesn't reach them. Text is Hanken Grotesk and headings Bricolage Grotesque, both under the SIL Open Font License, bundled through Fontsource. The theme is Tailwind 3 only.

What belongs to each project is the product slot, at the top of the sidebar and on the sign-in screens:

```ts
branding: {
  name: 'Acme',                                    // also the browser tab title: "Pages · Acme"
  icon: '/icon.svg',                               // optional: a square image, a path or an https URL
  footer: { es: 'Soporte: hola@acme.com', en: 'Support: hola@acme.com' }  // optional, under the sidebar
}
```

Without `icon`, `withCms` takes the favicon at build: `app/icon.svg`, `icon.png` or `apple-icon.png` (under `src/` too), then `public/icon.svg` or `favicon.svg`, then the largest `favicon*.png` or `icon*.png` in `public/`, the same under `public/seo/`, then `favicon.ico`. `doctor` says which one it found; with none, the panel shows the initials of the name. The icon sits on a white tile, so a favicon drawn for a light tab still shows on the dark sidebar.

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

Publishing on Amplify is a build hook plus two lines in `amplify.yml`: the build reports itself to the publish log with the credentials it already has, so no AWS resource beyond the hook is needed.

1. **Environment variables** of the Amplify app: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `NEXT_PUBLIC_SITE_URL` and `CMS_BUILD_HOOK_URL` (the app's incoming webhook for the branch: App settings → Build settings → Incoming webhooks); `CMS_BUILD_BRANCH` only when the hook's branch is not `main` and a panel outside Amplify (local, another host) publishes against this project: it names the branch whose build takes the publishes that carry no branch (see [Preview and production on one Supabase](#preview-and-production-on-one-supabase)). `GITHUB_PACKAGES_TOKEN` for the install, written to `~/.npmrc` in the build's `preBuild`. Amplify passes them to the build, not to the SSR runtime: the `preBuild` also copies `SUPABASE_SECRET_KEY` and `CMS_BUILD_HOOK_URL` into `.env.production` (see [docs/deploy.md](https://github.com/Linkcharsoft/linkchar-cms/blob/main/docs/deploy.md)).
2. **`amplify.yml`**: `preBuild` ends with `build:report --start` and the build reports its end:

   ```yaml
   frontend:
     phases:
       preBuild:
         commands:
           - echo "//npm.pkg.github.com/:_authToken=${GITHUB_PACKAGES_TOKEN}" >> ~/.npmrc
           - pnpm install --frozen-lockfile
           - env | grep -E "^(SUPABASE_SECRET_KEY|CMS_BUILD_HOOK_URL)=" >> .env.production || true
           - rm -rf .next/cache/fetch-cache
           - pnpm exec linkchar-cms build:report --start
       build:
         commands:
           - pnpm run build && pnpm exec linkchar-cms build:report --ok || (pnpm exec linkchar-cms build:report --failed; exit 1)
   ```

   `--start` takes the open publish of its own branch (the one whose `job_id` the hook stored, else the oldest of the last 30 minutes without a job whose `branch` is this build's `AWS_BRANCH`; the panel records its branch on every publish, from `CMS_SITE_BRANCH`, which `withCms` inlines from `AWS_BRANCH`) and records Amplify's `AWS_JOB_ID`, `AWS_APP_ID`, `AWS_BRANCH`, `AWS_REGION` and `AWS_COMMIT_ID`, which the panel turns into a link to the deployment. A publish without a branch (a local panel, `publish:ping`) is taken by the build of `CMS_BUILD_BRANCH`, `main` by default. `--ok` leaves it `built` with the build's stamp (`withCms` derives the same stamp from those variables, or takes `CMS_BUILD_STAMP`); `--failed` closes it as `build_failed`. Both only close the publish this build's `--start` claimed (the row with its job), never another one: a build nobody asked for (a push, a schedule) finds no open publish at `--start` and does nothing; a build that can't reach Supabase says so and goes on: `build:report` never fails a build. `doctor` fails while `amplify.yml` lacks these lines.
3. **Confirmation**: the built site answers `GET /api/cms/build-status` with `{ stamp }` (public; the stamp is not a secret). The panel, `doctor` and `publish:ping` ask `site.url` for it whenever they read the publish log, and a `built` publish reads "Listo" once the stamp matches; until then, "Publicando · desplegando". A deploy that never serves the stamp (a failed deploy, a `site.url` that is not this app) is closed by whichever of them reads the log next, 30 minutes after the build ended, as `failed` with `error_code` `unconfirmed`, which reads "Sin confirmar" and can be retried; so is a publish whose build never reported (a failed install, an `amplify.yml` without the lines), 30 minutes after the request.
4. **Verify the circuit** once, with the hosted keys in an env file kept out of git:

   ```bash
   pnpm exec linkchar-cms publish:ping --env-file .env.remote [--timeout 20]
   ```

   It logs an empty publish, fires the build hook (shown without its token) and waits, printing each change, and confirms the stamp itself, so it needs no panel visit. Each cut has its own message: a hook that refuses points at `CMS_BUILD_HOOK_URL`; a build that never reports, at the `amplify.yml` lines or at the build's Supabase variables; a build that reported `--start` but never its end, at the `--ok`/`--failed` line or a build still running (with the deployment link); a `built` publish the site never serves, at the deploy or at `site.url` (`cms.config.ts`, else `NEXT_PUBLIC_SITE_URL`); a publish another site on the same Supabase confirmed (its stamp is not the one this site serves), at `CMS_BUILD_BRANCH`. It only credits what the site it was given serves. It costs one Amplify build and takes the 30-minute publish lock like any publish. Until a real build has confirmed a publish, the publish page (for whoever can publish) and `doctor` warn that the circuit is unverified; publishes of the simulated build read "Simulada" in the history and never count.

### Preview and production on one Supabase

An Amplify app with a preview branch next to `main`, both on the same Supabase project, has one publish log for two sites. Keep it straight with:

- **Each branch takes its own publishes.** The panel records the branch it was built from on every publish, and `build:report --start` only claims the publishes of its build's branch, so a preview build never takes a production publish or confirms it with a stamp production will never serve; nothing to configure. With one hook (`main`'s), a publish from the preview's panel builds `main` and carries `branch: <preview>`: no build of `main` takes it and it reads "sin confirmar" after 30 minutes. Give the preview its own hook (`CMS_BUILD_HOOK_URL` with a branch override) when its editors must publish the preview, or its own Supabase project when it must not touch production's content. `CMS_BUILD_BRANCH` matters only for publishes that carry no branch (a local panel, `publish:ping`): `main` takes them unless the variable names another branch.
- **`site.url` per branch.** `NEXT_PUBLIC_SITE_URL` (or whatever `cms.config.ts` reads) is an Amplify variable with a branch override, so each panel asks its own site for the stamp.
- **Auth on the final domain.** `[remotes.hosted.auth] site_url` is the production origin, with the preview's in `additional_redirect_urls`, so invitation and recovery links land on production and the preview can still sign in.

**EventBridge (optional).** A project that already reports builds through an EventBridge rule keeps working: with `CMS_BUILD_WEBHOOK_SECRET` set, `POST /api/cms/build-status` takes Amplify's "Amplify Deployment Status Change" events (`SUCCEED`, `FAILED`, `CANCELLED`) sent by an API destination with `Authorization: Bearer <secret>`; without the variable the route answers 404. Its API destination needs an IAM role a developer usually can't create, which is why it is no longer the default: once `build:report` is in `amplify.yml`, the rule, the API destination, the connection and the variable can go.

A weekly scheduled build (Amplify's own, or a cron hitting the hook) keeps the site's static pages from drifting from drafts nobody published. It does not keep a free Supabase project awake: `linkchar-cms routes` writes `.github/workflows/supabase-keepalive.yml`, a read every three days with the repository variables `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY`; `routes --check` and `doctor` parse the file (a workflow that does not parse or has no schedule fails them), `doctor` warns while it is missing and, when `gh` is signed in (or `GITHUB_TOKEN` is set), says whether it ran green in the last four days, quoting the failed run's annotation otherwise (see [docs/deploy.md](https://github.com/Linkcharsoft/linkchar-cms/blob/main/docs/deploy.md#free-plan)).

## Import content

Moving content in (from Strapi, a JSON export or constants in code) is a script the project writes. `linkchar-cms import` runs it with a session signed in as a panel user, so it writes through RLS and the activity log like the panel:

```ts
// scripts/import-content.ts
import type { ImportSessionType } from '@linkcharsoft/cms/import'

export default async (cms: ImportSessionType) => {
  const shot = await cms.media({ file: 'src/assets/projects/givxo-1.webp', folder: 'proyectos', alt: { es: 'Givxo: panel de donaciones', en: 'Givxo: donations dashboard' } })
  await cms.upsert('projects', { data: { title: { es: 'Givxo', en: 'Givxo' }, slug: { es: 'givxo', en: 'givxo' }, mosaic: { es: [shot.id] } }, match: { key: 'givxo' } })
  await cms.upsert('home', { data: { hero: { title: { es: 'Hola', en: 'Hello' } } } })
  const { published, skipped } = await cms.publish()
  console.log(`${published} published`, skipped)
}
```

```bash
CMS_IMPORT_PASSWORD='…' pnpm exec linkchar-cms import scripts/import-content.ts --email ana@acme.com --env-file .env.remote --allow-remote [--otp 123456] [--dry-run] [--yes] [--no-publish] [--no-create]
```

The password comes from `CMS_IMPORT_PASSWORD`, `--password`, or `--password-stdin` (the first line of stdin: `printf '%s' "$PASSWORD" | pnpm exec linkchar-cms import … --password-stdin`), which keeps it out of the shell history and of CI logs.

Nothing is written before it is shown. The script first runs dry: `upsert()` compares each document with what is stored, `media()` looks each file up by its bytes, and the plan is printed (`Plan for https://…: 3 documents change, 1 created, 11 unchanged, 2 files uploaded.`, then `~ projects "Casa Giv": title.es, gallery` for each document that changes and `+ projects (key arca)` for each creation). Then the command asks `Write this to <url>? [y/N]` and runs the script for real; `--yes` skips the question (CI, or with `--password-stdin`, which takes the terminal), `--dry-run` stops after the plan (`Nothing was written (--dry-run).`) and needs no other flag against a hosted project, since it only reads, and when nothing would change nothing runs. A Supabase that is not local refuses to write without `--allow-remote`: a seed run against the hosted project replaces whatever editors wrote there, which is how a morning of panel edits was lost once. The script runs twice, so its own `console.log` lines appear twice.

The run ends with what it updated, what changed in it and how it was found (`15 updated (3 changed, 12 unchanged; 14 by key, 1 by slug, 1 key adopted)`), so the first run after adding `match: { key }` shows the keys being adopted; a document created in a collection that already had documents is listed as a warning with what was looked for (`givxo (slug not found)`), since that is how a renamed slug turns into a duplicate; and the hidden documents of those collections that the script never touched and nobody published are listed too, because a draft someone started in the panel under the same name is the duplicate the import can't see.

- `media({ file, folder, alt, caption, poster })` processes an image like the panel's uploader (upright, without metadata, within 2560 px, WebP, blur preview) and needs `sharp` (`pnpm add -D sharp`); PDFs go as they are; an mp4 or webm goes as it is, within 25 MB and faststart (an mp4 that is not is refused), with its duration and size read from the file and `poster` the id of an image already imported. The same bytes give back the file already in the library, so the script can run again.
- `upsert(entry, { data, match })` writes `data` in its stored shape (localized maps, media ids) and returns `{ id, created, matchedBy, adjusted, fields }`, `fields` being what changed in a found document (`title.es`, `gallery`), empty when the stored content already matched. A page or singleton is the one of its entry. A collection document is found again by `match: { key }`, a key of the script's own that is stored with the document and survives whatever editors do to the slug or the title (`matchedBy: 'key'`); without one, by its slug in the default locale (or `match: { id }`, `match: { slug }`). Give every collection document a `key` from the first import: a document found by slug adopts the `key` the script passes, and one created with a `key` keeps it. The script's `data` replaces the stored one, slug included, so a slug an editor shortened goes back to the seed's unless the seed follows. When nothing matches, a new document goes visible at the end of the list, so the script's order is the order of an orderable collection; with `--no-create` (`create: false` in `createImportSession`) it throws instead, which is the safe mode for a seed that only updates. List and block items need no `_key`: one missing takes the key of the stored item in the same place (a new one the first time), so running the import again leaves the content as it was. A `_key` the script sets is kept; it must be unique within its list. A new collection document is validated before it is created, so invalid data throws and leaves nothing behind; if the save fails after that (the network, the database), the empty draft it leaves goes when someone opens that collection in the panel a day later.
- `transform({ entry, map, dryRun })` rewrites every document of an entry: `map(data, { id, slug })` gets the stored data with defaults filled in and returns the data to save, or `null` to leave that document alone; each result is validated and saved like an upsert (RLS, activity, conflicts), and `{ changed, unchanged, invalid }` lists the documents whose mapped data is invalid, which stay as they were. `dryRun: true` saves nothing. See [Changing a field's kind](#changing-a-fields-kind).
- `summary()` (async) is what the CLI prints at the end: `{ created: [{ entry, id, lookup, existing }], updated, changed: [{ entry, id, title, fields }], unchanged, matched: { id, key, slug }, adopted, media, untouched: [{ entry, id, title }], dryRun }`.
- `publish()` publishes what the import touched, in one publish and one build, and lists in `skipped` the documents still missing content, which stay out as in Publicar. `--no-publish` makes it report without publishing.
- The environment (or `--env-file`; without it `.env.local` and then `.env`, as Next reads them) needs `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` and `SUPABASE_SECRET_KEY` (it only updates the publish log). `CMS_BUILD_HOOK_URL` triggers the Amplify build, a local Supabase runs the mock one, and a hosted project without a hook gets no build: retry it from Publicar. A user with two-step verification passes the current code with `--otp`.
- The script runs outside Next, loaded with jiti and the `tsconfig` paths: it can't import `server-only` modules (`src/cms/server.ts`) or files only Next understands (static images, CSS).
- `createImportSession(options)` from `@linkcharsoft/cms/import` is the same session for a runner of the project's own; `dryRun: true` is the plan pass: nothing is written or uploaded, `upsert()` answers with the found id or a `dry-run-…` placeholder, `media()` with the library file or a placeholder item, and `publish()` publishes nothing. There is no mode with the secret key and no user: the content would skip RLS and the activity log, and a development shortcut ends up used in production.

### Changing a field's kind

Stored values do not change when the schema does. A `select` that becomes `color()` leaves every document invalid (the old option name is not a hex color), and the panel shows the error on each one. A transform in the import script moves the values once, with the same validation the panel applies:

```ts
// scripts/import-content.ts
import type { ImportSessionType } from '@linkcharsoft/cms/import'

const COLORS: Record<string, string> = { blue: '#1f5fa8', ink: '#0e0e13' }

export default async (cms: ImportSessionType) => {
  const { changed, invalid } = await cms.transform({
    entry: 'projects',
    map: data => (typeof data.accent === 'string' && data.accent in COLORS ? { ...data, accent: COLORS[data.accent] } : null)
  })
  console.log(`${changed} projects moved to hex colors`, invalid)
}
```

Run it with `--no-publish` first and read `invalid`: those documents keep their old value until the map covers them. Publish when the list is empty.

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
pnpm --filter playground db:start  # local Supabase on 4442x, with the QA users of supabase/seed.sql
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
