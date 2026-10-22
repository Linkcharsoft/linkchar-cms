import { existsSync, readdirSync } from 'node:fs'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join, relative, sep } from 'node:path'
import { CliError } from './migrations.js'

/**
 * @typedef {{ name: string, basePath: string, locales: string[], panelLocale: string, siteUrl: string }} InitOptionsType
 * @typedef {{ file: string, status: 'added' | 'kept' }} InitChangeType
 * @typedef {{ root: string, sourceDir: string, configFile: string }} InitPathsType
 * @typedef {import('./templates.js').TranslateType} TranslateType
 */

// The panel speaks these; the starter labels come from their `starter.*` catalog keys.
export const PANEL_LOCALES = ['es', 'en']

const SEGMENT = /^\/[a-z0-9]+(-[a-z0-9]+)*$/
const LOCALE = /^[a-z]{2,3}(-[A-Z]{2})?$/

/** @param {InitOptionsType} options */
export const checkInitOptions = ({ name, basePath, locales, panelLocale, siteUrl }) => {
  if (!name.trim()) throw new CliError('--name is required: the site name shown in the panel and in page titles.')
  if (!SEGMENT.test(basePath)) throw new CliError(`--base-path "${basePath}" must be one lowercase segment like /cms.`)
  const invalid = locales.find(locale => !LOCALE.test(locale))
  if (locales.length === 0 || invalid) throw new CliError(`--locales "${locales.join(',')}" must list codes like es,en.`)
  if (!PANEL_LOCALES.includes(panelLocale)) throw new CliError(`--panel-locale "${panelLocale}" must be one of ${PANEL_LOCALES.join(', ')}.`)
  if (!/^https?:\/\/[^/]+$/.test(siteUrl)) throw new CliError(`--site-url "${siteUrl}" must be an origin like https://acme.com.`)
}

const toPosix = (/** @type {string} */ path) => path.split(sep).join('/')

/** @param {string} from @param {string} target */
const importPath = (from, target) => {
  const path = toPosix(relative(dirname(from), target))
  return path.startsWith('.') ? path : `./${path}`
}

const quote = (/** @type {string} */ text) => `'${text.replace(/\\/g, '\\\\').replace(/'/g, '\\\'')}'`

// A home page at app/page.tsx or in any route group of app/, e.g. app/(landing)/page.tsx.
const hasHomePage = (/** @type {string} */ app) => existsSync(join(app, 'page.tsx')) || (existsSync(app) &&
  readdirSync(app, { withFileTypes: true }).some(entry => entry.isDirectory() && /^\(.+\)$/.test(entry.name) && existsSync(join(app, entry.name, 'page.tsx'))))

/**
 * The files a project owns from the first day; initProject writes only the ones that don't exist yet.
 * @param {InitOptionsType} options
 * @param {InitPathsType} paths
 * @param {TranslateType} t
 * @returns {{ path: string, content: string }[]}
 */
