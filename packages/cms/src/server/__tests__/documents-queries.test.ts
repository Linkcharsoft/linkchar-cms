import cmsConfig from '@playground/cms.config'
import { beforeEach, describe, expect, it } from 'vitest'
import { buildDefaults } from '../../core/defaults'
import { getDocumentState, getRelationLabels, getStaleDrafts, listCollection, listTrash, purgeExpiredDocuments, purgeUntouchedDrafts, searchRelation, titleColumn } from '../documents'
import { createFakeDb, fakeContext, signIn } from './fakeSupabase'
import type { FakeDbType } from './fakeSupabase'

const ID = (n: number) => `6f1c3b2a-2222-4c1d-9e0f-${String(n).padStart(12, '0')}`
const DAY = 24 * 60 * 60 * 1000

let db: FakeDbType

const paragraph = (text: string) => ({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text }] }] })

const post = (n: number, title: string, extra: Record<string, unknown> = {}) => ({
  id: ID(n), type: 'posts', key: null, slug: `post-${n}`, data: { title: { es: title, en: `Story ${n}` } }, revision: 1,
  sort_order: n, visible: true, created_at: `2026-10-0${n}T10:00:00Z`, updated_at: `2026-10-0${n}T10:00:00Z`, deleted_at: null, ...extra
})

beforeEach(() => {
  db = createFakeDb({
    documents: [
      post(1, 'Casa en el bosque'),
      post(2, 'Obra 100% sustentable'),
      post(3, 'Patio interno', { deleted_at: '2026-10-05T00:00:00Z' }),
      { id: ID(4), type: 'team', key: null, slug: null, data: { name: 'Ana Pérez' }, revision: 1, sort_order: 0, visible: true, created_at: '2026-10-01T00:00:00Z', updated_at: '2026-10-01T00:00:00Z', deleted_at: null }
    ],
    published_documents: [{ id: ID(1), type: 'posts', key: null, slug: 'post-1', data: { title: { es: 'Casa en el bosque', en: 'Story 1' } }, sort_order: 1, published_at: '2026-10-02T00:00:00Z' }]
  })
  signIn(db, { id: ID(99) })
})

describe('listCollection', () => {
  it('lists live documents, newest first, with their status and editor link', async () => {
    const { items, total } = await listCollection(fakeContext(db, cmsConfig), 'posts')
    expect(total).toBe(2)
    expect(items.map(item => [item.title, item.status])).toEqual([['Obra 100% sustentable', 'incomplete'], ['Casa en el bosque', 'published']])
    expect(items[0].href).toBe(`/dashboard/colecciones/posts/${ID(2)}`)
  })

  it('tells new documents with missing content apart from the ones ready to publish, and filters by both', async () => {
    const ctx = fakeContext(db, cmsConfig)
    db.tables.documents.push(post(5, 'Completa', {
      data: { title: { es: 'Completa', en: 'Complete' }, slug: { es: 'completa', en: 'complete' }, body: { es: paragraph('Hola'), en: paragraph('Hi') } }
    }))
    expect((await listCollection(ctx, 'posts')).items.map(item => [item.id, item.status])).toEqual([[ID(5), 'new'], [ID(2), 'incomplete'], [ID(1), 'published']])
    expect((await listCollection(ctx, 'posts', { status: 'incomplete' })).items.map(item => item.id)).toEqual([ID(2)])
    const ready = await listCollection(ctx, 'posts', { status: 'new' })
    expect(ready.items.map(item => item.id)).toEqual([ID(5)])
    expect(ready.total).toBe(1)
  })

  it('shows the last page when the requested one is past the end', async () => {
    const ctx = fakeContext(db, cmsConfig)
    const beyond = await listCollection(ctx, 'posts', { page: 9 })
    expect(beyond.page).toBe(1)
    expect(beyond.items).toHaveLength(2)
    const filtered = await listCollection(ctx, 'posts', { page: 9, status: 'incomplete' })
    expect(filtered.page).toBe(1)
    expect(filtered.items.map(item => item.id)).toEqual([ID(2)])
  })

  it('says whether a document is incomplete', async () => {
    const ctx = fakeContext(db, cmsConfig)
    expect(await getDocumentState(ctx, ID(2))).toEqual({ status: 'new', visible: true, incomplete: true })
    expect(await getDocumentState(ctx, ID(1))).toEqual({ status: 'published', visible: true, incomplete: false })
  })

  it('searches the title in the default locale, literally', async () => {
    const ctx = fakeContext(db, cmsConfig)
    expect((await listCollection(ctx, 'posts', { search: 'bosque' })).items.map(item => item.id)).toEqual([ID(1)])
    expect((await listCollection(ctx, 'posts', { search: '100%' })).items.map(item => item.id)).toEqual([ID(2)])
    expect((await listCollection(ctx, 'posts', { search: 'story' })).items).toEqual([])
    expect((await listCollection(ctx, 'posts', { search: 'es' })).items).toEqual([])
  })

  it('filters by status and sorts by title', async () => {
    const ctx = fakeContext(db, cmsConfig)
    expect((await listCollection(ctx, 'posts', { status: 'published' })).items.map(item => item.id)).toEqual([ID(1)])
    expect((await listCollection(ctx, 'posts', { sort: 'title' })).items.map(item => item.id)).toEqual([ID(1), ID(2)])
  })

  it('uses the manual order for orderable collections', async () => {
    expect((await listCollection(fakeContext(db, cmsConfig), 'team')).sort).toBe('manual')
  })
})

