import { STALE_DRAFT_DAYS } from '../core/alerts'
import { textContext } from '../core/config'
import { buildDefaults } from '../core/defaults'
import { documentTitle, entryIds, getCollection, getEntry } from '../core/entries'
import { fieldLocalize } from '../core/locales'
import { sameContent } from '../core/merge'
import { panelPaths } from '../core/paths'
import { isDocumentStatus } from '../core/publish'
import { displayStatus } from '../core/status'
import { resolveText } from '../core/text'
import { dataFields } from '../core/walk'
import { incompleteIds } from './incomplete'
import type { CmsContextType } from './context'
import type { Database } from './database'
import type { UsageRowType } from './media'
import type { AlertDraftType } from '../core/alerts'
import type { CollectionEntry, SchemaEntry } from '../core/define'
import type { LeafField } from '../core/kinds/registry'
import type { RelationRefType } from '../core/relations'
import type { DocumentDisplayStatusType, DocumentStatusType } from '../core/status'

export type DocumentRowType = Database['public']['Tables']['documents']['Row']

export interface CollectionItemType {
  id: string
  entryId: string
  href: string
  title: string
  slug: string | null
  status: DocumentDisplayStatusType
  visible: boolean
  sortOrder: number
  updatedAt: string
}

export type CollectionSortType = 'updated' | 'title' | 'manual'

export interface CollectionQueryType {
  search?: string
  sort?: CollectionSortType
  status?: DocumentDisplayStatusType
  page?: number
}

export const COLLECTION_PAGE_SIZE = 20

// Manual order shows more per page: reordering only works within a page.
export const ORDERABLE_PAGE_SIZE = 100
// "Incompleto" is not a column of the view: those filters read the candidates and pick in memory, up to this many.
const DERIVED_STATUS_LIMIT = 200
const DERIVED_STATUSES: readonly DocumentDisplayStatusType[] = ['new', 'changed', 'incomplete']

export interface TrashItemType {
  id: string
  entryLabel: string
  title: string
  deletedAt: string
  // Still on the site until the next publish.
  published: boolean
}

export const TRASH_RETENTION_DAYS = 30

export const TRASH_PAGE_SIZE = 50
const DAY_MS = 24 * 60 * 60 * 1000

const LIST_COLUMNS = 'id, slug, data, sort_order, updated_at, status, visible'

// ilike treats % and _ as wildcards; the user's search is literal.
export const escapeLike = (value: string) => value.replace(/[\\%_]/g, char => `\\${char}`)

export const entryLabel = (ctx: CmsContextType, entry: SchemaEntry) => resolveText(entry.label, textContext(ctx.config))

export const titleOf = (ctx: CmsContextType, entry: CollectionEntry, data: unknown) => documentTitle(entry, data, textContext(ctx.config))

// Localized titles are stored as { es, en }: search and sort by the default locale's text.
export const titleColumn = (ctx: CmsContextType, entry: CollectionEntry) => {
  const field = dataFields(entry.fields).find(([key]) => key === entry.titleField)?.[1]
  const localized = field && field.kind !== 'group' && field.kind !== 'list' && field.kind !== 'blocks'
    && fieldLocalize(ctx.config, field as LeafField) !== false
  return localized ? `data->${entry.titleField}->>${ctx.config.defaultLocale}` : `data->>${entry.titleField}`
}

export const getEntryDocument = async (ctx: CmsContextType, entryId: string) => {
  const { data } = await ctx.db.from('documents').select('*')
    .eq('type', entryId).eq('key', entryId).is('deleted_at', null).maybeSingle()
  return data
}

export const getDocument = async (ctx: CmsContextType, entryId: string, id: string) => {
  const { data } = await ctx.db.from('documents').select('*')
    .eq('id', id).eq('type', entryId).is('deleted_at', null).maybeSingle()
  return data
}

