import { beforeEach, describe, expect, it } from 'vitest'
import { assignableRoles, canManageUser, canPublish, needsSecondFactor, userStatus } from '../../core/roles'
import { openedFromEmailLink, requireRole } from '../auth'
import { CmsRedirect } from '../context'
import { createFakeDb, fakeContext, signIn } from './fakeSupabase'
import type { FakeDbType } from './fakeSupabase'

const USER = '00000000-0000-0000-0000-0000000000a1'

let db: FakeDbType

beforeEach(() => {
  db = createFakeDb()
})

const redirectOf = async (promise: Promise<unknown>) => {
  const error = await promise.catch((caught: unknown) => caught)
  return error instanceof CmsRedirect ? error.to : null
}

describe('requireRole', () => {
  it('returns the signed-in user and profile', async () => {
    signIn(db, { id: USER, role: 'admin' })
    const { profile } = await requireRole(fakeContext(db), 'admin')
    expect(profile.role).toBe('admin')
  })

  it('sends visitors to sign out, and inactive users too', async () => {
    expect(await redirectOf(requireRole(fakeContext(db)))).toBe('/dashboard/auth/signout?error=sesion')
    signIn(db, { id: USER, active: false })
    expect(await redirectOf(requireRole(fakeContext(db)))).toBe('/dashboard/auth/signout')
  })

  it('asks for the second step when the user has a verified device', async () => {
    signIn(db, { id: USER })
    db.user!.factors = [{ id: 'f1', status: 'verified', created_at: '2026-10-01' }]
    expect(await redirectOf(requireRole(fakeContext(db)))).toBe('/dashboard/verificacion')
    db.claims = { aal: 'aal2' }
    expect(await redirectOf(requireRole(fakeContext(db)))).toBeNull()
  })

  it('sends a user without the role to the panel home', async () => {
    signIn(db, { id: USER, role: 'editor' })
    expect(await redirectOf(requireRole(fakeContext(db), 'admin'))).toBe('/dashboard')
  })

  it('reads the profile once per context', async () => {
    signIn(db, { id: USER, role: 'admin' })
    const ctx = fakeContext(db)
    await requireRole(ctx)
    db.tables.profiles[0].role = 'editor'
    expect((await requireRole(ctx, 'admin')).profile.role).toBe('admin')
  })
})

describe('openedFromEmailLink', () => {
  it('accepts only recent email OTP sign-ins', async () => {
    const ctx = fakeContext(db)
    const now = ctx.now().getTime() / 1000
    db.claims = { amr: [{ method: 'otp', timestamp: now - 60 }] }
    expect(await openedFromEmailLink(ctx)).toBe(true)
    db.claims = { amr: [{ method: 'otp', timestamp: now - 7200 }] }
    expect(await openedFromEmailLink(ctx)).toBe(false)
    db.claims = { amr: [{ method: 'password', timestamp: now }] }
    expect(await openedFromEmailLink(ctx)).toBe(false)
  })
})

describe('role rules', () => {
  it('lets admins publish by role and editors by permission', () => {
    expect(canPublish({ role: 'admin', can_publish: false })).toBe(true)
    expect(canPublish({ role: 'editor', can_publish: true })).toBe(true)
    expect(canPublish({ role: 'editor', can_publish: false })).toBe(false)
  })

  it('mirrors who may manage whom', () => {
    expect(canManageUser({ id: 'a', role: 'admin' }, { id: 'b', role: 'editor' })).toBe(true)
    expect(canManageUser({ id: 'a', role: 'admin' }, { id: 'b', role: 'superadmin' })).toBe(false)
    expect(canManageUser({ id: 'a', role: 'superadmin' }, { id: 'a', role: 'superadmin' })).toBe(false)
    expect(assignableRoles('admin')).toEqual(['editor', 'admin'])
    expect(assignableRoles('editor')).toEqual([])
  })

  it('derives the user status and the second step', () => {
    expect(userStatus({ active: true, lastSignInAt: null })).toBe('invited')
    expect(userStatus({ active: false, lastSignInAt: '2026-10-01' })).toBe('inactive')
    expect(needsSecondFactor([{ id: 'f', status: 'unverified', created_at: '' }], 'aal1')).toBe(false)
    expect(needsSecondFactor([{ id: 'f', status: 'verified', created_at: '' }], 'aal1')).toBe(true)
  })
})
