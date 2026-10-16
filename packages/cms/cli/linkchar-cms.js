#!/usr/bin/env node
import { resolve } from 'node:path'
import { parseArgs } from 'node:util'
import { CliError, isUpToDate, syncMigrations } from './migrations.js'

/** @typedef {import('./migrations.js').SyncChangeType} SyncChangeType */

const USAGE = `Usage: linkchar-cms migrations sync [--dir supabase] [--check]

  --dir    The project's Supabase folder (default: ./supabase)
  --check  Change nothing; exit with 1 when the project is behind the package`

/** @type {Record<SyncChangeType['status'], string>} */
const SYMBOLS = { added: '+', updated: '~', removed: '-', differs: '!', same: '=' }

/** @param {string} title @param {SyncChangeType[]} changes @param {boolean} check */
const print = (title, changes, check) => {
  const shown = changes.filter(change => change.status !== 'same')
  console.log(shown.length === 0 ? `${title}: up to date` : `${title}:`)
  for (const { file, status } of shown) {
    const verb = check && status !== 'differs' ? `would be ${status}` : status
    console.log(`  ${SYMBOLS[status]} ${file} (${verb})`)
  }
}

const main = async () => {
  const { positionals, values } = parseArgs({
    allowPositionals: true,
    options: { dir: { type: 'string', default: 'supabase' }, check: { type: 'boolean', default: false }, help: { type: 'boolean', short: 'h' } }
  })

  if (values.help || positionals.join(' ') !== 'migrations sync') {
    console.log(USAGE)
    return values.help ? 0 : 1
  }

  const report = await syncMigrations({ target: resolve(values.dir), write: !values.check })
  print('Migrations', report.migrations, values.check)
  print('Tests (tests/cms)', report.tests, values.check)

  const differs = report.migrations.filter(change => change.status === 'differs')
  if (differs.length > 0) {
    console.warn('\nA package migration was edited in the project. It is left as is: an applied migration must not change.')
  }
  return values.check && !isUpToDate(report) ? 1 : 0
}

main().then(code => { process.exitCode = code }).catch(error => {
  console.error(error instanceof CliError ? error.message : error)
  process.exitCode = 1
})
