import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { basename, extname, resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { textContext, translatorFor } from '../core/config'
import { withDefaults, withItemKeys } from '../core/defaults'
import { documentTitle, getEntry } from '../core/entries'
import { consoleLogger } from '../core/logger'
import { buildMediaPath, isImageMime, isVideoMime, MAX_IMAGE_DIMENSION, MAX_VIDEO_BYTES, MEDIA_BUCKET } from '../core/media'
import { MP4_HEAD_BYTES, readMp4Head } from '../core/mp4'
import { validateContent } from '../core/validation'
import { addDocument, setDocumentVisibility } from './collections'
import { UNIQUE_VIOLATION } from './context'
import { saveDocument } from './editing'
import { findMediaByHash, registerMedia, updateMedia } from './media'
import { getPendingChanges, publishChanges } from './publish'
import type { CmsClientType, CmsContextType, DataRecord } from './context'
import type { Database } from './database'
import type { CmsConfigType } from '../core/config'
import type { MessageKeyType } from '../core/i18n/types'
import type { CmsLoggerType } from '../core/logger'
import type { MediaItemType } from '../core/media'
import type { BuildStatusType } from '../core/publish'
import type { LocalizedTextType } from '../core/text'
import type { PublishTargetType } from '../publish/types'

export class CmsImportError extends Error {
  constructor (message: string) {
    super(`[@linkcharsoft/cms] ${message}`)
    this.name = 'CmsImportError'
  }
}

export interface ImportSessionOptionsType {
  config: CmsConfigType
  // The secret key only updates the publish log; content is written as the signed-in user, through RLS.
  supabase: { url: string, publishableKey: string, secretKey: string }
  email: string
  password: string
  // The current code of the user's authenticator app, when they enrolled one.
  otp?: string
  publishTarget?: PublishTargetType | null
  // false: publish() reports what it would publish and publishes nothing.
  publish?: boolean
  // false: upsert() only finds documents; one it cannot find throws instead of being created.
  create?: boolean
  // Where relative file paths start.
  root?: string
  logger?: CmsLoggerType
}

export interface ImportMediaInputType {
  // Path of the file, relative to the root.
  file: string
  folder: string
  // Images need it in the default locale, like an upload from the panel.
  alt?: LocalizedTextType
  caption?: LocalizedTextType
  // Videos: the id of an image already in the library, shown before the video plays (publishing asks for one).
  poster?: string
}

export interface ImportUpsertInputType {
  // The content as stored, localized maps included: { title: { es, en }, cover: { es: mediaId } }.
  data: DataRecord
  // A collection document is found by its id, by a `key` of the script's own (kept when editors change the slug)
  // or by its slug in the default locale (the one in `data` by default).
  match?: { id?: string, key?: string, slug?: string }
}

export type ImportMatchType = 'id' | 'key' | 'slug'

export interface ImportUpsertResultType {
  id: string
  created: boolean
  // How the existing document was found; null when it was created.
  matchedBy: ImportMatchType | null
  // Keys the server changed, e.g. a slug another document had.
  adjusted: string[]
}

export interface ImportCreatedType {
  entry: string
  id: string
  // What was looked for and not found: "slug givxo" or "key givxo".
  lookup: string
  // Documents the collection had before this one.
  existing: number
}

export interface ImportUntouchedType {
  entry: string
  id: string
  title: string
}

export interface ImportSummaryType {
  created: ImportCreatedType[]
  updated: number
  // How the updated documents were found.
  matched: Record<ImportMatchType, number>
  // Documents found by slug that took the script's key in this run.
  adopted: number
  // Hidden documents of the collections the script wrote that it never touched and nobody published: drafts the panel left.
  untouched: ImportUntouchedType[]
}

export interface ImportTransformInputType {
  entry: string
  // The stored data of each document (defaults filled in) to the data to save; null keeps it as it is.
  map: (data: DataRecord, document: { id: string, slug: string | null }) => DataRecord | null | undefined | Promise<DataRecord | null | undefined>
  // true: nothing is saved; the report says what would change.
  dryRun?: boolean
}

export interface ImportTransformReportType {
  changed: number
  unchanged: number
  // Documents whose mapped data is invalid: left as they were.
  invalid: { id: string, title: string, problems: string[] }[]
}

export interface ImportPublishReportType {
  published: number
  // Documents of this import still missing content: they stay out until someone fills it in.
  skipped: { id: string, title: string, problems: string[] }[]
  buildStatus: BuildStatusType | null
}

const MIME_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.gif': 'image/gif',
  '.pdf': 'application/pdf',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm'
}

