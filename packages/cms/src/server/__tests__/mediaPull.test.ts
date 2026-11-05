import { createHash } from 'node:crypto'
import { existsSync } from 'node:fs'
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { defineCmsConfig } from '../../core/config'
import { page } from '../../core/define'
import { file, image, richText, section, text, videoFile } from '../../core/fields'
import { planMediaPull, publishedMedia, runMediaPull } from '../mediaPull'
import { createFakeDb, fakeClient } from './fakeSupabase'
import type { PulledMediaRowType } from '../mediaPull'
import type { FakeDbType } from './fakeSupabase'

const ID = (n: number) => `6f1c3b2a-5555-4c1d-9e0f-${String(n).padStart(12, '0')}`

const schema = {
  home: page('Inicio', {
    hero: section('Portada', { title: text({ label: 'Título' }), cover: image({ label: 'Imagen' }), clip: videoFile({ label: 'Video' }), brochure: file({ label: 'PDF' }), body: richText({ label: 'Texto' }) })
  }, { path: '/' })
}

const config = defineCmsConfig({ schema, locales: ['es', 'en'], media: { delivery: 'build' } })

const media = (n: number, path: string, mime: string, size: number, extra: Record<string, unknown> = {}) => ({
  id: ID(n), path, filename: path.split('/').pop(), folder: 'sitio', alt: {}, caption: {}, mime, size, width: null, height: null,
  focal_x: null, focal_y: null, blur_data_url: null, duration: null, poster_id: null, hash: null, created_at: '', deleted_at: null, ...extra
})

const PDF_BYTES = 'p'.repeat(300)
const PDF_HASH = createHash('sha256').update(PDF_BYTES).digest('hex')

let db: FakeDbType
let root: string

beforeEach(async () => {
  db = createFakeDb()
  root = await mkdtemp(join(tmpdir(), 'cms-pull-'))
  db.tables.media.push(
    media(1, 'sitio/2026/cover.webp', 'image/webp', 10, { hash: 'b'.repeat(64) }),
    media(2, 'sitio/2026/clip.mp4', 'video/mp4', 5000, { poster_id: ID(3) }),
    media(3, 'sitio/2026/poster.webp', 'image/webp', 20),
    media(4, 'sitio/2026/brochure.pdf', 'application/pdf', 300, { hash: PDF_HASH }),
    media(5, 'sitio/2026/inline.webp', 'image/webp', 30),
    media(6, 'sitio/2026/draft-only.webp', 'image/webp', 40),
    media(7, 'sitio/2026/trashed.webp', 'image/webp', 50, { deleted_at: '2026-01-01' })
  )
  db.tables.published_documents.push({
    id: ID(10), type: 'home', key: 'home', slug: null, slugs: {}, paths: {}, sort_order: 0, published_at: '2026-10-01T00:00:00Z',
    data: {
      hero: {
        title: { es: 'Hola' },
        cover: { es: ID(1) },
        clip: { es: ID(2) },
        brochure: { es: ID(4), en: ID(7) },
        body: { es: { type: 'doc', content: [{ type: 'image', attrs: { mediaId: ID(5) } }] } }
      }
    }
  })
  db.tables.documents.push({ id: ID(10), type: 'home', key: 'home', slugs: {}, deleted_at: null, visible: true, data: { hero: { cover: { es: ID(6) } } } })
})

afterEach(() => rm(root, { recursive: true, force: true }))

const row = (n: number, path: string, mime: string, size: number, hash: string | null = null): PulledMediaRowType => ({ id: ID(n), path, mime, size, hash })

describe('publishedMedia', () => {
  it('collects the files of the published content through the field references, posters included, drafts and trash left out', async () => {
    const rows = await publishedMedia(config, fakeClient(db))
    expect(rows.map(item => item.path).sort()).toEqual(['sitio/2026/brochure.pdf', 'sitio/2026/clip.mp4', 'sitio/2026/cover.webp', 'sitio/2026/inline.webp', 'sitio/2026/poster.webp'])
    expect(rows.find(item => item.id === ID(4))).toEqual({ id: ID(4), path: 'sitio/2026/brochure.pdf', mime: 'application/pdf', size: 300, hash: PDF_HASH })
  })

  it('fails when Supabase cannot be read', async () => {
    db.failNext = { table: 'published_documents', op: 'select', error: { code: '42501', message: 'permission denied' } }
    await expect(publishedMedia(config, fakeClient(db))).rejects.toThrow('permission denied')
  })
})