export const listCollection = async (ctx: CmsContextType, entryId: string, query: CollectionQueryType = {}) => {
  const entry = getCollection(ctx.config, entryId)
  if (!entry) return { items: [], total: 0, page: 1, pageSize: COLLECTION_PAGE_SIZE, sort: 'updated' as CollectionSortType }

  const requested = Math.max(1, query.page ?? 1)
  const sort = query.sort ?? (entry.orderable ? 'manual' : 'updated')
  const pageSize = sort === 'manual' ? ORDERABLE_PAGE_SIZE : COLLECTION_PAGE_SIZE
  const title = titleColumn(ctx, entry)
  const derived = !!query.status && DERIVED_STATUSES.includes(query.status)

  const request = () => {
    let builder = ctx.db.from('document_status').select(LIST_COLUMNS, { count: 'exact' }).eq('type', entryId).is('deleted_at', null)
    if (query.status) builder = derived ? builder.in('status', query.status === 'incomplete' ? ['new', 'changed'] : [query.status]) : builder.eq('status', query.status)
    if (query.search?.trim()) builder = builder.ilike(title, `%${escapeLike(query.search.trim())}%`)
    return sort === 'manual'
      ? builder.order('sort_order').order('created_at')
      : sort === 'title' ? builder.order(title) : builder.order('updated_at', { ascending: false })
  }
  const pageOf = (page: number) => request().range((page - 1) * pageSize, page * pageSize - 1)
  const lastPageFor = (total: number) => Math.max(1, Math.ceil(total / pageSize))

  let { data, count } = derived ? await request().limit(DERIVED_STATUS_LIMIT) : await pageOf(requested)
  // A page past the end (a stale link, the last item of a page deleted) shows the last one instead of "no content".
  const page = derived ? requested : Math.min(requested, lastPageFor(count ?? 0))
  if (page !== requested) ({ data, count } = await pageOf(page))
  const rows = data ?? []
  const incomplete = await incompleteIds(ctx, rows.map(row => ({ id: row.id, type: entryId, data: row.data, status: row.status })))
  const paths = panelPaths(ctx.config)

  // The view's columns are nullable in the generated types, but they mirror non-null table columns.
  const items: CollectionItemType[] = rows.map(row => ({
    id: row.id!,
    entryId,
    href: paths.document(entryId, row.id!),
    title: titleOf(ctx, entry, row.data),
    slug: row.slug,
    status: displayStatus(row.status as DocumentStatusType, incomplete.has(row.id!)),
    visible: row.visible ?? true,
    sortOrder: row.sort_order ?? 0,
    updatedAt: row.updated_at!
  }))

  if (!derived) return { items, total: count ?? 0, page, pageSize, sort }
  const matching = items.filter(item => item.status === query.status)
  const shownPage = Math.min(page, lastPageFor(matching.length))
  const start = (shownPage - 1) * pageSize
  return { items: matching.slice(start, start + pageSize), total: matching.length, page: shownPage, pageSize, sort }
}

// PostgREST `or()` values are quoted: commas, parentheses and quotes from the search can't break the filter.
const orValue = (search: string) => `"%${search.replace(/["\\%_]/g, char => `\\${char}`)}%"`

export const listTrash = async (ctx: CmsContextType, query: { search?: string, page?: number } = {}) => {
  const page = Math.max(1, query.page ?? 1)
  const from = (page - 1) * TRASH_PAGE_SIZE
  const collections = entryIds(ctx.config).flatMap(id => {
    const entry = getCollection(ctx.config, id)
    return entry ? [{ id, entry }] : []
  })
  let request = ctx.db.from('document_status').select('id, type, data, deleted_at, status', { count: 'exact' })
    .not('deleted_at', 'is', null).in('type', collections.map(({ id }) => id))
  if (query.search?.trim()) {
    const value = orValue(query.search.trim())
    request = request.or([...new Set(collections.map(({ entry }) => titleColumn(ctx, entry)))].map(column => `${column}.ilike.${value}`).join(','))
  }
  const { data, count } = await request.order('deleted_at', { ascending: false }).range(from, from + TRASH_PAGE_SIZE - 1)

  const items = (data ?? []).flatMap((row): TrashItemType[] => {
    const entry = row.type ? getCollection(ctx.config, row.type) : null
    if (!entry || !row.id || !row.deleted_at) return []
    return [{
      id: row.id,
      entryLabel: entryLabel(ctx, entry),
      title: titleOf(ctx, entry, row.data),
      deletedAt: row.deleted_at,
      published: row.status === 'unpublishing'
    }]
  })
  return { items, total: count ?? 0, page }
}

