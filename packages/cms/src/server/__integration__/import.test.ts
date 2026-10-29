import { execFileSync, execSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { copyFile, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import cmsConfig from '@playground/cms.config'
import { createClient } from '@supabase/supabase-js'
import sharp from 'sharp'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { mockBuild } from '../../publish/mock'
import { createImportSession } from '../import'
import { settleBuilds } from './builds'
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
  for (const clip of ['clip.mp4', 'slow.mp4']) await copyFile(fileURLToPath(new URL(`../../core/__tests__/fixtures/${clip}`, import.meta.url)), join(root, clip))
  // The clip is the same bytes every run: a row an interrupted run left would be found instead of uploaded.
  const hash = createHash('sha256').update(await readFile(join(root, 'clip.mp4'))).digest('hex')
  const { data: leftovers } = await admin.from('media').select('id, path').eq('hash', hash)
  if (leftovers?.length) {
    await admin.from('media').delete().in('id', leftovers.map(row => row.id))
    await admin.storage.from('media').remove(leftovers.map(row => row.path))
  }
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

  it('uploads a faststart video as it is, with its duration and poster, and turns away one that cannot stream', async () => {
    const poster = await session.media({ file: 'cover.png', folder: 'blog', alt: { es: 'Fachada' } })
    const clip = await session.media({ file: 'clip.mp4', folder: 'blog', poster: poster.id })
    media.push({ id: clip.id, path: clip.path })
    expect(clip).toMatchObject({ mime: 'video/mp4', width: 64, height: 64, duration: 1, posterId: poster.id, blurDataUrl: null })
    expect(clip.posterUrl).toContain(poster.path)
    await expect(session.media({ file: 'slow.mp4', folder: 'blog' })).rejects.toThrow('-movflags +faststart')
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

    await settleBuilds(admin)
    const report = await session.publish()
    expect(report).toMatchObject({ published: 1, buildStatus: 'building' })
    expect(report.skipped.map(item => item.id)).toEqual([incomplete.id])

    const { data: live } = await admin.from('published_documents').select('paths, data').eq('id', first.id).single()
    expect(live?.paths).toEqual({ es: `/blog/imp-${stamp}`, en: `/en/blog/imp-${stamp}-en` })
    expect((live?.data as { title: Record<string, string> }).title.es).toBe(`Casa nueva ${stamp}`)
    const { data: row } = await admin.from('documents').select('visible').eq('id', first.id).single()
    expect(row?.visible).toBe(true)
  })

  it('finds a document again by match.key after an editor changed its slug, instead of creating a second one', async () => {
    const key = `imp-key-${stamp}`
    const seed = { data: { title: { es: `Con key ${stamp}` }, slug: { es: `imp-${stamp}-k` } }, match: { key } }
    const first = await session.upsert('posts', seed)
    documents.push(first.id)
    expect(first).toMatchObject({ created: true, matchedBy: null })
    expect((await admin.from('documents').select('key').eq('id', first.id).single()).data?.key).toBe(key)

    await admin.from('documents').update({ slug: `imp-${stamp}-renamed`, data: { ...seed.data, slug: { es: `imp-${stamp}-renamed` } } }).eq('id', first.id)
    const again = await session.upsert('posts', seed)
    expect(again).toMatchObject({ id: first.id, created: false, matchedBy: 'key' })
    expect((await admin.from('documents').select('id', { count: 'exact', head: true }).eq('type', 'posts').in('slug', [`imp-${stamp}-k`, `imp-${stamp}-renamed`])).count).toBe(1)
  })

  it('adopts match.key on a document it found by slug', async () => {
    const slug = `imp-${stamp}-adopt`
    const { id } = await session.upsert('posts', { data: { title: { es: `Adopta ${stamp}` }, slug: { es: slug } } })
    documents.push(id)
    const adopted = await session.upsert('posts', { data: { title: { es: `Adopta ${stamp}` }, slug: { es: slug } }, match: { key: `imp-adopt-${stamp}` } })
    expect(adopted).toMatchObject({ id, created: false, matchedBy: 'slug' })
    expect((await admin.from('documents').select('key').eq('id', id).single()).data?.key).toBe(`imp-adopt-${stamp}`)
  })

  it('reports what it created in collections that already had documents, and refuses to create with create: false', async () => {
    const draft = await admin.from('documents').insert({ type: 'posts', data: { title: { es: `E2E hidden ${stamp}` } }, visible: false }).select('id').single()
    try {
      const { created, updated, matched, adopted, untouched } = await session.summary()
      expect(updated).toBeGreaterThan(0)
      expect(matched.key).toBeGreaterThan(0)
      expect(matched.slug).toBeGreaterThan(0)
      expect(adopted).toBe(1)
      expect(created).toContainEqual(expect.objectContaining({ entry: 'posts', lookup: `key ${`imp-key-${stamp}`}`, existing: expect.any(Number) }))
      expect(untouched).toContainEqual({ entry: 'posts', id: draft.data?.id, title: `E2E hidden ${stamp}` })
    } finally {
      if (draft.data) await admin.from('documents').delete().eq('id', draft.data.id)
    }

    const strict = await createImportSession({ config: cmsConfig, supabase, email: 'qa-super@local.test', password: 'QaLocal12345', create: false, root, logger: console })
    try {
      await expect(strict.upsert('posts', { data: { title: { es: 'Nuevo' }, slug: { es: `imp-${stamp}-missing` } } })).rejects.toThrow(`posts: no document with slug imp-${stamp}-missing`)
      expect((await strict.upsert('posts', { data: { title: { es: `Adopta ${stamp}` }, slug: { es: `imp-${stamp}-adopt` } } })).created).toBe(false)
    } finally {
      await strict.signOut()
    }
  })

  it('transforms the documents of an entry through the same validation and save as an import', async () => {
    const mine = (slug: string | null) => slug?.startsWith(`imp-${stamp}`) ?? false
    const title = (data: Record<string, unknown>) => data.title as Record<string, string>
    const dry = await session.transform({ entry: 'posts', dryRun: true, map: (data, { slug }) => (mine(slug) ? { ...data, title: { ...title(data), es: `${title(data).es} (dry)` } } : null) })
    expect(dry.changed).toBeGreaterThanOrEqual(2)
    expect((await admin.from('documents').select('data').eq('id', documents[0]).single()).data?.data).not.toMatchObject({ title: { es: expect.stringContaining('(dry)') } })

    const report = await session.transform({ entry: 'posts', map: (data, { slug }) => (mine(slug) ? { ...data, title: { ...title(data), es: slug === `imp-${stamp}-adopt` ? 'x'.repeat(130) : `${title(data).es} (t)` } } : null) })
    expect(report.changed).toBe(dry.changed - 1)
    expect(report.unchanged).toBeGreaterThan(0)
    expect(report.invalid).toEqual([expect.objectContaining({ title: `Adopta ${stamp}`, problems: [expect.stringContaining('title.es')] })])
    expect((await admin.from('documents').select('data').eq('id', documents[0]).single()).data?.data).toMatchObject({ title: { es: `Casa nueva ${stamp} (t)` } })
  })

  it('refuses entries the schema does not have and documents it cannot find again', async () => {
    await expect(session.upsert('nope', { data: {} })).rejects.toThrow('"nope" is not an entry')
    await expect(session.upsert('posts', { data: { title: { es: 'Sin slug' } } })).rejects.toThrow('match.slug')
  })

  it('creates nothing when a new document is invalid, so the next run finds no empty draft', async () => {
    const posts = async () => (await admin.from('documents').select('id', { count: 'exact', head: true }).eq('type', 'posts')).count
    const before = await posts()
    await expect(session.upsert('posts', { data: { title: { es: 'x'.repeat(130) }, slug: { es: `imp-${stamp}-long` } } })).rejects.toThrow('posts: title.es')
    expect(await posts()).toBe(before)
  })

  it('gives list items without a key the stored ones, so running the import again leaves the content as it was', async () => {
    const stored = async () => (await admin.from('documents').select('id, data').eq('key', 'settings').maybeSingle()).data as { id: string, data: Record<string, unknown> } | null
    // A fresh database has no settings row until the first save.
    const before = await stored()
    const networks = [{ network: 'instagram', link: `https://instagram.com/${stamp}` }, { network: 'behance', link: `https://behance.net/${stamp}` }]

    const { id } = await session.upsert('settings', { data: { networks } })
    try {
      const first = await stored()
      expect((first?.data.networks as { _key: string }[]).map(item => item._key)).toEqual([expect.stringMatching(/^[0-9a-f-]{36}$/), expect.stringMatching(/^[0-9a-f-]{36}$/)])
      await session.upsert('settings', { data: { networks } })
      expect((await stored())?.data).toEqual(first?.data)
    } finally {
      await (before ? admin.from('documents').update({ data: before.data }).eq('id', id) : admin.from('documents').delete().eq('id', id))
    }
  })
})