const MAX_VIDEO_MB = MAX_VIDEO_BYTES / 1024 / 1024

// Videos go up as they are: within the cap, and an mp4 only when it plays while it downloads.
const checkVideo = (file: string, mime: string, original: Buffer) => {
  if (original.byteLength > MAX_VIDEO_BYTES) {
    throw new CmsImportError(`${file}: videos go up to ${MAX_VIDEO_MB} MB; export it at 720p with H.264 (CRF 28) or trim it`)
  }
  if (mime !== 'video/mp4') return { fastStart: true, duration: null, width: null, height: null }
  const head = readMp4Head(new Uint8Array(original.buffer, original.byteOffset, Math.min(original.byteLength, MP4_HEAD_BYTES)))
  if (head.fastStart !== true) throw new CmsImportError(`${file}: the mp4 is not faststart (its moov box comes after mdat): export it with -movflags +faststart`)
  return head
}

interface SharpPipelineType {
  rotate: () => SharpPipelineType
  resize: (width: number, height: number, options: { fit: 'inside', withoutEnlargement?: boolean }) => SharpPipelineType
  webp: (options: { quality: number }) => SharpPipelineType
  metadata: () => Promise<{ width?: number, height?: number }>
  toBuffer: (options: { resolveWithObject: true }) => Promise<{ data: Buffer, info: { width: number, height: number } }>
}

type SharpType = (input: Buffer) => SharpPipelineType

// Optional peer: only imports with images need it, and a plain specifier keeps projects without it type-checking.
const loadSharp = async (): Promise<SharpType> => {
  try {
    return ((await import('sharp' as string)) as { default: SharpType }).default
  } catch {
    throw new CmsImportError('Importing images needs sharp: pnpm add -D sharp')
  }
}

export interface ProcessedImageType {
  data: Buffer
  mime: string
  width: number
  height: number
  blurDataUrl: string
}

// What the panel's uploader does in the browser: upright, without metadata (GPS included), within 2560 px, as WebP.
export const processImage = async (original: Buffer, mime: string): Promise<ProcessedImageType> => {
  const sharp = await loadSharp()
  const blur = await sharp(original).rotate().resize(16, 16, { fit: 'inside' }).webp({ quality: 50 }).toBuffer({ resolveWithObject: true })
  const blurDataUrl = `data:image/webp;base64,${blur.data.toString('base64')}`

  // Animated GIFs would lose their frames.
  if (mime === 'image/gif') {
    const { width = 0, height = 0 } = await sharp(original).metadata()
    return { data: original, mime, width, height, blurDataUrl }
  }

  const { data, info } = await sharp(original).rotate()
    .resize(MAX_IMAGE_DIMENSION, MAX_IMAGE_DIMENSION, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 85 })
    .toBuffer({ resolveWithObject: true })
  return { data, mime: 'image/webp', width: info.width, height: info.height, blurDataUrl }
}

// The default locale's slug a collection document is matched by.
export const importSlug = (config: CmsConfigType, entryId: string, data: DataRecord): string | null => {
  const entry = getEntry(config, entryId)
  const value = entry?.kind === 'collection' && entry.slugField ? data[entry.slugField] : undefined
  const slug = typeof value === 'string' ? value : (value as Record<string, unknown> | undefined)?.[config.defaultLocale]
  return typeof slug === 'string' && slug ? slug : null
}

const detached = (url: string, key: string): CmsClientType => createClient<Database>(url, key, { auth: { persistSession: false, autoRefreshToken: false } })

