import { execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import cmsConfig from '@playground/cms.config'
import { createClient } from '@supabase/supabase-js'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { withDefaults } from '../../core/defaults'
import { mockBuild } from '../../publish/mock'
import { createDocument, setDocumentVisibility } from '../collections'
import { CmsRedirect } from '../context'
import { listCollection } from '../documents'
import { saveDocument } from '../editing'
import { getMediaUsage, listMedia } from '../media'
import { getPendingChanges, publishChanges } from '../publish'
import type { CmsClientType, CmsContextType, DataRecord } from '../context'
import type { Database } from '../database'

// Keys come from the environment or from the playground's running local Supabase, never from the source.
const localStatus = (): Record<string, string> => {
  const output = execSync('pnpm exec supabase status -o env', { cwd: fileURLToPath(new URL('../../../../../apps/playground', import.meta.url)), encoding: 'utf8' })
  return Object.fromEntries(output.split(/\r?\n/).flatMap(line => {
    const match = line.match(/^(\w+)="?([^"]*)"?$/)
    return match ? [[match[1], match[2]]] : []
  }))
}

const env = process.env.CMS_TEST_SUPABASE_SECRET_KEY ? {} : localStatus()
const SUPABASE_URL = process.env.CMS_TEST_SUPABASE_URL ?? env.API_URL ?? 'http://127.0.0.1:54421'
const PUBLISHABLE_KEY = process.env.CMS_TEST_SUPABASE_PUBLISHABLE_KEY ?? env.PUBLISHABLE_KEY ?? ''
const SECRET_KEY = process.env.CMS_TEST_SUPABASE_SECRET_KEY ?? env.SECRET_KEY ?? ''

const client = (key: string): CmsClientType => createClient<Database>(SUPABASE_URL, key, { auth: { persistSession: false, autoRefreshToken: false } })

const admin = client(SECRET_KEY)
const created: string[] = []
const stamp = Date.now().toString(36)

const signedIn = async (email: string): Promise<CmsContextType> => {
  const db = client(PUBLISHABLE_KEY)
  const { error } = await db.auth.signInWithPassword({ email, password: 'QaLocal12345' })
  if (error) throw new Error(`${email} could not sign in: ${error.message}. Is the playground database running and seeded?`)
  return {
    config: cmsConfig,
    supabaseUrl: SUPABASE_URL,
    db,
    admin: () => admin,
    anonymous: () => client(PUBLISHABLE_KEY),
    publishTarget: mockBuild({ seconds: 1 }),
    revalidate: () => {},
    now: () => new Date(),
    logger: console
  }
}

const paragraph = (text: string) => ({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text }] }] })

const newPost = async (ctx: CmsContextType) => {
  const error = await createDocument(ctx, 'posts').catch((caught: unknown) => caught)
  if (!(error instanceof CmsRedirect)) throw new Error('createDocument did not open the new post')
  const id = error.to.split('/').pop()!
  created.push(id)
  return id
}

const waitForBuild = async (publishId: number) => {
  for (let attempt = 0; attempt < 40; attempt++) {
    const { data } = await admin.from('publish_log').select('build_status').eq('id', publishId).single()
    if (data?.build_status === 'success' || data?.build_status === 'failed') return data.build_status
    await new Promise(resolve => setTimeout(resolve, 250))
  }
  return 'timeout'
}

let superadmin: CmsContextType
let editor: CmsContextType

beforeAll(async () => {
  superadmin = await signedIn('qa-super@local.test')
  editor = await signedIn('qa-editor@local.test')
})

afterAll(async () => {
  await admin.from('documents').delete().in('id', created)
  await admin.from('redirects').delete().like('from_path', `/blog/int-${stamp}%`)
  await admin.from('media').delete().like('path', `blog/2026/%-${stamp}.webp`)
})

