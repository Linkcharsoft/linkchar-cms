import { textContext, translatorFor } from '../core/config'
import { getEntry } from '../core/entries'
import { isImageMime, isPathInFolder, isVideoMime, maxBytesFor, MEDIA_BUCKET, MEDIA_MIME_TYPES, mediaItemFrom } from '../core/media'
import { pageSections } from '../core/pages'
import { panelPaths } from '../core/paths'
import { resolveText } from '../core/text'
import { logActivity } from './activity'
import { requireRole } from './auth'
import { asRecord } from './context'
import { titleOf } from './documents'
import type { CmsClientType, CmsContextType } from './context'
import type { Database } from './database'
import type { MessageKeyType } from '../core/i18n/types'
import type { MediaItemType, MediaTypeType } from '../core/media'
import type { LocalizedTextType } from '../core/text'

export type MediaRowType = Database['public']['Tables']['media']['Row']

export interface MediaQueryType {
  folder?: string
  type?: MediaTypeType
  search?: string
  trash?: boolean
  page?: number
  // Images whose alt text in this locale is still empty while the default locale has one.
  missingAlt?: string
}

export const MEDIA_PAGE_SIZE = 40
const TRASH_RETENTION_DAYS = 30
const TEXT_MAX = 300

export { mediaItemFrom } from '../core/media'

export const toMediaItem = (ctx: CmsContextType, row: MediaRowType) => mediaItemFrom(ctx.supabaseUrl, row)

// Items with the URL of their poster, so a grid or a field shows a video by its image.
const withPosters = async (ctx: CmsContextType, rows: MediaRowType[], client: CmsClientType = ctx.db): Promise<MediaItemType[]> => {
  const posterIds = [...new Set(rows.flatMap(row => (row.poster_id ? [row.poster_id] : [])))]
  const { data } = posterIds.length > 0 ? await client.from('media').select('id, path').in('id', posterIds).is('deleted_at', null) : { data: [] }
  const paths = new Map((data ?? []).map(row => [row.id, row.path]))
  return rows.map(row => mediaItemFrom(ctx.supabaseUrl, row, row.poster_id ? paths.get(row.poster_id) ?? null : null))
}

// How a file is named in summaries: its alt text in the default locale, else its filename.
export const mediaName = (ctx: CmsContextType, item: MediaItemType) => item.alt[ctx.config.defaultLocale] || item.filename

// PostgREST `or()` values are quoted: commas, parentheses and quotes from the search can't break the filter.
const orValue = (search: string) => `"%${search.replace(/["\\%_]/g, char => `\\${char}`)}%"`

export const listMedia = async (ctx: CmsContextType, query: MediaQueryType = {}) => {
  const page = Math.max(1, query.page ?? 1)
  const from = (page - 1) * MEDIA_PAGE_SIZE

  let request = ctx.db.from('media').select('*', { count: 'exact' })
  request = query.trash ? request.not('deleted_at', 'is', null) : request.is('deleted_at', null)
  if (query.folder) request = request.eq('folder', query.folder)
  if (query.type === 'image') request = request.like('mime', 'image/%')
  if (query.type === 'document') request = request.eq('mime', 'application/pdf')
  if (query.type === 'video') request = request.like('mime', 'video/%')
  const { defaultLocale, locales } = ctx.config
  if (query.missingAlt && query.missingAlt !== defaultLocale && locales.includes(query.missingAlt)) {
    // Saving drops blank texts, so a missing alt text is an absent key.
    request = request.like('mime', 'image/%').not(`alt->>${defaultLocale}`, 'is', null).is(`alt->>${query.missingAlt}`, null)
  }
  if (query.search?.trim()) {
    const value = orValue(query.search.trim())
    request = request.or([`filename.ilike.${value}`, ...ctx.config.locales.map(locale => `alt->>${locale}.ilike.${value}`)].join(','))
  }

  const { data, count } = await request
    .order(query.trash ? 'deleted_at' : 'created_at', { ascending: false })
    .range(from, from + MEDIA_PAGE_SIZE - 1)

  return { items: await withPosters(ctx, data ?? []), total: count ?? 0, page }
}

export const getMediaByIds = async (ctx: CmsContextType, ids: string[]): Promise<Record<string, MediaItemType>> => {
  if (ids.length === 0) return {}
  const { data } = await ctx.db.from('media').select('*').in('id', ids)
  return Object.fromEntries((await withPosters(ctx, data ?? [])).map(item => [item.id, item]))
}

// One row of media_usage(): a draft or a published copy that holds the file.
export interface UsageRowType {
  document_id: string
  type: string
  data: unknown
  keys: string[]
  published: boolean
  trashed: boolean
}

