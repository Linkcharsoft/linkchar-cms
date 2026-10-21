import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { cookies, draftMode } from 'next/headers'
import { redirect } from 'next/navigation'
import { NextResponse } from 'next/server'
import { cache } from 'react'
import { consoleLogger } from '../core/logger'
import { panelPaths } from '../core/paths'
import { createSiteReaders } from '../site/readers'
import { documentJsonLd, documentMetadata } from '../site/seo'
import { changePassword, markTourSeen, recordMfaChange, resetTours, updateAvatar, updateProfile } from './account'
import { listActivity, purgeExpiredActivity } from './activity'
import { getCurrentProfile, requireRole } from './auth'
import { createDocument, createRelated, duplicateDocument, reorderCollection, setDocumentVisibility, trashDocument } from './collections'
import { CmsRedirect } from './context'
import * as documents from './documents'
import { saveDocument } from './editing'
import { confirmEmailLink, disableDraft, enableDraft, signOutTo } from './handlers'
import * as media from './media'
import { listPages } from './pages'
import { applyBuildEvent, getLatestPublish, getPendingChanges, getPendingCount, getPendingCounts, getPublishHistory, getPublishStatus, publishChanges, retryPublish } from './publish'
import { acceptInvite, completeSecondFactor, login, logout, requestPasswordReset, updatePassword } from './session'
import { purgeDocument, restoreDocument } from './trash'
import { deleteInvite, inviteUser, listPanelUsers, resendInvite, resetUserMfa, setUserActive, updateUserAccess } from './users'
import { discardChanges, getVersionDiff, listVersions, restoreVersion } from './versions'
import type { CmsClientType, CmsContextType } from './context'
import type { Database } from './database'
import type { CmsConfigType } from '../core/config'
import type { CmsLoggerType } from '../core/logger'
import type { PublishTargetType } from '../publish/types'
import type { SiteDocumentType } from '../site/types'
import type { NextRequest } from 'next/server'

export interface CmsServerOptionsType {
  config: CmsConfigType
  // From the project's environment; checked on first use so the site builds without them.
  supabase: { url: string | undefined, publishableKey: string | undefined, secretKey: string | undefined }
  publishTarget?: PublishTargetType | null
  logger?: CmsLoggerType
}

type BoundType<F> = F extends (ctx: CmsContextType, ...args: infer A) => Promise<infer R> ? (...args: A) => Promise<R> : never

type BoundAllType<T> = { [K in keyof T]: BoundType<T[K]> }

const ACTIONS = {
  saveDocument, createDocument, createRelated, duplicateDocument, trashDocument, setDocumentVisibility, reorderCollection,
  listVersions, getVersionDiff, restoreVersion, discardChanges, restoreDocument, purgeDocument,
  searchRelation: async (ctx: CmsContextType, collectionId: string, search: string) => {
    await requireRole(ctx, 'editor')
    return documents.searchRelation(ctx, collectionId, search)
  },
  getDocumentUsage: async (ctx: CmsContextType, id: string) => {
    await requireRole(ctx, 'editor')
    return media.describeUsage(ctx, await documents.getDocumentUsageRows(ctx, [id]))
  },
  registerMedia: media.registerMedia, updateMedia: media.updateMedia, getMediaUsage: media.getUsageOf, trashMedia: media.trashMedia,
  restoreMedia: media.restoreMedia, purgeMedia: media.purgeMedia, searchMedia: media.searchMedia,
  publishChanges, retryPublish, getPublishStatus,
  inviteUser, updateUserAccess, setUserActive, resendInvite, deleteInvite, resetUserMfa,
  updateProfile, updateAvatar, changePassword, recordMfaChange, markTourSeen, resetTours,
  login, requestPasswordReset, updatePassword, acceptInvite, completeSecondFactor, logout
}

// Read by panel pages, which call requireRole first.
const QUERIES = {
  getCurrentProfile, requireRole,
  getEntryDocument: documents.getEntryDocument, getDocument: documents.getDocument, listCollection: documents.listCollection,
  listTrash: documents.listTrash, purgeExpiredDocuments: documents.purgeExpiredDocuments, getPublishedData: documents.getPublishedData,
  getDocumentState: documents.getDocumentState, getRelationLabels: documents.getRelationLabels, getRecentDrafts: documents.getRecentDrafts,
  listMedia: media.listMedia, getMediaByIds: media.getMediaByIds, purgeExpiredMedia: media.purgeExpiredMedia,
  listPages, getPendingChanges, getPendingCount, getPendingCounts, getPublishHistory, getLatestPublish, listPanelUsers, listActivity, purgeExpiredActivity
}

