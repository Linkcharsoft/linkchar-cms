import { NextResponse } from 'next/server'
import { panelPaths } from '../core/paths'
import type { CmsContextType } from './context'
import type { EmailOtpType } from '@supabase/supabase-js'

// Reasons the sign-in screen explains; anything else reads as a deactivated user.
export const SIGN_OUT_REASONS = ['inactivo', 'sesion'] as const

const redirectTo = (request: Request, path: string) => NextResponse.redirect(new URL(path, request.url), 303)

// Landing point of the invite and recovery emails. Fixed targets per type: no `next` param, so no open redirect.
export const confirmEmailLink = async (ctx: CmsContextType, request: Request) => {
  const paths = panelPaths(ctx.config)
  const targets: Partial<Record<EmailOtpType, string>> = { invite: paths.acceptInvite, recovery: paths.passwordReset }
  const { searchParams } = new URL(request.url)
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const target = type ? targets[type] : undefined

  if (!tokenHash || !type || !target) return redirectTo(request, `${paths.login}?error=link-invalido`)

  const { error } = await ctx.db.auth.verifyOtp({ type, token_hash: tokenHash })
  return redirectTo(request, error ? `${paths.login}?error=link-vencido` : target)
}

// requireRole() lands here when the session can't be used: signing out first avoids a proxy ↔ layout redirect loop.
export const signOutTo = async (ctx: CmsContextType, request: Request) => {
  await ctx.db.auth.signOut({ scope: 'local' })
  const reason = new URL(request.url).searchParams.get('error')
  const known = (SIGN_OUT_REASONS as readonly (string | null)[]).includes(reason) ? reason : 'inactivo'
  return redirectTo(request, `${panelPaths(ctx.config).login}?error=${known}`)
}
