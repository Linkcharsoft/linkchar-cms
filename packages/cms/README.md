# @linkcharsoft/cms

Linkchar's CMS for Next.js projects: a content schema in code, Supabase storage, an editor panel and site readers. The package ships TypeScript source; the project compiles it.

> 0.2.x ships the core, the server layer (Supabase queries and actions), publishing (Amplify and a local mock), the base migration and the `linkchar-cms` CLI. The panel, site readers and Next helpers arrive in later stages.

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
// next.config.ts
const nextConfig = { transpilePackages: ['@linkcharsoft/cms'] }
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

Text kinds keep one value per locale, `{ es: 'Hola', en: 'Hello' }`, even with a single locale. Images, galleries and files keep the original and, only when someone sets one, a version per locale. Everything else is shared. A field can opt out or in with `localized: false | true`.

- `withDefaults(config, fields, data)` repairs stored content into that shape.
- `resolveContent(config, fields, data, locale)` gives the site plain values for one locale.
- `missingTranslations(config, fields, data, { mediaAlt })` lists what blocks publishing: texts filled in the default locale but empty in another, and the alt texts of the images in use.

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
// src/app/(cms)/actions.ts: server actions are re-exported one per line
'use server'
import { cms } from '@/cms/server'

export const saveDocument = cms.actions.saveDocument
export const publishChanges = cms.actions.publishChanges

// src/app/api/cms/build-status/route.ts: the EventBridge rule posts Amplify build events here
export const POST = cms.handlers.buildStatus

// src/proxy.ts: refreshes the session on panel requests
export const proxy = async (request: NextRequest) => (await cms.updateSession(request)).response
```

- `cms.actions` check the user's role, write through RLS and return catalog keys as errors (`errors.publish.stale`), never prose.
- `cms.queries` read for panel pages (`cms.queries.requireRole('admin')` redirects whoever may not see one).
- The server functions also take the context directly (`saveDocument(ctx, input)`), which is how the tests run them.

Publishing calls the `PublishTarget`. With Amplify, the build hook queues a build and the EventBridge rule reports its status with `Authorization: Bearer <CMS_BUILD_WEBHOOK_SECRET>`. A status event for an unknown job goes to the oldest open publish of the last 30 minutes. A failed build stores `publish_log.error_code` (`target_missing`, `hook_refused`, `hook_unreachable`, `build_failed`), which the panel translates (`errors.build.*`). The mock build reports `started` and then the result in-process.

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

## Development

This repo is a pnpm workspace: `packages/cms` and `apps/playground`, a Next app with a studio schema used by the tests.

```bash
pnpm install
pnpm verify                        # lint, types, unit tests
pnpm --filter playground db:start  # local Supabase on 5442x, with the QA users of supabase/seed.sql
pnpm --filter playground db:test   # pgTAP
pnpm --filter @linkcharsoft/cms test:db   # integration suite against that database
pnpm --filter playground dev       # http://localhost:3100/dashboard (qa-super@local.test / QaLocal12345)
```

`apps/playground/.env.example` lists the variables; `pnpm --filter playground db:status` prints the local keys. After changing a migration, `pnpm db:types` regenerates `src/server/database.ts`.

Releases use changesets: add one with `pnpm changeset`. Merging to `main` opens the version PR, and merging that PR publishes to GitHub Packages.
