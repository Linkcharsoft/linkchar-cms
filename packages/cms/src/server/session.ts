import { validateAcceptInvite, validateLogin, validatePasswordRecovery, validatePasswordReset } from '../core/forms'
import { panelPaths } from '../core/paths'
import { needsSecondFactor } from '../core/roles'
import { logActivity } from './activity'
import { openedFromEmailLink, requireRole } from './auth'
import { CmsRedirect } from './context'
import type { CmsContextType } from './context'
import type { MessageKeyType } from '../core/i18n/types'

export interface SessionResultType {
  error?: MessageKeyType
  // Navigated by the client: a redirect() inside a form submit surfaces as an unhandled NEXT_REDIRECT.
  redirectTo?: string
}

export const passwordError = (code: string | undefined): MessageKeyType => {
  if (code === 'weak_password') return 'errors.account.weakPassword'
  if (code === 'same_password') return 'errors.account.samePassword'
  return 'errors.account.passwordFailed'
}

export const login = async (ctx: CmsContextType, values: unknown): Promise<SessionResultType> => {
  const { value: credentials } = validateLogin(values)
  if (!credentials) return { error: 'errors.invalidData' }

  const { data, error } = await ctx.db.auth.signInWithPassword(credentials)
  if (error) {
    if (error.code === 'over_request_rate_limit') return { error: 'errors.auth.rateLimit' }
    if (error.code === 'user_banned') return { error: 'errors.auth.inactive' }
    return { error: 'errors.auth.wrongCredentials' }
  }

  const { data: profile } = await ctx.db.from('profiles').select('active').eq('id', data.user.id).maybeSingle()
  if (!profile?.active) {
    await ctx.db.auth.signOut()
    return { error: 'errors.auth.inactive' }
  }

  const paths = panelPaths(ctx.config)
  // With MFA the session has no role until the second step (RLS), so the login is logged after the code.
  if (needsSecondFactor(data.user.factors, 'aal1')) return { redirectTo: paths.mfaVerify }

  await logActivity(ctx.db, 'auth.login', null)
  return { redirectTo: paths.home }
}

// Always reports success so the form can't be used to find out which emails have an account.
export const requestPasswordReset = async (ctx: CmsContextType, values: unknown): Promise<SessionResultType> => {
  const { value } = validatePasswordRecovery(values)
  if (!value) return { error: 'errors.invalidData' }

  const { error } = await ctx.db.auth.resetPasswordForEmail(value.email)
  if (error) console.error('[auth] resetPasswordForEmail:', error.code ?? error.message)
  return {}
}

export const updatePassword = async (ctx: CmsContextType, values: unknown): Promise<SessionResultType> => {
  await requireRole(ctx)
  if (!await openedFromEmailLink(ctx)) return { error: 'errors.auth.linkRequired' }

  const { value } = validatePasswordReset(values)
  if (!value) return { error: 'errors.invalidData' }

  const { error } = await ctx.db.auth.updateUser({ password: value.password })
  if (error) return { error: passwordError(error.code) }
  return { redirectTo: panelPaths(ctx.config).home }
}

export const acceptInvite = async (ctx: CmsContextType, values: unknown): Promise<SessionResultType> => {
  const { user } = await requireRole(ctx)
  if (!await openedFromEmailLink(ctx)) return { error: 'errors.auth.linkRequired' }

  const { value } = validateAcceptInvite(values)
  if (!value) return { error: 'errors.invalidData' }

  const { error } = await ctx.db.auth.updateUser({ password: value.password })
  if (error) return { error: passwordError(error.code) }

  const { error: profileError } = await ctx.db.from('profiles').update({ name: value.name }).eq('id', user.id)
  if (profileError) return { error: 'errors.auth.nameFailed' }
  return { redirectTo: panelPaths(ctx.config).home }
}

// Called by the browser right after it verified the code (the session cookies are already aal2).
export const completeSecondFactor = async (ctx: CmsContextType): Promise<SessionResultType> => {
  await requireRole(ctx)
  await logActivity(ctx.db, 'auth.login', null, { mfa: true })
  return { redirectTo: panelPaths(ctx.config).home }
}

export const logout = async (ctx: CmsContextType): Promise<never> => {
  await ctx.db.auth.signOut()
  throw new CmsRedirect(panelPaths(ctx.config).login)
}
