import cmsConfig from '@playground/cms.config'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { buildMediaPath } from '../../core/media'
import { describeUsage, listMedia, purgeExpiredMedia, purgeMedia, registerMedia, trashMedia, updateMedia } from '../media'
import { createFakeDb, fakeContext, signIn } from './fakeSupabase'
import type { CmsContextType } from '../context'
import type { RegisterMediaInputType } from '../media'
import type { FakeDbType } from './fakeSupabase'

const ID = (n: number) => `6f1c3b2a-7777-4c1d-9e0f-${String(n).padStart(12, '0')}`
const DAY = 24 * 60 * 60 * 1000

let db: FakeDbType
let ctx: CmsContextType
let usage: Record<string, unknown[]>

const file = (n: number, extra: Record<string, unknown> = {}) => ({
  id: ID(n), path: `blog/2026/${ID(n)}.webp`, filename: `foto-${n}.webp`, folder: 'blog', alt: {}, caption: {}, mime: 'image/webp', size: 100,
  width: 10, height: 10, focal_x: null, focal_y: null, blur_data_url: null, created_at: `2026-10-0${n}T00:00:00Z`, created_by: null,
  updated_at: `2026-10-0${n}T00:00:00Z`, deleted_at: null, ...extra
})

const upload = (extra: Partial<RegisterMediaInputType> = {}): RegisterMediaInputType => ({
  path: buildMediaPath('blog', 'image/webp'), filename: ' fachada.webp ', folder: 'blog', alt: { es: ' Fachada ', en: '', fr: 'x' }, caption: {},
  mime: 'image/webp', size: 2048, width: 1200, height: 800, blurDataUrl: null, ...extra
})

