import { textContext, translatorFor } from '../core/config'
import { withDefaults } from '../core/defaults'
import { entryIds, getEntry } from '../core/entries'
import { languageName } from '../core/i18n/translator'
import { changedSections } from '../core/pages'
import { panelPaths } from '../core/paths'
import { BUILD_CONFIRMATION_TIMEOUT_MS } from '../core/publish'
import { documentReferences } from '../core/references'
import { referenceWarnings } from '../core/relations'
import { canPublish } from '../core/roles'
import { resolveText } from '../core/text'
import { missingTranslations } from '../core/translations'
import { entryPath, entryUrls, publishUrls } from '../core/urls'
import { validateContent } from '../core/validation'
import { fieldLabel } from '../core/walk'
import { logActivity } from './activity'
import { requireRole } from './auth'
import { authorNames } from './authors'
import { getDocumentUsageRows, getRelationLabels, titleOf } from './documents'
import { describeUsage } from './media'
import type { CmsContextType } from './context'
import type { FieldsRecord } from '../core/fields'
import type { MessageKeyType } from '../core/i18n/types'
import type { BuildErrorCodeType, BuildEventType, BuildStatusType } from '../core/publish'
import type { DocumentStatusType } from '../core/status'
import type { LocalizedTextType } from '../core/text'

// One thing that keeps a document out of the publication, with the data path the editor opens.
export interface MissingItemType {
  path: string
  // The language it is missing in; null for values shared by every language.
  locale: string | null
  kind: 'field' | 'alt'
  label: string
}

export interface PendingChangeType {
  id: string
  entryId: string
  entryLabel: string
  title: string
  href: string
  action: 'publish' | 'unpublish'
  status: DocumentStatusType
  revision: number
  updatedAt: string
  updatedBy: string | null
  // Required fields, translations and alt texts still empty: the document stays out of the publication until they're filled.
  missing: MissingItemType[]
  // The same, as the labels the publish list shows.
  problems: string[]
  // Its URL in each locale once published.
  urls: Record<string, string>
  // Live URLs that change with this publish; each one leaves a 301 to the new one.
  urlChanges: { locale: string, from: string, to: string }[]
  // Pages with changes: which sections, each linking to its place in the editor.
  sections: { label: string, href: string }[]
  // Picked items (author, category…) that won't be on the site after this publish. They don't block it.
  warnings: string[]
}

export interface PublishRecordType {
  id: number
  requestedAt: string
  requestedBy: string | null
  published: number
  removed: number
  buildStatus: BuildStatusType
  finishedAt: string | null
  errorCode: BuildErrorCodeType | null
  errorDetail: string | null
  // The failed publish this one builds again; a retry publishes nothing new.
  retryOf: number | null
  items: { id: string, title: string | null, action: 'publish' | 'unpublish' }[]
}

type StatusRowType = { id: string | null, type: string | null, data: unknown, deleted_at: string | null }

export const describeDocument = (ctx: CmsContextType, row: StatusRowType) => {
  const entry = row.type ? getEntry(ctx.config, row.type) : null
  if (!entry || !row.id || !row.type) return null

  const paths = panelPaths(ctx.config)
  const entryLabel = resolveText(entry.label, textContext(ctx.config))
  return {
    id: row.id,
    entry,
    entryLabel,
    title: entry.kind === 'collection' ? titleOf(ctx, entry, row.data) : entryLabel,
    href: row.deleted_at ? paths.trash : paths.entry(entry.kind, row.type, row.id)
  }
}

type MediaAltType = (id: string) => LocalizedTextType | undefined

const missingItems = async (ctx: CmsContextType, fields: FieldsRecord, data: unknown, mediaAlt: MediaAltType): Promise<MissingItemType[]> => {
  const { config } = ctx
  const stored = withDefaults(config, fields, data)
  const { errors } = await validateContent(config, fields, stored, { mode: 'publish' })
  const texts = textContext(config)
  const { t } = translatorFor(config)
  const named = (label: string, locale: string | null) =>
    (locale && locale !== config.defaultLocale ? `${label} (${languageName(locale, config.panelLocale)})` : label)

  const fieldsMissing = Object.keys(errors ?? {}).map((path): MissingItemType => {
    const last = path.split('.').pop() ?? ''
    const locale = config.locales.includes(last) ? last : null
    return { path, locale, kind: 'field', label: named(fieldLabel(fields, path, texts), locale) }
  })
  const altsMissing = missingTranslations(config, fields, stored, { mediaAlt })
    .filter(item => item.kind === 'alt')
    .map((item): MissingItemType => ({
      path: item.path,
      locale: item.locale,
      kind: 'alt',
      label: named(t('validation.altOf', { field: fieldLabel(fields, item.path, texts) }), item.locale)
    }))
  return [...fieldsMissing, ...altsMissing]
}

