import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { basename, extname, resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { translatorFor } from '../core/config'
import { withDefaults, withItemKeys } from '../core/defaults'
import { getEntry } from '../core/entries'
import { consoleLogger } from '../core/logger'
import { buildMediaPath, isImageMime, isVideoMime, MAX_IMAGE_DIMENSION, MAX_VIDEO_BYTES, MEDIA_BUCKET } from '../core/media'
import { MP4_HEAD_BYTES, readMp4Head } from '../core/mp4'
import { validateContent } from '../core/validation'
import { addDocument, setDocumentVisibility } from './collections'
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
  // A collection document is found by its id, or by its slug in the default locale (the one in `data` by default).
  match?: { id?: string, slug?: string }
}

export interface ImportUpsertResultType {
  id: string
  created: boolean
  // Keys the server changed, e.g. a slug another document had.
  adjusted: string[]
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

  const findDocument = async (entryId: string, match: ImportUpsertInputType['match'], data: DataRecord) => {
    const query = db.from('documents').select('id, data').eq('type', entryId).is('deleted_at', null)
    const entry = getEntry(config, entryId)!
    if (entry.kind !== 'collection') return (await query.eq('key', entryId).maybeSingle()).data
    if (match?.id) return (await query.eq('id', match.id).maybeSingle()).data
    const slug = match?.slug ?? importSlug(config, entryId, data)
    if (!slug) throw new CmsImportError(`${entryId}: pass match.slug or match.id, or a slug in the data, to find the document again`)
    return (await query.eq('slug', slug).maybeSingle()).data
  }

  // Creates or replaces a document with `data`; collections add new documents at the end, visible.
  const upsert = async (entryId: string, { data, match }: ImportUpsertInputType): Promise<ImportUpsertResultType> => {
    const entry = getEntry(config, entryId)
    if (!entry) throw new CmsImportError(`"${entryId}" is not an entry of the schema`)

    const found = await findDocument(entryId, match, data)
    const patch = withItemKeys(entry.fields, data, found?.data)
    const invalid = (errors: Record<string, string>) => new CmsImportError(`${entryId}: ${Object.entries(errors).map(([path, message]) => `${path} ${message}`).join('; ')}`)

    // Checked before the document exists: a failed save would leave an empty draft the next run can't find.
    if (!found && entry.kind === 'collection') {
      const { errors } = await validateContent(config, entry.fields, { ...withDefaults(config, entry.fields, {}), ...patch }, { mode: 'draft' })
      if (errors) throw invalid(errors)
    }
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
    touched.add(saved.id)
    return { id: saved.id, created: !found, adjusted: saved.adjusted ?? [] }
  }

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

  return { ctx, media, upsert, publish, signOut: () => db.auth.signOut() }
}

export type ImportSessionType = Awaited<ReturnType<typeof createImportSession>>