describe('a dry run', () => {
  it('reports what it would change, create and upload, and writes nothing', async () => {
    const slug = `dry-${stamp}`
    const { id } = await session.upsert('posts', { data: { title: { es: 'Seco', en: 'Dry' }, slug: { es: slug, en: slug }, body: { es: paragraph('Uno'), en: paragraph('One') } } })
    documents.push(id)
    await writeFile(join(root, 'dry.png'), await sharp({ create: { width: 40, height: 20, channels: 3, background: { r: 1, g: 2, b: 3 } } }).png().toBuffer())

    const dry = await createImportSession({ config: cmsConfig, supabase, email: 'qa-super@local.test', password: 'QaLocal12345', root, dryRun: true, logger: console })
    try {
      const same = await dry.upsert('posts', { data: { title: { es: 'Seco', en: 'Dry' }, slug: { es: slug, en: slug }, body: { es: paragraph('Uno'), en: paragraph('One') } } })
      expect(same).toMatchObject({ id, created: false, matchedBy: 'slug', fields: [] })
      const changed = await dry.upsert('posts', { data: { title: { es: 'Seco 2', en: 'Dry' }, slug: { es: slug, en: slug }, body: { es: paragraph('Dos'), en: paragraph('One') } } })
      expect(changed).toMatchObject({ id, created: false, fields: ['title.es', 'body.es'] })
      const fresh = await dry.upsert('posts', { data: { title: { es: 'Nuevo', en: 'New' }, slug: { es: `${slug}-new`, en: `${slug}-new` }, body: { es: paragraph('Uno'), en: paragraph('One') } } })
      expect(fresh.created).toBe(true)
      expect(fresh.id).toMatch(/^dry-run-posts-/)
      const file = await dry.media({ file: 'dry.png', folder: 'blog', alt: { es: 'Seco' } })
      expect(file.id).toMatch(/^dry-run-media-/)
      expect(file).toMatchObject({ mime: 'image/webp', width: 40, height: 20 })
      expect(await dry.publish()).toMatchObject({ published: 0 })
      expect(await dry.summary()).toMatchObject({ dryRun: true, updated: 2, unchanged: 1, media: 1, changed: [{ id, title: 'Seco 2', fields: ['title.es', 'body.es'] }], created: [{ entry: 'posts', lookup: `slug ${slug}-new` }] })
    } finally {
      await dry.signOut()
    }
    const { data } = await admin.from('documents').select('data').eq('id', id).single()
    expect((data!.data as { title: { es: string } }).title.es).toBe('Seco')
    expect((await admin.from('documents').select('id').eq('slug', `${slug}-new`)).data).toEqual([])
    expect((await admin.from('media').select('id').eq('filename', 'dry.png')).data).toEqual([])
  })
})