// Alt texts of every file the pending documents use, for the missing translations check.
const mediaAltOf = async (ctx: CmsContextType, documents: { type: string | null, data: unknown }[]): Promise<MediaAltType> => {
  const ids = [...new Set(documents.flatMap(({ type, data }) => {
    const entry = type ? getEntry(ctx.config, type) : null
    return entry ? documentReferences(ctx.config, entry.fields, withDefaults(ctx.config, entry.fields, data)).media : []
  }))]
  if (ids.length === 0 || ctx.config.locales.length < 2) return () => undefined
  const { data } = await ctx.db.from('media').select('id, alt').in('id', ids)
  const alts = new Map((data ?? []).map(row => [row.id, row.alt as LocalizedTextType]))
  return id => alts.get(id)
}

const asPaths = (value: unknown): Record<string, string> =>
  (value && typeof value === 'object' && !Array.isArray(value)
    ? Object.fromEntries(Object.entries(value).filter((pair): pair is [string, string] => typeof pair[1] === 'string'))
    : {})

export const getPendingChanges = async (ctx: CmsContextType): Promise<PendingChangeType[]> => {
  const { data } = await ctx.db.from('document_status')
    .select('id, type, data, slugs, published_slug, published_paths, revision, status, updated_at, updated_by, deleted_at')
    .eq('pending', true).in('type', entryIds(ctx.config)).order('updated_at', { ascending: false })

  const rows = data ?? []
  const paths = panelPaths(ctx.config)
  const texts = textContext(ctx.config)
  const changedPages = rows.filter(row => row.id && row.status === 'changed' && row.type && getEntry(ctx.config, row.type)?.kind === 'page').map(row => row.id!)
  const [names, published, mediaAlt] = await Promise.all([
    authorNames(ctx, rows.map(row => row.updated_by)),
    changedPages.length > 0
      ? ctx.db.from('published_documents').select('id, data').in('id', changedPages).then(({ data: live }) => live ?? [])
      : [],
    mediaAltOf(ctx, rows.filter(row => row.status !== 'unpublishing'))
  ])

  const changes = await Promise.all(rows.map(async (row): Promise<PendingChangeType | null> => {
    const described = describeDocument(ctx, row)
    if (!described || !row.status || row.revision === null || !row.updated_at) return null

    const action = row.status === 'unpublishing' ? 'unpublish' : 'publish'
    const urls = entryUrls(ctx.config, described.entry, asPaths(row.slugs))
    const live = asPaths(row.published_paths)
    // Published before URLs were kept per locale: the default locale's comes from the single slug.
    const defaultLive = live[ctx.config.defaultLocale] ?? entryPath(ctx.config, described.entry, { slug: row.published_slug })
    if (defaultLive && row.status !== 'new') live[ctx.config.defaultLocale] = defaultLive
    const missing = action === 'publish' ? await missingItems(ctx, described.entry.fields, row.data, mediaAlt) : []
    return {
      id: described.id,
      entryId: row.type!,
      entryLabel: described.entryLabel,
      title: described.title,
      href: described.href,
      action,
      status: row.status as DocumentStatusType,
      revision: row.revision,
      updatedAt: row.updated_at,
      updatedBy: row.updated_by ? names[row.updated_by] ?? null : null,
      missing,
      problems: [...new Set(missing.map(item => item.label))],
      urls,
      urlChanges: action === 'publish'
        ? Object.entries(urls).flatMap(([locale, to]) => (live[locale] && live[locale] !== to ? [{ locale, from: live[locale], to }] : []))
        : [],
      sections: changedPages.includes(described.id)
        ? changedSections(ctx.config, described.entry.fields, row.data, published.find(live => live.id === described.id)?.data)
          .map(({ key, label }) => ({ label: resolveText(label, texts), href: paths.page(row.type!, key) }))
        : [],
      warnings: []
    }
  }))

  const pending = changes.filter(change => change !== null)
  await addReferenceWarnings(ctx, pending, rows)
  await addUsageWarnings(ctx, pending)
  return pending
}

const addReferenceWarnings = async (ctx: CmsContextType, changes: PendingChangeType[], rows: StatusRowType[]) => {
  const references = new Map(changes.filter(change => change.action === 'publish').map(change => {
    const row = rows.find(candidate => candidate.id === change.id)
    const entry = row?.type ? getEntry(ctx.config, row.type) : null
    return [change.id, entry ? documentReferences(ctx.config, entry.fields, withDefaults(ctx.config, entry.fields, row?.data)).relations : []]
  }))
  const refs = await getRelationLabels(ctx, [...new Set([...references.values()].flat())])
  const comesOut = (id: string) => changes.find(change => change.id === id)?.problems.length === 0
  const { t } = translatorFor(ctx.config)

  for (const change of changes) change.warnings = referenceWarnings(references.get(change.id) ?? [], refs, comesOut, t)
}

