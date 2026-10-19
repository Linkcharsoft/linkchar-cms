import cmsConfig from '@playground/cms.config'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineCmsConfig } from '../../core/config'
import { withDefaults } from '../../core/defaults'
import { page } from '../../core/define'
import { section } from '../../core/fields'
import { text } from '../../core/kinds/strings'
import { CmsRedirect } from '../context'
import { SAVE_ATTEMPTS, saveDocument } from '../editing'
import { createFakeDb, fakeContext, signIn } from './fakeSupabase'
import type { DataRecord } from '../context'
import type { FakeDbType } from './fakeSupabase'

const ID = (n: number) => `6f1c3b2a-3333-4c1d-9e0f-${String(n).padStart(12, '0')}`
const EDITOR = ID(90)

let db: FakeDbType

const homeRow = () => db.tables.documents.find(row => row.key === 'home')!
const stored = () => homeRow().data as DataRecord

// What an editor loads before anything is saved: the schema defaults.
const loadedPage = () => withDefaults(cmsConfig, cmsConfig.schema.home.fields, {}) as DataRecord

const firstSave = async () => {
  const result = await saveDocument(fakeContext(db, cmsConfig), { entryId: 'home', id: null, patch: {}, base: {} })
  if (result.status !== 'saved') throw new Error(`first save: ${result.status}`)
  return result
}

