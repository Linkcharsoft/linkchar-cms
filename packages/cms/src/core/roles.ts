export type RoleType = 'editor' | 'admin' | 'superadmin'

export const ROLES: readonly RoleType[] = ['editor', 'admin', 'superadmin']

const ROLE_LEVEL: Record<RoleType, number> = { editor: 0, admin: 1, superadmin: 2 }

export const isRole = (value: unknown): value is RoleType => typeof value === 'string' && (ROLES as readonly string[]).includes(value)

export const hasRole = (role: RoleType, minRole: RoleType) => ROLE_LEVEL[role] >= ROLE_LEVEL[minRole]

// Admins publish by role; the flag only means something for editors.
export const canPublish = (profile: { role: RoleType, can_publish: boolean }) => profile.can_publish || hasRole(profile.role, 'admin')

export interface ManagedUserRefType {
  id: string
  role: RoleType
}

// Mirrors private.guard_profile_privileges for the Admin API calls (ban, MFA reset, delete), which bypass it.
export const canManageUser = (actor: ManagedUserRefType, target: ManagedUserRefType) =>
  actor.id !== target.id
  && (actor.role === 'superadmin' || (actor.role === 'admin' && target.role !== 'superadmin'))

export const assignableRoles = (actorRole: RoleType): RoleType[] =>
  actorRole === 'superadmin' ? ['editor', 'admin', 'superadmin'] : actorRole === 'admin' ? ['editor', 'admin'] : []

export type UserStatusType = 'active' | 'invited' | 'inactive'

export const userStatus = ({ active, lastSignInAt }: { active: boolean, lastSignInAt: string | null }): UserStatusType =>
  !active ? 'inactive' : lastSignInAt ? 'active' : 'invited'

export interface MfaFactorRefType {
  id: string
  status: string
  friendly_name?: string
  created_at: string
}

export interface MfaDeviceType {
  id: string
  name: string
  createdAt: string
}

export const verifiedDevices = (factors: MfaFactorRefType[] | undefined): MfaDeviceType[] =>
  (factors ?? [])
    .filter(factor => factor.status === 'verified')
    .map(factor => ({ id: factor.id, name: factor.friendly_name ?? '', createdAt: factor.created_at }))

// Mirrors private.mfa_satisfied(): any verified factor makes the second step mandatory for the session.
export const needsSecondFactor = (factors: MfaFactorRefType[] | undefined, aal: string | undefined) =>
  verifiedDevices(factors).length > 0 && aal !== 'aal2'