export const createImportSession = async (options: ImportSessionOptionsType) => {
  const { config, supabase, email, password, otp, publishTarget = null, root = process.cwd(), logger = consoleLogger } = options
  const { translate } = translatorFor(config, 'en')
  const failed = (what: string, key: MessageKeyType) => new CmsImportError(`${what}: ${translate(key)} (${key})`)

  const db = detached(supabase.url, supabase.publishableKey)
  const { error: signInError } = await db.auth.signInWithPassword({ email, password })
  if (signInError) throw new CmsImportError(`${email} could not sign in: ${signInError.message}`)

  // With a verified factor, RLS gives no role to a session that skipped the second step.
  const { data: factors } = await db.auth.mfa.listFactors()
  const totp = factors?.totp.find(factor => factor.status === 'verified')
  if (totp) {
    if (!otp) throw new CmsImportError(`${email} has two-step verification: pass the current code with --otp`)
    const { error } = await db.auth.mfa.challengeAndVerify({ factorId: totp.id, code: otp })
    if (error) throw new CmsImportError(`The two-step code was not accepted: ${error.message}`)
  }

  const ctx: CmsContextType = {
    config,
    supabaseUrl: supabase.url,
    db,
    admin: () => detached(supabase.url, supabase.secretKey),
    anonymous: () => detached(supabase.url, supabase.publishableKey),
    publishTarget,
    revalidate: () => {},
    now: () => new Date(),
    logger
  }

  const touched = new Set<string>()
  const creations: ImportCreatedType[] = []
  const collections = new Set<string>()
  const matched: Record<ImportMatchType, number> = { id: 0, key: 0, slug: 0 }
  let updated = 0
  let adopted = 0
  const problems = (errors: Record<string, string>) => Object.entries(errors).map(([path, message]) => `${path} ${message}`)

  // The same file twice (same bytes) gives back the first upload, so an import can run again.
  const media = async ({ file, folder, alt = {}, caption = {}, poster }: ImportMediaInputType): Promise<MediaItemType> => {
    const path = resolve(root, file)
    const mime = MIME_TYPES[extname(path).toLowerCase()]
    if (!mime) throw new CmsImportError(`${file}: only images (jpg, png, webp, avif, gif), PDFs and videos (mp4, webm) go to Media`)
    const original = await readFile(path)
    const video = isVideoMime(mime) ? checkVideo(file, mime, original) : null
    const hash = createHash('sha256').update(original).digest('hex')
    const existing = await findMediaByHash(ctx, hash)
    if (existing) return existing

    const processed = isImageMime(mime)
      ? await processImage(original, mime)
      : { data: original, mime, width: video?.width ?? null, height: video?.height ?? null, blurDataUrl: null }
    const storagePath = buildMediaPath(folder, processed.mime)
    const { error } = await db.storage.from(MEDIA_BUCKET).upload(storagePath, processed.data, { contentType: processed.mime, cacheControl: '31536000', upsert: false })
    if (error) throw new CmsImportError(`${file} could not be uploaded: ${error.message}`)

    const result = await registerMedia(ctx, {
      path: storagePath,
      filename: basename(path),
      folder,
      alt,
      caption,
      mime: processed.mime,
      size: processed.data.byteLength,
      width: processed.width,
      height: processed.height,
      blurDataUrl: processed.blurDataUrl,
      hash,
      duration: video?.duration ?? null
    })
    if (!result.ok) throw failed(file, result.error)
    if (!video || !poster) return result.item

    const withPoster = await updateMedia(ctx, result.item.id, { alt: result.item.alt, caption: result.item.caption, folder, focalX: null, focalY: null, posterId: poster })
    if (!withPoster.ok) throw failed(file, withPoster.error)
    return withPoster.item
  }

  type FoundType = { id: string, data: unknown, key: string | null }

  const findDocument = async (entryId: string, match: ImportUpsertInputType['match'], data: DataRecord): Promise<{ found: FoundType | null, matchedBy: ImportMatchType | null, lookup: string }> => {
    const query = () => db.from('documents').select('id, data, key').eq('type', entryId).is('deleted_at', null)
    const entry = getEntry(config, entryId)!
    if (entry.kind !== 'collection') {
      const found = (await query().eq('key', entryId).maybeSingle()).data
      return { found, matchedBy: found ? 'key' : null, lookup: entryId }
    }
    if (match?.id) {
      const found = (await query().eq('id', match.id).maybeSingle()).data
      return { found, matchedBy: found ? 'id' : null, lookup: `id ${match.id}` }
    }
    if (match?.key) {
      const found = (await query().eq('key', match.key).maybeSingle()).data
      if (found) return { found, matchedBy: 'key', lookup: `key ${match.key}` }
    }
    const slug = match?.slug ?? importSlug(config, entryId, data)
    if (!slug) throw new CmsImportError(`${entryId}: pass match.key, match.slug or match.id, or a slug in the data, to find the document again`)
    const found = (await query().eq('slug', slug).maybeSingle()).data
    return { found, matchedBy: found ? 'slug' : null, lookup: match?.key ? `key ${match.key}` : `slug ${slug}` }
  }

  const countDocuments = async (entryId: string) =>
    (await db.from('documents').select('id', { count: 'exact', head: true }).eq('type', entryId).is('deleted_at', null)).count ?? 0

  // The script's key stays on the document, so the next run finds it however editors rename it.
  const adoptKey = async (entryId: string, id: string, key: string) => {
    const { error } = await db.from('documents').update({ key }).eq('id', id)
    if (!error) return
    if (error.code === UNIQUE_VIOLATION) throw new CmsImportError(`${entryId}: key ${key} already belongs to another document`)
    throw failed(entryId, 'errors.documents.saveFailed')
  }

  // Creates or replaces a document with `data`; collections add new documents at the end, visible.
  const upsert = async (entryId: string, { data, match }: ImportUpsertInputType): Promise<ImportUpsertResultType> => {
    const entry = getEntry(config, entryId)
    if (!entry) throw new CmsImportError(`"${entryId}" is not an entry of the schema`)

    const { found, matchedBy, lookup } = await findDocument(entryId, match, data)
    const patch = withItemKeys(entry.fields, data, found?.data)
    const invalid = (errors: Record<string, string>) => new CmsImportError(`${entryId}: ${problems(errors).join('; ')}`)

    if (!found && entry.kind === 'collection' && options.create === false) {
      throw new CmsImportError(`${entryId}: no document with ${lookup}, and the session creates none (create: false, --no-create)`)
    }
    // Checked before the document exists: a failed save would leave an empty draft the next run can't find.
    if (!found && entry.kind === 'collection') {
      const { errors } = await validateContent(config, entry.fields, { ...withDefaults(config, entry.fields, {}), ...patch }, { mode: 'draft' })
      if (errors) throw invalid(errors)
    }
    const existing = !found && entry.kind === 'collection' ? await countDocuments(entryId) : 0
    const added = !found && entry.kind === 'collection' ? await addDocument(ctx, entryId) : null
    if (added && !added.ok) throw failed(entryId, added.error)
    const fresh = added?.ok ? added : null

    const base = withDefaults(config, entry.fields, found?.data ?? fresh?.data ?? {}) as DataRecord
    const saved = await saveDocument(ctx, { entryId, id: found?.id ?? fresh?.id ?? null, patch, base })
    if (saved.status === 'invalid') throw invalid(saved.errors)
    if (saved.status === 'conflict') throw new CmsImportError(`${entryId}: someone saved ${saved.keys.join(', ')} while importing`)
    if (saved.status === 'error') throw failed(entryId, saved.error)

    if (fresh && entry.kind === 'collection' && !entry.referenceOnly) {
      const shown = await setDocumentVisibility(ctx, entryId, saved.id, true)
      if (!shown.ok) throw failed(entryId, shown.error)
    }
    if (entry.kind === 'collection' && match?.key && !found?.key) {
      await adoptKey(entryId, saved.id, match.key)
      if (found) adopted++
    }
    touched.add(saved.id)
    if (entry.kind === 'collection') collections.add(entryId)
    if (found && matchedBy) matched[matchedBy]++
    if (found) updated++
    else creations.push({ entry: entryId, id: saved.id, lookup, existing })
    return { id: saved.id, created: !found, matchedBy: found ? matchedBy : null, adjusted: saved.adjusted ?? [] }
  }

  // Rewrites every document of an entry (a field whose kind changed), validated and saved like an upsert.
  const transform = async ({ entry: entryId, map, dryRun = false }: ImportTransformInputType): Promise<ImportTransformReportType> => {
    const entry = getEntry(config, entryId)
    if (!entry) throw new CmsImportError(`"${entryId}" is not an entry of the schema`)
    const query = db.from('documents').select('id, slug, data').eq('type', entryId).is('deleted_at', null)
    const { data: rows, error } = await (entry.kind === 'collection' ? query.order('sort_order') : query.eq('key', entryId))
    if (error) throw new CmsImportError(`${entryId}: the documents could not be read: ${error.message}`)

    const report: ImportTransformReportType = { changed: 0, unchanged: 0, invalid: [] }
    const title = (data: unknown) => (entry.kind === 'collection' ? documentTitle(entry, data, textContext(config)) : entryId)
    for (const row of rows ?? []) {
      const current = withDefaults(config, entry.fields, row.data) as DataRecord
      const next = await map(structuredClone(current), { id: row.id, slug: row.slug })
      const patch = Object.fromEntries(Object.entries(next ?? {}).filter(([key, value]) => JSON.stringify(value) !== JSON.stringify(current[key])))
      if (Object.keys(patch).length === 0) {
        report.unchanged++
        continue
      }
      const { errors } = await validateContent(config, entry.fields, { ...current, ...patch }, { mode: 'draft' })
      if (errors) {
        report.invalid.push({ id: row.id, title: title(row.data), problems: problems(errors) })
        continue
      }
      if (!dryRun) {
        const saved = await saveDocument(ctx, { entryId, id: row.id, patch, base: current })
        if (saved.status === 'invalid') {
          report.invalid.push({ id: row.id, title: title(row.data), problems: problems(saved.errors) })
          continue
        }
        if (saved.status === 'conflict') throw new CmsImportError(`${entryId}: someone saved ${saved.keys.join(', ')} while transforming`)
        if (saved.status === 'error') throw failed(entryId, saved.error)
        touched.add(saved.id)
      }
      report.changed++
    }
    return report
  }

  // A draft someone started in the panel under the same name is how a duplicate hides from the import.
  const untouchedHidden = async (): Promise<ImportUntouchedType[]> => {
    const items: ImportUntouchedType[] = []
    for (const entryId of collections) {
      const entry = getEntry(config, entryId)
      if (!entry || entry.kind !== 'collection') continue
      const { data: rows } = await db.from('documents').select('id, data').eq('type', entryId).eq('visible', false).is('deleted_at', null)
      const hidden = (rows ?? []).filter(row => !touched.has(row.id))
      if (hidden.length === 0) continue
      const { data: published } = await db.from('published_documents').select('id').in('id', hidden.map(row => row.id))
      const live = new Set((published ?? []).map(row => row.id))
      items.push(...hidden.filter(row => !live.has(row.id)).map(row => ({ entry: entryId, id: row.id, title: documentTitle(entry, row.data, textContext(config)) })))
    }
    return items
  }

  const summary = async (): Promise<ImportSummaryType> => ({ created: [...creations], updated, matched: { ...matched }, adopted, untouched: await untouchedHidden() })

  // One publish (and one build) for everything this import touched that has no missing content.
  const publish = async (): Promise<ImportPublishReportType> => {
    const pending = (await getPendingChanges(ctx)).filter(change => touched.has(change.id) && change.action === 'publish')
    const ready = pending.filter(change => change.problems.length === 0)
    const skipped = pending.filter(change => change.problems.length > 0).map(({ id, title, problems }) => ({ id, title, problems }))
    if (ready.length === 0 || options.publish === false) return { published: 0, skipped, buildStatus: null }

    const result = await publishChanges(ctx, { publish: ready.map(({ id, revision }) => ({ id, revision })), remove: [] })
    if (!result.ok) throw failed('publish', result.error)
    return { published: result.published, skipped, buildStatus: result.buildStatus }
  }

  return { ctx, media, upsert, transform, publish, summary, signOut: () => db.auth.signOut() }
}

export type ImportSessionType = Awaited<ReturnType<typeof createImportSession>>