export const createCmsServer = ({ config, supabase, publishTarget = null, logger = consoleLogger }: CmsServerOptionsType) => {
  const credentials = () => {
    const { url, publishableKey, secretKey } = supabase
    if (!url || !publishableKey) throw new Error('[@linkcharsoft/cms] Missing the Supabase URL or publishable key')
    return { url, publishableKey, secretKey }
  }

  const detached = (key: string): CmsClientType =>
    createClient<Database>(credentials().url, key, { auth: { persistSession: false, autoRefreshToken: false } })

  const admin = () => {
    const { secretKey } = credentials()
    if (!secretKey) throw new Error('[@linkcharsoft/cms] Missing the Supabase secret key')
    return detached(secretKey)
  }

  const baseContext = (db: CmsClientType): CmsContextType => ({
    config,
    supabaseUrl: credentials().url,
    db,
    admin,
    anonymous: () => detached(credentials().publishableKey),
    publishTarget,
    revalidate: (path, type) => revalidatePath(path, type),
    now: () => new Date(),
    logger
  })

  // One per request: the profile read by requireRole is shared by everything that request renders.
  const context = cache(async (): Promise<CmsContextType> => {
    const cookieStore = await cookies()
    const { url, publishableKey } = credentials()
    const db = createServerClient<Database>(url, publishableKey, {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: cookiesToSet => {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          } catch {
            // Server Components can't write cookies; the proxy already refreshed the session.
          }
        }
      }
    })
    return baseContext(db)
  })

  const bind = <T extends Record<string, (ctx: CmsContextType, ...args: never[]) => Promise<unknown>>>(functions: T): BoundAllType<T> =>
    Object.fromEntries(Object.entries(functions).map(([name, fn]) => [name, async (...args: never[]) => {
      try {
        return await fn(await context(), ...args)
      } catch (error) {
        if (error instanceof CmsRedirect) redirect(error.to)
        throw error
      }
    }])) as BoundAllType<T>

  // Fed by the build status webhook (an EventBridge rule for Amplify); there is no user session.
  const buildStatus = async (request: Request) => {
    if (!publishTarget?.readWebhook) return new Response('Not found', { status: 404 })
    const event = await publishTarget.readWebhook(request)
    if (event === 'unauthorized') return new Response('Unauthorized', { status: 401 })
    if (event === 'invalid') return new Response('Invalid event', { status: 400 })
    const matched = await applyBuildEvent(baseContext(admin()), event)
    return Response.json({ matched })
  }

  // For the project's proxy: must run on every panel request, it is what refreshes an expired session.
  const updateSession = async (request: NextRequest) => {
    const { url, publishableKey } = credentials()
    let response = NextResponse.next({ request })
    const client = createServerClient<Database>(url, publishableKey, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet, headers) => {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
          Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value))
        }
      }
    })
    const { data } = await client.auth.getClaims()
    return { response, claims: data?.claims ?? null }
  }

  // The whole proxy for panel routes: signed-out users go to sign in, signed-in ones skip the guest screens.
  // Role and `active` are checked by requireRole() in the layouts and actions.
  const proxy = async (request: NextRequest) => {
    const { response, claims } = await updateSession(request)
    const paths = panelPaths(config)
    const { pathname } = request.nextUrl
    const matches = (list: string[]) => list.some(path => pathname === path || pathname.startsWith(`${path}/`))
    const target = !claims && !matches(paths.publicPaths) ? paths.login : claims && matches(paths.guestOnlyPaths) ? paths.home : null
    if (!target) return response

    const url = request.nextUrl.clone()
    url.pathname = target
    url.search = ''
    const redirect = NextResponse.redirect(url)
    response.cookies.getAll().forEach(cookie => redirect.cookies.set(cookie))
    return redirect
  }

  const handler = (fn: (ctx: CmsContextType, request: Request) => Promise<Response>) =>
    async (request: Request) => fn(await context(), request)

  let publicClient: CmsClientType | null = null
  const published = () => {
    publicClient ??= detached(credentials().publishableKey)
    return publicClient
  }

  // Drafts only in Draft Mode with a panel session; cookies are read only then, so built pages stay static.
  const siteSource = async () => {
    if ((await draftMode()).isEnabled) {
      const ctx = await context()
      const { data } = await ctx.db.auth.getClaims()
      if (data?.claims) return { db: ctx.db, draft: true }
    }
    return { db: published(), draft: false }
  }

  const site = {
    ...createSiteReaders({ config, supabaseUrl: () => credentials().url, source: siteSource, published }),
    metadata: (document: SiteDocumentType) => documentMetadata(config, document),
    jsonLd: (document: SiteDocumentType, type?: string) => documentJsonLd(config, document, type)
  }

  return {
    config,
    context,
    actions: bind(ACTIONS),
    queries: bind(QUERIES),
    handlers: {
      buildStatus,
      authConfirm: handler(confirmEmailLink),
      signout: handler(signOutTo),
      draft: handler(enableDraft),
      disableDraft: handler(disableDraft)
    },
    site,
    updateSession,
    proxy,
    // What the browser needs to talk to Supabase itself (uploads, MFA): public values only.
    browserSupabase: () => {
      const { url, publishableKey } = credentials()
      return { url, publishableKey }
    }
  }
}

export type CmsServerType = ReturnType<typeof createCmsServer>