describe('purgeUntouchedDrafts', () => {
  it('removes day-old drafts nobody touched and keeps edited, used, recent or published ones', async () => {
    const now = Date.parse('2026-10-03T10:00:00Z')
    const ctx = { ...fakeContext(db, cmsConfig), now: () => new Date(now) }
    const defaults = JSON.parse(JSON.stringify(buildDefaults(cmsConfig, cmsConfig.schema.posts.fields)))
    const blank = (n: number, extra: Record<string, unknown> = {}) =>
      post(n, '', { data: defaults, slug: null, visible: false, created_at: '2026-10-01T10:00:00Z', updated_at: '2026-10-01T10:00:00Z', ...extra })
    db.tables.documents.push(
      blank(5),
      blank(6),
      blank(7, { data: { ...defaults, title: { es: 'Con título', en: '' } } }),
      blank(8, { revision: 2 }),
      blank(9, { created_at: '2026-10-03T09:00:00Z', updated_at: '2026-10-03T09:00:00Z' }),
      blank(10)
    )
    db.tables.published_documents.push({ id: ID(10), type: 'posts', key: null, slug: null, data: defaults, sort_order: 0, published_at: '2026-10-02T00:00:00Z' })
    db.rpc.document_usage = ({ ids }) => ({
      data: (ids as string[]).includes(ID(6)) ? [{ target_id: ID(6), document_id: ID(1), type: 'posts', data: {}, keys: [], published: false, trashed: false }] : [],
      error: null
    })

    expect(await purgeUntouchedDrafts(ctx, 'posts')).toBe(1)
    const left = db.tables.documents.map(row => row.id)
    expect(left).not.toContain(ID(5))
    expect(left).toEqual(expect.arrayContaining([ID(6), ID(7), ID(8), ID(9), ID(10)]))
    expect(await purgeUntouchedDrafts(ctx, 'posts')).toBe(0)
  })
})

describe('getStaleDrafts', () => {
  it('lists hidden drafts untouched for two weeks, oldest first, never the visible or published ones', async () => {
    const now = Date.parse('2026-11-01T12:00:00Z')
    const ctx = { ...fakeContext(db, cmsConfig), now: () => new Date(now) }
    db.tables.documents.push(
      post(5, 'Vieja oculta', { visible: false, updated_at: '2026-10-05T12:00:00Z' }),
      post(6, 'Más vieja oculta', { visible: false, updated_at: '2026-10-01T12:00:00Z' }),
      post(7, 'Reciente oculta', { visible: false, updated_at: '2026-10-25T12:00:00Z' }),
      post(8, 'Vieja visible', { visible: true, updated_at: '2026-10-01T12:00:00Z' })
    )
    expect(await getStaleDrafts(ctx)).toEqual([
      { title: 'Más vieja oculta', href: `/dashboard/colecciones/posts/${ID(6)}`, days: 31 },
      { title: 'Vieja oculta', href: `/dashboard/colecciones/posts/${ID(5)}`, days: 27 }
    ])
    expect(await getStaleDrafts(ctx, 1)).toHaveLength(1)
  })
})

describe('titleColumn', () => {
  it('reads localized titles in the default locale and plain ones as they are', () => {
    const ctx = fakeContext(db, cmsConfig)
    expect(titleColumn(ctx, cmsConfig.schema.posts)).toBe('data->title->>es')
    expect(titleColumn(ctx, cmsConfig.schema.team)).toBe('data->>name')
  })
})

describe('trash', () => {
  it('lists trashed documents with their collection', async () => {
    expect(await listTrash(fakeContext(db, cmsConfig))).toEqual([
      { id: ID(3), entryLabel: 'Blog', title: 'Patio interno', deletedAt: '2026-10-05T00:00:00Z', published: false }
    ])
  })

  it('purges documents trashed long ago, except the ones still on the site', async () => {
    const ctx = { ...fakeContext(db, cmsConfig), now: () => new Date(Date.parse('2026-10-05T00:00:00Z') + 31 * DAY) }
    db.tables.documents.push(post(5, 'Publicado', { deleted_at: '2026-10-01T00:00:00Z' }))
    db.tables.published_documents.push({ id: ID(5), type: 'posts', key: null, slug: 'post-5', data: {}, sort_order: 5, published_at: '2026-09-01T00:00:00Z' })
    expect(await purgeExpiredDocuments(ctx)).toBe(1)
    expect(db.tables.documents.map(row => row.id)).not.toContain(ID(3))
    expect(db.tables.documents.map(row => row.id)).toContain(ID(5))
  })

  it('keeps documents trashed less than 30 days ago', async () => {
    const ctx = { ...fakeContext(db, cmsConfig), now: () => new Date(Date.parse('2026-10-05T00:00:00Z') + 29 * DAY) }
    expect(await purgeExpiredDocuments(ctx)).toBe(0)
  })
})

describe('relations', () => {
  it('searches documents of a collection to pick them', async () => {
    const options = await searchRelation(fakeContext(db, cmsConfig), 'posts', 'casa')
    expect(options).toEqual([{ id: ID(1), label: 'Casa en el bosque', kind: 'Artículo', status: 'published', trashed: false }])
    expect(await searchRelation(fakeContext(db, cmsConfig), 'home', '')).toEqual([])
  })

  it('labels picked documents, trashed ones included', async () => {
    const labels = await getRelationLabels(fakeContext(db, cmsConfig), [ID(3), ID(4)])
    expect(labels[ID(3)]).toMatchObject({ label: 'Patio interno', trashed: true })
    expect(labels[ID(4)]).toMatchObject({ label: 'Ana Pérez', kind: 'Integrante', status: 'new' })
  })
})
