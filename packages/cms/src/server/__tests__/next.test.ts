import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ACTION_NAMES } from '../../../cli/routes.js'
import { defineCmsConfig } from '../../core/config'
import { page, singleton } from '../../core/define'
import { text, textarea } from '../../core/fields'
import { amplify } from '../../publish/amplify'
import { mockBuild } from '../../publish/mock'
import { createCmsServer } from '../next'
import { createFakeDb, fakeClient, signIn } from './fakeSupabase'
import type { FakeDbType } from './fakeSupabase'

const state = vi.hoisted(() => ({
  db: null as unknown,
  draft: false,
  redirect: vi.fn((to: string) => { throw new Error(`NEXT_REDIRECT ${to}`) }),
  clients: [] as { url: string, key: string, options: Record<string, unknown> }[]
}))

vi.mock('react', () => ({ cache: <T>(fn: T) => fn }))
vi.mock('next/headers', () => ({
  cookies: async () => ({ getAll: () => [], set: () => {} }),
  draftMode: async () => ({ isEnabled: state.draft, enable: () => {}, disable: () => {} })
}))
vi.mock('next/navigation', () => ({ redirect: state.redirect }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@supabase/ssr', () => ({ createServerClient: () => fakeClient(state.db as FakeDbType) }))
vi.mock('@supabase/supabase-js', () => ({
  createClient: (url: string, key: string, options: Record<string, unknown>) => {
    state.clients.push({ url, key, options })
    return fakeClient(state.db as FakeDbType)
  }
}))

const config = defineCmsConfig({ schema: {} })
const supabase = { url: 'http://127.0.0.1:54421', publishableKey: 'pk', secretKey: 'sk' }

const webhook = (authorization: string) => new Request('http://localhost/api/cms/build-status', {
  method: 'POST',
  headers: { authorization },
  body: JSON.stringify({ detail: { jobId: 'job-1', jobStatus: 'SUCCEED' } })
})

let db: FakeDbType

beforeEach(() => {
  db = createFakeDb()
  state.db = db
  state.draft = false
  state.redirect.mockClear()
})

describe('createCmsServer', () => {
  it('turns the server layer redirects into Next redirects', async () => {
    const cms = createCmsServer({ config, supabase })
    await expect(cms.actions.saveDocument({ entryId: 'x', id: null, patch: {}, base: {} })).rejects.toThrow('NEXT_REDIRECT /dashboard/auth/signout?error=sesion')
    expect(state.redirect).toHaveBeenCalledWith('/dashboard/auth/signout?error=sesion')
  })

  it('needs the Supabase settings only when it is used', async () => {
    const cms = createCmsServer({ config, supabase: { url: undefined, publishableKey: undefined, secretKey: undefined } })
    await expect(cms.queries.listPages()).rejects.toThrow('Missing the Supabase URL')
  })

  it('applies build events that arrive with the shared secret', async () => {
    db.tables.publish_log.push({ id: 1, requested_at: new Date().toISOString(), build_status: 'building', job_id: 'job-1' })
    const cms = createCmsServer({ config, supabase, publishTarget: amplify({ hookUrl: 'https://hooks.example', webhookSecret: 's3cret' }) })

    expect((await cms.handlers.buildStatus(webhook('Bearer nope'))).status).toBe(401)
    const response = await cms.handlers.buildStatus(webhook('Bearer s3cret'))
    expect(await response.json()).toEqual({ matched: true })
    expect(db.tables.publish_log[0].build_status).toBe('success')
  })

  it('stamps every detached read with the build, so a build never reuses the fetch cache of the previous one', async () => {
    db.tables.publish_log.push({ id: 1, requested_at: new Date().toISOString(), build_status: 'building', job_id: 'job-1' })
    const cms = createCmsServer({ config, supabase, publishTarget: amplify({ hookUrl: 'https://hooks.example', webhookSecret: 's3cret' }) })
    process.env.CMS_BUILD_STAMP = 'build-1'
    try {
      state.clients.length = 0
      await cms.handlers.buildStatus(webhook('Bearer s3cret'))
      expect(state.clients.at(-1)).toMatchObject({ key: 'sk', options: { global: { headers: { 'x-cms-build': 'build-1' } } } })
    } finally {
      delete process.env.CMS_BUILD_STAMP
    }
    await cms.handlers.buildStatus(webhook('Bearer s3cret'))
    const stamp = (state.clients.at(-1)?.options.global as { headers: Record<string, string> }).headers['x-cms-build']
    expect(stamp).toMatch(/^[0-9a-z]+$/)
    expect(stamp).not.toBe('build-1')
  })

  it('treats the simulated build as missing against a hosted project, and says why once', async () => {
    const error = vi.fn()
    const hosted = { ...supabase, url: 'https://abc.supabase.co' }
    const cms = createCmsServer({ config, supabase: hosted, publishTarget: mockBuild(), logger: { error } })
    db.tables.publish_log.push({ id: 1, requested_at: new Date().toISOString(), build_status: 'pending', job_id: null })
    await cms.handlers.buildStatus(webhook('Bearer x'))
    await cms.queries.getPublishHistory()
    await cms.queries.getPublishHistory()
    expect(error).toHaveBeenCalledTimes(1)
    expect(error.mock.calls[0][0]).toContain('mockBuild({ allowRemote: true })')

    const insisting = createCmsServer({ config, supabase: hosted, publishTarget: mockBuild({ allowRemote: true }), logger: { error: vi.fn() } })
    expect(insisting).toBeTruthy()
  })

  it('has no webhook when the target reports in-process', async () => {
    const cms = createCmsServer({ config, supabase, publishTarget: mockBuild() })
    expect((await cms.handlers.buildStatus(webhook('Bearer x'))).status).toBe(404)
  })

  it('sends signed-out users to sign in and signed-in ones past the guest screens', async () => {
    const cms = createCmsServer({ config, supabase })
    const request = (path: string) => new NextRequest(`http://localhost${path}`)

    db.claims = null as unknown as Record<string, unknown>
    expect((await cms.proxy(request('/dashboard/paginas?x=1'))).headers.get('location')).toBe('http://localhost/dashboard/login?next=%2Fdashboard%2Fpaginas%3Fx%3D1')
    expect((await cms.proxy(request('/dashboard'))).headers.get('location')).toBe('http://localhost/dashboard/login')
    expect((await cms.proxy(request('/dashboard/login'))).headers.get('location')).toBeNull()
    expect((await cms.proxy(request('/dashboard/auth/confirm'))).headers.get('location')).toBeNull()

    db.claims = { sub: 'u1' }
    expect((await cms.proxy(request('/dashboard/login'))).headers.get('location')).toBe('http://localhost/dashboard')
    expect((await cms.proxy(request('/dashboard/paginas'))).headers.get('location')).toBeNull()
  })

  it('lands email links on their fixed screen of the public host', async () => {
    const verifyOtp = vi.fn(async ({ token_hash }: { token_hash: string }) => ({ error: token_hash === 'old' ? { code: 'otp_expired' } : null }))
    db.authApi = { verifyOtp }
    const cms = createCmsServer({ config, supabase })
    const confirm = async (query: string) => (await cms.handlers.authConfirm(new Request(`https://localhost:3000/dashboard/auth/confirm?${query}`))).headers.get('location')

    expect(await confirm('token_hash=t1&type=invite')).toBe('/dashboard/invitacion')
    expect(await confirm('token_hash=t1&type=recovery')).toBe('/dashboard/restablecer-contrasena')
    expect(await confirm('token_hash=old&type=recovery')).toBe('/dashboard/login?error=link-vencido')
    expect(await confirm('token_hash=t1&type=signup')).toBe('/dashboard/login?error=link-invalido')
    expect(verifyOtp).toHaveBeenCalledTimes(3)
  })

  it('signs out with a reason the sign-in screen knows', async () => {
    const cms = createCmsServer({ config, supabase })
    const signout = async (query: string) => (await cms.handlers.signout(new Request(`https://localhost:3000/dashboard/auth/signout${query}`))).headers.get('location')

    expect(await signout('?error=sesion')).toBe('/dashboard/login?error=sesion')
    expect(await signout('?error=<script>')).toBe('/dashboard/login?error=inactivo')
    expect(await signout('')).toBe('/dashboard/login?error=inactivo')
  })

  it('enters and leaves Draft Mode on the public host', async () => {
    signIn(db, { id: 'u1' })
    const cms = createCmsServer({ config, supabase })
    const internal = (path: string) => new Request(`https://localhost:3000${path}`)

    const entered = await cms.handlers.draft(internal('/api/cms/draft?path=/blog/hola'))
    expect([entered.status, entered.headers.get('location')]).toEqual([303, '/blog/hola'])
    expect((await cms.handlers.disableDraft(internal('/api/cms/disable-draft'))).headers.get('location')).toBe('/')
  })

  it('lists for the CLI every action the project re-exports', () => {
    expect(Object.keys(createCmsServer({ config, supabase }).actions).sort()).toEqual([...ACTION_NAMES].sort())
  })

  it('hands the browser only the public Supabase settings', () => {
    expect(createCmsServer({ config, supabase }).browserSupabase()).toEqual({ url: supabase.url, publishableKey: 'pk' })
  })

  describe('site in Draft Mode', () => {
    const homeConfig = defineCmsConfig({ schema: { home: page('Inicio', { title: text({ label: 'Título' }) }, { path: '/' }) } })
    const readsDraft = async () => (await createCmsServer({ config: homeConfig, supabase }).site.getEntryContent('home')).draft

    beforeEach(() => {
      db.tables.published_documents.push({ id: 'h', type: 'home', key: 'home', slug: null, slugs: {}, paths: { es: '/' }, sort_order: 0, published_at: '', data: { title: { es: 'Publicado' } } })
      db.tables.documents.push({ id: 'h', type: 'home', key: 'home', slugs: {}, deleted_at: null, visible: true, data: { title: { es: 'Borrador' } } })
      signIn(db, { id: 'u1' })
      state.draft = true
    })

    it('shows drafts to an active panel user', async () => {
      expect(await readsDraft()).toBe(true)
    })

    it('shows the published site to a deactivated user whose preview cookie is still alive', async () => {
      db.tables.profiles[0].active = false
      expect(await readsDraft()).toBe(false)
    })

    it('shows the published site while the second factor is pending or without a session', async () => {
      db.user = { id: 'u1', factors: [{ id: 'f', status: 'verified', created_at: '' }] }
      expect(await readsDraft()).toBe(false)
      db.user = null
      expect(await readsDraft()).toBe(false)
    })

    it('does not read the session outside Draft Mode', async () => {
      state.draft = false
      const getUser = vi.fn(() => null)
      Object.defineProperty(db, 'user', { get: getUser })
      expect(await readsDraft()).toBe(false)
      expect(getUser).not.toHaveBeenCalled()
    })
  })

  it('fills the page metadata with the site defaults, in the page language', async () => {
    const schema = {
      settings: singleton('Sitio', { tagline: textarea({ label: 'Descripción corta' }) }),
      home: page('Inicio', { title: text({ label: 'Título' }) }, { path: '/' })
    }
    const sited = defineCmsConfig({ schema, locales: ['es', 'en'], site: { defaults: { entry: 'settings', description: 'tagline' } } })
    db.tables.published_documents.push(
      { id: 's', type: 'settings', key: 'settings', slug: null, slugs: {}, paths: {}, sort_order: 0, published_at: '', data: { tagline: { es: 'Salud mental', en: 'Mental health' } } },
      { id: 'h', type: 'home', key: 'home', slug: null, slugs: {}, paths: { es: '/', en: '/en' }, sort_order: 0, published_at: '', data: { title: { es: 'Hola', en: 'Hello' } } }
    )
    const cms = createCmsServer({ config: sited, supabase })
    const metadata = await cms.site.metadata(await cms.site.getEntryContent('home', { locale: 'en' }))
    expect(metadata).toMatchObject({ description: 'Mental health', openGraph: { description: 'Mental health', locale: 'en' } })
  })

  it('hands the project the request client and, with the secret key, the admin one', async () => {
    signIn(db, { id: 'u1' })
    const cms = createCmsServer({ config, supabase })
    expect((await (await cms.supabase()).from('profiles').select('id')).data).toMatchObject([{ id: 'u1' }])
    expect((await cms.supabaseAdmin().from('profiles').select('id')).data).toMatchObject([{ id: 'u1' }])
    expect(() => createCmsServer({ config, supabase: { ...supabase, secretKey: undefined } }).supabaseAdmin()).toThrow('Missing the Supabase secret key')
  })

  it('reports through the project logger, console by default', async () => {
    const logger = { error: vi.fn() }
    expect((await createCmsServer({ config, supabase, logger }).context()).logger).toBe(logger)
    expect((await createCmsServer({ config, supabase }).context()).logger.error).toBeTypeOf('function')
  })
})
