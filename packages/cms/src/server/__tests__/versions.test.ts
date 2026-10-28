import cmsConfig from '@playground/cms.config'
import { beforeEach, describe, expect, it } from 'vitest'
import { withDefaults } from '../../core/defaults'
import { discardChanges, getVersionDiff, listVersions, restoreVersion } from '../versions'
import { createFakeDb, fakeContext, signIn } from './fakeSupabase'
import type { CmsContextType, DataRecord } from '../context'
import type { FakeDbType } from './fakeSupabase'

const ID = (n: number) => `6f1c3b2a-5555-4c1d-9e0f-${String(n).padStart(12, '0')}`
const PAGE = ID(1)
const POST = ID(2)

let db: FakeDbType
let ctx: CmsContextType

const home = (eyebrow: string, servicesTitle: string) => withDefaults(cmsConfig, cmsConfig.schema.home.fields, {
  hero: { eyebrow: { es: eyebrow } },
  services: { title: { es: servicesTitle } }
}) as DataRecord

const homeRow = () => db.tables.documents.find(row => row.id === PAGE)!
const heroEyebrow = () => ((homeRow().data as DataRecord).hero as DataRecord).eyebrow
const servicesTitle = () => ((homeRow().data as DataRecord).services as DataRecord).title

beforeEach(() => {
  db = createFakeDb({
    documents: [{
      id: PAGE, type: 'home', key: 'home', slug: null, data: home('Ahora', 'Servicios'), revision: 5, sort_order: 0, visible: true,
      created_at: '2026-10-01T00:00:00Z', updated_at: '2026-10-10T00:00:00Z', deleted_at: null
    }],
    document_versions: [
      { id: ID(10), document_id: PAGE, data: home('Antes', 'Viejo'), reason: 'checkpoint', created_at: '2026-10-05T00:00:00Z', created_by: ID(90) },
      { id: ID(11), document_id: PAGE, data: home('Publicado', 'Viejo'), reason: 'publish', created_at: '2026-10-06T00:00:00Z', created_by: null }
    ],
    published_documents: [{ id: PAGE, type: 'home', key: 'home', slug: null, data: home('Publicado', 'Publicados'), sort_order: 0 }]
  })
  signIn(db, { id: ID(90), name: 'Ana' })
  db.rpc.author_names = ({ ids }) => ({ data: db.tables.profiles.filter(row => (ids as string[]).includes(row.id as string)).map(row => ({ id: row.id, name: row.name })), error: null })
  ctx = fakeContext(db, cmsConfig)
})

describe('listVersions', () => {
  it('lists the history newest first, with who made each version', async () => {
    expect(await listVersions(ctx, 'home', PAGE)).toEqual({
      items: [
        { id: ID(11), reason: 'publish', createdAt: '2026-10-06T00:00:00Z', createdBy: null },
        { id: ID(10), reason: 'checkpoint', createdAt: '2026-10-05T00:00:00Z', createdBy: 'Ana' }
      ],
      more: false
    })
  })

  it('pages through a long history by date', async () => {
    for (let n = 0; n < 60; n++) {
      db.tables.document_versions.push({ id: ID(100 + n), document_id: PAGE, data: {}, reason: 'checkpoint', created_at: `2026-09-${String(1 + (n % 28)).padStart(2, '0')}T${String(n % 24).padStart(2, '0')}:00:00Z`, created_by: null })
    }
    const first = await listVersions(ctx, 'home', PAGE)
    expect(first.items).toHaveLength(50)
    expect(first.more).toBe(true)
    const rest = await listVersions(ctx, 'home', PAGE, first.items[49].createdAt)
    expect(rest.items).toHaveLength(12)
    expect(rest.more).toBe(false)
    expect(rest.items.every(item => item.createdAt < first.items[49].createdAt)).toBe(true)
  })
})

