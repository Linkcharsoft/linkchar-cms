import { validateInviteUser, validateUserAccess } from '../core/forms'
import { assignableRoles, canManageUser, userStatus, verifiedDevices } from '../core/roles'
import { logActivity } from './activity'
import { requireRole } from './auth'
import type { CmsContextType } from './context'
import type { SessionResultType } from './session'
import type { UserAccessFormType } from '../core/forms'
import type { MessageKeyType } from '../core/i18n/types'
import type { RoleType, UserStatusType } from '../core/roles'

export interface PanelUserType {
  id: string
  email: string
  name: string
  avatar: string | null
  role: RoleType
  canPublish: boolean
  status: UserStatusType
  mfa: boolean
  lastSignInAt: string | null
  createdAt: string
}

// Supabase has no permanent ban: 100 years is close enough.
const BAN_FOREVER = '876000h'

const STATUS_ORDER: Record<UserStatusType, number> = { active: 0, invited: 1, inactive: 2 }

// Admins publish by role; the flag only means something for editors.
const accessColumns = ({ role, canPublish }: UserAccessFormType) => ({ role, can_publish: role === 'editor' && canPublish })

const inviteError = (code: string | undefined): MessageKeyType => {
  if (code === 'email_exists' || code === 'user_already_exists') return 'errors.users.emailTaken'
  if (code === 'over_email_send_rate_limit') return 'errors.users.emailRateLimit'
  return 'errors.users.inviteFailed'
}

// Emails, last sign-in and MFA live in auth.users: only the Admin API reads them.
export const listPanelUsers = async (ctx: CmsContextType): Promise<PanelUserType[]> => {
  await requireRole(ctx, 'admin')
  const [{ data: auth, error }, { data: profiles }] = await Promise.all([
    ctx.admin().auth.admin.listUsers({ perPage: 1000 }),
    ctx.db.from('profiles').select('*')
  ])
  if (error) throw new Error(`Listing users failed: ${error.message}`)

  const accounts = new Map(auth.users.map(user => [user.id, user]))
  return (profiles ?? []).flatMap(profile => {
    const account = accounts.get(profile.id)
    if (!account) return []
    const lastSignInAt = account.last_sign_in_at ?? null
    return [{
      id: profile.id,
      email: account.email ?? '',
      name: profile.name,
      avatar: profile.avatar,
      role: profile.role,
      canPublish: profile.can_publish || profile.role !== 'editor',
      status: userStatus({ active: profile.active, lastSignInAt }),
      mfa: verifiedDevices(account.factors).length > 0,
      lastSignInAt,
      createdAt: profile.created_at
    }]
  }).sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || (a.name || a.email).localeCompare(b.name || b.email, ctx.config.panelLocale))
}

// The Admin API bypasses the profile guard trigger, so every action re-checks who may manage whom.
const loadTarget = async (ctx: CmsContextType, id: string) => {
  const { user, profile } = await requireRole(ctx, 'admin')
  const { data: target } = await ctx.db.from('profiles').select('id, role, name').eq('id', id).maybeSingle()
  if (!target || !canManageUser({ id: user.id, role: profile.role }, target)) return null

  const { data } = await ctx.admin().auth.admin.getUserById(id)
  if (!data.user) return null
  return { actorRole: profile.role, target, account: data.user, email: data.user.email ?? '' }
}

const isPendingInvite = (lastSignInAt: string | null | undefined) => !lastSignInAt

export const inviteUser = async (ctx: CmsContextType, values: unknown): Promise<SessionResultType> => {
  const { profile } = await requireRole(ctx, 'admin')
  const { value } = validateInviteUser(values)
  if (!value) return { error: 'errors.invalidData' }
  if (!assignableRoles(profile.role).includes(value.role)) return { error: 'errors.users.forbidden' }

  // Supabase silently re-sends the invite (and the role would be overwritten) when the email is still pending.
  const startedAt = ctx.now().getTime() - 1000
  const admin = ctx.admin()
  const { data: existing } = await admin.auth.admin.listUsers({ perPage: 1000 })
  if (existing.users.some(account => account.email?.toLowerCase() === value.email)) return { error: inviteError('email_exists') }

  const { data, error } = await admin.auth.admin.inviteUserByEmail(value.email, { data: { name: value.name } })
  if (error || !data.user) return { error: inviteError(error?.code) }

  // Set with the admin's own session so the guard trigger applies its rules; the invite is undone if it refuses.
  const { data: updated } = await ctx.db.from('profiles').update(accessColumns(value)).eq('id', data.user.id).select('id').maybeSingle()
  if (!updated) {
    // Only undo an account this call created: a concurrent or older account is never deleted from here.
    if (!data.user.last_sign_in_at && Date.parse(data.user.created_at) >= startedAt) await admin.auth.admin.deleteUser(data.user.id)
    return { error: 'errors.users.forbidden' }
  }

  await logActivity(ctx.db, 'user.invite', null, { userId: data.user.id, email: value.email, role: value.role })
  return {}
}