describe('planMediaPull', () => {
  it('reuses a local file of the same path and size, checks the hash of PDFs and videos only, and removes the rest', async () => {
    const rows = [
      row(1, 'sitio/2026/cover.webp', 'image/webp', 10, 'b'.repeat(64)),
      row(2, 'sitio/2026/clip.mp4', 'video/mp4', 5000, 'c'.repeat(64)),
      row(4, 'sitio/2026/brochure.pdf', 'application/pdf', 300, PDF_HASH),
      row(5, 'sitio/2026/inline.webp', 'image/webp', 30)
    ]
    const local = new Map([
      ['sitio/2026/cover.webp', 10],
      ['sitio/2026/clip.mp4', 5000],
      ['sitio/2026/brochure.pdf', 300],
      ['sitio/2026/inline.webp', 31],
      ['sitio/2025/gone.webp', 7],
      ['sitio/2026/clip.mp4.part', 100]
    ])
    const hashed: string[] = []
    const plan = await planMediaPull(rows, local, async path => {
      hashed.push(path)
      return path.endsWith('.pdf') ? PDF_HASH : 'other'
    })
    expect(plan.reuse.map(item => item.path)).toEqual(['sitio/2026/cover.webp', 'sitio/2026/brochure.pdf'])
    expect(plan.download.map(item => item.path)).toEqual(['sitio/2026/clip.mp4', 'sitio/2026/inline.webp'])
    expect(plan.remove).toEqual(['sitio/2025/gone.webp', 'sitio/2026/clip.mp4.part'])
    expect(hashed).toEqual(['sitio/2026/clip.mp4', 'sitio/2026/brochure.pdf'])
  })
})

describe('runMediaPull', () => {
  // Storage gives each file with the size its media row says.
  const served = new Map<string, string | number>([
    ['sitio/2026/cover.webp', 'c'.repeat(10)],
    ['sitio/2026/clip.mp4', 'v'.repeat(5000)],
    ['sitio/2026/poster.webp', 'o'.repeat(20)],
    ['sitio/2026/brochure.pdf', PDF_BYTES],
    ['sitio/2026/inline.webp', 404]
  ])
  const requested: string[] = []
  const get = (async (url: string) => {
    const path = url.replace('https://db.test/storage/v1/object/public/media/', '')
    requested.push(path)
    const body = served.get(path)
    return typeof body === 'string'
      ? new Response(body, { status: 200 })
      : new Response('', { status: body ?? 500 })
  }) as unknown as typeof fetch

  const pull = (warnings: string[] = []) => runMediaPull({ config, db: fakeClient(db), supabaseUrl: 'https://db.test', root, fetch: get, warn: message => warnings.push(message) })

  it('downloads what is missing, removes what is unused, and goes on past a file Storage refuses', async () => {
    const dir = join(root, 'public', 'cms-media')
    await mkdir(join(dir, 'sitio', '2025'), { recursive: true })
    await writeFile(join(dir, 'sitio', '2025', 'old.webp'), 'old')
    await mkdir(join(dir, 'sitio', '2026'), { recursive: true })
    await writeFile(join(dir, 'sitio', '2026', 'poster.webp'), 'x'.repeat(20))
    const warnings: string[] = []
    requested.length = 0

    const summary = await pull(warnings)
    expect(summary).toEqual({ downloaded: 3, reused: 1, removed: 1, failed: ['sitio/2026/inline.webp'], downloadedBytes: 10 + 5000 + 300, totalBytes: 10 + 5000 + 20 + 300 + 30 })
    expect(requested.sort()).toEqual(['sitio/2026/brochure.pdf', 'sitio/2026/clip.mp4', 'sitio/2026/cover.webp', 'sitio/2026/inline.webp'])
    expect(await readFile(join(dir, 'sitio', '2026', 'clip.mp4'), 'utf8')).toBe('v'.repeat(5000))
    expect(await readFile(join(dir, 'sitio', '2026', 'poster.webp'), 'utf8')).toBe('x'.repeat(20))
    expect(existsSync(join(dir, 'sitio', '2025'))).toBe(false)
    expect(existsSync(join(dir, 'sitio', '2026', 'inline.webp'))).toBe(false)
    expect(existsSync(join(dir, 'sitio', '2026', 'inline.webp.part'))).toBe(false)
    expect(warnings).toEqual([expect.stringContaining('sitio/2026/inline.webp (HTTP 404)')])
    expect((await readdir(join(dir, 'sitio', '2026'))).sort()).toEqual(['brochure.pdf', 'clip.mp4', 'cover.webp', 'poster.webp'])
  })

  it('downloads nothing the second time', async () => {
    await pull()
    requested.length = 0
    const again = await pull()
    expect(again).toMatchObject({ downloaded: 0, reused: 4, removed: 0, failed: ['sitio/2026/inline.webp'] })
    expect(requested).toEqual(['sitio/2026/inline.webp'])
  })
})
