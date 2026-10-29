import { draftMode } from 'next/headers'
import { emailLinkTarget, isEmailLinkType, panelPaths } from '../core/paths'
import { safePreviewPath } from '../core/preview'
import { canPreview } from './auth'
import type { CmsContextType } from './context'

// Reasons the sign-in screen explains; anything else reads as a deactivated user.
export const SIGN_OUT_REASONS = ['inactivo', 'sesion'] as const

// Relative on purpose: behind a proxy (Amplify) request.url carries the internal host, e.g. localhost:3000.
const redirectTo = (path: string) => new Response(null, { status: 303, headers: { Location: path } })

// The email link handler projects generated before 0.13.0 (the page with a button replaced it: linkchar-cms routes).
export const confirmEmailLink = async (ctx: CmsContextType, request: Request) => {
  const paths = panelPaths(ctx.config)
  const { searchParams } = new URL(request.url)
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type')

  if (!tokenHash || !isEmailLinkType(type)) return redirectTo(`${paths.login}?error=link-invalido`)

  const { error } = await ctx.db.auth.verifyOtp({ type, token_hash: tokenHash })
  return redirectTo(error ? `${paths.login}?error=link-vencido` : emailLinkTarget(ctx.config, type))
}

// requireRole() lands here when the session can't be used: signing out first avoids a proxy ↔ layout redirect loop.
export const signOutTo = async (ctx: CmsContextType, request: Request) => {
  await ctx.db.auth.signOut({ scope: 'local' })
  const reason = new URL(request.url).searchParams.get('error')
  const known = (SIGN_OUT_REASONS as readonly (string | null)[]).includes(reason) ? reason : 'inactivo'
  return redirectTo(`${panelPaths(ctx.config).login}?error=${known}`)
}

// Panel preview: a signed-in, active panel user opens `?path=` of the site in Draft Mode.
export const enableDraft = async (ctx: CmsContextType, request: Request) => {
  const path = safePreviewPath(new URL(request.url).searchParams.get('path') ?? '/', ctx.config.basePath)
  if (!path) return new Response('Invalid path', { status: 400 })

  if (!await canPreview(ctx)) return new Response('Unauthorized', { status: 401 })

  const draft = await draftMode()
  draft.enable()
  return redirectTo(path)
}

// Leaves the preview (clears the Draft Mode cookie) and goes back to the published site.
export const disableDraft = async () => {
  const draft = await draftMode()
  draft.disable()
  return redirectTo('/')
}