describe('linkchar-cms import', () => {
  it('runs a project script with a signed-in session and leaves publishing to --no-publish', async () => {
    const script = join(root, 'import-content.ts')
    await writeFile(script, [
      'export default async (cms: { upsert: (entry: string, input: object) => Promise<{ id: string }>, publish: () => Promise<{ published: number }> }) => {',
      `  const { id } = await cms.upsert('posts', { data: { title: { es: 'CLI ${stamp}', en: 'CLI ${stamp}' }, slug: { es: 'cli-${stamp}', en: 'cli-${stamp}' } } })`,
      '  console.log(`IMPORTED ${id} ${(await cms.publish()).published}`)',
      '}'
    ].join('\n'))

    const cli = (...flags: string[]) => execFileSync(process.execPath, [fileURLToPath(new URL('../../../cli/linkchar-cms.js', import.meta.url)), 'import', script, '--email', 'qa-super@local.test', '--no-publish', '--password-stdin', ...flags], {
      cwd: fileURLToPath(new URL('../../../../../apps/playground', import.meta.url)),
      encoding: 'utf8',
      input: 'QaLocal12345\n',
      env: {
        ...process.env,
        NEXT_PUBLIC_SUPABASE_URL: supabase.url,
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: supabase.publishableKey,
        SUPABASE_SECRET_KEY: supabase.secretKey
      }
    })

    const plan = cli('--dry-run')
    expect(plan).toContain(`Plan for ${supabase.url}: 0 documents change, 1 created, 0 unchanged, 0 files uploaded.`)
    expect(plan).toContain(`  + posts (slug cli-${stamp})`)
    expect(plan).toMatch(/IMPORTED dry-run-posts-\d+ 0/)
    expect((await admin.from('documents').select('id').eq('slug', `cli-${stamp}`)).data).toEqual([])
    expect(() => cli()).toThrow('pass --yes')

    const output = cli('--yes')
    const [, id, published] = output.match(/IMPORTED (?!dry-run)(\S+) (\d+)/) ?? []
    documents.push(id)
    expect(published).toBe('0')
    expect(output).toContain('nothing published (--no-publish)')
    expect(output).toContain('1 created')
    expect(output).toContain('posts already had')
    expect(output).toContain(`cli-${stamp} (slug not found)`)
    const { data } = await admin.from('documents').select('slug, visible').eq('id', id).single()
    expect(data).toEqual({ slug: `cli-${stamp}`, visible: true })
  }, 120_000)
})