describe('saving against the database', () => {
  it('merges two editors working on different fields and reports a real conflict on the same one', async () => {
    const id = await newPost(superadmin)
    const base = withDefaults(cmsConfig, cmsConfig.schema.posts.fields, {}) as DataRecord

    const mine = await saveDocument(superadmin, { entryId: 'posts', id, patch: { title: { es: `Casa ${stamp}`, en: `House ${stamp}` } }, base })
    const theirs = await saveDocument(editor, { entryId: 'posts', id, patch: { excerpt: { es: 'Resumen', en: 'Summary' } }, base })
    expect(mine.status).toBe('saved')
    expect(theirs).toMatchObject({ status: 'saved', revision: 3 })

    const clash = await saveDocument(editor, { entryId: 'posts', id, patch: { title: { es: 'Otro', en: 'Other' } }, base })
    expect(clash).toMatchObject({ status: 'conflict', keys: ['title'] })
    const { data: copies } = await superadmin.db.from('document_versions').select('reason').eq('document_id', id)
    expect(copies?.map(row => row.reason)).toContain('conflict')
  })

  it('finds documents by their title in the default locale', async () => {
    const { items } = await listCollection(superadmin, 'posts', { search: `casa ${stamp}` })
    expect(items.map(item => item.title)).toEqual([`Casa ${stamp}`])
    expect((await listCollection(superadmin, 'posts', { search: `house ${stamp}` })).items).toEqual([])
  })
})

describe('publishing against the database', () => {
  it('publishes, builds with the mock, and redirects the old URL after a slug change', async () => {
    const id = await newPost(superadmin)
    const content = (slug: string) => withDefaults(cmsConfig, cmsConfig.schema.posts.fields, {
      title: { es: `Obra ${stamp}`, en: `Work ${stamp}` },
      slug: { es: slug, en: slug },
      body: { es: paragraph('Hola'), en: paragraph('Hello') }
    }) as DataRecord

    const defaults = withDefaults(cmsConfig, cmsConfig.schema.posts.fields, {}) as DataRecord
    const first = await saveDocument(superadmin, { entryId: 'posts', id, patch: content(`int-${stamp}`), base: defaults })
    expect(first.status).toBe('saved')
    expect(await setDocumentVisibility(superadmin, 'posts', id, true)).toEqual({ ok: true })

    const publishOne = async () => {
      const change = (await getPendingChanges(superadmin)).find(item => item.id === id)!
      expect(change.problems).toEqual([])
      const result = await publishChanges(superadmin, { publish: [{ id, revision: change.revision }], remove: [] })
      expect(result).toMatchObject({ ok: true, published: 1, buildStatus: 'building' })
      const { data: latest } = await admin.from('publish_log').select('id').order('id', { ascending: false }).limit(1).single()
      return waitForBuild(latest!.id)
    }

    expect(await publishOne()).toBe('success')

    const saved = first.status === 'saved' ? first.data : {}
    const renamed = await saveDocument(superadmin, { entryId: 'posts', id, patch: { slug: { es: `int-${stamp}-nueva`, en: `int-${stamp}-new` } }, base: saved })
    expect(renamed.status).toBe('saved')
    expect(await publishOne()).toBe('success')

    const { data: redirects } = await admin.from('redirects').select('from_path, to_path').eq('from_path', `/blog/int-${stamp}`)
    expect(redirects).toEqual([{ from_path: `/blog/int-${stamp}`, to_path: `/blog/int-${stamp}-nueva` }])
  })

  it('keeps editors without permission away from publishing', async () => {
    expect(await publishChanges(editor, { publish: [], remove: [] })).toEqual({ ok: false, error: 'errors.publish.forbidden' })
  })
})

describe('media against the database', () => {
  it('searches the alt text of any locale and tells where a file is used', async () => {
    const path = `blog/2026/${crypto.randomUUID()}-${stamp}.webp`
    const { data: file } = await admin.from('media')
      .insert({ path, filename: `fachada-${stamp}.webp`, folder: 'blog', alt: { es: 'Ladrillo', en: `Brick ${stamp}` }, mime: 'image/webp', size: 10 })
      .select('id').single()

    const { items } = await listMedia(superadmin, { search: `brick ${stamp}` })
    expect(items.map(item => item.id)).toEqual([file!.id])

    const id = await newPost(superadmin)
    await saveDocument(superadmin, { entryId: 'posts', id, patch: { cover: { es: file!.id } }, base: withDefaults(cmsConfig, cmsConfig.schema.posts.fields, {}) as DataRecord })
    const usage = await getMediaUsage(superadmin, [file!.id])
    expect(usage[file!.id]).toEqual([expect.objectContaining({ documentId: id, href: `/dashboard/colecciones/posts/${id}`, onlyPublished: false })])
  })
})