// Lazy purge when the trash is opened. Published documents wait: deleting them would skip the next publish.
export const purgeExpiredDocuments = async (ctx: CmsContextType) => {
  const admin = ctx.admin()
  const limit = new Date(ctx.now().getTime() - TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString()
  const { data: expired } = await admin.from('document_status').select('id')
    .lt('deleted_at', limit).is('published_at', null).limit(100)

  const ids = (expired ?? []).flatMap(row => (row.id ? [row.id] : []))
  if (ids.length === 0) return 0

  const { error } = await admin.from('documents').delete().in('id', ids)
  if (error) ctx.logger.error('[documents] purge failed:', error.code ?? error.message)
  return error ? 0 : ids.length
}

export const getPublishedData = async (ctx: CmsContextType, id: string) => {
  const { data } = await ctx.db.from('published_documents').select('data').eq('id', id).maybeSingle()
  return data?.data ?? null
}

export const getDocumentState = async (ctx: CmsContextType, id: string) => {
  const { data } = await ctx.db.from('document_status').select('type, data, status, visible').eq('id', id).maybeSingle()
  if (!data) return null
  const incomplete = (await incompleteIds(ctx, [{ id, type: data.type, data: data.data, status: data.status }])).has(id)
  return { status: data.status as DocumentStatusType, visible: data.visible ?? true, incomplete }
}

export interface RelationOptionType extends RelationRefType {
  id: string
}

export const searchRelation = async (ctx: CmsContextType, collectionId: string, search: string): Promise<RelationOptionType[]> => {
  const entry = getCollection(ctx.config, collectionId)
  if (!entry) return []

  let request = ctx.db.from('document_status').select('id, data, status')
    .eq('type', collectionId).is('deleted_at', null).order('updated_at', { ascending: false }).limit(20)
  if (search.trim()) request = request.ilike(titleColumn(ctx, entry), `%${escapeLike(search.trim())}%`)

  const { data } = await request
  const kind = resolveText(entry.singularLabel, textContext(ctx.config))
  return (data ?? []).map(row => ({
    id: row.id!,
    label: titleOf(ctx, entry, row.data),
    kind,
    status: isDocumentStatus(row.status) ? row.status : 'hidden',
    trashed: false
  }))
}

// One row of document_usage(): a draft or a published copy whose content holds `target_id`.
export type DocumentUsageRowType = UsageRowType & { target_id: string }

export const getDocumentUsageRows = async (ctx: CmsContextType, ids: string[]): Promise<DocumentUsageRowType[]> => {
  if (ids.length === 0) return []
  const { data } = await ctx.db.rpc('document_usage', { ids })
  return data ?? []
}

export const getRelationLabels = async (ctx: CmsContextType, ids: string[]): Promise<Record<string, RelationRefType>> => {
  if (ids.length === 0) return {}

  const { data } = await ctx.db.from('document_status').select('id, type, data, status, deleted_at').in('id', ids)
  const texts = textContext(ctx.config)

  return Object.fromEntries((data ?? []).map(row => {
    const entry = row.type ? getEntry(ctx.config, row.type) : null
    const collection = entry?.kind === 'collection' ? entry : null
    return [row.id, {
      label: collection ? titleOf(ctx, collection, row.data) : row.id!,
      kind: collection ? resolveText(collection.singularLabel, texts) : entry ? resolveText(entry.label, texts) : '',
      status: isDocumentStatus(row.status) ? row.status : 'hidden',
      trashed: row.deleted_at !== null
    }]
  }))
}

export const UNTOUCHED_DRAFT_HOURS = 24

// Drafts created and never touched (revision 1, same timestamps, the schema defaults, never published, used nowhere) go after a day.
export const purgeUntouchedDrafts = async (ctx: CmsContextType, entryId: string) => {
  const entry = getCollection(ctx.config, entryId)
  if (!entry) return 0
  const admin = ctx.admin()
  const limit = new Date(ctx.now().getTime() - UNTOUCHED_DRAFT_HOURS * 60 * 60 * 1000).toISOString()
  const { data } = await admin.from('document_status').select('id, data, created_at, updated_at')
    .eq('type', entryId).eq('revision', 1).is('published_at', null).is('deleted_at', null).lt('created_at', limit).limit(100)
  const defaults = JSON.parse(JSON.stringify(buildDefaults(ctx.config, entry.fields)))
  const untouched = (data ?? []).filter(row => row.id && row.updated_at === row.created_at && sameContent(row.data, defaults)).map(row => row.id!)
  if (untouched.length === 0) return 0

  const used = new Set((await getDocumentUsageRows(ctx, untouched)).map(row => row.target_id))
  const ids = untouched.filter(id => !used.has(id))
  if (ids.length === 0) return 0

  const { error } = await admin.from('documents').delete().in('id', ids)
  if (error) ctx.logger.error('[documents] purge untouched failed:', error.code ?? error.message)
  return error ? 0 : ids.length
}

// Hidden collection drafts nobody touched for STALE_DRAFT_DAYS, oldest first, for the overview.
export const getStaleDrafts = async (ctx: CmsContextType, limit = 5): Promise<AlertDraftType[]> => {
  const now = ctx.now().getTime()
  const collections = entryIds(ctx.config).filter(id => getCollection(ctx.config, id))
  const { data } = await ctx.db.from('document_status').select('id, type, data, updated_at')
    .eq('status', 'hidden').is('deleted_at', null).in('type', collections)
    .lt('updated_at', new Date(now - STALE_DRAFT_DAYS * DAY_MS).toISOString())
    .order('updated_at').limit(limit)
  const paths = panelPaths(ctx.config)

  return (data ?? []).flatMap(row => {
    const entry = row.type ? getCollection(ctx.config, row.type) : null
    if (!entry || !row.id || !row.updated_at) return []
    return [{ title: titleOf(ctx, entry, row.data), href: paths.document(row.type!, row.id), days: Math.floor((now - Date.parse(row.updated_at)) / DAY_MS) }]
  })
}

export const getRecentDrafts = async (ctx: CmsContextType, limit = 5) => {
  const { data } = await ctx.db.from('documents').select('id, type, data, updated_at')
    .is('deleted_at', null).order('updated_at', { ascending: false }).limit(limit)
  const paths = panelPaths(ctx.config)

  return (data ?? []).flatMap(row => {
    const entry = getEntry(ctx.config, row.type)
    if (!entry) return []
    return [{
      id: row.id,
      label: entry.kind === 'collection' ? titleOf(ctx, entry, row.data) : entryLabel(ctx, entry),
      entryLabel: entryLabel(ctx, entry),
      href: paths.entry(entry.kind, row.type, row.id),
      updatedAt: row.updated_at
    }]
  })
}
