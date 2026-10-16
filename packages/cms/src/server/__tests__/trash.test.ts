import cmsConfig from '@playground/cms.config'
import { beforeEach, describe, expect, it } from 'vitest'
import { CmsRedirect } from '../context'
import { purgeDocument, restoreDocument } from '../trash'
import { createFakeDb, fakeContext, signIn } from './fakeSupabase'
import type { CmsContextType } from '../context'
import type { FakeDbType } from './fakeSupabase'

const ID = (n: number) => `6f1c3b2a-6666-4c1d-9e0f-${String(n).padStart(12, '0')}`
const ADMIN = ID(90)

let db: FakeDbType
let ctx: CmsContextType

const post = (n: number, slug: string, deleted: boolean) => ({
  id: ID(n), type: 'posts', key: null, slug, data: { slug: { es: slug } }, revision: 1, sort_order: n, visible: true,
  created_at: '2026-10-01T00:00:00Z', updated_at: '2026-10-01T00:00:00Z', deleted_at: deleted ? '2026-10-10T00:00:00Z' : null
})

beforeEach(() => {
  db = createFakeDb({
    documents: [post(1, 'casa', true), post(2, 'patio', true), post(3, 'patio', false)],
    document_versions: [{ id: ID(10), document_id: ID(1), data: {}, reason: 'checkpoint', created_at: '2026-10-01T00:00:00Z' }]
  })
  signIn(db, { id: ADMIN, role: 'admin' })
  ctx = fakeContext(db, cmsConfig)
})

describe('restoreDocument', () => {
  it('brings a document back from the trash', async () => {
    expect(await restoreDocument(ctx, ID(1))).toEqual({ ok: true })
    expect(db.tables.documents[0].deleted_at).toBeNull()
    expect(db.tables.activity_log[0]).toMatchObject({ action: 'document.untrash', details: { type: 'posts' } })
    expect(ctx.revalidate).toHaveBeenCalledWith('/dashboard/papelera')
  })

  it('says when another document took its URL meanwhile', async () => {
    expect(await restoreDocument(ctx, ID(2))).toEqual({ ok: false, error: 'errors.trash.slugTaken' })
    expect(db.tables.documents[1].deleted_at).not.toBeNull()
  })

  it('only restores documents that are in the trash', async () => {
    expect(await restoreDocument(ctx, ID(3))).toEqual({ ok: false, error: 'errors.trash.restoreFailed' })
  })
})

describe('purgeDocument', () => {
  it('deletes a trashed document for good, with its history', async () => {
    expect(await purgeDocument(ctx, ID(1))).toEqual({ ok: true })
    expect(db.tables.documents.map(row => row.id)).toEqual([ID(2), ID(3)])
    expect(db.tables.document_versions).toEqual([])
    expect(db.tables.activity_log[0]).toMatchObject({ action: 'document.purge', document_id: null, details: { id: ID(1), type: 'posts' } })
  })

  it('waits for a document still on the site', async () => {
    db.tables.published_documents.push({ id: ID(1), type: 'posts', key: null, slug: 'casa', data: {}, sort_order: 1 })
    expect(await purgeDocument(ctx, ID(1))).toEqual({ ok: false, error: 'errors.trash.stillPublished' })
    expect(db.tables.documents).toHaveLength(3)
  })

  it('only purges what is in the trash', async () => {
    expect(await purgeDocument(ctx, ID(3))).toEqual({ ok: false, error: 'errors.trash.notTrashed' })
  })

  it('is for admins', async () => {
    signIn(db, { id: ID(91), role: 'editor' })
    await expect(purgeDocument(fakeContext(db, cmsConfig), ID(1))).rejects.toBeInstanceOf(CmsRedirect)
  })
})
