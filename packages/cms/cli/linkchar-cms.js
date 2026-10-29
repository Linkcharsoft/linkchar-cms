#!/usr/bin/env node
import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { parseArgs } from 'node:util'
import { findBrandIcon } from '../next/index.js'
import { createSuperadmin, readProjectEnv } from './admin.js'
import { buildIdentity, describeBuildReport, reportSettings, runBuildReport } from './build.js'
import { authChecks, environmentChecks } from './doctor.js'
import { askYesNo, importSettings, planLines, readPasswordFromStdin, runImport, summaryLines } from './import.js'
import { initProject, nextSteps, normalizeBasePath } from './init.js'
import { isLocalSupabaseUrl } from './local.js'
import { CliError, isUpToDate, syncMigrations } from './migrations.js'
import { amplifyTrigger, describePing, maskHookUrl, pingSettings, runPing } from './publish.js'
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
  linkchar-cms import <script.ts> --email ana@acme.com [--password …] [--password-stdin] [--otp 123456] [--dry-run] [--yes] [--allow-remote] [--no-publish] [--no-create] [--config cms.config.ts] [--env-file .env.local]
  linkchar-cms publish:ping [--timeout 20] [--config cms.config.ts] [--env-file .env.local]
  linkchar-cms build:report --start | --ok | --failed [--env-file .env.local]

  --dir     The project's Supabase folder (default: ./supabase)
  --config  The project's CMS config (default: ./cms.config.ts)
  --src     Folder with app/ and cms/ (default: ./src when it exists, else the project root)
  --check   Change nothing; exit with 1 when the project is behind the package
  --env-file  The env file to read (default: .env.local, then .env, as Next does); the environment wins over it
  --help    This text

  init writes the files a project owns (cms.config.ts, src/cms, the panel and site layouts) where none exist,
  then runs templates, routes and migrations sync, and lists what is left to wire by hand.
  admin makes the first superadmin with SUPABASE_SECRET_KEY: created with --password, else invited by email.
  doctor checks routes, the panel icon, migrations (files and applied), templates, variables, Supabase, the publish circuit, amplify.yml, the package registry and the ports.
  import runs the script's default export with a session signed in as --email (password in CMS_IMPORT_PASSWORD,
  --password or --password-stdin): cms.media(), cms.upsert(), cms.transform() and cms.publish(). It first runs the
  script dry, prints what would change (each document and its fields) and asks before writing; --yes skips the question
  (CI), --dry-run stops after the plan. A Supabase that is not local takes --allow-remote. --no-publish makes
  cms.publish() report without publishing, --no-create makes cms.upsert() fail instead of creating a document.
  publish:ping verifies the publish circuit end to end: it logs an empty publish, fires CMS_BUILD_HOOK_URL and waits
  (--timeout minutes) for the build to report itself and the site to serve it. It costs one Amplify build and takes the 30-minute lock.
  build:report runs inside the site's build (amplify.yml) with the build's own variables: --start in preBuild takes the
  open publish, --ok and --failed close the build. Without an open publish it does nothing, and it never fails the build.`

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
  if (!check && changes.some(change => change.status === 'removed')) console.log('\nA removed route leaves .next/types behind: run next typegen (or next build) before the next type-check.')
  return check && (behind || proxy !== 'ok') ? 1 : 0
}

/** @param {{ config: string, dir: string, check: boolean }} options */
const templates = async ({ config, dir, check }) => {
  const loaded = await loadConfig(resolve(config))
  const changes = await syncTemplates({ supabaseDir: resolve(dir), basePath: loaded.basePath, t: await translatorOf(loaded), product: loaded.branding?.name, write: !check })
  print('Email templates', changes, check)

  if (changes.some(change => change.status === 'stale')) {
    console.warn(`\nAn email template does not link to ${loaded.basePath}/auth/confirm: fix its href, or delete it and run this again.`)
  }
  return check && changes.some(change => change.status !== 'same' && change.status !== 'kept') ? 1 : 0
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

/** @param {{ email?: string, password?: string, name?: string, 'env-file'?: string }} options */
const admin = async ({ email, password, name, 'env-file': envFile }) => {
  if (!email) throw new CliError('--email is required.')
  const { env, label } = await readProjectEnv(envFile)
  const url = env.NEXT_PUBLIC_SUPABASE_URL
  const secretKey = env.SUPABASE_SECRET_KEY
  if (!url || !secretKey) throw new CliError(`NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY are needed, in the environment or in ${label}.`)

  const { createClient } = await import('@supabase/supabase-js')
  const client = createClient(url, secretKey, { auth: { persistSession: false, autoRefreshToken: false } })
  const { status } = await createSuperadmin(/** @type {import('./admin.js').AdminClientType} */ (/** @type {unknown} */ (client)), { email, password, name })
  const how = { created: 'created with the given password', invited: 'invited: the email links to the panel', promoted: password ? 'already existed; password updated, email confirmed' : 'already existed' }[status]
  console.log(`Superadmin ${email} at ${url}: ${how}.`)
  return 0
}

/**
 * @param {import('./routes.js').RoutesConfigType} config
 * @returns {import('./doctor.js').CheckType}
 */
const brandIconCheck = ({ branding }) => {
  if (branding?.icon) return { level: 'ok', text: `Panel icon: ${branding.icon} (branding.icon)` }
  const found = findBrandIcon(resolve('.'))
  return found
    ? { level: 'ok', text: `Panel icon: ${found.url} (from ${found.file})` }
    : { level: 'warn', text: 'No product icon: add app/icon.svg or set branding.icon (the panel shows initials meanwhile)' }
}

/** @param {{ config: string, src?: string, dir: string, 'env-file'?: string }} options */
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
    checks.push(brandIconCheck(loaded))
  }
  if (existsSync(join(supabaseDir, 'config.toml'))) {
    checks.push(...authChecks(await readFile(join(supabaseDir, 'config.toml'), 'utf8')))
    checks.push(isUpToDate(await syncMigrations({ target: supabaseDir, write: false }))
      ? { level: 'ok', text: 'Migrations are in sync with the package' }
      : { level: 'fail', text: 'Migrations are behind the package: linkchar-cms migrations sync' })
    if (loaded) {
      const emails = await syncTemplates({ supabaseDir, basePath: loaded.basePath, t: await translatorOf(loaded), write: false })
      checks.push(emails.some(change => change.status !== 'same' && change.status !== 'kept')
        ? { level: 'fail', text: 'Email templates are missing, unbranded or link elsewhere: linkchar-cms templates' }
        : { level: 'ok', text: 'Email templates link to the panel' })
    }
  } else {
    checks.push({ level: 'fail', text: `There is no ${dir}/config.toml: supabase init` })
  }

  const { env, label } = await readProjectEnv(envFile)
  const siteUrl = loaded?.site?.url ?? null
  checks.push(...await environmentChecks({ root: resolve('.'), supabaseDir, env, envFile: label, siteUrl }))

  const marks = { ok: '✓', warn: '!', fail: '✗' }
  for (const { level, text } of checks) console.log(`${marks[level]} ${text}`)
  return checks.some(check => check.level === 'fail') ? 1 : 0
}

/**
 * @param {string | undefined} script
 * @param {{ config: string, email?: string, password?: string, 'password-stdin': boolean, otp?: string, publish: boolean, create: boolean, 'dry-run': boolean, yes: boolean, 'allow-remote': boolean, 'env-file'?: string }} options
 */
const importContent = async (script, { config, email, password, 'password-stdin': passwordStdin, otp, publish, create, 'dry-run': dryRun, yes, 'allow-remote': allowRemote, 'env-file': envFile }) => {
  if (!script) throw new CliError('Usage: linkchar-cms import <script.ts> --email ana@acme.com [--password-stdin] [--dry-run] [--yes] [--allow-remote] [--no-publish] [--no-create] [--env-file .env.local]; linkchar-cms --help lists every option.')
  if (passwordStdin && password) throw new CliError('Pass --password or --password-stdin, not both.')
  const secret = passwordStdin ? await readPasswordFromStdin(process.stdin) : password
  const { env, label } = await readProjectEnv(envFile)
  const settings = importSettings(env, { email, password: secret, otp }, label)
  const { url } = settings.supabase
  if (!dryRun && !allowRemote && !isLocalSupabaseUrl(url)) {
    throw new CliError(`${url} is not a local Supabase: an import replaces what editors wrote there. Run with --dry-run to see the plan, then --allow-remote to write it.`)
  }
  const run = (/** @type {boolean} */ dry) => runImport({ script: resolve(script), configFile: resolve(config), root: resolve('.'), settings, publish, create, dryRun: dry })

  const plan = await run(true)
  for (const line of planLines(plan.summary, url)) console.log(line)
  if (dryRun) return 0
  if (plan.summary.changed.length + plan.summary.created.length + plan.summary.media === 0) return 0
  if (!yes) {
    if (passwordStdin) throw new CliError('With --password-stdin there is no terminal to ask on: pass --yes to write the plan above.')
    if (!process.stdin.isTTY) throw new CliError('No terminal to ask on: pass --yes to write the plan above.')
    if (!await askYesNo(`Write this to ${url}? [y/N] `)) {
      console.log('Nothing written.')
      return 0
    }
  }
  const { build, summary } = await run(false)
  const builds = { amplify: 'publishing triggers the Amplify build', mock: 'publishing ran the mock build', none: 'no build hook (CMS_BUILD_HOOK_URL): retry the build from Publicar' }
  console.log(`Import done as ${settings.email} at ${settings.supabase.url}${publish ? `; ${builds[build]}` : '; nothing published (--no-publish)'}.`)
  for (const line of summaryLines(summary)) console.log(line)
  return 0
}

/** @param {{ timeout: string, config: string, 'env-file'?: string }} options */
const publishPing = async ({ timeout, config, 'env-file': envFile }) => {
  const { env, label } = await readProjectEnv(envFile)
  const loaded = existsSync(resolve(config)) ? await loadConfig(resolve(config)).catch(() => null) : null
  const settings = pingSettings(env, label, loaded?.site?.url ?? env.NEXT_PUBLIC_SITE_URL ?? null)
  const minutes = Number(timeout)
  if (!Number.isFinite(minutes) || minutes <= 0) throw new CliError('--timeout takes the minutes to wait for the site, e.g. --timeout 20.')
  console.log(`Verifying the publish circuit of ${settings.url} through ${maskHookUrl(settings.hookUrl)} (up to ${minutes} min)…`)
  const result = await runPing({ settings, trigger: await amplifyTrigger(settings), timeoutMs: minutes * 60_000 })
  console.log(describePing(result))
  return result.ok ? 0 : 1
}

// Runs inside the site's build: whatever goes wrong is said and the build goes on.
/** @param {{ start: boolean, ok: boolean, failed: boolean, 'env-file'?: string }} options */
const buildReport = async ({ start, ok, failed, 'env-file': envFile }) => {
  const phases = /** @type {('start' | 'ok' | 'failed')[]} */ ([start && 'start', ok && 'ok', failed && 'failed'].filter(Boolean))
  if (phases.length !== 1) throw new CliError('build:report takes exactly one of --start, --ok or --failed.')
  const [phase] = phases
  try {
    const { env, label } = await readProjectEnv(envFile)
    const identity = buildIdentity(env)
    const result = await runBuildReport({ phase, settings: reportSettings(env, label), identity })
    console.log(describeBuildReport(phase, result, identity))
  } catch (error) {
    console.error(`build:report --${phase} could not reach the publish log (${error instanceof Error ? error.message : error}); the build goes on.`)
  }
  return 0
}

const main = async () => {
  const { positionals, values } = parseArgs({
    allowPositionals: true,
    allowNegative: true,
    options: {
      dir: { type: 'string', default: 'supabase' },
      config: { type: 'string', default: 'cms.config.ts' },
      src: { type: 'string' },
      check: { type: 'boolean', default: false },
      name: { type: 'string' },
      email: { type: 'string' },
      password: { type: 'string' },
      'password-stdin': { type: 'boolean', default: false },
      otp: { type: 'string' },
      publish: { type: 'boolean', default: true },
      create: { type: 'boolean', default: true },
      'dry-run': { type: 'boolean', default: false },
      yes: { type: 'boolean', default: false },
      'allow-remote': { type: 'boolean', default: false },
      'env-file': { type: 'string' },
      timeout: { type: 'string', default: '20' },
      start: { type: 'boolean', default: false },
      ok: { type: 'boolean', default: false },
      failed: { type: 'boolean', default: false },
      'base-path': { type: 'string', default: '/dashboard' },
      locales: { type: 'string', default: 'es' },
      'panel-locale': { type: 'string', default: 'es' },
      'site-url': { type: 'string', default: 'http://localhost:3000' },
      help: { type: 'boolean', short: 'h' }
    }
  })

  const command = positionals.join(' ')
  if (values.help) {
    console.log(USAGE)
    return 0
  }
  if (command === 'init') return init(values)
  if (command === 'admin') return admin(values)
  if (command === 'doctor') return doctor(values)
  if (positionals[0] === 'import') return importContent(positionals[1], values)
  if (command === 'publish:ping') return publishPing(values)
  if (command === 'build:report') return buildReport(values)
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
