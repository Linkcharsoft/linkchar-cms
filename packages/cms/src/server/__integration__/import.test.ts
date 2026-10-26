import { execSync } from 'node:child_process'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import cmsConfig from '@playground/cms.config'
import { createClient } from '@supabase/supabase-js'
import sharp from 'sharp'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { mockBuild } from '../../publish/mock'
import { createImportSession } from '../import'
import type { ImportSessionType } from '../import'

const localStatus = (): Record<string, string> => {
  const output = execSync('pnpm exec supabase status -o env', { cwd: fileURLToPath(new URL('../../../../../apps/playground', import.meta.url)), encoding: 'utf8' })
  return Object.fromEntries(output.split(/\r?\n/).flatMap(line => {
    const match = line.match(/^(\w+)="?([^"]*)"?$/)
    return match ? [[match[1], match[2]]] : []
  }))
}

const env = process.env.CMS_TEST_SUPABASE_SECRET_KEY ? {} : localStatus()
const supabase = {
  url: process.env.CMS_TEST_SUPABASE_URL ?? env.API_URL ?? 'http://127.0.0.1:44421',
  publishableKey: process.env.CMS_TEST_SUPABASE_PUBLISHABLE_KEY ?? env.PUBLISHABLE_KEY ?? '',
  secretKey: process.env.CMS_TEST_SUPABASE_SECRET_KEY ?? env.SECRET_KEY ?? ''
}
const admin = createClient(supabase.url, supabase.secretKey, { auth: { persistSession: false, autoRefreshToken: false } })

const stamp = Date.now().toString(36)
const paragraph = (text: string) => ({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text }] }] })
const documents: string[] = []
const media: { id: string, path: string }[] = []

let root: string
let session: ImportSessionType

beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), 'cms-import-'))
  // A color of its own, so a file left by an earlier run is not the same bytes.
  const background = { r: Math.floor(Math.random() * 256), g: Math.floor(Math.random() * 256), b: Math.floor(Math.random() * 256) }
  await writeFile(join(root, 'cover.png'), await sharp({ create: { width: 3000, height: 1500, channels: 3, background } }).png().toBuffer())
  session = await createImportSession({
    config: cmsConfig,
    supabase,
    email: 'qa-super@local.test',
    password: 'QaLocal12345',
    publishTarget: mockBuild({ seconds: 1 }),
    root,
    logger: console
  })
})

afterAll(async () => {
  await admin.from('documents').delete().in('id', documents)
  await admin.from('media').delete().in('id', media.map(item => item.id))
  await admin.storage.from('media').remove(media.map(item => item.path))
  await rm(root, { recursive: true, force: true })
})

describe('an import session', () => {
  it('uploads a file once, processed like the panel does', async () => {
    const cover = await session.media({ file: 'cover.png', folder: 'blog', alt: { es: 'Fachada', en: 'Facade' } })
    media.push({ id: cover.id, path: cover.path })
    expect(cover).toMatchObject({ mime: 'image/webp', width: 2560, height: 1280, alt: { es: 'Fachada', en: 'Facade' } })
    expect(cover.blurDataUrl).toMatch(/^data:image\/webp;base64,/)
    expect((await session.media({ file: 'cover.png', folder: 'blog', alt: { es: 'Otra' } })).id).toBe(cover.id)
  })

  it('creates a visible document, finds it again by its slug and publishes it with its URLs', async () => {
    const [cover] = media
    const post = (title: string) => ({
      data: {
        title: { es: `${title} ${stamp}`, en: `${title} ${stamp} (en)` },
        slug: { es: `imp-${stamp}`, en: `imp-${stamp}-en` },
        body: { es: paragraph('Hola'), en: paragraph('Hello') },
        cover: { es: cover.id }
      }
    })

    const first = await session.upsert('posts', post('Casa'))
    documents.push(first.id)
    expect(first.created).toBe(true)
    const again = await session.upsert('posts', post('Casa nueva'))
    expect(again).toMatchObject({ id: first.id, created: false })

    const incomplete = await session.upsert('posts', { data: { title: { es: `Sin traducir ${stamp}` }, slug: { es: `imp-${stamp}-b` }, body: { es: paragraph('Solo') } } })
    documents.push(incomplete.id)

    const report = await session.publish()
    expect(report).toMatchObject({ published: 1, buildStatus: 'building' })
    expect(report.skipped.map(item => item.id)).toEqual([incomplete.id])

    const { data: live } = await admin.from('published_documents').select('paths, data').eq('id', first.id).single()
    expect(live?.paths).toEqual({ es: `/blog/imp-${stamp}`, en: `/en/blog/imp-${stamp}-en` })
    expect((live?.data as { title: Record<string, string> }).title.es).toBe(`Casa nueva ${stamp}`)
    const { data: row } = await admin.from('documents').select('visible').eq('id', first.id).single()
    expect(row?.visible).toBe(true)
  })

  it('refuses entries the schema does not have and documents it cannot find again', async () => {
    await expect(session.upsert('nope', { data: {} })).rejects.toThrow('"nope" is not an entry')
    await expect(session.upsert('posts', { data: { title: { es: 'Sin slug' } } })).rejects.toThrow('match.slug')
  })
})