// Live pages that still pick an item being removed lose it, unless they go out without it in the same publish.
const addUsageWarnings = async (ctx: CmsContextType, changes: PendingChangeType[]) => {
  const removals = changes.filter(change => change.action === 'unpublish')
  const rows = await getDocumentUsageRows(ctx, removals.map(change => change.id))
  if (rows.length === 0) return

  const { t } = translatorFor(ctx.config)
  const leaving = new Set(removals.map(change => change.id))
  const goesOutWithout = (documentId: string, targetId: string) =>
    changes.some(change => change.id === documentId && change.action === 'publish' && change.problems.length === 0)
    && !rows.some(row => row.document_id === documentId && row.target_id === targetId && !row.published)

  for (const removal of removals) {
    const live = rows.filter(row => row.target_id === removal.id && row.published && !leaving.has(row.document_id)
      && !goesOutWithout(row.document_id, removal.id))
    removal.warnings.push(...describeUsage(ctx, live).map(place => t('relations.usedLive', { name: place.label })))
  }
}

export const getPendingCount = async (ctx: CmsContextType) => {
  const { count } = await ctx.db.from('document_status').select('id', { count: 'exact', head: true })
    .eq('pending', true).in('type', entryIds(ctx.config))
  return count ?? 0
}

type LogItemType = { id: string, type: string, action: 'publish' | 'unpublish' }

export const getPublishHistory = async (ctx: CmsContextType, limit = 10): Promise<PublishRecordType[]> => {
  const { data } = await ctx.db.from('publish_log').select('*').order('requested_at', { ascending: false }).limit(limit)

  const rows = data ?? []
  const itemsOf = (items: unknown) => (Array.isArray(items) ? items : []) as LogItemType[]
  const ids = [...new Set(rows.flatMap(row => itemsOf(row.items)).map(item => item.id))]

  const [names, documents] = await Promise.all([
    authorNames(ctx, rows.map(row => row.requested_by)),
    ids.length ? ctx.db.from('document_status').select('id, type, data, deleted_at').in('id', ids).then(result => result.data ?? []) : []
  ])
  const titles = Object.fromEntries(documents.map(row => [row.id, describeDocument(ctx, row)?.title ?? null]))

  return rows.map(row => ({
    id: row.id,
    requestedAt: row.requested_at,
    requestedBy: row.requested_by ? names[row.requested_by] ?? null : null,
    published: row.documents_count,
    removed: row.removed_count,
    buildStatus: row.build_status as BuildStatusType,
    finishedAt: row.finished_at,
    errorCode: row.error_code as BuildErrorCodeType | null,
    errorDetail: row.error_detail,
    retryOf: row.retry_of,
    // A purged document has no title left: the panel names it as deleted.
    items: itemsOf(row.items).map(item => ({ id: item.id, action: item.action, title: titles[item.id] ?? null }))
  }))
}

export const getLatestPublish = async (ctx: CmsContextType) => (await getPublishHistory(ctx, 1))[0] ?? null

type BuildValuesType = { build_status: BuildStatusType, job_id?: string, error_code?: BuildErrorCodeType | null, error_detail?: string | null, finished_at?: string }

// publish_log is written with the service role: the build webhook has no user session.
const setBuildStatus = async (ctx: CmsContextType, publishId: number, values: BuildValuesType, onlyIfPending = false) => {
  let request = ctx.admin().from('publish_log').update(values).eq('id', publishId)
  // The "started" event can beat the hook response; it must not be overwritten.
  if (onlyIfPending) request = request.eq('build_status', 'pending')
  const { error } = await request
  if (error) console.error('[publish] status update failed:', error.code ?? error.message)
}

// The oldest open publish owns a job nobody claimed yet, as long as it is recent: an old one that never heard
// back must not take the next publish's events.
export const applyBuildEvent = async (ctx: CmsContextType, { jobId, status }: BuildEventType) => {
  const admin = ctx.admin()
  let { data: row } = await admin.from('publish_log').select('id').eq('job_id', jobId).maybeSingle()

  if (!row) {
    const since = new Date(ctx.now().getTime() - BUILD_CONFIRMATION_TIMEOUT_MS).toISOString()
    const { data: open } = await admin.from('publish_log').select('id')
      .in('build_status', ['pending', 'building']).is('job_id', null).gte('requested_at', since)
      .order('requested_at').limit(1).maybeSingle()
    row = open
  }

  if (!row) return false

  if (status === 'started') {
    await setBuildStatus(ctx, row.id, { build_status: 'building', job_id: jobId })
  } else {
    await setBuildStatus(ctx, row.id, {
      build_status: status === 'succeeded' ? 'success' : 'failed',
      job_id: jobId,
      error_code: status === 'failed' ? 'build_failed' : null,
      error_detail: null,
      finished_at: ctx.now().toISOString()
    })
  }

  return true
}

