import { textContext, translatorFor } from '../core/config'
import { withDefaults } from '../core/defaults'
import { entryIds, getEntry } from '../core/entries'
import { changedSections } from '../core/pages'
import { panelPaths } from '../core/paths'
import { BUILD_CONFIRMATION_TIMEOUT_MS, isSimulatedJob, MOCK_JOB_PREFIX, publishDisplayStatus } from '../core/publish'
import { unfreedConflicts } from '../core/publishSelection'
import { documentReferences } from '../core/references'
import { referenceWarnings, relationIssue, relationName } from '../core/relations'
import { canPublish } from '../core/roles'
import { resolveText } from '../core/text'
import { entryPath, entryUrls, publishUrls } from '../core/urls'
import { logActivity } from './activity'
import { requireRole } from './auth'
import { authorNames } from './authors'
import { getDocumentUsageRows, getRelationLabels, titleOf } from './documents'
import { incompleteIds, mediaChecksOf, missingItems } from './incomplete'
import { describeUsage } from './media'
import type { CmsContextType } from './context'
import type { MissingItemType } from './incomplete'
import type { MessageKeyType } from '../core/i18n/types'
import type { BuildErrorCodeType, BuildEventStatusType, BuildEventType, BuildStatusType, PublishCircuitType } from '../core/publish'
import type { SelectionDependencyType, UrlConflictType } from '../core/publishSelection'
import type { DocumentStatusType } from '../core/status'

export type { MissingItemType } from './incomplete'

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
  // Picked items that come out only if they are also ticked; the panel warns when they are not.
  pendingRefs: SelectionDependencyType[]
  // For a removal: live documents that stop using it only if their pending publish is ticked too.
  fixedUsers: SelectionDependencyType[]
  // Live URLs of other documents this one would take: the publish fails unless the holder frees them in the same run.
  urlConflicts: UrlConflictType[]
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
  // Reported by the simulated build: no site was built.
  simulated: boolean
  items: { id: string, title: string | null, action: 'publish' | 'unpublish' }[]
}

type StatusRowType = { id: string | null, type: string | null, data: unknown, deleted_at: string | null, slugs?: unknown }

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
  const [names, published, media] = await Promise.all([
    authorNames(ctx, rows.map(row => row.updated_by)),
    changedPages.length > 0
      ? ctx.db.from('published_documents').select('id, data').in('id', changedPages).then(({ data: live }) => live ?? [])
      : [],
    mediaChecksOf(ctx, rows.filter(row => row.status !== 'unpublishing'))
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
    const missing = action === 'publish' ? await missingItems(ctx, described.entry.fields, row.data, media, item => paths.field(described.entry.kind, row.type!, described.id, item))
      : []
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
      warnings: [],
      pendingRefs: [],
      fixedUsers: [],
      urlConflicts: []
    }
  }))

  const pending = changes.filter(change => change !== null)
  await addReferenceWarnings(ctx, pending, rows)
  await addUsageWarnings(ctx, pending)
  await addUrlConflicts(ctx, pending, rows)
  return pending
}

// Live documents of the same collections and the pages: where a slug or a URL can be held by someone else.
const addUrlConflicts = async (ctx: CmsContextType, changes: PendingChangeType[], rows: StatusRowType[]) => {
  const publishes = changes.filter(change => change.action === 'publish' && Object.keys(change.urls).length > 0)
  if (publishes.length === 0) return

  const pages = entryIds(ctx.config).filter(id => getEntry(ctx.config, id)?.kind === 'page')
  const { data } = await ctx.db.from('published_documents').select('id, type, data, slugs, paths')
    .in('type', [...new Set([...publishes.map(change => change.entryId), ...pages])])
  const live = (data ?? []).map(row => ({ ...row, slugs: asPaths(row.slugs), paths: asPaths(row.paths) }))
  const byId = new Map(changes.map(change => [change.id, change]))
  const slugsOf = (id: string) => asPaths(rows.find(row => row.id === id)?.slugs)

  for (const change of publishes) {
    const slugs = slugsOf(change.id)
    change.urlConflicts = Object.entries(change.urls).flatMap(([locale, path]) => {
      const holder = live.find(row => row.id !== change.id
        && (Object.values(row.paths).includes(path) || (row.type === change.entryId && !!slugs[locale] && row.slugs[locale] === slugs[locale])))
      if (!holder) return []
      const other = byId.get(holder.id)
      const freed = !!other && (other.action === 'unpublish' || (other.problems.length === 0 && !Object.values(other.urls).includes(path)))
      const described = describeDocument(ctx, { id: holder.id, type: holder.type, data: holder.data, deleted_at: null })
      return [{ locale, path, takenBy: { id: holder.id, name: described?.title ?? holder.id }, freed }]
    })
  }
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

  for (const change of changes) {
    const ids = references.get(change.id) ?? []
    change.warnings = referenceWarnings(ids, refs, comesOut, t)
    change.pendingRefs = ids.flatMap(id => {
      const issue = refs[id] ? relationIssue(refs[id], t) : null
      return issue && !issue.missing && comesOut(id) ? [{ id, name: relationName(refs[id], true) }] : []
    })
  }
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
    const live = rows.filter(row => row.target_id === removal.id && row.published && !leaving.has(row.document_id))
    const [fixed, stuck] = [live.filter(row => goesOutWithout(row.document_id, removal.id)), live.filter(row => !goesOutWithout(row.document_id, removal.id))]
    removal.warnings.push(...describeUsage(ctx, stuck).map(place => t('relations.usedLive', { name: place.label })))
    removal.fixedUsers = describeUsage(ctx, fixed).map(place => ({ id: place.documentId, name: place.label }))
  }
}