beforeEach(() => {
  db = createFakeDb()
  signIn(db, { id: EDITOR })
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('saveDocument', () => {
  it('creates a page on its first save, with the schema defaults', async () => {
    const result = await firstSave()
    expect(result).toMatchObject({ status: 'saved', revision: 1 })
    expect(homeRow()).toMatchObject({ type: 'home', key: 'home', slug: null })
    expect((stored().hero as DataRecord).title).toEqual({ es: 'Arquitectura que se habita', en: 'Architecture to live in' })
  })

  it('merges the keys an editor changed over what others saved in other keys', async () => {
    const loaded = await firstSave()
    const base = loaded.data
    const theirs = { ...(base.services as DataRecord), title: { es: 'Servicios', en: 'Services' } }
    await saveDocument(fakeContext(db, cmsConfig), { entryId: 'home', id: loaded.id, patch: { services: theirs }, base })

    const hero = { ...(base.hero as DataRecord), eyebrow: { es: 'Estudio', en: 'Studio' } }
    const result = await saveDocument(fakeContext(db, cmsConfig), { entryId: 'home', id: loaded.id, patch: { hero }, base })

    expect(result).toMatchObject({ status: 'saved', revision: 3 })
    expect((stored().hero as DataRecord).eyebrow).toEqual({ es: 'Estudio', en: 'Studio' })
    expect((stored().services as DataRecord).title).toEqual({ es: 'Servicios', en: 'Services' })
  })

  it('reports a conflict on a key someone else changed, and keeps the editor version in the history', async () => {
    const loaded = await firstSave()
    const base = loaded.data
    const mine = { ...(base.hero as DataRecord), eyebrow: { es: 'Mío', en: '' } }
    const theirs = { ...(base.hero as DataRecord), eyebrow: { es: 'Suyo', en: '' } }
    await saveDocument(fakeContext(db, cmsConfig), { entryId: 'home', id: loaded.id, patch: { hero: theirs }, base })

    const result = await saveDocument(fakeContext(db, cmsConfig), { entryId: 'home', id: loaded.id, patch: { hero: mine }, base })

    expect(result).toMatchObject({ status: 'conflict', keys: ['hero'], revision: 2 })
    expect((stored().hero as DataRecord).eyebrow).toEqual({ es: 'Suyo', en: '' })
    const copy = db.tables.document_versions.find(version => version.reason === 'conflict')
    expect(((copy?.data as DataRecord).hero as DataRecord).eyebrow).toEqual({ es: 'Mío', en: '' })
  })

  it('retries when another save lands between its read and its write', async () => {
    const loaded = await firstSave()
    const base = loaded.data
    let slipped = 0
    db.beforeWrite = (table, op) => {
      if (table !== 'documents' || op !== 'update' || slipped++ > 0) return
      const row = homeRow()
      row.data = { ...(row.data as DataRecord), services: { ...(base.services as DataRecord), title: { es: 'Otro', en: '' } } }
      row.revision = (row.revision as number) + 1
    }

    const hero = { ...(base.hero as DataRecord), eyebrow: { es: 'Reintento', en: '' } }
    const result = await saveDocument(fakeContext(db, cmsConfig), { entryId: 'home', id: loaded.id, patch: { hero }, base })

    expect(result).toMatchObject({ status: 'saved', revision: 3 })
    expect((stored().hero as DataRecord).eyebrow).toEqual({ es: 'Reintento', en: '' })
    expect((stored().services as DataRecord).title).toEqual({ es: 'Otro', en: '' })
  })

  it(`gives up after ${SAVE_ATTEMPTS} attempts while saves keep landing`, async () => {
    const loaded = await firstSave()
    let writes = 0
    db.beforeWrite = (table, op) => {
      if (table !== 'documents' || op !== 'update') return
      writes++
      homeRow().revision = (homeRow().revision as number) + 1
    }
    const hero = { ...(loaded.data.hero as DataRecord), eyebrow: { es: 'Nunca', en: '' } }
    const result = await saveDocument(fakeContext(db, cmsConfig), { entryId: 'home', id: loaded.id, patch: { hero }, base: loaded.data })
    expect(result).toEqual({ status: 'error', error: 'errors.documents.busy' })
    expect(writes).toBe(SAVE_ATTEMPTS)
  })

  it('merges over a page someone else created first', async () => {
    db.beforeWrite = (table, op) => {
      if (table !== 'documents' || op !== 'insert' || db.tables.documents.length > 0) return
      db.tables.documents.push({
        id: ID(1), type: 'home', key: 'home', slug: null, data: { services: { title: { es: 'Primero', en: '' } } }, revision: 1, sort_order: 0,
        visible: true, created_at: '2026-10-16T00:00:00Z', updated_at: '2026-10-16T00:00:00Z', deleted_at: null
      })
    }
    const base = loadedPage()
    const hero = { ...(base.hero as DataRecord), eyebrow: { es: 'Segundo', en: '' } }
    const result = await saveDocument(fakeContext(db, cmsConfig), { entryId: 'home', id: null, patch: { hero }, base })

    expect(result).toMatchObject({ status: 'saved', id: ID(1), revision: 2 })
    expect(db.tables.documents).toHaveLength(1)
    expect((stored().services as DataRecord).title).toEqual({ es: 'Primero', en: '' })
    expect((stored().hero as DataRecord).eyebrow).toEqual({ es: 'Segundo', en: '' })
  })

  describe('when another document has the slug', () => {
    const post = (n: number, slug: string | null, en?: string) => ({
      id: ID(n), type: 'posts', key: null, slug, slugs: slug ? { es: slug, ...(en ? { en } : {}) } : {}, data: {}, revision: 1, sort_order: n, visible: false,
      created_at: '2026-10-16T00:00:00Z', updated_at: '2026-10-16T00:00:00Z', deleted_at: null
    })
    const postBase = () => withDefaults(cmsConfig, cmsConfig.schema.posts.fields, {}) as DataRecord
    const postRow = () => db.tables.documents.find(row => row.id === ID(3))!
    const body = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Cuerpo' }] }] }

    beforeEach(() => {
      db.tables.documents.push(post(2, 'casa'), post(3, null))
    })

    it('saves the rest and keeps the stored slug when it was typed by hand', async () => {
      const result = await saveDocument(fakeContext(db, cmsConfig), {
        entryId: 'posts',
        id: ID(3),
        patch: { title: { es: 'Otra casa', en: '' }, slug: { es: 'casa', en: 'house' }, body: { es: body, en: null } },
        base: postBase()
      })

      expect(result).toMatchObject({ status: 'saved', errors: { 'slug.es': 'Ya hay otro contenido con esta URL' } })
      expect(result).not.toHaveProperty('adjusted')
      expect(postRow().slug).toBeNull()
      expect(postRow().data).toMatchObject({ title: { es: 'Otra casa' }, slug: { es: '', en: 'house' }, body: { es: body } })
    })

    it('saves a free variant of a slug that follows the title', async () => {
      db.tables.documents.push(post(4, 'casa-2'))
      const result = await saveDocument(fakeContext(db, cmsConfig), {
        entryId: 'posts',
        id: ID(3),
        patch: { title: { es: 'Casa', en: 'House' }, slug: { es: 'casa', en: 'house' } },
        base: postBase()
      })

      expect(result).toMatchObject({ status: 'saved', adjusted: ['slug'], data: { slug: { es: 'casa-3', en: 'house' } } })
      expect(result).not.toHaveProperty('errors')
      expect(postRow().slug).toBe('casa-3')
    })

    it('stores a free slug as the default locale slug', async () => {
      const result = await saveDocument(fakeContext(db, cmsConfig), { entryId: 'posts', id: ID(3), patch: { slug: { es: 'casa-2', en: 'house' } }, base: postBase() })
      expect(result).toMatchObject({ status: 'saved' })
      expect(result).not.toHaveProperty('errors')
      expect(postRow()).toMatchObject({ slug: 'casa-2', slugs: { es: 'casa-2', en: 'house' } })
    })

    it('checks each locale: a taken English slug that follows the title gets a free variant', async () => {
      db.tables.documents.push(post(4, 'hogar', 'house'))
      const result = await saveDocument(fakeContext(db, cmsConfig), {
        entryId: 'posts', id: ID(3), patch: { title: { es: 'Otra', en: 'House' }, slug: { es: 'otra', en: 'house' } }, base: postBase()
      })
      expect(result).toMatchObject({ status: 'saved', adjusted: ['slug'] })
      expect(postRow()).toMatchObject({ slug: 'otra', slugs: { es: 'otra', en: 'house-2' } })
    })

    it('checks each locale: a taken English slug typed by hand is reported on its locale', async () => {
      db.tables.documents.push(post(4, 'hogar', 'house'))
      const result = await saveDocument(fakeContext(db, cmsConfig), {
        entryId: 'posts', id: ID(3), patch: { title: { es: 'Otra', en: 'Other' }, slug: { es: 'otra', en: 'house' } }, base: postBase()
      })
      expect(result).toMatchObject({ status: 'saved', errors: { 'slug.en': 'Ya hay otro contenido con esta URL' } })
      expect(postRow()).toMatchObject({ slug: 'otra', slugs: { es: 'otra' } })
    })
  })

  it('rejects malformed content with the path of each problem', async () => {
    const base = loadedPage()
    const hero = { ...(base.hero as DataRecord), title: { es: 'x'.repeat(81), en: '' } }
    const result = await saveDocument(fakeContext(db, cmsConfig), { entryId: 'home', id: null, patch: { hero }, base })
    expect(result).toEqual({ status: 'invalid', errors: { 'hero.title.es': 'Usá hasta 80 caracteres' } })
    expect(db.tables.documents).toEqual([])
  })

  it('keeps superadmin-only fields away from other roles', async () => {
    const config = defineCmsConfig({
      schema: { landing: page('Landing', { main: section('Principal', { title: text({ label: 'Título' }), tracking: text({ label: 'Script', superadminOnly: true, localized: false }) }) }) }
    })
    db.tables.documents.push({
      id: ID(4), type: 'landing', key: 'landing', slug: null, data: { main: { title: { es: 'Hola' }, tracking: 'G-1' } }, revision: 1, sort_order: 0,
      visible: true, created_at: '2026-10-16T00:00:00Z', updated_at: '2026-10-16T00:00:00Z', deleted_at: null
    })
    const base = db.tables.documents[0].data as DataRecord
    const patch = { main: { title: { es: 'Chau' }, tracking: 'G-HACK' } }

    await saveDocument(fakeContext(db, config), { entryId: 'landing', id: ID(4), patch, base })
    expect(db.tables.documents[0].data).toMatchObject({ main: { title: { es: 'Chau' }, tracking: 'G-1' } })
  })

  it('explains a document that is gone, an unknown entry and a failed read', async () => {
    const ctx = fakeContext(db, cmsConfig)
    expect(await saveDocument(ctx, { entryId: 'posts', id: ID(9), patch: {}, base: {} })).toEqual({ status: 'error', error: 'errors.documents.gone' })
    expect(await saveDocument(ctx, { entryId: 'nope', id: null, patch: {}, base: {} })).toEqual({ status: 'error', error: 'errors.unknownEntry' })
    db.failNext = { table: 'documents', op: 'select', error: { code: '08006', message: 'down' } }
    expect(await saveDocument(ctx, { entryId: 'home', id: null, patch: {}, base: {} })).toEqual({ status: 'error', error: 'errors.documents.saveFailed' })
  })

  it('needs a signed-in editor', async () => {
    db.user = null
    await expect(saveDocument(fakeContext(db, cmsConfig), { entryId: 'home', id: null, patch: {}, base: {} })).rejects.toBeInstanceOf(CmsRedirect)
  })
})
