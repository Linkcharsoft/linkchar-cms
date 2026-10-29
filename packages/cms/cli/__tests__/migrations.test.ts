import { existsSync } from 'node:fs'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { CliError, isUpToDate, PACKAGE_SUPABASE, syncMigrations } from '../migrations.js'

let root: string
let source: string
let target: string

const write = async (path: string, text: string) => {
  await mkdir(join(path, '..'), { recursive: true })
  await writeFile(path, text)
}

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'cms-sync-'))
  source = join(root, 'package')
  target = join(root, 'project', 'supabase')
  await write(join(source, 'migrations', '20261020000000_cms_base.sql'), 'create table a ();\n')
  await write(join(source, 'migrations', '20261101000000_cms_next.sql'), 'create table b ();\n')
  await write(join(source, 'tests', 'content.test.sql'), 'select 1;\n')
  await mkdir(target, { recursive: true })
})

afterEach(() => rm(root, { recursive: true, force: true }))

describe('syncMigrations', () => {
  it('copies the package migrations and tests the project lacks', async () => {
    const report = await syncMigrations({ source, target })
    expect(report.migrations.map(change => change.status)).toEqual(['added', 'added'])
    expect(report.tests).toEqual([{ file: 'content.test.sql', status: 'added' }])
    expect(await readFile(join(target, 'migrations', '20261101000000_cms_next.sql'), 'utf8')).toBe('create table b ();\n')
    expect(existsSync(join(target, 'tests', 'cms', 'content.test.sql'))).toBe(true)
    expect(isUpToDate(await syncMigrations({ source, target }))).toBe(true)
  })

  it('never rewrites a migration the project already has', async () => {
    await write(join(target, 'migrations', '20261020000000_cms_base.sql'), 'create table a (edited int);\n')
    const report = await syncMigrations({ source, target })
    expect(report.migrations[0]).toEqual({ file: '20261020000000_cms_base.sql', status: 'differs' })
    expect(await readFile(join(target, 'migrations', '20261020000000_cms_base.sql'), 'utf8')).toBe('create table a (edited int);\n')
  })

  it('does not count line endings as a change', async () => {
    await write(join(target, 'migrations', '20261020000000_cms_base.sql'), 'create table a ();\r\n')
    expect((await syncMigrations({ source, target })).migrations[0].status).toBe('same')
  })

  it('keeps the package tests in step, removing the ones it dropped', async () => {
    await write(join(target, 'tests', 'cms', 'content.test.sql'), 'select 0;\n')
    await write(join(target, 'tests', 'cms', 'old.test.sql'), 'select 2;\n')
    await write(join(target, 'tests', 'own.test.sql'), 'select 3;\n')
    const report = await syncMigrations({ source, target })
    expect(report.tests).toEqual([{ file: 'content.test.sql', status: 'updated' }, { file: 'old.test.sql', status: 'removed' }])
    expect(await readFile(join(target, 'tests', 'cms', 'content.test.sql'), 'utf8')).toBe('select 1;\n')
    expect(existsSync(join(target, 'tests', 'own.test.sql'))).toBe(true)
  })

  it('only reports when asked to check', async () => {
    const report = await syncMigrations({ source, target, write: false })
    expect(isUpToDate(report)).toBe(false)
    expect(existsSync(join(target, 'migrations'))).toBe(false)
  })

  it('needs a Supabase folder', async () => {
    await expect(syncMigrations({ source, target: join(root, 'nowhere') })).rejects.toThrow(CliError)
  })

  it('ships the base migration and the generic suites', async () => {
    const report = await syncMigrations({ target, write: false })
    expect(PACKAGE_SUPABASE).toMatch(/supabase[\\/]$/)
    expect(report.migrations.map(change => change.file)).toContain('20261020000000_cms_base.sql')
    expect(report.tests.map(change => change.file)).toEqual(
      ['accounts.test.sql', 'cms_migrations.test.sql', 'content.test.sql', 'document_usage.test.sql', 'locale_slugs.test.sql', 'media_hash.test.sql', 'media_usage.test.sql', 'publish.test.sql', 'redirects.test.sql', 'rls.test.sql', 'service_role.test.sql']
    )
  })
})
