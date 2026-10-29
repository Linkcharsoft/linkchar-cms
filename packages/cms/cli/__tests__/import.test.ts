import { Readable } from 'node:stream'
import { describe, expect, it } from 'vitest'
import { askYesNo, importSettings, planLines, readPasswordFromStdin, summaryLines } from '../import.js'
import type { ImportSummaryType } from '../../src/server/import'

const sum = (partial: Partial<ImportSummaryType>): ImportSummaryType =>
  ({ created: [], updated: 0, matched: { id: 0, key: 0, slug: 0 }, adopted: 0, untouched: [], changed: [], unchanged: 0, media: 0, dryRun: false, ...partial })

const supabase = {
  NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:44421',
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_x',
  SUPABASE_SECRET_KEY: 'sb_secret_x'
}

describe('importSettings', () => {
  it('signs in with --email and the password from the environment', () => {
    expect(importSettings({ ...supabase, CMS_IMPORT_PASSWORD: 'secreto' }, { email: 'ana@acme.com', otp: '123456' })).toEqual({
      email: 'ana@acme.com',
      password: 'secreto',
      otp: '123456',
      supabase: { url: 'http://127.0.0.1:44421', publishableKey: 'sb_publishable_x', secretKey: 'sb_secret_x' },
      build: { kind: 'mock' }
    })
  })

  it('builds like the project: Amplify with a hook, nothing on a hosted project without one', () => {
    const hosted = { ...supabase, NEXT_PUBLIC_SUPABASE_URL: 'https://abc.supabase.co' }
    expect(importSettings({ ...hosted, CMS_BUILD_HOOK_URL: 'https://hook', CMS_BUILD_WEBHOOK_SECRET: 's' }, { email: 'a@b.co', password: 'p' }).build)
      .toEqual({ kind: 'amplify', hookUrl: 'https://hook', webhookSecret: 's' })
    expect(importSettings(hosted, { email: 'a@b.co', password: 'p' }).build).toEqual({ kind: 'none' })
  })

  it('names what is missing', () => {
    expect(() => importSettings(supabase, { email: 'ana@acme.com' })).toThrow('CMS_IMPORT_PASSWORD (or --password, or --password-stdin)')
    expect(() => importSettings({ CMS_IMPORT_EMAIL: 'a@b.co', CMS_IMPORT_PASSWORD: 'p' }, {}))
      .toThrow('Missing NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, SUPABASE_SECRET_KEY')
  })
})

describe('readPasswordFromStdin', () => {
  it('takes the first line and nothing else', async () => {
    expect(await readPasswordFromStdin(Readable.from(['secr', 'eto\n', 'ignored\n']))).toBe('secreto')
    expect(await readPasswordFromStdin(Readable.from(['sin salto']))).toBe('sin salto')
    await expect(readPasswordFromStdin(Readable.from(['\n']))).rejects.toThrow('--password-stdin got nothing')
  })
})

describe('planLines', () => {
  it('names each document that changes with its fields, what is created and uploaded, or that nothing is', () => {
    const changed = [{ entry: 'projects', id: 'p1', title: 'Casa Giv', fields: ['title.es', 'gallery'] }, { entry: 'home', id: 'h', title: '', fields: ['hero.image'] }]
    const created = [{ entry: 'projects', id: 'dry-run-projects-1', lookup: 'key arca', existing: 12 }]
    expect(planLines(sum({ changed, created, unchanged: 11, media: 2 }), 'https://abc.supabase.co')).toEqual([
      'Plan for https://abc.supabase.co: 2 documents change, 1 created, 11 unchanged, 2 files uploaded.',
      '  ~ projects "Casa Giv": title.es, gallery',
      '  ~ home "h": hero.image',
      '  + projects (key arca)'
    ])
    expect(planLines(sum({ changed: [changed[0]], unchanged: 0 }), 'http://127.0.0.1:44421')).toEqual(['Plan for http://127.0.0.1:44421: 1 document change, 0 created, 0 unchanged, 0 files uploaded.', '  ~ projects "Casa Giv": title.es, gallery'])
    expect(planLines(sum({ unchanged: 14 }), 'https://abc.supabase.co')).toEqual(['Nothing to write to https://abc.supabase.co: every document matches the script (14 documents unchanged).'])
    expect(planLines(sum({}), 'https://abc.supabase.co')).toEqual(['Nothing to write to https://abc.supabase.co: every document matches the script.'])
  })
})

describe('askYesNo', () => {
  it('takes y or yes, and anything else as no', async () => {
    const { PassThrough } = await import('node:stream')
    const ask = async (answer: string) => {
      const input = new PassThrough()
      const output = new PassThrough()
      const pending = askYesNo('Write? ', { input, output })
      input.end(`${answer}\n`)
      return pending
    }
    expect(await ask('y')).toBe(true)
    expect(await ask(' YES ')).toBe(true)
    expect(await ask('n')).toBe(false)
    expect(await ask('')).toBe(false)
  })
})

describe('summaryLines', () => {
  it('counts the run and warns about documents created where the collection already had some', () => {
    expect(summaryLines(sum({ updated: 3, changed: [{ entry: 'posts', id: 'a', title: 'A', fields: ['title.es'] }], unchanged: 2 }))).toEqual(['3 updated (1 changed, 2 unchanged), 0 created.'])
    expect(summaryLines(sum({ updated: 15, matched: { id: 0, key: 14, slug: 1 }, adopted: 1, unchanged: 15, media: 1 }))).toEqual(['15 updated (0 changed, 15 unchanged; 14 by key, 1 by slug, 1 key adopted), 0 created, 1 file uploaded.'])
    expect(summaryLines(sum({ updated: 2, matched: { id: 0, key: 0, slug: 2 }, adopted: 2, unchanged: 2 }))).toEqual(['2 updated (0 changed, 2 unchanged; 2 by slug, 2 keys adopted), 0 created.'])
    expect(summaryLines(sum({ updated: 1, matched: { id: 0, key: 1, slug: 0 }, unchanged: 1, untouched: [{ entry: 'projects', id: 'd1', title: 'TocToc' }, { entry: 'projects', id: 'd2', title: '' }] }))).toEqual([
      '1 updated (0 changed, 1 unchanged; 1 by key), 0 created.',
      '! projects has 2 hidden documents the script did not touch and nobody published: TocToc, d2. Open the collection in the panel to keep or trash them.'
    ])
    expect(summaryLines(sum({ created: [{ entry: 'projects', id: '1', lookup: 'slug givxo', existing: 0 }] }))).toEqual(['0 updated, 1 created.'])
    expect(summaryLines(sum({
      updated: 2,
      unchanged: 2,
      created: [
        { entry: 'projects', id: '1', lookup: 'slug consultores-de-empresas-automatizacion-arca', existing: 12 },
        { entry: 'projects', id: '2', lookup: 'key arca', existing: 13 },
        { entry: 'posts', id: '3', lookup: 'slug nuevo', existing: 0 }
      ]
    }))).toEqual([
      '2 updated (0 changed, 2 unchanged), 3 created.',
      '! projects already had 12 documents; created consultores-de-empresas-automatizacion-arca (slug not found), arca (key not found). Pass match: { key } so the import finds a document after its slug changes, or --no-create to refuse.'
    ])
  })
})
