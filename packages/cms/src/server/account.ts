import { validateChangePassword, validateProfile } from '../core/forms'
import { isAvatarPath, MEDIA_BUCKET } from '../core/media'
import { logActivity } from './activity'
import { requireRole } from './auth'
import { passwordError } from './session'
import type { CmsContextType } from './context'
import type { SessionResultType } from './session'

// Tour ids come from the panel; the database caps how many a profile keeps.
const TOUR_ID = /^[a-z0-9-]{1,40}$/

export const updateProfile = async (ctx: CmsContextType, values: unknown): Promise<SessionResultType> => {
  const { user } = await requireRole(ctx)
  const { value } = validateProfile(values)
  if (!value) return { error: 'errors.invalidData' }

  const { error } = await ctx.db.from('profiles').update({ name: value.name }).eq('id', user.id)
  if (error) return { error: 'errors.account.nameFailed' }

  await logActivity(ctx.db, 'profile.update', null, { name: value.name })
  return {}
}

// The new photo is already in Storage (uploaded by the browser); null removes it.
export const updateAvatar = async (ctx: CmsContextType, avatar: string | null): Promise<SessionResultType> => {
  const { user, profile } = await requireRole(ctx)
  if (avatar !== null && !isAvatarPath(avatar, user.id)) return { error: 'errors.account.invalidPhoto' }

  const { error } = await ctx.db.from('profiles').update({ avatar }).eq('id', user.id)

  // Editors can't delete Storage objects: the service role removes the unused photo, only inside the user's folder.
  const unused = error ? avatar : profile.avatar
  if (unused && unused !== (error ? null : avatar) && isAvatarPath(unused, user.id)) {
    await ctx.admin().storage.from(MEDIA_BUCKET).remove([unused])
  }
  if (error) return { error: 'errors.account.photoFailed' }

  await logActivity(ctx.db, 'profile.update', null, { photo: avatar ? 'changed' : 'removed' })
  return {}
}

// Checked with a throwaway client: signing in on the cookie session would replace it (and drop it from aal2 to aal1).
const isCurrentPassword = async (ctx: CmsContextType, email: string, password: string) => {
  const probe = ctx.anonymous()
  const { error } = await probe.auth.signInWithPassword({ email, password })
  if (error) return false
  await probe.auth.signOut({ scope: 'local' })
  return true
}

export const changePassword = async (ctx: CmsContextType, values: unknown): Promise<SessionResultType> => {
  const { user } = await requireRole(ctx)
  const { value } = validateChangePassword(values)
  if (!value || !user.email) return { error: 'errors.invalidData' }
  if (!await isCurrentPassword(ctx, user.email, value.currentPassword)) return { error: 'errors.account.wrongPassword' }

  const { error } = await ctx.db.auth.updateUser({ password: value.password })
  if (error) return { error: passwordError(error.code) }

  if (value.signOutOthers) await ctx.db.auth.signOut({ scope: 'others' })

  await logActivity(ctx.db, 'auth.password_change', null, { signOutOthers: value.signOutOthers })
  return {}
}

// MFA runs in the browser (Supabase Auth API); this only records it once the change is done.
export const recordMfaChange = async (ctx: CmsContextType, change: 'enroll' | 'unenroll', device: string): Promise<SessionResultType> => {
  await requireRole(ctx)
  await logActivity(ctx.db, change === 'enroll' ? 'auth.mfa_enroll' : 'auth.mfa_unenroll', null, { device: String(device).slice(0, 60) })
  return {}
}

// Finishing or closing a tour marks it, so it doesn't start on its own again.
export const markTourSeen = async (ctx: CmsContextType, tourId: string): Promise<SessionResultType> => {
  const { user, profile } = await requireRole(ctx)
  if (!TOUR_ID.test(tourId) || profile.seen_tours.includes(tourId)) return {}

  await ctx.db.from('profiles').update({ seen_tours: [...profile.seen_tours, tourId].slice(-20) }).eq('id', user.id)
  return {}
}

export const resetTours = async (ctx: CmsContextType): Promise<SessionResultType> => {
  const { user } = await requireRole(ctx)
  const { error } = await ctx.db.from('profiles').update({ seen_tours: [] }).eq('id', user.id)
  return error ? { error: 'errors.account.toursFailed' } : {}
}
