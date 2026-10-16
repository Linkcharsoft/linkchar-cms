import { beforeEach, describe, expect, it, vi } from 'vitest'
import { changePassword, markTourSeen, updateAvatar, updateProfile } from '../account'
import { CmsRedirect } from '../context'
import { login, logout, updatePassword } from '../session'
import { inviteUser, resendInvite, setUserActive, updateUserAccess } from '../users'
import { createFakeDb, fakeContext, signIn } from './fakeSupabase'
import type { FakeDbType } from './fakeSupabase'

const ID = (n: number) => `6f1c3b2a-9999-4c1d-9e0f-${String(n).padStart(12, '0')}`
const ADMIN = ID(1)
const EDITOR = ID(2)
const SUPER = ID(3)

let db: FakeDbType

const account = (id: string, extra: Record<string, unknown> = {}) => ({
  id, email: `${id.slice(-2)}@estudio.test`, last_sign_in_at: '2026-10-01T00:00:00Z', created_at: '2026-09-01T00:00:00Z', factors: [], ...extra
})

beforeEach(() => {
  db = createFakeDb()
  signIn(db, { id: ADMIN, role: 'admin', name: 'Ana' })
  db.tables.profiles.push(
    { id: EDITOR, name: 'Bruno', role: 'editor', can_publish: false, active: true, seen_tours: [], avatar: null },
    { id: SUPER, name: 'Carla', role: 'superadmin', can_publish: false, active: true, seen_tours: [], avatar: null }
  )
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('login', () => {
  const credentials = { email: ' ana@estudio.test ', password: 'secreta12345' }

  it('signs in, logs it and goes to the panel', async () => {
    const signInWithPassword = vi.fn(async () => ({ data: { user: { id: ADMIN, factors: [] } }, error: null }))
    db.authApi = { signInWithPassword }
    expect(await login(fakeContext(db), credentials)).toEqual({ redirectTo: '/dashboard' })
    expect(signInWithPassword).toHaveBeenCalledWith({ email: 'ana@estudio.test', password: 'secreta12345' })
    expect(db.tables.activity_log[0].action).toBe('auth.login')
  })

  it('asks for the second step before logging the sign-in', async () => {
    db.authApi = { signInWithPassword: async () => ({ data: { user: { id: ADMIN, factors: [{ id: 'f', status: 'verified', created_at: '' }] } }, error: null }) }
    expect(await login(fakeContext(db), credentials)).toEqual({ redirectTo: '/dashboard/verificacion' })
    expect(db.tables.activity_log).toEqual([])
  })

  it('explains why it could not sign in', async () => {
    db.authApi = { signInWithPassword: async () => ({ data: {}, error: { code: 'invalid_credentials' } }) }
    expect(await login(fakeContext(db), credentials)).toEqual({ error: 'errors.auth.wrongCredentials' })
    db.authApi = { signInWithPassword: async () => ({ data: {}, error: { code: 'user_banned' } }) }
    expect(await login(fakeContext(db), credentials)).toEqual({ error: 'errors.auth.inactive' })
    expect(await login(fakeContext(db), { email: 'no', password: '' })).toEqual({ error: 'errors.invalidData' })
  })

  it('signs out a deactivated user right away', async () => {
    const signOut = vi.fn(async () => ({ error: null }))
    db.tables.profiles[0].active = false
    db.authApi = { signInWithPassword: async () => ({ data: { user: { id: ADMIN, factors: [] } }, error: null }), signOut }
    expect(await login(fakeContext(db), credentials)).toEqual({ error: 'errors.auth.inactive' })
    expect(signOut).toHaveBeenCalled()
  })

  it('logs out to the sign-in page', async () => {
    await expect(logout(fakeContext(db))).rejects.toEqual(new CmsRedirect('/dashboard/login'))
  })
})

describe('updatePassword', () => {
  it('only works from an email link, and explains weak passwords', async () => {
    const values = { password: 'nueva123456', confirmPassword: 'nueva123456' }
    expect(await updatePassword(fakeContext(db), values)).toEqual({ error: 'errors.auth.linkRequired' })
    db.claims = { amr: [{ method: 'otp', timestamp: Date.now() / 1000 }] }
    db.authApi = { updateUser: async () => ({ error: { code: 'weak_password' } }) }
    expect(await updatePassword(fakeContext(db), values)).toEqual({ error: 'errors.account.weakPassword' })
  })
})

describe('inviteUser', () => {
  const invite = { email: 'Nuevo@Estudio.test', name: 'Nuevo', role: 'editor', canPublish: true }

  it('invites by email and sets the access with the admin session', async () => {
    const inviteUserByEmail = vi.fn(async () => ({ data: { user: account(ID(9), { last_sign_in_at: null, created_at: new Date().toISOString() }) }, error: null }))
    db.adminApi = { listUsers: async () => ({ data: { users: [] }, error: null }), inviteUserByEmail }
    db.tables.profiles.push({ id: ID(9), name: '', role: 'editor', can_publish: false, active: true, seen_tours: [] })

    expect(await inviteUser(fakeContext(db), invite)).toEqual({})
    expect(inviteUserByEmail).toHaveBeenCalledWith('nuevo@estudio.test', { data: { name: 'Nuevo' } })
    expect(db.tables.profiles.find(row => row.id === ID(9))).toMatchObject({ role: 'editor', can_publish: true })
    expect(db.tables.activity_log[0]).toMatchObject({ action: 'user.invite', details: { email: 'nuevo@estudio.test', role: 'editor' } })
  })

  it('never re-sends an invite to an existing email', async () => {
    const inviteUserByEmail = vi.fn()
    db.adminApi = { listUsers: async () => ({ data: { users: [account(ID(9), { email: 'nuevo@estudio.test' })] }, error: null }), inviteUserByEmail }
    expect(await inviteUser(fakeContext(db), invite)).toEqual({ error: 'errors.users.emailTaken' })
    expect(inviteUserByEmail).not.toHaveBeenCalled()
  })

  it('lets admins assign up to their own role', async () => {
    expect(await inviteUser(fakeContext(db), { ...invite, role: 'superadmin' })).toEqual({ error: 'errors.users.forbidden' })
  })

  it('undoes an invite this call created when the profile refuses the access', async () => {
    const deleteUser = vi.fn(async () => ({ error: null }))
    db.adminApi = {
      listUsers: async () => ({ data: { users: [] }, error: null }),
      inviteUserByEmail: async () => ({ data: { user: account(ID(9), { last_sign_in_at: null, created_at: new Date().toISOString() }) }, error: null }),
      deleteUser
    }
    expect(await inviteUser(fakeContext(db), invite)).toEqual({ error: 'errors.users.forbidden' })
    expect(deleteUser).toHaveBeenCalledWith(ID(9))
  })
})

describe('managing users', () => {
  beforeEach(() => {
    db.adminApi = {
      getUserById: async (id: never) => ({ data: { user: account(id) }, error: null }),
      updateUserById: vi.fn(async () => ({ error: null })),
      inviteUserByEmail: vi.fn()
    }
  })

  it('keeps admins away from superadmins and from themselves', async () => {
    expect(await updateUserAccess(fakeContext(db), SUPER, { role: 'editor', canPublish: false })).toEqual({ error: 'errors.users.forbidden' })
    expect(await setUserActive(fakeContext(db), ADMIN, false)).toEqual({ error: 'errors.users.forbidden' })
  })

  it('changes the role and the publish permission of editors only', async () => {
    expect(await updateUserAccess(fakeContext(db), EDITOR, { role: 'admin', canPublish: true })).toEqual({})
    expect(db.tables.profiles.find(row => row.id === EDITOR)).toMatchObject({ role: 'admin', can_publish: false })
  })

  it('bans deactivated users so their sessions end', async () => {
    expect(await setUserActive(fakeContext(db), EDITOR, false)).toEqual({})
    expect(db.adminApi.updateUserById).toHaveBeenCalledWith(EDITOR, { ban_duration: '876000h' })
    expect(db.tables.activity_log[0].action).toBe('user.deactivate')
  })

  it('re-sends only pending invites', async () => {
    expect(await resendInvite(fakeContext(db), EDITOR)).toEqual({ error: 'errors.users.alreadySignedIn' })
  })

  it('is for admins', async () => {
    signIn(db, { id: EDITOR, role: 'editor' })
    await expect(setUserActive(fakeContext(db), SUPER, false)).rejects.toBeInstanceOf(CmsRedirect)
  })
})

describe('account', () => {
  it('renames the user', async () => {
    expect(await updateProfile(fakeContext(db), { name: ' Ana María ' })).toEqual({})
    expect(db.tables.profiles.find(row => row.id === ADMIN)?.name).toBe('Ana María')
  })

  it('checks the current password with a separate client', async () => {
    const probe = vi.fn(async () => ({ error: { code: 'invalid_credentials' } }))
    db.authApi = { signInWithPassword: probe }
    db.user = { id: ADMIN, factors: [], email: 'ana@estudio.test' } as never
    const values = { currentPassword: 'vieja', password: 'nueva123456', confirmPassword: 'nueva123456', signOutOthers: true }
    expect(await changePassword(fakeContext(db), values)).toEqual({ error: 'errors.account.wrongPassword' })
    expect(probe).toHaveBeenCalledWith({ email: 'ana@estudio.test', password: 'vieja' })
  })

  it('accepts only photos inside the user folder', async () => {
    expect(await updateAvatar(fakeContext(db), `avatars/${EDITOR}/${ID(7)}.webp`)).toEqual({ error: 'errors.account.invalidPhoto' })
    expect(await updateAvatar(fakeContext(db), `avatars/${ADMIN}/${ID(7)}.webp`)).toEqual({})
  })

  it('remembers each tour once', async () => {
    await markTourSeen(fakeContext(db), 'welcome')
    await markTourSeen(fakeContext(db), 'welcome')
    await markTourSeen(fakeContext(db), 'Not a tour!')
    expect(db.tables.profiles.find(row => row.id === ADMIN)?.seen_tours).toEqual(['welcome'])
  })
})
