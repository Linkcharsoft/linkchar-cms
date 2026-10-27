import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { createSuperadmin, readEnvFile } from '../admin.js'
import type { AdminClientType } from '../admin.js'

const fakeClient = (users: { id: string, email: string }[] = [], profile: { id: string } | null = { id: 'u1' }) => {
  const update = vi.fn(() => ({ eq: () => ({ select: () => ({ maybeSingle: async () => ({ data: profile, error: null }) }) }) }))
  const admin = {
    listUsers: vi.fn(async () => ({ data: { users }, error: null })),
    createUser: vi.fn(async () => ({ data: { user: { id: 'u1' } }, error: null })),
    inviteUserByEmail: vi.fn(async () => ({ data: { user: { id: 'u1' } }, error: null })),
    updateUserById: vi.fn(async () => ({ error: null }))
  }
  return { client: { auth: { admin }, from: () => ({ update }) } as unknown as AdminClientType, admin, update }
}

describe('createSuperadmin', () => {
  it('creates a confirmed user with the password and promotes its profile', async () => {
    const { client, admin, update } = fakeClient()
    expect(await createSuperadmin(client, { email: 'ana@acme.com', password: 'Secreta123', name: 'Ana' })).toEqual({ status: 'created', userId: 'u1' })
    expect(admin.createUser).toHaveBeenCalledWith({ email: 'ana@acme.com', password: 'Secreta123', email_confirm: true, user_metadata: { name: 'Ana' } })
    expect(update).toHaveBeenCalledWith({ role: 'superadmin', can_publish: true, active: true, name: 'Ana' })
  })

  it('invites by email when there is no password', async () => {
    const { client, admin } = fakeClient()
    expect((await createSuperadmin(client, { email: 'ana@acme.com' })).status).toBe('invited')
    expect(admin.inviteUserByEmail).toHaveBeenCalledWith('ana@acme.com', { data: { name: '' } })
    expect(admin.createUser).not.toHaveBeenCalled()
  })

  it('promotes a user that already exists, whatever the case of the email, and confirms it along with the password', async () => {
    const { client, admin, update } = fakeClient([{ id: 'u1', email: 'Ana@Acme.com' }])
    expect((await createSuperadmin(client, { email: 'ana@acme.com', password: 'Otra12345' })).status).toBe('promoted')
    expect(admin.updateUserById).toHaveBeenCalledWith('u1', { password: 'Otra12345', email_confirm: true })
    expect(admin.inviteUserByEmail).not.toHaveBeenCalled()
    expect(update).toHaveBeenCalledWith({ role: 'superadmin', can_publish: true, active: true })
  })

  it('explains a database without the package migrations', async () => {
    const { client } = fakeClient([], null)
    await expect(createSuperadmin(client, { email: 'ana@acme.com', password: 'x' })).rejects.toThrow('are the package migrations applied?')
    await expect(createSuperadmin(client, { email: 'ana' })).rejects.toThrow('is not an email address')
  })
})

describe('readEnvFile', () => {
  it('reads plain and quoted values and skips comments', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'cms-env-'))
    await writeFile(join(dir, '.env.local'), '# local\nNEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:44421\r\nSUPABASE_SECRET_KEY="sb_secret_x"\nexport NAME=\'Acme\'\n')
    expect(await readEnvFile(join(dir, '.env.local'))).toEqual({ NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:44421', SUPABASE_SECRET_KEY: 'sb_secret_x', NAME: 'Acme' })
    expect(await readEnvFile(join(dir, 'missing'))).toEqual({})
    await rm(dir, { recursive: true, force: true })
  })
})