export const planInit = ({ name, basePath, locales, panelLocale, siteUrl }, { sourceDir, configFile }, t) => {
  const label = (/** @type {string} */ key) => quote(t(`starter.${key}`))
  const [defaultLocale] = locales
  const app = join(sourceDir, 'app')
  const at = (/** @type {string} */ from, /** @type {string} */ target) => importPath(from, join(sourceDir, target))
  const serverFile = join(sourceDir, 'cms', 'server.ts')

  /** @type {[string, string[]][]} */
  const files = [
    [configFile, [
      'import { defineCmsConfig } from \'@linkcharsoft/cms/core\'',
      `import { schema } from '${importPath(configFile, join(sourceDir, 'cms', 'schema'))}'`,
      `import type { Database } from '${importPath(configFile, join(sourceDir, 'types', 'supabase'))}'`,
      '',
      'const cmsConfig = defineCmsConfig({',
      '  schema,',
      `  basePath: ${quote(basePath)},`,
      `  locales: [${locales.map(quote).join(', ')}],`,
      `  defaultLocale: ${quote(defaultLocale)},`,
      `  panelLocale: ${quote(panelLocale)},`,
      `  branding: { name: ${quote(name)} },`,
      `  mediaFolders: [{ value: 'sitio', label: ${label('folder')} }],`,
      '  site: {',
      `    url: process.env.NEXT_PUBLIC_SITE_URL ?? ${quote(siteUrl)},`,
      `    titleTemplate: ${quote(`%s | ${name}`)},`,
      '    defaults: { entry: \'settings\', description: \'tagline\', image: \'shareImage\' }',
      '  }',
      '})',
      '',
      'declare module \'@linkcharsoft/cms/core\' {',
      '  interface Register {',
      '    config: typeof cmsConfig',
      '    database: Database',
      '  }',
      '}',
      '',
      'export default cmsConfig'
    ]],
    [join(sourceDir, 'cms', 'schema.ts'), [
      'import { image, page, section, singleton, text, textarea } from \'@linkcharsoft/cms/core\'',
      '',
      'export const schema = {',
      `  settings: singleton(${label('settings')}, {`,
      `    siteName: text({ label: ${label('siteName')}, required: true, default: ${quote(name)} }),`,
      `    tagline: textarea({ label: ${label('tagline')}, maxLength: 160 }),`,
      `    shareImage: image({ label: ${label('shareImage')}, folder: 'sitio' })`,
      '  }, { previewPath: \'/\' }),',
      `  home: page(${label('home')}, {`,
      `    hero: section(${label('hero')}, {`,
      `      title: text({ label: ${label('title')}, required: true }),`,
      `      intro: textarea({ label: ${label('intro')} })`,
      '    }, { anchor: \'inicio\' })',
      '  }, { path: \'/\' })',
      '}'
    ]],
    [serverFile, [
      'import \'server-only\'',
      'import { amplify } from \'@linkcharsoft/cms/publish/amplify\'',
      'import { mockBuild } from \'@linkcharsoft/cms/publish/mock\'',
      'import { createCmsServer } from \'@linkcharsoft/cms/server\'',
      `import cmsConfig from '${importPath(serverFile, configFile.replace(/\.[cm]?[jt]s$/, ''))}'`,
      '',
      'const env = process.env',
      '',
      '// Without a build hook (local development) publishing runs against the mock build.',
      'const publishTarget = env.CMS_BUILD_HOOK_URL',
      '  ? amplify({ hookUrl: env.CMS_BUILD_HOOK_URL, webhookSecret: env.CMS_BUILD_WEBHOOK_SECRET })',
      '  : mockBuild()',
      '',
      'export const cms = createCmsServer({',
      '  config: cmsConfig,',
      '  supabase: {',
      '    url: env.NEXT_PUBLIC_SUPABASE_URL,',
      '    publishableKey: env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,',
      '    secretKey: env.SUPABASE_SECRET_KEY',
      '  },',
      '  publishTarget',
      '})'
    ]],
    [join(sourceDir, 'types', 'supabase.ts'), [
      '// Replaced by `supabase gen types typescript --local > src/types/supabase.ts` once the project has its own tables.',
      'export type { Database, Json } from \'@linkcharsoft/cms/server\''
    ]],
    [join(app, '(cms)', 'theme.css'), [
      ':root {',
      '  --cms-primary: #1f5fa8;',
      '}'
    ]],
    [join(app, '(cms)', 'layout.tsx'), [
      'import \'./theme.css\'',
      'import { rootLayout } from \'@linkcharsoft/cms/panel/routes/root\'',
      `import { CmsClient } from '${at(join(app, '(cms)', 'layout.tsx'), 'cms/client')}'`,
      `import { cms } from '${at(join(app, '(cms)', 'layout.tsx'), 'cms/server')}'`,
      '',
      'const route = rootLayout(cms, CmsClient)',
      '',
      'export default route.Layout',
      'export const metadata = route.metadata'
    ]],
    [join(app, '(site)', '[...notFound]', 'page.tsx'), [
      'import { notFound } from \'next/navigation\'',
      '',
      '// With two root layouts, unmatched URLs need a route inside the site\'s: this one renders (site)/not-found.tsx.',
      'const Page = () => notFound()',
      '',
      'export default Page'
    ]],
    [join(app, 'sitemap.ts'), [
      `import { cms } from '${at(join(app, 'sitemap.ts'), 'cms/server')}'`,
      '',
      'const sitemap = () => cms.site.sitemap()',
      '',
      'export default sitemap'
    ]],
    [join(sourceDir, 'proxy.ts'), [
      `import { cms } from '${at(join(sourceDir, 'proxy.ts'), 'cms/server')}'`,
      '',
      'export const proxy = cms.proxy',
      '',
      `export const config = { matcher: [${quote(`${basePath}/:path*`)}] }`
    ]]
  ]

  // A project with its own root layout, home or 404 moves them into (site) instead (see nextSteps).
  if (!existsSync(join(app, 'layout.tsx'))) {
    files.push([join(app, '(site)', 'layout.tsx'), [
      'import { DraftRefresh } from \'@linkcharsoft/cms/site\'',
      'import { draftMode } from \'next/headers\'',
      'import type { ReactNode } from \'react\'',
      '',
      'const SiteLayout = async ({ children }: { children: ReactNode }) => (',
      `  <html lang=${quote(defaultLocale)}>`,
      '    <body>',
      '      {children}',
      `      {(await draftMode()).isEnabled && <DraftRefresh locale=${quote(panelLocale)} />}`,
      '    </body>',
      '  </html>',
      ')',
      '',
      'export default SiteLayout'
    ]])
  }
  if (!hasHomePage(app)) {
    files.push([join(app, '(site)', 'page.tsx'), [
      'import { JsonLd } from \'@linkcharsoft/cms/site\'',
      `import { cms } from '${at(join(app, '(site)', 'page.tsx'), 'cms/server')}'`,
      '',
      'export const generateMetadata = async () => cms.site.metadata(await cms.site.getEntryContent(\'home\'))',
      '',
      'const HomePage = async () => {',
      '  const home = await cms.site.getEntryContent(\'home\')',
      '  const { hero } = home.content',
      '  return (',
      '    <main id=\'inicio\'>',
      '      <JsonLd data={cms.site.jsonLd(home)} />',
      '      <h1>{hero.title}</h1>',
      '      {hero.intro && <p>{hero.intro}</p>}',
      '    </main>',
      '  )',
      '}',
      '',
      'export default HomePage'
    ]])
  }
  if (!existsSync(join(app, 'not-found.tsx'))) {
    files.push([join(app, '(site)', 'not-found.tsx'), [
      `const NotFoundPage = () => <main><h1>{${label('notFound')}}</h1></main>`,
      '',
      'export default NotFoundPage'
    ]])
  }

  return files.map(([path, lines]) => ({ path, content: `${lines.join('\n')}\n` }))
}

