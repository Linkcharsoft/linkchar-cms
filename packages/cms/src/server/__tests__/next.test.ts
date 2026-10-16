import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineCmsConfig } from '../../core/config'
import { amplify } from '../../publish/amplify'
import { mockBuild } from '../../publish/mock'
import { createCmsServer } from '../next'
import { createFakeDb, fakeClient } from './fakeSupabase'
import type { FakeDbType } from './fakeSupabase'

const state = vi.hoisted(() => ({ db: null as unknown, redirect: vi.fn((to: string) => { throw new Error(`NEXT_REDIRECT ${to}`) }) }))

vi.mock('react', () => ({ cache: <T>(fn: T) => fn }))
vi.mock('next/headers', () => ({ cookies: async () => ({ getAll: () => [], set: () => {} }) }))
vi.mock('next/navigation', () => ({ redirect: state.redirect }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@supabase/ssr', () => ({ createServerClient: () => fakeClient(state.db as FakeDbType) }))
vi.mock('@supabase/supabase-js', () => ({ createClient: () => fakeClient(state.db as FakeDbType) }))

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

  it('has no webhook when the target reports in-process', async () => {
    const cms = createCmsServer({ config, supabase, publishTarget: mockBuild() })
    expect((await cms.handlers.buildStatus(webhook('Bearer x'))).status).toBe(404)
  })

  it('sends signed-out users to sign in and signed-in ones past the guest screens', async () => {
    const cms = createCmsServer({ config, supabase })
    const request = (path: string) => new NextRequest(`http://localhost${path}`)

    db.claims = null as unknown as Record<string, unknown>
    expect((await cms.proxy(request('/dashboard/paginas?x=1'))).headers.get('location')).toBe('http://localhost/dashboard/login')
    expect((await cms.proxy(request('/dashboard/login'))).headers.get('location')).toBeNull()
    expect((await cms.proxy(request('/dashboard/auth/confirm'))).headers.get('location')).toBeNull()

    db.claims = { sub: 'u1' }
    expect((await cms.proxy(request('/dashboard/login'))).headers.get('location')).toBe('http://localhost/dashboard')
    expect((await cms.proxy(request('/dashboard/paginas'))).headers.get('location')).toBeNull()
  })

  it('lands email links on their fixed screen', async () => {
    const verifyOtp = vi.fn(async ({ token_hash }: { token_hash: string }) => ({ error: token_hash === 'old' ? { code: 'otp_expired' } : null }))
    db.authApi = { verifyOtp }
    const cms = createCmsServer({ config, supabase })
    const confirm = async (query: string) => (await cms.handlers.authConfirm(new Request(`http://localhost/dashboard/auth/confirm?${query}`))).headers.get('location')

    expect(await confirm('token_hash=t1&type=invite')).toBe('http://localhost/dashboard/invitacion')
    expect(await confirm('token_hash=t1&type=recovery')).toBe('http://localhost/dashboard/restablecer-contrasena')
    expect(await confirm('token_hash=old&type=recovery')).toBe('http://localhost/dashboard/login?error=link-vencido')
    expect(await confirm('token_hash=t1&type=signup')).toBe('http://localhost/dashboard/login?error=link-invalido')
    expect(verifyOtp).toHaveBeenCalledTimes(3)
  })

  it('signs out with a reason the sign-in screen knows', async () => {
    const cms = createCmsServer({ config, supabase })
    const signout = async (query: string) => (await cms.handlers.signout(new Request(`http://localhost/dashboard/auth/signout${query}`))).headers.get('location')

    expect(await signout('?error=sesion')).toBe('http://localhost/dashboard/login?error=sesion')
    expect(await signout('?error=<script>')).toBe('http://localhost/dashboard/login?error=inactivo')
    expect(await signout('')).toBe('http://localhost/dashboard/login?error=inactivo')
  })

  it('hands the browser only the public Supabase settings', () => {
    expect(createCmsServer({ config, supabase }).browserSupabase()).toEqual({ url: supabase.url, publishableKey: 'pk' })
  })
})