export const updateUserAccess = async (ctx: CmsContextType, id: string, values: unknown): Promise<SessionResultType> => {
  const context = await loadTarget(ctx, id)
  if (!context) return { error: 'errors.users.forbidden' }
  const { value } = validateUserAccess(values)
  if (!value) return { error: 'errors.invalidData' }
  if (!assignableRoles(context.actorRole).includes(value.role)) return { error: 'errors.users.forbidden' }

  const { error } = await ctx.db.from('profiles').update(accessColumns(value)).eq('id', id)
  if (error) return { error: error.code === '42501' ? 'errors.users.forbidden' : 'errors.users.saveFailed' }

  await logActivity(ctx.db, 'user.update', null, { userId: id, email: context.email, role: value.role, canPublish: value.canPublish })
  return {}
}

export const setUserActive = async (ctx: CmsContextType, id: string, active: boolean): Promise<SessionResultType> => {
  const context = await loadTarget(ctx, id)
  if (!context) return { error: 'errors.users.forbidden' }

  const { error } = await ctx.db.from('profiles').update({ active }).eq('id', id)
  if (error) return { error: error.code === '42501' ? 'errors.users.forbidden' : 'errors.users.saveFailed' }

  // The ban also kills refresh tokens: a deactivated user is out before their current session expires.
  const { error: banError } = await ctx.admin().auth.admin.updateUserById(id, { ban_duration: active ? 'none' : BAN_FOREVER })
  if (banError) console.error('[users] ban update failed:', banError.code ?? banError.message)

  await logActivity(ctx.db, active ? 'user.reactivate' : 'user.deactivate', null, { userId: id, email: context.email })
  return {}
}

export const resendInvite = async (ctx: CmsContextType, id: string): Promise<SessionResultType> => {
  const context = await loadTarget(ctx, id)
  if (!context?.email) return { error: 'errors.users.forbidden' }
  if (!isPendingInvite(context.account.last_sign_in_at)) return { error: 'errors.users.alreadySignedIn' }

  const { error } = await ctx.admin().auth.admin.inviteUserByEmail(context.email, { data: { name: context.target.name } })
  if (error) return { error: inviteError(error.code) }

  await logActivity(ctx.db, 'user.invite_resend', null, { userId: id, email: context.email })
  return {}
}

export const deleteInvite = async (ctx: CmsContextType, id: string): Promise<SessionResultType> => {
  const context = await loadTarget(ctx, id)
  if (!context) return { error: 'errors.users.forbidden' }
  if (!isPendingInvite(context.account.last_sign_in_at)) return { error: 'errors.users.deleteSignedIn' }

  const { error } = await ctx.admin().auth.admin.deleteUser(id)
  if (error) return { error: 'errors.users.deleteInviteFailed' }

  await logActivity(ctx.db, 'user.invite_delete', null, { email: context.email })
  return {}
}

export const resetUserMfa = async (ctx: CmsContextType, id: string): Promise<SessionResultType> => {
  const context = await loadTarget(ctx, id)
  if (!context) return { error: 'errors.users.forbidden' }

  const admin = ctx.admin()
  const factors = context.account.factors ?? []
  const results = await Promise.all(factors.map(factor => admin.auth.admin.mfa.deleteFactor({ id: factor.id, userId: id })))
  if (results.some(result => result.error)) return { error: 'errors.users.mfaResetFailed' }

  await logActivity(ctx.db, 'user.mfa_reset', null, { userId: id, email: context.email, devices: factors.length })
  return {}
}
