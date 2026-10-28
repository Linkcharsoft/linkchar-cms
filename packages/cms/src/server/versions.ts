import { withDefaults } from '../core/defaults'
import { diffContent } from '../core/diff'
import { getEntry } from '../core/entries'
import { documentReferences } from '../core/references'
import { logActivity } from './activity'
import { requireRole } from './auth'
import { authorNames } from './authors'
import { asRecord, UNIQUE_VIOLATION } from './context'
import { getRelationLabels } from './documents'
import { guardFields, slugColumns, toJson } from './editing'
import { getMediaByIds, mediaName } from './media'
import type { CmsContextType, DataRecord, ProfileType } from './context'
import type { FieldDiffType } from '../core/diff'
import type { MessageKeyType } from '../core/i18n/types'

export type VersionReasonType = 'publish' | 'restore' | 'discard' | 'conflict' | 'checkpoint'

export interface VersionItemType {
  id: string
  reason: VersionReasonType
  createdAt: string
  createdBy: string | null
}

export type ReplaceDraftResultType =
  | { status: 'replaced', data: DataRecord, revision: number }
  | { status: 'conflict' }
  | { status: 'error', error: MessageKeyType }

export const VERSIONS_PAGE_SIZE = 50

export interface VersionListType {
  items: VersionItemType[]
  // Older versions exist past this page: ask again with `before` = the last item's createdAt.
  more: boolean
}

export const listVersions = async (ctx: CmsContextType, entryId: string, documentId: string, before?: string): Promise<VersionListType> => {
  await requireRole(ctx, 'editor')
  if (!getEntry(ctx.config, entryId)) return { items: [], more: false }

  let request = ctx.db.from('document_versions').select('id, reason, created_at, created_by')
    .eq('document_id', documentId).order('created_at', { ascending: false }).limit(VERSIONS_PAGE_SIZE + 1)
  if (before) request = request.lt('created_at', before)
  const { data } = await request

  const rows = (data ?? []).slice(0, VERSIONS_PAGE_SIZE)
  const names = await authorNames(ctx, rows.map(row => row.created_by))
  return {
    items: rows.map(row => ({
      id: row.id,
      reason: row.reason as VersionReasonType,
      createdAt: row.created_at,
      createdBy: row.created_by ? names[row.created_by] ?? null : null
    })),
    more: (data ?? []).length > VERSIONS_PAGE_SIZE
  }
}

// The current draft is kept as a version first, so restoring or discarding can always be undone.
// A whole-document replace needs the editor's revision; a single section goes over whatever others saved meanwhile.
const replaceDraft = async (
  ctx: CmsContextType,
  profile: ProfileType,
  entryId: string,
  documentId: string,
  revision: number,
  incoming: unknown,
  reason: 'restore' | 'discard',
  section?: string
): Promise<ReplaceDraftResultType> => {
  const entry = getEntry(ctx.config, entryId)
  if (!entry) return { status: 'error', error: 'errors.unknownEntry' }

  const { data: current } = await ctx.db.from('documents').select('data, revision')
    .eq('id', documentId).eq('type', entryId).is('deleted_at', null).maybeSingle()

  if (!current) return { status: 'error', error: 'errors.documents.gone' }
  if (!section && current.revision !== revision) return { status: 'conflict' }

  const source = section ? { ...asRecord(current.data), [section]: asRecord(incoming)[section] } : incoming
  const restored = withDefaults(ctx.config, entry.fields, source) as DataRecord
  const data = guardFields(ctx, profile, entry.fields, restored, current.data)

  await ctx.db.from('document_versions').insert({ document_id: documentId, data: current.data, reason })

  const { data: updated, error } = await ctx.db.from('documents')
    .update({ data: toJson(data), ...slugColumns(ctx, entryId, data) })
    .eq('id', documentId).eq('revision', current.revision).select('revision').maybeSingle()

  if (error?.code === UNIQUE_VIOLATION) return { status: 'error', error: 'errors.versions.slugTaken' }
  if (error) return { status: 'error', error: 'errors.versions.failed' }
  if (!updated) return { status: 'conflict' }

  await logActivity(ctx, reason === 'restore' ? 'document.restore' : 'document.discard', documentId, { type: entryId, ...(section ? { section } : {}) })
  return { status: 'replaced', data, revision: updated.revision }
}

const getVersion = async (ctx: CmsContextType, documentId: string, versionId: string) => {
  const { data } = await ctx.db.from('document_versions').select('data').eq('id', versionId).eq('document_id', documentId).maybeSingle()
  return data
}

// What restoring a version would change in the current draft, field by field.
export const getVersionDiff = async (ctx: CmsContextType, entryId: string, documentId: string, versionId: string): Promise<FieldDiffType[] | null> => {
  await requireRole(ctx, 'editor')
  const entry = getEntry(ctx.config, entryId)
  if (!entry) return null

  const [version, { data: current }] = await Promise.all([
    getVersion(ctx, documentId, versionId),
    ctx.db.from('documents').select('data').eq('id', documentId).eq('type', entryId).maybeSingle()
  ])
  if (!version || !current) return null

  const draft = withDefaults(ctx.config, entry.fields, current.data)
  const old = withDefaults(ctx.config, entry.fields, version.data)
  const refs = [documentReferences(ctx.config, entry.fields, draft), documentReferences(ctx.config, entry.fields, old)]
  const [media, relations] = await Promise.all([
    getMediaByIds(ctx, [...new Set(refs.flatMap(ref => ref.media))]),
    getRelationLabels(ctx, [...new Set(refs.flatMap(ref => ref.relations))])
  ])

  return diffContent(ctx.config, entry.fields, draft, old, {
    media: Object.fromEntries(Object.entries(media).map(([id, item]) => [id, mediaName(ctx, item)])),
    relations: Object.fromEntries(Object.entries(relations).map(([id, ref]) => [id, ref.label]))
  })
}

export const restoreVersion = async (ctx: CmsContextType, entryId: string, documentId: string, versionId: string, revision: number, section?: string): Promise<ReplaceDraftResultType> => {
  const { profile } = await requireRole(ctx, 'editor')
  const version = await getVersion(ctx, documentId, versionId)

  if (!version) return { status: 'error', error: 'errors.versions.gone' }
  return replaceDraft(ctx, profile, entryId, documentId, revision, version.data, 'restore', section)
}

export const discardChanges = async (ctx: CmsContextType, entryId: string, documentId: string, revision: number, section?: string): Promise<ReplaceDraftResultType> => {
  const { profile } = await requireRole(ctx, 'editor')
  const { data: published } = await ctx.db.from('published_documents').select('data').eq('id', documentId).maybeSingle()

  if (!published) return { status: 'error', error: 'errors.versions.notPublished' }
  return replaceDraft(ctx, profile, entryId, documentId, revision, published.data, 'discard', section)
}
