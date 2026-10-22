#!/usr/bin/env node
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { parseArgs } from 'node:util'
import { initProject, nextSteps } from './init.js'
import { CliError, isUpToDate, syncMigrations } from './migrations.js'
import { checkProxy, loadConfig, syncRoutes } from './routes.js'
import { syncTemplates, translatorOf } from './templates.js'

/** @typedef {import('./migrations.js').SyncChangeType} SyncChangeType */
/** @typedef {import('./routes.js').RouteChangeType} RouteChangeType */
/** @typedef {import('./templates.js').TemplateChangeType} TemplateChangeType */
/** @typedef {import('./init.js').InitChangeType} InitChangeType */

const USAGE = `Usage:
  linkchar-cms init --name "Acme" [--base-path /dashboard] [--locales es,en] [--panel-locale es] [--site-url http://localhost:3000]
  linkchar-cms migrations sync [--dir supabase] [--check]
  linkchar-cms routes [--config cms.config.ts] [--src src] [--check]
  linkchar-cms templates [--config cms.config.ts] [--dir supabase] [--check]

  --dir     The project's Supabase folder (default: ./supabase)
  --config  The project's CMS config (default: ./cms.config.ts)
  --src     Folder with app/ and cms/ (default: ./src when it exists, else the project root)
  --check   Change nothing; exit with 1 when the project is behind the package

  init writes the files a project owns (cms.config.ts, src/cms, the panel and site layouts) where none exist,
  then runs templates, routes and migrations sync, and lists what is left to wire by hand.`

/** @type {Record<SyncChangeType['status'] | RouteChangeType['status'] | TemplateChangeType['status'], string>} */
const SYMBOLS = { added: '+', updated: '~', removed: '-', differs: '!', stale: '!', same: '=', kept: '=' }

/** @param {string} title @param {(SyncChangeType | RouteChangeType | TemplateChangeType | InitChangeType)[]} changes @param {boolean} check */
const print = (title, changes, check) => {
  const shown = changes.filter(change => change.status !== 'same' && change.status !== 'kept')
  console.log(shown.length === 0 ? `${title}: up to date` : `${title}:`)
  for (const { file, status } of shown) {
    const verb = check && status !== 'differs' && status !== 'stale' ? `would be ${status}` : status
    console.log(`  ${SYMBOLS[status]} ${file} (${verb})`)
  }
}

/** @param {{ dir: string, check: boolean }} options */
const migrations = async ({ dir, check }) => {
  const report = await syncMigrations({ target: resolve(dir), write: !check })
  print('Migrations', report.migrations, check)
  print('Tests (tests/cms)', report.tests, check)

  const differs = report.migrations.filter(change => change.status === 'differs')
  if (differs.length > 0) {
    console.warn('\nA package migration was edited in the project. It is left as is: an applied migration must not change.')
  }
  return check && !isUpToDate(report) ? 1 : 0
}

/** @param {{ config: string, src?: string, check: boolean }} options */
const routes = async ({ config, src, check }) => {
  const configFile = resolve(config)
  const sourceDir = resolve(src ?? (existsSync('src') ? 'src' : '.'))
  const loaded = await loadConfig(configFile)
  const changes = await syncRoutes({ sourceDir, config: loaded, configFile, write: !check })
  print('Panel routes', changes, check)

  const proxy = await checkProxy({ sourceDir, basePath: loaded.basePath })
  if (proxy !== 'ok') {
    console.warn(`\n${proxy === 'missing' ? 'There is no proxy.ts' : 'proxy.ts does not match the panel'}: it needs`)
    console.warn(`  export const proxy = cms.proxy\n  export const config = { matcher: ['${loaded.basePath}/:path*'] }`)
  }
  const behind = changes.some(change => change.status === 'added' || change.status === 'updated' || change.status === 'removed')
  return check && (behind || proxy !== 'ok') ? 1 : 0
}

/** @param {{ config: string, dir: string, check: boolean }} options */
const templates = async ({ config, dir, check }) => {
  const loaded = await loadConfig(resolve(config))
  const changes = await syncTemplates({ supabaseDir: resolve(dir), basePath: loaded.basePath, t: await translatorOf(loaded), write: !check })
  print('Email templates', changes, check)

  if (changes.some(change => change.status === 'stale')) {
    console.warn(`\nAn email template does not link to ${loaded.basePath}/auth/confirm: fix its href, or delete it and run this again.`)
  }
  return check && changes.some(change => change.status === 'added' || change.status === 'stale') ? 1 : 0
}

/**
 * @param {{ name?: string, 'base-path': string, locales: string, 'panel-locale': string, 'site-url': string, config: string, src?: string, dir: string }} options
 */
const init = async options => {
  const root = resolve('.')
  const sourceDir = resolve(options.src ?? (existsSync('src') ? 'src' : '.'))
  const configFile = resolve(options.config)
  const project = {
    name: options.name ?? '',
    basePath: options['base-path'],
    locales: options.locales.split(',').map(locale => locale.trim()).filter(Boolean),
    panelLocale: options['panel-locale'],
    siteUrl: options['site-url']
  }
  const changes = await initProject(project, { root, sourceDir, configFile, t: await translatorOf(project.panelLocale) })
  print('Starter files', changes, false)

  if (existsSync(resolve(options.dir, 'config.toml'))) {
    await templates({ config: options.config, dir: options.dir, check: false })
  } else {
    console.log(`Email templates: skipped, there is no ${options.dir}/config.toml (run supabase init, then linkchar-cms templates)`)
  }
  await routes({ config: options.config, src: options.src, check: false })
  await migrations({ dir: options.dir, check: false })

  console.log('\nLeft to wire by hand:')
  for (const step of nextSteps(project, { root, sourceDir, configFile }, changes)) console.log(`  - ${step}`)
  return 0
}

const main = async () => {
  const { positionals, values } = parseArgs({
    allowPositionals: true,
    options: {
      dir: { type: 'string', default: 'supabase' },
      config: { type: 'string', default: 'cms.config.ts' },
      src: { type: 'string' },
      check: { type: 'boolean', default: false },
      name: { type: 'string' },
      'base-path': { type: 'string', default: '/dashboard' },
      locales: { type: 'string', default: 'es' },
      'panel-locale': { type: 'string', default: 'es' },
      'site-url': { type: 'string', default: 'http://localhost:3000' },
      help: { type: 'boolean', short: 'h' }
    }
  })

  const command = positionals.join(' ')
  if (command === 'init') return init(values)
  if (command === 'migrations sync') return migrations(values)
  if (command === 'routes') return routes(values)
  if (command === 'templates') return templates(values)
  console.log(USAGE)
  return values.help ? 0 : 1
}

main().then(code => { process.exitCode = code }).catch(error => {
  console.error(error instanceof CliError ? error.message : error)
  process.exitCode = 1
})