beforeEach(() => {
  db = createFakeDb({
    media: [
      file(1, { alt: { es: 'Fachada de ladrillo', en: 'Brick facade' } }),
      file(2, { alt: { es: 'Patio 100% verde' } }),
      file(3, { deleted_at: '2026-10-05T00:00:00Z' })
    ]
  })
  usage = {}
  db.rpc.media_usage = ({ ids }) => ({ data: (ids as string[]).flatMap(id => (usage[id] ?? []).map(row => ({ media_id: id, ...(row as object) }))), error: null })
  signIn(db, { id: ID(90), role: 'admin' })
  ctx = fakeContext(db, cmsConfig)
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('listMedia', () => {
  it('lists the library newest first, with public URLs and alt texts per locale', async () => {
    const { items, total } = await listMedia(ctx)
    expect(total).toBe(2)
    expect(items.map(item => item.id)).toEqual([ID(2), ID(1)])
    expect(items[1]).toMatchObject({ alt: { es: 'Fachada de ladrillo', en: 'Brick facade' }, url: `http://127.0.0.1:54421/storage/v1/object/public/media/blog/2026/${ID(1)}.webp` })
  })

  it('searches the filename and the alt text of every locale, literally', async () => {
    expect((await listMedia(ctx, { search: 'brick' })).items.map(item => item.id)).toEqual([ID(1)])
    expect((await listMedia(ctx, { search: 'foto-2' })).items.map(item => item.id)).toEqual([ID(2)])
    expect((await listMedia(ctx, { search: '100%' })).items.map(item => item.id)).toEqual([ID(2)])
    expect((await listMedia(ctx, { search: 'es' })).items).toEqual([])
  })

  it('shows the trash on its own', async () => {
    expect((await listMedia(ctx, { trash: true })).items.map(item => item.id)).toEqual([ID(3)])
  })
})

describe('registerMedia', () => {
  it('creates the library entry with clean texts in the configured locales', async () => {
    const result = await registerMedia(ctx, upload())
    expect(result).toMatchObject({ ok: true, item: { filename: 'fachada.webp', alt: { es: 'Fachada' }, caption: {} } })
    expect(db.tables.activity_log[0].action).toBe('media.upload')
  })

  it('needs the alt text of an image in the default locale', async () => {
    const input = upload({ alt: { en: 'Facade' } })
    expect(await registerMedia(ctx, input)).toEqual({ ok: false, error: 'errors.media.altRequired' })
    expect(db.storageRemoved).toEqual([input.path])
  })

  it('accepts only the configured folders, allowed types and sizes', async () => {
    expect(await registerMedia(ctx, upload({ folder: 'otra', path: buildMediaPath('otra', 'image/webp') }))).toEqual({ ok: false, error: 'errors.media.invalidFolder' })
    expect(await registerMedia(ctx, upload({ path: 'blog/2026/../../avatars/x.webp' }))).toEqual({ ok: false, error: 'errors.media.invalidFolder' })
    expect(await registerMedia(ctx, upload({ mime: 'image/svg+xml' }))).toEqual({ ok: false, error: 'errors.media.invalidType' })
    expect(await registerMedia(ctx, upload({ size: 11 * 1024 * 1024 }))).toEqual({ ok: false, error: 'errors.media.tooLarge' })
    expect(await registerMedia(ctx, upload({ blurDataUrl: 'javascript:alert(1)' }))).toEqual({ ok: false, error: 'errors.media.invalidPreview' })
  })

  it('never deletes a file that belongs to another entry', async () => {
    const taken = file(1).path
    await registerMedia(ctx, upload({ path: taken, alt: {} }))
    expect(db.storageRemoved).toEqual([])
  })
})

describe('updateMedia', () => {
  it('saves alt texts, caption, folder and focal point', async () => {
    const result = await updateMedia(ctx, ID(1), { alt: { es: 'Nueva', en: 'New' }, caption: { es: 'Pie' }, folder: 'proyectos', focalX: 0.5, focalY: 0.2 })
    expect(result).toMatchObject({ ok: true, item: { alt: { es: 'Nueva', en: 'New' }, caption: { es: 'Pie' }, folder: 'proyectos', focalX: 0.5 } })
  })

  it('refuses an image without alt, unknown folders and focal points outside the image', async () => {
    expect(await updateMedia(ctx, ID(1), { alt: { es: ' ' }, caption: {}, folder: 'blog', focalX: null, focalY: null })).toEqual({ ok: false, error: 'errors.media.altRequired' })
    expect(await updateMedia(ctx, ID(1), { alt: { es: 'a' }, caption: {}, folder: 'x', focalX: null, focalY: null })).toEqual({ ok: false, error: 'errors.media.invalidFolder' })
    expect(await updateMedia(ctx, ID(1), { alt: { es: 'a' }, caption: {}, folder: 'blog', focalX: 2, focalY: null })).toEqual({ ok: false, error: 'errors.media.invalidFocalPoint' })
    expect(await updateMedia(ctx, ID(9), { alt: { es: 'a' }, caption: {}, folder: 'blog', focalX: null, focalY: null })).toEqual({ ok: false, error: 'errors.media.gone' })
  })
})

describe('trash and purge', () => {
  const inPost = { document_id: ID(50), type: 'posts', data: { title: { es: 'Casa' } }, keys: ['cover'], published: false, trashed: false }

  it('keeps a file in use out of the trash and says where it is used', async () => {
    usage[ID(1)] = [inPost]
    expect(await trashMedia(ctx, ID(1))).toEqual({ ok: false, usage: [{ documentId: ID(50), label: 'Blog › Casa', href: `/dashboard/colecciones/posts/${ID(50)}`, onlyPublished: false, trashed: false }] })
    expect(await trashMedia(ctx, ID(2))).toEqual({ ok: true })
  })

  it('purges a trashed, unused file: row first, then the stored file', async () => {
    expect(await purgeMedia(ctx, ID(3))).toEqual({ ok: true })
    expect(db.tables.media.map(row => row.id)).toEqual([ID(1), ID(2)])
    expect(db.storageRemoved).toEqual([file(3).path])
    expect(await purgeMedia(ctx, ID(1))).toEqual({ ok: false, usage: [] })
  })

  it('purges expired trash lazily, leaving files still in use', async () => {
    db.tables.media.push(file(4, { deleted_at: '2026-10-01T00:00:00Z' }))
    usage[ID(4)] = [{ ...inPost, published: true }]
    const later = { ...ctx, now: () => new Date(Date.parse('2026-10-05T00:00:00Z') + 31 * DAY) }
    expect(await purgeExpiredMedia(later)).toBe(1)
    expect(db.tables.media.map(row => row.id)).toEqual([ID(1), ID(2), ID(4)])
  })
})

describe('describeUsage', () => {
  it('names pages by their sections and prefers the draft over the published copy', () => {
    const rows = [
      { document_id: ID(60), type: 'home', data: {}, keys: ['hero', 'extra'], published: true, trashed: false },
      { document_id: ID(60), type: 'home', data: {}, keys: ['hero'], published: false, trashed: false },
      { document_id: ID(61), type: 'settings', data: {}, keys: ['general'], published: true, trashed: false },
      { document_id: ID(62), type: 'posts', data: { title: { es: 'Vieja' } }, keys: ['cover'], published: false, trashed: true }
    ]
    expect(describeUsage(ctx, rows)).toEqual([
      { documentId: ID(60), label: 'Inicio › Portada', href: '/dashboard/paginas/home#hero', onlyPublished: false, trashed: false },
      { documentId: ID(62), label: 'Blog › Vieja', href: '/dashboard/papelera', onlyPublished: false, trashed: true },
      { documentId: ID(61), label: 'Datos del sitio', href: '/dashboard/sitio/settings', onlyPublished: true, trashed: false }
    ])
  })
})
