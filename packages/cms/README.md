# @linkcharsoft/cms

Linkchar's CMS for Next.js projects: a content schema in code, Supabase storage, an editor panel and site readers. The package ships TypeScript source; the project compiles it.

> Stage 1 (0.1.x) ships the core only: schema DSL, field registry, validation, defaults, diff, references, catalogs and localized values. Server, panel, site and Next helpers arrive in later stages.

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
pnpm verify          # lint, types, tests
pnpm --filter playground dev    # http://localhost:3100
```

Releases use changesets: add one with `pnpm changeset`. Merging to `main` opens the version PR, and merging that PR publishes to GitHub Packages.
