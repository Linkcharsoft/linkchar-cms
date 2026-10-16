import { panelPaths } from '../core/paths'
import { hasRole, needsSecondFactor } from '../core/roles'
import { CmsRedirect } from './context'
import type { CmsContextType, ProfileType } from './context'
import type { RoleType } from '../core/roles'

const profiles = new WeakMap<CmsContextType, ReturnType<typeof loadProfile>>()

// getUser() hits the Auth server, so a revoked session is rejected even if its JWT is still valid.
const loadProfile = async (ctx: CmsContextType) => {
  const { data: { user } } = await ctx.db.auth.getUser()
  if (!user) return { user: null, profile: null, mfaPending: false }

  const [{ data: profile }, { data: claims }] = await Promise.all([
    ctx.db.from('profiles').select('*').eq('id', user.id).maybeSingle(),
    ctx.db.auth.getClaims()
  ])

  return { user, profile: profile as ProfileType | null, mfaPending: needsSecondFactor(user.factors, claims?.claims.aal) }
}

// Once per context: the binding builds one per request.
export const getCurrentProfile = (ctx: CmsContextType) => {
  const cached = profiles.get(ctx)
  if (cached) return cached
  const loading = loadProfile(ctx)
  profiles.set(ctx, loading)
  return loading
}

// Call at the top of every panel page and server action: RLS is the second layer, not the only one.
export const requireRole = async (ctx: CmsContextType, minRole: RoleType = 'editor') => {
  const paths = panelPaths(ctx.config)
  const { user, profile, mfaPending } = await getCurrentProfile(ctx)

  // The proxy only checks the JWT locally: a revoked session or a banned user still has cookies to clear.
  if (!user) throw new CmsRedirect(`${paths.signout}?error=sesion`)
  if (!profile?.active) throw new CmsRedirect(paths.signout)
  if (mfaPending) throw new CmsRedirect(paths.mfaVerify)
  if (!hasRole(profile.role, minRole)) throw new CmsRedirect(paths.home)

  return { user, profile }
}

// Recovery and invite links sign in with an email OTP: only those sessions may set a password without the current one.
export const openedFromEmailLink = async (ctx: CmsContextType, maxAgeSeconds = 3600) => {
  const { data } = await ctx.db.auth.getClaims()
  const now = ctx.now().getTime() / 1000
  return (data?.claims.amr ?? []).some(entry => typeof entry !== 'string' && entry.method === 'otp' && now - entry.timestamp < maxAgeSeconds)
}