describe('restoreVersion', () => {
  it('replaces the whole draft and keeps the current one in the history', async () => {
    const result = await restoreVersion(ctx, 'home', PAGE, ID(10), 5)
    expect(result).toMatchObject({ status: 'replaced', revision: 6 })
    expect(heroEyebrow()).toEqual({ es: 'Antes', en: '' })
    expect(servicesTitle()).toMatchObject({ es: 'Viejo' })
    const kept = db.tables.document_versions.find(version => version.reason === 'restore')
    expect(((kept?.data as DataRecord).hero as DataRecord).eyebrow).toEqual({ es: 'Ahora', en: '' })
    expect(db.tables.activity_log[0]).toMatchObject({ action: 'document.restore', document_id: PAGE })
  })

  it('refuses a whole restore when the draft moved since the editor loaded it', async () => {
    expect(await restoreVersion(ctx, 'home', PAGE, ID(10), 4)).toEqual({ status: 'conflict' })
    expect(heroEyebrow()).toEqual({ es: 'Ahora', en: '' })
  })

  it('restores one section over whatever others saved in the rest', async () => {
    const result = await restoreVersion(ctx, 'home', PAGE, ID(10), 1, 'hero')
    expect(result.status).toBe('replaced')
    expect(heroEyebrow()).toEqual({ es: 'Antes', en: '' })
    expect(servicesTitle()).toMatchObject({ es: 'Servicios' })
    expect(db.tables.activity_log[0].details).toEqual({ type: 'home', section: 'hero' })
  })

  it('says when the version is gone', async () => {
    expect(await restoreVersion(ctx, 'home', PAGE, ID(99), 5)).toEqual({ status: 'error', error: 'errors.versions.gone' })
  })

  it('says when the restored URL belongs to another document now', async () => {
    db.tables.documents.push(
      { id: POST, type: 'posts', key: null, slug: 'nuevo', data: { slug: { es: 'nuevo' } }, revision: 2, sort_order: 0, visible: true, created_at: '2026-10-01T00:00:00Z', updated_at: '2026-10-01T00:00:00Z', deleted_at: null },
      { id: ID(3), type: 'posts', key: null, slug: 'viejo', data: { slug: { es: 'viejo' } }, revision: 1, sort_order: 1, visible: true, created_at: '2026-10-01T00:00:00Z', updated_at: '2026-10-01T00:00:00Z', deleted_at: null }
    )
    db.tables.document_versions.push({ id: ID(12), document_id: POST, data: { slug: { es: 'viejo' } }, reason: 'checkpoint', created_at: '2026-10-01T00:00:00Z' })
    expect(await restoreVersion(ctx, 'posts', POST, ID(12), 2)).toEqual({ status: 'error', error: 'errors.versions.slugTaken' })
  })
})

describe('discardChanges', () => {
  it('goes back to what is on the site', async () => {
    const result = await discardChanges(ctx, 'home', PAGE, 5)
    expect(result.status).toBe('replaced')
    expect(heroEyebrow()).toEqual({ es: 'Publicado', en: '' })
    expect(servicesTitle()).toMatchObject({ es: 'Publicados' })
    expect(db.tables.document_versions.some(version => version.reason === 'discard')).toBe(true)
  })

  it('discards one section only', async () => {
    await discardChanges(ctx, 'home', PAGE, 5, 'services')
    expect(heroEyebrow()).toEqual({ es: 'Ahora', en: '' })
    expect(servicesTitle()).toMatchObject({ es: 'Publicados' })
  })

  it('needs a published version', async () => {
    db.tables.published_documents = []
    expect(await discardChanges(ctx, 'home', PAGE, 5)).toEqual({ status: 'error', error: 'errors.versions.notPublished' })
  })
})

describe('getVersionDiff', () => {
  it('lists what restoring would change', async () => {
    const diff = await getVersionDiff(ctx, 'home', PAGE, ID(10))
    expect(diff?.map(change => [change.path, change.current, change.version])).toEqual(expect.arrayContaining([
      ['hero.eyebrow.es', expect.stringContaining('Ahora'), expect.stringContaining('Antes')],
      ['services.title.es', expect.stringContaining('Servicios'), expect.stringContaining('Viejo')]
    ]))
  })
})