export interface MediaUsageType {
  // A document that holds the file, or the video it is the poster of.
  kind: 'document' | 'poster'
  documentId: string
  // "Inicio › Portada", "Blog › Mi artículo".
  label: string
  href: string
  // Only the published copy still has it: it goes away with the next publish.
  onlyPublished: boolean
  trashed: boolean
}

const placeOf = (ctx: CmsContextType, row: UsageRowType) => {
  const entry = getEntry(ctx.config, row.type)
  if (!entry) return null
  const paths = panelPaths(ctx.config)
  const label = (text: Parameters<typeof resolveText>[0]) => resolveText(text, textContext(ctx.config))

  if (entry.kind === 'collection') return { label: `${label(entry.label)} › ${titleOf(ctx, entry, row.data)}`, href: paths.document(row.type, row.document_id) }
  if (entry.kind === 'singleton') return { label: label(entry.label), href: paths.site(row.type) }

  const sections = pageSections(entry.fields).filter(({ key }) => row.keys.includes(key))
  return {
    label: [label(entry.label), ...sections.map(section => label(section.label))].join(' › '),
    href: paths.page(row.type, sections[0]?.key)
  }
}

// One entry per document, preferring what the draft says (sections can differ from the published copy).
export const describeUsage = (ctx: CmsContextType, rows: UsageRowType[]): MediaUsageType[] => {
  const byDocument = new Map<string, MediaUsageType>()
  for (const row of [...rows].sort((a, b) => Number(a.published) - Number(b.published))) {
    if (byDocument.has(row.document_id)) continue
    const place = placeOf(ctx, row)
    if (!place) continue
    byDocument.set(row.document_id, {
      kind: 'document',
      documentId: row.document_id,
      label: place.label,
      href: row.trashed ? panelPaths(ctx.config).trash : place.href,
      onlyPublished: row.published,
      trashed: row.trashed
    })
  }
  return [...byDocument.values()]
}

// The live videos an image is the poster of: in use like a document, the database refuses to trash it too.
const posterUsage = async (ctx: CmsContextType, ids: string[], client: CmsClientType): Promise<{ posterId: string, usage: MediaUsageType }[]> => {
  const { data } = await client.from('media').select('id, filename, alt, poster_id').in('poster_id', ids).is('deleted_at', null)
  const { t } = translatorFor(ctx.config)
  return (data ?? []).map(row => ({
    posterId: row.poster_id!,
    usage: {
      kind: 'poster',
      documentId: row.id,
      label: t('media.details.posterOf', { name: asRecord(row.alt)[ctx.config.defaultLocale] as string || row.filename }),
      href: panelPaths(ctx.config).media,
      onlyPublished: false,
      trashed: false
    }
  }))
}

// Drafts and published copies that hold each file, and the videos it is the poster of, by media id.
export const getMediaUsage = async (ctx: CmsContextType, ids: string[], client: CmsClientType = ctx.db): Promise<Record<string, MediaUsageType[]>> => {
  if (ids.length === 0) return {}
  const [{ data }, posters] = await Promise.all([client.rpc('media_usage', { ids }), posterUsage(ctx, ids, client)])
  const rows = (data ?? []) as (UsageRowType & { media_id: string })[]
  return Object.fromEntries(ids.map(id => [id, [
    ...describeUsage(ctx, rows.filter(row => row.media_id === id)),
    ...posters.filter(poster => poster.posterId === id).map(poster => poster.usage)
  ]]))
}

