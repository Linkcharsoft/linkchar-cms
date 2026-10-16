import cmsConfig from '@playground/cms.config'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createDocument, createRelated, duplicateDocument, reorderCollection, setDocumentVisibility, trashDocument } from '../collections'
import { CmsRedirect } from '../context'
import { createFakeDb, fakeContext, signIn } from './fakeSupabase'
import type { CmsContextType, DataRecord } from '../context'
import type { FakeDbType } from './fakeSupabase'

const ID = (n: number) => `6f1c3b2a-4444-4c1d-9e0f-${String(n).padStart(12, '0')}`

let db: FakeDbType
let ctx: CmsContextType

const doc = (n: number, type: string, data: DataRecord, extra: DataRecord = {}) => ({
  id: ID(n), type, key: null, slug: null, data, revision: 1, sort_order: n, visible: true,
  created_at: '2026-10-16T00:00:00Z', updated_at: '2026-10-16T00:00:00Z', deleted_at: null, ...extra
})

const redirectOf = async (promise: Promise<unknown>) => {
  const error = await promise.catch((caught: unknown) => caught)
  if (!(error instanceof CmsRedirect)) throw new Error(`expected a redirect, got ${JSON.stringify(error)}`)
  return error.to
}

beforeEach(() => {
  db = createFakeDb()
  signIn(db, { id: ID(90) })
  ctx = fakeContext(db, cmsConfig)
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('createDocument', () => {
  it('creates a hidden draft with the defaults and opens its editor', async () => {
    const to = await redirectOf(createDocument(ctx, 'posts'))
    const [created] = db.tables.documents
    expect(to).toBe(`/dashboard/colecciones/posts/${created.id}`)
    expect(created).toMatchObject({ type: 'posts', visible: false, sort_order: 0 })
    expect((created.data as DataRecord).title).toEqual({ es: '', en: '' })
    expect(db.tables.activity_log[0]).toMatchObject({ action: 'document.create', document_id: created.id })
  })

  it('adds orderable items at the end, visible when the collection is reference-only', async () => {
    db.tables.documents.push(doc(1, 'team', { name: 'Ana' }, { sort_order: 4 }))
    await redirectOf(createDocument(ctx, 'team'))
    expect(db.tables.documents[1]).toMatchObject({ sort_order: 5, visible: true })
  })

  it('refuses entries that are not collections', async () => {
    expect(await createDocument(ctx, 'home')).toEqual({ ok: false, error: 'errors.unknownEntry' })
  })
})

describe('createRelated', () => {
  it('creates an item from its title, with a free slug in the default locale', async () => {
    db.tables.documents.push(doc(1, 'categories', { name: { es: 'Obras' } }, { slug: 'obras' }))
    const option = await createRelated(ctx, 'categories', '  Obras ')
    const created = db.tables.documents[1]
    expect(option).toEqual({ id: created.id, label: 'Obras', kind: 'Categoría', status: 'new', trashed: false })
    expect(created.data).toMatchObject({ name: { es: 'Obras', en: '' }, slug: { es: 'obras-2', en: '' } })
    expect(created.slug).toBe('obras-2')
    expect(ctx.revalidate).toHaveBeenCalledWith('/dashboard/colecciones/categories')
  })

  it('keeps plain titles plain', async () => {
    await createRelated(ctx, 'team', 'Bruno')
    expect((db.tables.documents[0].data as DataRecord).name).toBe('Bruno')
  })

  it('needs a title', async () => {
    expect(await createRelated(ctx, 'team', '   ')).toBeNull()
  })
})

describe('duplicateDocument', () => {
  it('copies the content with a copy title and a free slug in every locale', async () => {
    db.tables.documents.push(doc(1, 'posts', { title: { es: 'Casa', en: 'House' }, slug: { es: 'casa', en: 'house' } }, { slug: 'casa' }))
    db.tables.documents.push(doc(2, 'posts', { title: { es: 'Otra' } }, { slug: 'casa-copia' }))
    const to = await redirectOf(duplicateDocument(ctx, 'posts', ID(1)))
    const copy = db.tables.documents[2]
    expect(to).toBe(`/dashboard/colecciones/posts/${copy.id}`)
    expect(copy.data).toMatchObject({ title: { es: 'Casa (copia)', en: 'House (copy)' }, slug: { es: 'casa-copia-2', en: 'house-copy' } })
    expect(copy).toMatchObject({ slug: 'casa-copia-2', sort_order: 2, visible: false })
    expect(db.tables.activity_log[0]).toMatchObject({ action: 'document.duplicate', details: { type: 'posts', from: ID(1) } })
  })

  it('says when the source is gone', async () => {
    expect(await duplicateDocument(ctx, 'posts', ID(9))).toEqual({ ok: false, error: 'errors.documents.gone' })
  })
})

describe('trash and visibility', () => {
  it('sends a document to the trash once', async () => {
    db.tables.documents.push(doc(1, 'posts', {}))
    expect(await trashDocument(ctx, 'posts', ID(1))).toEqual({ ok: true })
    expect(db.tables.documents[0].deleted_at).not.toBeNull()
    expect(await trashDocument(ctx, 'posts', ID(1))).toEqual({ ok: false, error: 'errors.documents.updateFailed' })
  })

  it('shows and hides documents of publishable collections', async () => {
    db.tables.documents.push(doc(1, 'posts', {}, { visible: false }), doc(2, 'team', {}))
    expect(await setDocumentVisibility(ctx, 'posts', ID(1), true)).toEqual({ ok: true })
    expect(db.tables.documents[0].visible).toBe(true)
    expect(db.tables.activity_log[0].action).toBe('document.show')
    expect(await setDocumentVisibility(ctx, 'team', ID(2), false)).toEqual({ ok: false, error: 'errors.unknownEntry' })
  })

  it('reorders a page of an orderable collection from its offset', async () => {
    db.tables.documents.push(doc(1, 'team', {}), doc(2, 'team', {}), doc(3, 'team', {}))
    expect(await reorderCollection(ctx, 'team', [ID(3), ID(1)], 10)).toEqual({ ok: true })
    expect(db.tables.documents.map(row => row.sort_order)).toEqual([11, 2, 10])
    expect(db.tables.documents.map(row => row.revision)).toEqual([1, 1, 1])
    expect(await reorderCollection(ctx, 'posts', [ID(1)])).toEqual({ ok: false, error: 'errors.unknownEntry' })
  })
})