export const triggerBuild = async (ctx: CmsContextType, publishId: number): Promise<BuildStatusType> => {
  const fail = async (code: BuildErrorCodeType, detail?: string) => {
    await setBuildStatus(ctx, publishId, { build_status: 'failed', error_code: code, error_detail: detail ?? null, finished_at: ctx.now().toISOString() })
    return 'failed' as const
  }

  if (!ctx.publishTarget) return fail('target_missing')

  const result = await ctx.publishTarget.trigger({ report: event => applyBuildEvent(ctx, event) })
  if (!result.ok) return fail(result.code, result.detail)

  await setBuildStatus(ctx, publishId, { build_status: 'building', ...(result.jobId ? { job_id: result.jobId } : {}) }, true)
  return 'building'
}

export interface PublishSelectionType {
  publish: { id: string, revision: number }[]
  remove: string[]
}

export type PublishResultType =
  | { ok: true, published: number, removed: number, buildStatus: BuildStatusType }
  | { ok: false, error: MessageKeyType }

const RPC_ERRORS: Record<string, MessageKeyType> = {
  CM001: 'errors.publish.stale',
  CM002: 'errors.publish.nothing',
  '42501': 'errors.publish.forbidden',
  '23505': 'errors.publish.slugTaken',
  '22023': 'errors.publish.invalidSlug'
}

// Publishes exactly what the user reviewed: anything edited or incomplete since then aborts the run.
export const publishChanges = async (ctx: CmsContextType, selection: PublishSelectionType): Promise<PublishResultType> => {
  const { profile } = await requireRole(ctx, 'editor')
  if (!canPublish(profile)) return { ok: false, error: 'errors.publish.forbidden' }

  const pending = new Map((await getPendingChanges(ctx)).map(change => [change.id, change]))

  const publishable = selection.publish.every(({ id, revision }) => {
    const change = pending.get(id)
    return change?.action === 'publish' && change.revision === revision && change.problems.length === 0
  })
  const removable = selection.remove.every(id => pending.get(id)?.action === 'unpublish')

  if (!publishable || !removable) return { ok: false, error: 'errors.publish.stale' }
  if (selection.publish.length + selection.remove.length === 0) return { ok: false, error: 'errors.publish.nothing' }

  // The prefix comes from the schema on the server, never from the client.
  const { data, error } = await ctx.db.rpc('publish_site', {
    p_publish: selection.publish.map(({ id, revision }) => {
      const entry = getEntry(ctx.config, pending.get(id)!.entryId)
      return { id, revision, urls: entry ? publishUrls(ctx.config, entry) : {} }
    }),
    p_remove: selection.remove
  })

  if (error) {
    if (!RPC_ERRORS[error.code]) console.error('[publish] publish_site failed:', error.code ?? error.message)
    return { ok: false, error: RPC_ERRORS[error.code] ?? 'errors.publish.failed' }
  }

  const result = data as { publishId: number, published: number, removed: number }
  const buildStatus = await triggerBuild(ctx, result.publishId)
  if (ctx.publishTarget?.revalidateOnPublish) ctx.revalidate('/', 'layout')

  return { ok: true, published: result.published, removed: result.removed, buildStatus }
}

// Only the latest publish, and only after its build failed: a newer one already rebuilt the site.
export const retryPublish = async (ctx: CmsContextType, publishId: number): Promise<PublishResultType> => {
  const { profile } = await requireRole(ctx, 'editor')
  if (!canPublish(profile)) return { ok: false, error: 'errors.publish.forbidden' }

  const { data: failed } = await ctx.db.from('publish_log').select('id, build_status, documents_count, removed_count, items')
    .order('requested_at', { ascending: false }).limit(1).maybeSingle()
  if (!failed || failed.id !== publishId || failed.build_status !== 'failed') return { ok: false, error: 'errors.publish.stale' }

  const { data: retry, error } = await ctx.admin().from('publish_log').insert({
    requested_by: profile.id,
    documents_count: failed.documents_count,
    removed_count: failed.removed_count,
    items: failed.items,
    retry_of: failed.id
  }).select('id').single()
  if (error) {
    console.error('[publish] retry failed:', error.code ?? error.message)
    return { ok: false, error: 'errors.publish.failed' }
  }

  await logActivity(ctx.db, 'site.retry', null, { publishId: retry.id, retryOf: failed.id })
  const buildStatus = await triggerBuild(ctx, retry.id)
  return { ok: true, published: 0, removed: 0, buildStatus }
}

export const getPublishStatus = async (ctx: CmsContextType) => {
  await requireRole(ctx, 'editor')
  const [latest, pendingCount] = await Promise.all([getLatestPublish(ctx), getPendingCount(ctx)])
  return { latest, pendingCount }
}