export interface PendingCountsType {
  // Changes the next publish takes: ready documents and removals.
  ready: number
  // Pending documents that missing content keeps out.
  incomplete: number
}

const COUNT_LIMIT = 200

export const getPendingCounts = async (ctx: CmsContextType): Promise<PendingCountsType> => {
  const { data, count } = await ctx.db.from('document_status').select('id, type, data, status', { count: 'exact' })
    .eq('pending', true).in('type', entryIds(ctx.config)).limit(COUNT_LIMIT)
  const rows = data ?? []
  const total = count ?? rows.length
  // The header asks on every navigation: past the limit, checking each document would cost more than it tells.
  if (total > COUNT_LIMIT) return { ready: total, incomplete: 0 }
  const incomplete = await incompleteIds(ctx, rows)
  return { ready: total - incomplete.size, incomplete: incomplete.size }
}

export const getPendingCount = async (ctx: CmsContextType) => {
  const counts = await getPendingCounts(ctx)
  return counts.ready + counts.incomplete
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
    simulated: isSimulatedJob(row.job_id),
    // A purged document has no title left: the panel names it as deleted.
    items: itemsOf(row.items).map(item => ({ id: item.id, action: item.action, title: titles[item.id] ?? null }))
  }))
}

export const getLatestPublish = async (ctx: CmsContextType) => (await getPublishHistory(ctx, 1))[0] ?? null

// A success with a real job id means the site's build reported back once; the simulated build's never count.
export const getPublishCircuit = async (ctx: CmsContextType): Promise<PublishCircuitType> => {
  const { data: any } = await ctx.db.from('publish_log').select('id').limit(1)
  if (!any?.length) return 'unused'
  const { data: confirmed } = await ctx.db.from('publish_log').select('id')
    .eq('build_status', 'success').not('job_id', 'is', null).not('job_id', 'like', `${MOCK_JOB_PREFIX}%`).limit(1)
  return confirmed?.length ? 'confirmed' : 'unconfirmed'
}

// A second publish while the site is still building would queue another build of the same content.
const isBuilding = async (ctx: CmsContextType) => {
  const latest = await getLatestPublish(ctx)
  return !!latest && publishDisplayStatus(latest.buildStatus, latest.requestedAt, ctx.now().getTime()) === 'building'
}

type BuildValuesType = { build_status: BuildStatusType, job_id?: string, error_code?: BuildErrorCodeType | null, error_detail?: string | null, finished_at?: string }

// publish_log is written with the service role: the build webhook has no user session.
const setBuildStatus = async (ctx: CmsContextType, publishId: number, values: BuildValuesType, onlyIfPending = false) => {
  let request = ctx.admin().from('publish_log').update(values).eq('id', publishId)
  // The "started" event can beat the hook response; it must not be overwritten.
  if (onlyIfPending) request = request.eq('build_status', 'pending')
  const { error } = await request
  if (error) ctx.logger.error('[publish] status update failed:', error.code ?? error.message)
}

const FAILURE_CODES: Partial<Record<BuildEventStatusType, BuildErrorCodeType>> = { failed: 'build_failed', cancelled: 'build_cancelled' }

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
      error_code: FAILURE_CODES[status] ?? null,
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

  const result = await ctx.publishTarget.trigger({ report: event => applyBuildEvent(ctx, event), logger: ctx.logger })
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
  // conflicts: for a taken URL, the document that wanted it and the live one that holds it.
  | { ok: false, error: MessageKeyType, conflicts?: { id: string, takenBy: string }[] }

