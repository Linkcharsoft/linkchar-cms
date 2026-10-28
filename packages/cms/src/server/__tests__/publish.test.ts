import cmsConfig from '@playground/cms.config'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { withDefaults } from '../../core/defaults'
import { mockBuild } from '../../publish/mock'
import { applyBuildEvent, getPendingChanges, getPendingCounts, getPublishHistory, getPublishStatus, publishChanges, retryPublish, triggerBuild } from '../publish'
import { createFakeDb, fakeContext, signIn } from './fakeSupabase'
import type { PublishTargetType } from '../../publish/types'
import type { CmsContextType, DataRecord } from '../context'
import type { FakeDbType } from './fakeSupabase'

const ID = (n: number) => `6f1c3b2a-8888-4c1d-9e0f-${String(n).padStart(12, '0')}`
const NOW = Date.parse('2026-10-16T12:00:00Z')
const MINUTE = 60_000

let db: FakeDbType
let ctx: CmsContextType

const at = (minutesAgo: number) => new Date(NOW - minutesAgo * MINUTE).toISOString()

const logRow = (id: number, values: DataRecord = {}) => ({
  id, requested_by: null, requested_at: at(1), documents_count: 1, removed_count: 0, items: [], build_status: 'pending',
  job_id: null, finished_at: null, error_code: null, error_detail: null, retry_of: null, ...values
})

const target = (trigger: PublishTargetType['trigger']): PublishTargetType => ({ name: 'test', trigger })

const paragraph = (text: string) => ({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text }] }] })

const completePost = (title: string, slug: string) => withDefaults(cmsConfig, cmsConfig.schema.posts.fields, {
  title: { es: title, en: title },
  slug: { es: slug, en: slug },
  body: { es: paragraph('Hola'), en: paragraph('Hello') }
}) as DataRecord

const document = (n: number, type: string, data: DataRecord, extra: DataRecord = {}) => ({
  id: ID(n), type, key: type === 'posts' ? null : type, slug: null, data, revision: 2, sort_order: 0, visible: true,
  created_at: at(60), updated_at: at(10 - n), updated_by: ID(90), deleted_at: null, ...extra
})