/**
 * Writes the starter files that don't exist yet; an existing file is the project's and stays as it is.
 * @param {InitOptionsType} options
 * @param {InitPathsType & { t: TranslateType, write?: boolean }} paths
 * @returns {Promise<InitChangeType[]>}
 */
export const initProject = async (options, { t, write = true, ...paths }) => {
  checkInitOptions(options)
  /** @type {InitChangeType[]} */
  const changes = []
  for (const { path, content } of planInit(options, paths, t)) {
    const file = toPosix(relative(paths.root, path))
    if (existsSync(path)) {
      changes.push({ file, status: 'kept' })
      continue
    }
    if (write) {
      await mkdir(dirname(path), { recursive: true })
      await writeFile(path, content)
    }
    changes.push({ file, status: 'added' })
  }
  return changes
}

/**
 * What init leaves to the project: edits to files every project writes its own way.
 * @param {InitOptionsType} options
 * @param {InitPathsType} paths
 * @param {InitChangeType[]} changes
 * @returns {string[]}
 */
export const nextSteps = ({ basePath, panelLocale }, { root, sourceDir }, changes) => {
  const app = join(sourceDir, 'app')
  const project = (/** @type {string} */ path) => toPosix(relative(root, path))
  const kept = (/** @type {string} */ path) => changes.some(change => change.file === project(path) && change.status === 'kept')
  const moves = ['layout.tsx', 'not-found.tsx'].filter(file => existsSync(join(app, file))).map(file => project(join(app, file)))

  return [
    ...(kept(join(sourceDir, 'proxy.ts')) ? [`${project(join(sourceDir, 'proxy.ts'))} exists: send ${basePath} requests to cms.proxy and add '${basePath}/:path*' to its matcher.`] : []),
    ...(moves.length > 0 ? [`Move ${moves.join(' and ')} with the site's pages into app/(site)/, and render <DraftRefresh locale='${panelLocale}' /> there in Draft Mode: the panel has its own root layout.`] : []),
    ...(kept(join(app, 'sitemap.ts')) ? [`${project(join(app, 'sitemap.ts'))} exists: return cms.site.sitemap() from it.`] : []),
    'next.config.ts: wrap the config with withCms() from \'@linkcharsoft/cms/next\'.',
    'tailwind.config: presets: [cmsPreset] and content: [...cmsContent()] from \'@linkcharsoft/cms/tailwind\'.',
    '.env.local: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, SUPABASE_SECRET_KEY, NEXT_PUBLIC_SITE_URL.',
    'supabase start, then supabase db reset: it applies the package migrations.',
    'linkchar-cms admin --email … --password … creates the first superadmin.',
    'package.json "check": linkchar-cms routes --check && linkchar-cms migrations sync --check && linkchar-cms templates --check.'
  ]
}
