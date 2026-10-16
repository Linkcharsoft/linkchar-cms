import { existsSync } from 'node:fs'
import { copyFile, mkdir, readdir, readFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

export const PACKAGE_SUPABASE = fileURLToPath(new URL('../supabase/', import.meta.url))

export class CliError extends Error {}

/** @typedef {'added' | 'same' | 'differs' | 'updated' | 'removed'} SyncStatusType */
/** @typedef {{ file: string, status: SyncStatusType }} SyncChangeType */

// Git on Windows may check the files out with CRLF: line endings alone are not a change.
/** @param {string} a @param {string} b */
const sameText = (a, b) => a.replace(/\r\n/g, '\n') === b.replace(/\r\n/g, '\n')

/** @param {string} dir @param {string} suffix */
const listFiles = async (dir, suffix) =>
  (existsSync(dir) ? (await readdir(dir)).filter(name => name.endsWith(suffix)).sort() : [])

/** @param {string} from @param {string} to */
const compare = async (from, to) => {
  if (!existsSync(to)) return 'missing'
  const [source, current] = await Promise.all([readFile(from, 'utf8'), readFile(to, 'utf8')])
  return sameText(source, current) ? 'same' : 'differs'
}

/**
 * Copies the package migrations the project lacks and never rewrites one it has: `supabase db push` stays the
 * only way they reach a database. The pgTAP suites in tests/cms belong to the package and follow its version.
 * @param {{ target: string, source?: string, write?: boolean }} options
 * @returns {Promise<{ migrations: SyncChangeType[], tests: SyncChangeType[] }>}
 */
export const syncMigrations = async ({ target, source = PACKAGE_SUPABASE, write = true }) => {
  if (!existsSync(target)) throw new CliError(`There is no Supabase folder at ${target}: run "supabase init" or pass --dir.`)

  const migrationsDir = join(target, 'migrations')
  const testsDir = join(target, 'tests', 'cms')
  if (write) await Promise.all([mkdir(migrationsDir, { recursive: true }), mkdir(testsDir, { recursive: true })])

  /** @type {SyncChangeType[]} */
  const migrations = []
  for (const file of await listFiles(join(source, 'migrations'), '.sql')) {
    const from = join(source, 'migrations', file)
    const to = join(migrationsDir, file)
    const state = await compare(from, to)
    if (state === 'missing' && write) await copyFile(from, to)
    migrations.push({ file, status: state === 'missing' ? 'added' : state })
  }

  /** @type {SyncChangeType[]} */
  const tests = []
  const packageTests = await listFiles(join(source, 'tests'), '.test.sql')
  for (const file of packageTests) {
    const from = join(source, 'tests', file)
    const to = join(testsDir, file)
    const state = await compare(from, to)
    if (state !== 'same' && write) await copyFile(from, to)
    tests.push({ file, status: state === 'missing' ? 'added' : state === 'differs' ? 'updated' : 'same' })
  }
  for (const file of await listFiles(testsDir, '.test.sql')) {
    if (packageTests.includes(file)) continue
    if (write) await rm(join(testsDir, file))
    tests.push({ file, status: 'removed' })
  }

  return { migrations, tests }
}

/** @param {{ migrations: SyncChangeType[], tests: SyncChangeType[] }} report */
export const isUpToDate = report =>
  report.migrations.every(change => change.status === 'same') && report.tests.every(change => change.status === 'same')