beforeEach(() => {
  db = createFakeDb()
  signIn(db, { id: ID(90), name: 'Ana', can_publish: true })
  db.rpc.author_names = () => ({ data: [{ id: ID(90), name: 'Ana' }], error: null })
  ctx = { ...fakeContext(db, cmsConfig), now: () => new Date(NOW) }
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('getPendingChanges', () => {
  it('lists what the next publish takes, with problems, URL changes and changed sections', async () => {
    const home = withDefaults(cmsConfig, cmsConfig.schema.home.fields, {}) as DataRecord
    const edited = { ...home, services: { ...(home.services as DataRecord), title: { es: 'Nuevo', en: 'New' } } }
    db.tables.documents.push(
      document(1, 'posts', completePost('Casa', 'casa-nueva'), { slug: 'casa-nueva', slugs: { es: 'casa-nueva', en: 'casa-nueva' } }),
      document(2, 'posts', withDefaults(cmsConfig, cmsConfig.schema.posts.fields, {}) as DataRecord),
      document(3, 'home', edited),
      document(4, 'posts', completePost('Vieja', 'vieja'), { slug: 'vieja', deleted_at: at(5) })
    )
    db.tables.published_documents.push(
      { id: ID(1), type: 'posts', key: null, slug: 'casa', data: completePost('Casa', 'casa'), sort_order: 0 },
      { id: ID(3), type: 'home', key: 'home', slug: null, data: home, sort_order: 0 },
      { id: ID(4), type: 'posts', key: null, slug: 'vieja', data: completePost('Vieja', 'vieja'), sort_order: 0 }
    )

    const changes = await getPendingChanges(ctx)
    const byId = Object.fromEntries(changes.map(change => [change.id, change]))

    expect(byId[ID(1)]).toMatchObject({
      entryId: 'posts', action: 'publish', status: 'changed', title: 'Casa', updatedBy: 'Ana', problems: [], missing: [],
      urls: { es: '/blog/casa-nueva', en: '/en/blog/casa-nueva' },
      urlChanges: [{ locale: 'es', from: '/blog/casa', to: '/blog/casa-nueva' }],
      href: `/dashboard/colecciones/posts/${ID(1)}`
    })
    expect(byId[ID(2)]).toMatchObject({ action: 'publish', status: 'new', problems: expect.arrayContaining(['Título', 'Dirección', 'Texto']) })
    expect(byId[ID(3)]).toMatchObject({ entryLabel: 'Inicio', sections: [{ label: 'Servicios', href: '/dashboard/paginas/home#services' }] })
    expect(byId[ID(4)]).toMatchObject({ action: 'unpublish', href: '/dashboard/papelera' })
  })

  it('names what is missing in another language, alt texts of the files in use included', async () => {
    const post = { ...completePost('Casa', 'casa'), title: { es: 'Casa', en: '' }, cover: { es: ID(7) } }
    db.tables.documents.push(document(1, 'posts', post))
    db.tables.media.push({ id: ID(7), alt: { es: 'Fachada' }, caption: {} })

    const [change] = await getPendingChanges(ctx)
    expect(change.missing).toEqual([
      { path: 'title.en', locale: 'en', kind: 'field', label: 'Título (Inglés)', href: `/dashboard/colecciones/posts/${ID(1)}?locale=en#title` },
      { path: 'cover', locale: 'en', kind: 'alt', label: 'Texto alternativo de Imagen (Inglés)', href: `/dashboard/colecciones/posts/${ID(1)}?locale=en#cover` }
    ])
    expect(change.problems).toEqual(['Título (Inglés)', 'Texto alternativo de Imagen (Inglés)'])
  })

  it('names the picked items that go out only if they are ticked too', async () => {
    db.tables.documents.push(
      document(1, 'posts', { ...completePost('Casa', 'casa'), author: ID(5) }),
      document(5, 'team', { name: 'Bruno' }, { key: null })
    )
    const [change] = (await getPendingChanges(ctx)).filter(item => item.id === ID(1))
    expect(change.warnings).toEqual([])
    expect(change.pendingRefs).toEqual([{ id: ID(5), name: '"Bruno" (integrante)' }])
  })

  it('warns about picked items that will not be on the site', async () => {
    db.tables.documents.push(
      document(1, 'posts', { ...completePost('Casa', 'casa'), author: ID(5) }),
      document(5, 'team', { name: 'Bruno' }, { key: null, visible: false })
    )
    const [change] = (await getPendingChanges(ctx)).filter(item => item.id === ID(1))
    expect(change.warnings).toEqual(['"Bruno" (integrante) está oculto: no va a aparecer en el sitio.'])
  })

  describe('when an item leaves the site', () => {
    const holds = (row: DataRecord, id: string) => row.id !== id && JSON.stringify(row.data).includes(id)
    const live = (n: number, data: DataRecord) => ({ id: ID(n), type: 'posts', key: null, slug: null, data, sort_order: 0 })
    const removal = async () => (await getPendingChanges(ctx)).find(change => change.id === ID(5))!

    beforeEach(() => {
      db.rpc.document_usage = ({ ids }) => ({
        data: (ids as string[]).flatMap(id => [
          ...db.tables.documents.filter(row => holds(row, id))
            .map(row => ({ target_id: id, document_id: row.id, type: row.type, data: row.data, keys: [], published: false, trashed: row.deleted_at !== null })),
          ...db.tables.published_documents.filter(row => holds(row, id))
            .map(row => ({ target_id: id, document_id: row.id, type: row.type, data: row.data, keys: [], published: true, trashed: false }))
        ]),
        error: null
      })
      const bruno = { name: 'Bruno' }
      db.tables.documents.push(document(5, 'team', bruno, { key: null, deleted_at: at(1) }))
      db.tables.published_documents.push({ id: ID(5), type: 'team', key: null, slug: null, data: bruno, sort_order: 0 })
    })

    it('names the live pages that still pick it', async () => {
      const post = { ...completePost('Casa', 'casa'), author: ID(5) }
      db.tables.documents.push(document(1, 'posts', post))
      db.tables.published_documents.push(live(1, post))
      expect((await removal()).warnings).toEqual(['Blog › Casa lo usa y sigue en el sitio: va a quedar sin este contenido.'])
    })

    it('says nothing when those pages leave too or go out without it', async () => {
      const post = { ...completePost('Casa', 'casa'), author: ID(5) }
      db.tables.documents.push(
        document(1, 'posts', post, { deleted_at: at(2) }),
        document(2, 'posts', completePost('Otra', 'otra'))
      )
      db.tables.published_documents.push(live(1, post), live(2, { ...completePost('Otra', 'otra'), author: ID(5) }))
      const change = await removal()
      expect(change.warnings).toEqual([])
      expect(change.fixedUsers).toEqual([{ id: ID(2), name: 'Blog › Otra' }])
    })
  })
})

describe('publishChanges', () => {
  beforeEach(() => {
    db.tables.documents.push(document(1, 'posts', completePost('Casa', 'casa'), { slug: 'casa' }))
    db.rpc.publish_site = () => {
      db.tables.publish_log.push(logRow(9))
      return { data: { publishId: 9, published: 1, removed: 0 }, error: null }
    }
  })

  it('refuses editors without permission before touching the database', async () => {
    signIn(db, { id: ID(91), can_publish: false })
    const rpc = vi.fn()
    db.rpc.publish_site = rpc
    expect(await publishChanges(fakeContext(db, cmsConfig), { publish: [{ id: ID(1), revision: 2 }], remove: [] })).toEqual({ ok: false, error: 'errors.publish.forbidden' })
    expect(rpc).not.toHaveBeenCalled()
  })

  it('waits for the previous build before publishing again', async () => {
    db.tables.publish_log.push(logRow(8, { build_status: 'building', requested_at: at(3) }))
    expect(await publishChanges(ctx, { publish: [{ id: ID(1), revision: 2 }], remove: [] })).toEqual({ ok: false, error: 'errors.publish.building' })
    db.tables.publish_log[0].requested_at = at(31)
    expect(await publishChanges(ctx, { publish: [{ id: ID(1), revision: 2 }], remove: [] })).toMatchObject({ ok: true })
  })

  it('rejects a selection that changed since it was reviewed', async () => {
    for (const selection of [{ publish: [{ id: ID(1), revision: 1 }], remove: [] }, { publish: [{ id: ID(7), revision: 1 }], remove: [] }, { publish: [], remove: [ID(1)] }]) {
      expect(await publishChanges(ctx, selection)).toEqual({ ok: false, error: 'errors.publish.stale' })
    }
    expect(await publishChanges(ctx, { publish: [], remove: [] })).toEqual({ ok: false, error: 'errors.publish.nothing' })
  })

  it('takes the URLs of each locale from the schema and starts the build', async () => {
    const rpc = vi.fn(db.rpc.publish_site)
    db.rpc.publish_site = rpc
    ctx.publishTarget = target(async () => ({ ok: true, jobId: 'job-1' }))

    expect(await publishChanges(ctx, { publish: [{ id: ID(1), revision: 2 }], remove: [] })).toEqual({ ok: true, published: 1, removed: 0, buildStatus: 'building' })
    expect(rpc).toHaveBeenCalledWith({
      p_publish: [{ id: ID(1), revision: 2, urls: { es: { prefix: '/blog/', primary: true }, en: { prefix: '/en/blog/', primary: false } } }],
      p_remove: []
    })
    expect(db.tables.publish_log[0]).toMatchObject({ build_status: 'building', job_id: 'job-1' })
  })

  it('revalidates the running site when the target builds nothing', async () => {
    ctx.publishTarget = { ...target(async () => ({ ok: true, jobId: null })), revalidateOnPublish: true }
    await publishChanges(ctx, { publish: [{ id: ID(1), revision: 2 }], remove: [] })
    expect(ctx.revalidate).toHaveBeenCalledWith('/', 'layout')
  })

  it('explains database errors with a code the panel translates', async () => {
    db.rpc.publish_site = () => ({ data: null, error: { code: '23505', message: 'dup' } })
    expect(await publishChanges(ctx, { publish: [{ id: ID(1), revision: 2 }], remove: [] })).toEqual({ ok: false, error: 'errors.publish.slugTaken' })
    db.rpc.publish_site = () => ({ data: null, error: { code: 'XX000', message: 'boom' } })
    expect(await publishChanges(ctx, { publish: [{ id: ID(1), revision: 2 }], remove: [] })).toEqual({ ok: false, error: 'errors.publish.failed' })
  })
})

describe('retryPublish', () => {
  const items = [{ id: ID(1), type: 'posts', action: 'publish' }]

  beforeEach(() => {
    db.tables.publish_log.push(
      logRow(3, { requested_at: at(30), build_status: 'success' }),
      logRow(4, { requested_at: at(5), build_status: 'failed', error_code: 'build_failed', items, documents_count: 1 })
    )
  })

  it('builds the latest failed publish again in a row of its own', async () => {
    ctx.publishTarget = target(async () => ({ ok: true, jobId: 'job-2' }))

    expect(await retryPublish(ctx, 4)).toEqual({ ok: true, published: 0, removed: 0, buildStatus: 'building' })
    expect(db.tables.publish_log.find(row => row.id === 5)).toMatchObject({
      retry_of: 4, requested_by: ID(90), documents_count: 1, items, build_status: 'building', job_id: 'job-2'
    })
    expect(db.tables.publish_log.find(row => row.id === 4)).toMatchObject({ build_status: 'failed' })
    expect(db.tables.activity_log).toEqual([expect.objectContaining({ action: 'site.retry', details: { publishId: 5, retryOf: 4 } })])
  })

  it('only retries the latest publish, and only when it failed', async () => {
    expect(await retryPublish(ctx, 3)).toEqual({ ok: false, error: 'errors.publish.stale' })
    db.tables.publish_log.find(row => row.id === 4)!.build_status = 'building'
    expect(await retryPublish(ctx, 4)).toEqual({ ok: false, error: 'errors.publish.stale' })
    expect(db.tables.publish_log).toHaveLength(2)
  })

  it('refuses editors without permission', async () => {
    signIn(db, { id: ID(91), can_publish: false })
    expect(await retryPublish(fakeContext(db, cmsConfig), 4)).toEqual({ ok: false, error: 'errors.publish.forbidden' })
    expect(db.tables.publish_log).toHaveLength(2)
  })
})

describe('triggerBuild', () => {
  beforeEach(() => {
    db.tables.publish_log.push(logRow(7))
  })

  it('fails with a code when no publish target is configured', async () => {
    expect(await triggerBuild(ctx, 7)).toBe('failed')
    expect(db.tables.publish_log[0]).toMatchObject({ build_status: 'failed', error_code: 'target_missing', error_detail: null, finished_at: at(0) })
  })

  it('keeps what the target says went wrong', async () => {
    ctx.publishTarget = target(async () => ({ ok: false, code: 'hook_refused', detail: '500' }))
    expect(await triggerBuild(ctx, 7)).toBe('failed')
    expect(db.tables.publish_log[0]).toMatchObject({ error_code: 'hook_refused', error_detail: '500' })
  })

  it('stores the job, without overwriting an event that arrived first', async () => {
    ctx.publishTarget = target(async ({ report }) => {
      await report({ jobId: 'job-2', status: 'succeeded' })
      return { ok: true, jobId: 'job-2' }
    })
    expect(await triggerBuild(ctx, 7)).toBe('building')
    expect(db.tables.publish_log[0]).toMatchObject({ build_status: 'success', job_id: 'job-2' })
  })

  it('runs the whole cycle with the mock build', async () => {
    vi.useFakeTimers()
    ctx.publishTarget = mockBuild({ result: 'success', seconds: 2 })
    expect(await triggerBuild(ctx, 7)).toBe('building')
    await vi.advanceTimersByTimeAsync(3000)
    expect(db.tables.publish_log[0]).toMatchObject({ build_status: 'success', job_id: expect.stringMatching(/^mock-/) })
    vi.useRealTimers()
  })
})

describe('applyBuildEvent', () => {
  it('updates the publication that owns the job', async () => {
    db.tables.publish_log.push(logRow(1, { job_id: '41', build_status: 'success' }), logRow(2, { job_id: '42', build_status: 'building' }))
    expect(await applyBuildEvent(ctx, { jobId: '42', status: 'succeeded' })).toBe(true)
    expect(db.tables.publish_log[1]).toMatchObject({ build_status: 'success', error_code: null, finished_at: at(0) })
  })

  it('assigns an unknown job to the oldest open publication', async () => {
    db.tables.publish_log.push(logRow(3, { requested_at: at(10) }), logRow(4, { requested_at: at(2) }))
    expect(await applyBuildEvent(ctx, { jobId: '43', status: 'started' })).toBe(true)
    expect(db.tables.publish_log[0]).toMatchObject({ build_status: 'building', job_id: '43' })
    expect(db.tables.publish_log[1].job_id).toBeNull()
  })

  it('ignores open publications older than 30 minutes, which never heard back', async () => {
    db.tables.publish_log.push(logRow(5, { requested_at: at(45) }), logRow(6, { requested_at: at(3) }))
    await applyBuildEvent(ctx, { jobId: '44', status: 'started' })
    expect(db.tables.publish_log[0]).toMatchObject({ build_status: 'pending', job_id: null })
    expect(db.tables.publish_log[1]).toMatchObject({ build_status: 'building', job_id: '44' })

    db.tables.publish_log = [logRow(5, { requested_at: at(45) })]
    expect(await applyBuildEvent(ctx, { jobId: '45', status: 'succeeded' })).toBe(false)
  })

  it('records failures as a code', async () => {
    db.tables.publish_log.push(logRow(8, { job_id: '46', build_status: 'building' }))
    await applyBuildEvent(ctx, { jobId: '46', status: 'failed' })
    expect(db.tables.publish_log[0]).toMatchObject({ build_status: 'failed', error_code: 'build_failed' })
  })

  it('marks a cancelled build as failed with its own reason', async () => {
    db.tables.publish_log.push(logRow(5, { job_id: '48', build_status: 'building' }))
    expect(await applyBuildEvent(ctx, { jobId: '48', status: 'cancelled' })).toBe(true)
    expect(db.tables.publish_log[0]).toMatchObject({ build_status: 'failed', error_code: 'build_cancelled', finished_at: at(0) })
  })

  it('ignores events nobody is waiting for', async () => {
    db.tables.publish_log.push(logRow(9, { job_id: '47', build_status: 'success' }))
    expect(await applyBuildEvent(ctx, { jobId: '99', status: 'succeeded' })).toBe(false)
  })
})

describe('getPendingCounts', () => {
  it('tells the changes ready to go out from the incomplete ones, as the publish screen does', async () => {
    const home = withDefaults(cmsConfig, cmsConfig.schema.home.fields, {}) as DataRecord
    db.tables.documents.push(
      document(1, 'posts', completePost('Casa', 'casa'), { slug: 'casa', slugs: { es: 'casa', en: 'casa' } }),
      document(2, 'posts', withDefaults(cmsConfig, cmsConfig.schema.posts.fields, {}) as DataRecord),
      document(3, 'home', home),
      document(4, 'posts', completePost('Vieja', 'vieja'), { slug: 'vieja', deleted_at: at(5) })
    )
    db.tables.published_documents.push({ id: ID(4), type: 'posts', key: null, slug: 'vieja', data: completePost('Vieja', 'vieja'), sort_order: 0 })

    const changes = await getPendingChanges(ctx)
    const ready = changes.filter(change => change.action === 'unpublish' || change.problems.length === 0).length
    const incomplete = changes.length - ready
    expect(incomplete).toBeGreaterThan(0)
    expect(await getPendingCounts(ctx)).toEqual({ ready, incomplete })
    expect(await getPublishStatus(ctx)).toEqual({ latest: null, counts: { ready, incomplete } })
  })
})

describe('publish targets', () => {
  it('report through the context logger', async () => {
    db.tables.publish_log.push(logRow(1))
    ctx = { ...ctx, publishTarget: target(async ({ logger }) => { logger.error('[test] hook noted'); return { ok: true, jobId: null } }) }
    expect(await triggerBuild(ctx, 1)).toBe('building')
    expect(ctx.logger.error).toHaveBeenCalledWith('[test] hook noted')
  })
})

describe('getPublishHistory', () => {
  it('names who published and each item, and leaves purged ones without a title', async () => {
    db.tables.documents.push(document(1, 'posts', completePost('Casa', 'casa')))
    db.tables.publish_log.push(logRow(1, {
      requested_by: ID(90), build_status: 'failed', error_code: 'hook_refused', error_detail: '503',
      items: [{ id: ID(1), type: 'posts', action: 'publish' }, { id: ID(8), type: 'posts', action: 'unpublish' }]
    }))
    expect(await getPublishHistory(ctx)).toEqual([expect.objectContaining({
      requestedBy: 'Ana', errorCode: 'hook_refused', errorDetail: '503',
      items: [{ id: ID(1), action: 'publish', title: 'Casa' }, { id: ID(8), action: 'unpublish', title: null }]
    })])
  })
})