// publish_site reports a taken slug or URL with both ids as JSON in the error detail.
const conflictsOf = (details: unknown) => {
  try {
    const detail = JSON.parse(String(details)) as { id?: unknown, takenBy?: unknown }
    return typeof detail.id === 'string' && typeof detail.takenBy === 'string' ? [{ id: detail.id, takenBy: detail.takenBy }] : undefined
  } catch {
    return undefined
  }
}

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
  if (await isBuilding(ctx)) return { ok: false, error: 'errors.publish.building' }

  const pending = new Map((await getPendingChanges(ctx)).map(change => [change.id, change]))

  const publishable = selection.publish.every(({ id, revision }) => {
    const change = pending.get(id)
    return change?.action === 'publish' && change.revision === revision && change.problems.length === 0
  })
  const removable = selection.remove.every(id => pending.get(id)?.action === 'unpublish')

  if (!publishable || !removable) return { ok: false, error: 'errors.publish.stale' }
  if (selection.publish.length + selection.remove.length === 0) return { ok: false, error: 'errors.publish.nothing' }

  const selected = new Set([...selection.publish.map(({ id }) => id), ...selection.remove])
  const conflicts = unfreedConflicts(selection.publish.map(({ id }) => pending.get(id)!), selected)
  if (conflicts.length > 0) return { ok: false, error: 'errors.publish.slugTaken', conflicts }

  // Documents that free a URL go first: publish_site checks each one against what is live at that moment.
  const frees = (id: string) => (pending.get(id)!.urlChanges.length > 0 ? 0 : 1)
  const ordered = [...new Map(selection.publish.map(item => [item.id, item])).values()].sort((a, b) => frees(a.id) - frees(b.id))

  // The prefix comes from the schema on the server, never from the client.
  const { data, error } = await ctx.db.rpc('publish_site', {
    p_publish: ordered.map(({ id, revision }) => {
      const entry = getEntry(ctx.config, pending.get(id)!.entryId)
      return { id, revision, urls: entry ? publishUrls(ctx.config, entry) : {} }
    }),
    p_remove: selection.remove
  })

  if (error) {
    if (!RPC_ERRORS[error.code]) ctx.logger.error('[publish] publish_site failed:', error.code ?? error.message)
    return { ok: false, error: RPC_ERRORS[error.code] ?? 'errors.publish.failed', ...(error.code === '23505' ? { conflicts: conflictsOf(error.details) } : {}) }
  }

  const result = data as { publishId: number, published: number, removed: number }
  const buildStatus = await triggerBuild(ctx, result.publishId)
  if (ctx.publishTarget?.revalidateOnPublish) ctx.revalidate('/', 'layout')

  return { ok: true, published: result.published, removed: result.removed, buildStatus }
}

// Only the latest publish, and only after its build failed or was never confirmed: a newer one already rebuilt the site.
// Without a publish target, a retry would fail the same way, so it is refused.
export const retryPublish = async (ctx: CmsContextType, publishId: number): Promise<PublishResultType> => {
  const { profile } = await requireRole(ctx, 'editor')
  if (!canPublish(profile)) return { ok: false, error: 'errors.publish.forbidden' }

  const { data: failed } = await ctx.db.from('publish_log').select('id, build_status, requested_at, error_code, documents_count, removed_count, items')
    .order('requested_at', { ascending: false }).limit(1).maybeSingle()
  const displayed = failed ? publishDisplayStatus(failed.build_status as BuildStatusType, failed.requested_at, ctx.now().getTime()) : null
  const retryable = (displayed === 'failed' && failed?.error_code !== 'target_missing') || displayed === 'unconfirmed'
  if (!failed || failed.id !== publishId || !retryable) return { ok: false, error: 'errors.publish.stale' }

  const { data: retry, error } = await ctx.admin().from('publish_log').insert({
    requested_by: profile.id,
    documents_count: failed.documents_count,
    removed_count: failed.removed_count,
    items: failed.items,
    retry_of: failed.id
  }).select('id').single()
  if (error) {
    ctx.logger.error('[publish] retry failed:', error.code ?? error.message)
    return { ok: false, error: 'errors.publish.failed' }
  }

  await logActivity(ctx, 'site.retry', null, { publishId: retry.id, retryOf: failed.id })
  const buildStatus = await triggerBuild(ctx, retry.id)
  return { ok: true, published: 0, removed: 0, buildStatus }
}

export const getPublishStatus = async (ctx: CmsContextType) => {
  await requireRole(ctx, 'editor')
  const [latest, counts] = await Promise.all([getLatestPublish(ctx), getPendingCounts(ctx)])
  return { latest, counts }
}
