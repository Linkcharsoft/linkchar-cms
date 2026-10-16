#!/usr/bin/env node
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { parseArgs } from 'node:util'
import { CliError, isUpToDate, syncMigrations } from './migrations.js'
import { checkProxy, loadConfig, syncRoutes } from './routes.js'

/** @typedef {import('./migrations.js').SyncChangeType} SyncChangeType */
/** @typedef {import('./routes.js').RouteChangeType} RouteChangeType */

const USAGE = `Usage:
  linkchar-cms migrations sync [--dir supabase] [--check]
  linkchar-cms routes [--config cms.config.ts] [--src src] [--check]

  --dir     The project's Supabase folder (default: ./supabase)
  --config  The project's CMS config (default: ./cms.config.ts)
  --src     Folder with app/ and cms/ (default: ./src when it exists, else the project root)
  --check   Change nothing; exit with 1 when the project is behind the package`

/** @type {Record<SyncChangeType['status'] | RouteChangeType['status'], string>} */
const SYMBOLS = { added: '+', updated: '~', removed: '-', differs: '!', same: '=', kept: '=' }

/** @param {string} title @param {(SyncChangeType | RouteChangeType)[]} changes @param {boolean} check */
const print = (title, changes, check) => {
  const shown = changes.filter(change => change.status !== 'same' && change.status !== 'kept')
  console.log(shown.length === 0 ? `${title}: up to date` : `${title}:`)
  for (const { file, status } of shown) {
    const verb = check && status !== 'differs' ? `would be ${status}` : status
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

const main = async () => {
  const { positionals, values } = parseArgs({
    allowPositionals: true,
    options: {
      dir: { type: 'string', default: 'supabase' },
      config: { type: 'string', default: 'cms.config.ts' },
      src: { type: 'string' },
      check: { type: 'boolean', default: false },
      help: { type: 'boolean', short: 'h' }
    }
  })

  const command = positionals.join(' ')
  if (command === 'migrations sync') return migrations(values)
  if (command === 'routes') return routes(values)
  console.log(USAGE)
  return values.help ? 0 : 1
}

main().then(code => { process.exitCode = code }).catch(error => {
  console.error(error instanceof CliError ? error.message : error)
  process.exitCode = 1
})