// SQL can't delete Storage objects, so expired trash is purged lazily when the library is opened.
// Files still in use stay (the database refuses them too); rows go first so none points to a missing file.
export const purgeExpiredMedia = async (ctx: CmsContextType) => {
  const admin = ctx.admin()
  const limit = new Date(ctx.now().getTime() - TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString()
  const { data: expired } = await admin.from('media').select('id, path').lt('deleted_at', limit).limit(100)
  if (!expired?.length) return 0

  const usage = await getMediaUsage(ctx, expired.map(row => row.id), admin)
  const unused = expired.filter(row => usage[row.id].length === 0)
  if (unused.length === 0) return 0

  const { error } = await admin.from('media').delete().in('id', unused.map(row => row.id))
  if (error) {
    ctx.logger.error('[media] purge rows failed:', error.code ?? error.message)
    return 0
  }

  const { error: storageError } = await admin.storage.from(MEDIA_BUCKET).remove(unused.map(row => row.path))
  if (storageError) ctx.logger.error('[media] purge storage failed:', storageError.message)
  return unused.length
}

export interface RegisterMediaInputType {
  path: string
  filename: string
  folder: string
  alt: LocalizedTextType
  caption: LocalizedTextType
  mime: string
  size: number
  width: number | null
  height: number | null
  blurDataUrl: string | null
  // SHA-256 of the file as uploaded; optional so older clients keep working.
  hash?: string | null
  // Videos: seconds, when the browser or the import could read them.
  duration?: number | null
}

const HASH = /^[0-9a-f]{64}$/

export interface UpdateMediaInputType {
  alt: LocalizedTextType
  caption: LocalizedTextType
  folder: string
  focalX: number | null
  focalY: number | null
  // Videos: an image of the library shown before it plays; left out, the poster stays as it is.
  posterId?: string | null
}

export type MediaResultType = { ok: true, item: MediaItemType } | { ok: false, error: MessageKeyType }

const isFolder = (ctx: CmsContextType, folder: string) => ctx.config.mediaFolders.some(option => option.value === folder)

const isRatio = (value: number | null) => value === null || (Number.isFinite(value) && value >= 0 && value <= 1)

const isDimension = (value: number | null) => value === null || (Number.isInteger(value) && value > 0 && value <= 20000)

const isDuration = (value: number | null | undefined) => value === null || value === undefined || (Number.isFinite(value) && value >= 0 && value <= 86400)

const clean = (value: unknown, max: number) => (typeof value === 'string' ? value.trim().slice(0, max) : '')

// Only the configured locales, trimmed; empty ones are left out so "missing" stays easy to tell.
const cleanTexts = (ctx: CmsContextType, value: unknown): LocalizedTextType =>
  Object.fromEntries(ctx.config.locales.map(locale => [locale, clean(asRecord(value)[locale], TEXT_MAX)]).filter(([, text]) => text))

const registerProblem = (ctx: CmsContextType, input: RegisterMediaInputType, alt: LocalizedTextType): MessageKeyType | null => {
  if (!isFolder(ctx, input.folder) || !isPathInFolder(input.path, input.folder)) return 'errors.media.invalidFolder'
  if (!MEDIA_MIME_TYPES.includes(input.mime)) return 'errors.media.invalidType'
  if (!Number.isInteger(input.size) || input.size <= 0 || input.size > maxBytesFor(input.mime)) return 'errors.media.tooLarge'
  if (isImageMime(input.mime) && !alt[ctx.config.defaultLocale]) return 'errors.media.altRequired'
  if (!isDimension(input.width) || !isDimension(input.height) || !isDuration(input.duration)) return 'errors.media.invalidDimensions'
  if (input.blurDataUrl && (!input.blurDataUrl.startsWith('data:image/') || input.blurDataUrl.length > 4000)) return 'errors.media.invalidPreview'
  return null
}

// The file is already in Storage (uploaded by the browser); this validates it and creates the library entry.
export const registerMedia = async (ctx: CmsContextType, input: RegisterMediaInputType): Promise<MediaResultType> => {
  await requireRole(ctx, 'editor')
  const alt = cleanTexts(ctx, input.alt)
  const image = isImageMime(input.mime)
  const video = isVideoMime(input.mime)
  const problem = registerProblem(ctx, input, alt)

  if (!problem) {
    const { data, error } = await ctx.db.from('media').insert({
      path: input.path,
      filename: clean(input.filename, 200),
      folder: input.folder,
      alt,
      caption: cleanTexts(ctx, input.caption),
      mime: input.mime,
      size: input.size,
      width: image || video ? input.width : null,
      height: image || video ? input.height : null,
      blur_data_url: image ? input.blurDataUrl : null,
      duration: video ? input.duration ?? null : null,
      hash: typeof input.hash === 'string' && HASH.test(input.hash) ? input.hash : null
    }).select('*').single()

    if (data) {
      await logActivity(ctx, 'media.upload', null, { mediaId: data.id, path: data.path })
      return { ok: true, item: toMediaItem(ctx, data) }
    }
    ctx.logger.error('[media] register failed:', error?.code ?? error?.message)
  }

  // Service role (editors can't delete objects), only for orphans: a crafted path must not hit another file.
  const admin = ctx.admin()
  const { data: owner } = await admin.from('media').select('id').eq('path', input.path).maybeSingle()
  if (!owner && isFolder(ctx, input.folder) && isPathInFolder(input.path, input.folder)) await admin.storage.from(MEDIA_BUCKET).remove([input.path])
  return { ok: false, error: problem ?? 'errors.media.registerFailed' }
}

// The library file with these bytes, if any, so the uploader can offer it instead of a copy.
export const findMediaByHash = async (ctx: CmsContextType, hash: string): Promise<MediaItemType | null> => {
  await requireRole(ctx, 'editor')
  if (!HASH.test(hash)) return null
  const { data } = await ctx.db.from('media').select('*').eq('hash', hash).is('deleted_at', null).order('created_at').limit(1).maybeSingle()
  return data ? toMediaItem(ctx, data) : null
}

const isLibraryImage = async (ctx: CmsContextType, id: string) => {
  const { data } = await ctx.db.from('media').select('mime').eq('id', id).is('deleted_at', null).maybeSingle()
  return !!data && isImageMime(data.mime)
}

export const updateMedia = async (ctx: CmsContextType, id: string, input: UpdateMediaInputType): Promise<MediaResultType> => {
  await requireRole(ctx, 'editor')
  const { data: current } = await ctx.db.from('media').select('mime, poster_id').eq('id', id).maybeSingle()
  if (!current) return { ok: false, error: 'errors.media.gone' }

  const alt = cleanTexts(ctx, input.alt)
  if (isImageMime(current.mime) && !alt[ctx.config.defaultLocale]) return { ok: false, error: 'errors.media.altRequired' }
  if (!isFolder(ctx, input.folder)) return { ok: false, error: 'errors.media.invalidFolder' }
  if (!isRatio(input.focalX) || !isRatio(input.focalY)) return { ok: false, error: 'errors.media.invalidFocalPoint' }
  const posterId = isVideoMime(current.mime) && input.posterId !== undefined ? input.posterId : current.poster_id
  if (posterId && posterId !== current.poster_id && !(await isLibraryImage(ctx, posterId))) return { ok: false, error: 'errors.media.invalidPoster' }

  const { data, error } = await ctx.db.from('media').update({
    alt,
    caption: cleanTexts(ctx, input.caption),
    folder: input.folder,
    focal_x: input.focalX,
    focal_y: input.focalY,
    poster_id: posterId
  }).eq('id', id).select('*').single()

  if (error || !data) return { ok: false, error: 'errors.media.updateFailed' }
  return { ok: true, item: (await withPosters(ctx, [data]))[0] }
}

export type MediaRemovalResultType = { ok: true } | { ok: false, usage: MediaUsageType[] }

export const getUsageOf = async (ctx: CmsContextType, id: string) => {
  await requireRole(ctx, 'editor')
  return (await getMediaUsage(ctx, [id]))[id]
}

const setTrashed = async (ctx: CmsContextType, id: string, trashed: boolean): Promise<MediaRemovalResultType> => {
  await requireRole(ctx, 'editor')
  if (trashed) {
    const usage = (await getMediaUsage(ctx, [id]))[id]
    if (usage.length > 0) return { ok: false, usage }
  }

  const { data } = await ctx.db.from('media').update({ deleted_at: trashed ? ctx.now().toISOString() : null })
    .eq('id', id).select('id').maybeSingle()
  if (data && trashed) await logActivity(ctx, 'media.trash', null, { mediaId: id })
  return data ? { ok: true } : { ok: false, usage: [] }
}

// Blocked while the file is used anywhere (the database refuses it too).
export const trashMedia = (ctx: CmsContextType, id: string) => setTrashed(ctx, id, true)

export const restoreMedia = (ctx: CmsContextType, id: string) => setTrashed(ctx, id, false)

// Admin only (RLS too): removes the row and then the file. Only items already in the trash and not in use.
export const purgeMedia = async (ctx: CmsContextType, id: string): Promise<MediaRemovalResultType> => {
  await requireRole(ctx, 'admin')
  const { data: row } = await ctx.db.from('media').select('id, path').eq('id', id).not('deleted_at', 'is', null).maybeSingle()
  if (!row) return { ok: false, usage: [] }

  const usage = (await getMediaUsage(ctx, [id]))[id]
  if (usage.length > 0) return { ok: false, usage }

  const { error } = await ctx.db.from('media').delete().eq('id', id)
  if (error) return { ok: false, usage: [] }

  const { error: storageError } = await ctx.db.storage.from(MEDIA_BUCKET).remove([row.path])
  if (storageError) ctx.logger.error('[media] purge storage failed:', storageError.message)
  await logActivity(ctx, 'media.purge', null, { mediaId: id, path: row.path })
  return { ok: true }
}

export const searchMedia = async (ctx: CmsContextType, query: MediaQueryType) => {
  await requireRole(ctx, 'editor')
  return listMedia(ctx, query)
}
