import { Readable } from 'node:stream'
import { describe, expect, it } from 'vitest'
import { importSettings, readPasswordFromStdin, summaryLines } from '../import.js'

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

describe('summaryLines', () => {
  it('counts the run and warns about documents created where the collection already had some', () => {
    expect(summaryLines({ matched: { id: 0, key: 0, slug: 0 }, adopted: 0, untouched: [], updated: 3, created: [] })).toEqual(['3 updated, 0 created.'])
    expect(summaryLines({ updated: 15, created: [], matched: { id: 0, key: 14, slug: 1 }, adopted: 1, untouched: [] })).toEqual(['15 updated (14 by key, 1 by slug, 1 key adopted), 0 created.'])
    expect(summaryLines({ updated: 2, created: [], matched: { id: 0, key: 0, slug: 2 }, adopted: 2, untouched: [] })).toEqual(['2 updated (2 by slug, 2 keys adopted), 0 created.'])
    expect(summaryLines({ updated: 1, created: [], matched: { id: 0, key: 1, slug: 0 }, adopted: 0, untouched: [{ entry: 'projects', id: 'd1', title: 'TocToc' }, { entry: 'projects', id: 'd2', title: '' }] })).toEqual([
      '1 updated (1 by key), 0 created.',
      '! projects has 2 hidden documents the script did not touch and nobody published: TocToc, d2. Open the collection in the panel to keep or trash them.'
    ])
    expect(summaryLines({ matched: { id: 0, key: 0, slug: 0 }, adopted: 0, untouched: [], updated: 0, created: [{ entry: 'projects', id: '1', lookup: 'slug givxo', existing: 0 }] })).toEqual(['0 updated, 1 created.'])
    expect(summaryLines({
      matched: { id: 0, key: 0, slug: 0 }, adopted: 0, untouched: [],
      updated: 2,
      created: [
        { entry: 'projects', id: '1', lookup: 'slug consultores-de-empresas-automatizacion-arca', existing: 12 },
        { entry: 'projects', id: '2', lookup: 'key arca', existing: 13 },
        { entry: 'posts', id: '3', lookup: 'slug nuevo', existing: 0 }
      ]
    })).toEqual([
      '2 updated, 3 created.',
      '! projects already had 12 documents; created consultores-de-empresas-automatizacion-arca (slug not found), arca (key not found). Pass match: { key } so the import finds a document after its slug changes, or --no-create to refuse.'
    ])
  })
})
