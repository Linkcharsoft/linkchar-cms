#!/usr/bin/env node
import { existsSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { parseArgs } from 'node:util'
import { createSuperadmin, readEnvFile } from './admin.js'
import { environmentChecks } from './doctor.js'
import { initProject, nextSteps, normalizeBasePath } from './init.js'
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
  linkchar-cms admin --email ana@acme.com [--password …] [--name "Ana"] [--env-file .env.local]
  linkchar-cms doctor [--config cms.config.ts] [--src src] [--dir supabase] [--env-file .env.local]

  --dir     The project's Supabase folder (default: ./supabase)
  --config  The project's CMS config (default: ./cms.config.ts)
  --src     Folder with app/ and cms/ (default: ./src when it exists, else the project root)
  --check   Change nothing; exit with 1 when the project is behind the package

  init writes the files a project owns (cms.config.ts, src/cms, the panel and site layouts) where none exist,
  then runs templates, routes and migrations sync, and lists what is left to wire by hand.
  admin makes the first superadmin with SUPABASE_SECRET_KEY: created with --password, else invited by email.
  doctor checks routes, migrations, templates, variables, Supabase, the package registry and the ports.`

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
    basePath: normalizeBasePath(options['base-path']),
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

/** @param {{ email?: string, password?: string, name?: string, 'env-file': string }} options */
const admin = async ({ email, password, name, 'env-file': envFile }) => {
  if (!email) throw new CliError('--email is required.')
  const env = { ...(await readEnvFile(resolve(envFile))), ...process.env }
  const url = env.NEXT_PUBLIC_SUPABASE_URL
  const secretKey = env.SUPABASE_SECRET_KEY
  if (!url || !secretKey) throw new CliError(`NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY are needed, in the environment or in ${envFile}.`)

  const { createClient } = await import('@supabase/supabase-js')
  const client = createClient(url, secretKey, { auth: { persistSession: false, autoRefreshToken: false } })
  const { status } = await createSuperadmin(/** @type {import('./admin.js').AdminClientType} */ (/** @type {unknown} */ (client)), { email, password, name })
  const how = { created: 'created with the given password', invited: 'invited: the email links to the panel', promoted: password ? 'already existed; password updated' : 'already existed' }[status]
  console.log(`Superadmin ${email} at ${url}: ${how}.`)
  return 0
}

/** @param {{ config: string, src?: string, dir: string, 'env-file': string }} options */
const doctor = async ({ config, src, dir, 'env-file': envFile }) => {
  /** @type {import('./doctor.js').CheckType[]} */
  const checks = []
  const supabaseDir = resolve(dir)
  /** @type {import('./routes.js').RoutesConfigType | null} */
  let loaded = null
  try {
    loaded = await loadConfig(resolve(config))
    checks.push({ level: 'ok', text: `${config} loads (panel at ${loaded.basePath})` })
  } catch (error) {
    checks.push({ level: 'fail', text: error instanceof Error ? error.message : String(error) })
  }

  if (loaded) {
    const sourceDir = resolve(src ?? (existsSync('src') ? 'src' : '.'))
    const routeChanges = await syncRoutes({ sourceDir, config: loaded, configFile: resolve(config), write: false })
    const proxy = await checkProxy({ sourceDir, basePath: loaded.basePath })
    const behind = routeChanges.filter(change => change.status !== 'same' && change.status !== 'kept').length
    checks.push(behind > 0 || proxy !== 'ok'
      ? { level: 'fail', text: `Panel routes are behind (${behind} files${proxy === 'ok' ? '' : `, proxy ${proxy}`}): linkchar-cms routes` }
      : { level: 'ok', text: 'Panel routes and proxy are up to date' })
  }
  if (existsSync(join(supabaseDir, 'config.toml'))) {
    checks.push(isUpToDate(await syncMigrations({ target: supabaseDir, write: false }))
      ? { level: 'ok', text: 'Migrations are in sync with the package' }
      : { level: 'fail', text: 'Migrations are behind the package: linkchar-cms migrations sync' })
    if (loaded) {
      const emails = await syncTemplates({ supabaseDir, basePath: loaded.basePath, t: await translatorOf(loaded), write: false })
      checks.push(emails.some(change => change.status === 'added' || change.status === 'stale')
        ? { level: 'fail', text: 'Email templates are missing or link elsewhere: linkchar-cms templates' }
        : { level: 'ok', text: 'Email templates link to the panel' })
    }
  } else {
    checks.push({ level: 'fail', text: `There is no ${dir}/config.toml: supabase init` })
  }

  const env = { ...(await readEnvFile(resolve(envFile))), ...process.env }
  const siteUrl = loaded?.site?.url ?? null
  checks.push(...await environmentChecks({ root: resolve('.'), supabaseDir, env, siteUrl }))

  const marks = { ok: '✓', warn: '!', fail: '✗' }
  for (const { level, text } of checks) console.log(`${marks[level]} ${text}`)
  return checks.some(check => check.level === 'fail') ? 1 : 0
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
      email: { type: 'string' },
      password: { type: 'string' },
      'env-file': { type: 'string', default: '.env.local' },
      'base-path': { type: 'string', default: '/dashboard' },
      locales: { type: 'string', default: 'es' },
      'panel-locale': { type: 'string', default: 'es' },
      'site-url': { type: 'string', default: 'http://localhost:3000' },
      help: { type: 'boolean', short: 'h' }
    }
  })

  const command = positionals.join(' ')
  if (command === 'init') return init(values)
  if (command === 'admin') return admin(values)
  if (command === 'doctor') return doctor(values)
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
