import { isRecord } from './kinds/shared'
import { isBlank } from './locales'
import type { CmsConfigType } from './config'
import type { LocalizedTextType } from './text'

// Images and PDFs; the bucket itself stops at 50 MB (the Free plan's maximum) so videos fit.
export const MAX_MEDIA_BYTES = 10 * 1024 * 1024
// Raw photos are compressed in the browser before upload; this only guards it against huge files.
export const MAX_RAW_IMAGE_BYTES = 50 * 1024 * 1024
// Storage serves a video whole on every view and the Free plan has 10 GB of egress a month: videos stay small.
export const MAX_VIDEO_BYTES = 25 * 1024 * 1024
export const MAX_IMAGE_DIMENSION = 2560

export const IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif'] as const
export const DOCUMENT_MIME_TYPES = ['application/pdf'] as const
export const VIDEO_MIME_TYPES = ['video/mp4', 'video/webm'] as const
export const MEDIA_MIME_TYPES: readonly string[] = [...IMAGE_MIME_TYPES, ...DOCUMENT_MIME_TYPES, ...VIDEO_MIME_TYPES]

export const MEDIA_BUCKET = 'media'

export const isImageMime = (mime: string) => (IMAGE_MIME_TYPES as readonly string[]).includes(mime)

export const isVideoMime = (mime: string) => (VIDEO_MIME_TYPES as readonly string[]).includes(mime)

export type MediaTypeType = 'image' | 'document' | 'video'

export const mediaTypeOf = (mime: string): MediaTypeType => (isImageMime(mime) ? 'image' : isVideoMime(mime) ? 'video' : 'document')

export const maxBytesFor = (mime: string) => (isVideoMime(mime) ? MAX_VIDEO_BYTES : MAX_MEDIA_BYTES)

export const mediaPublicPrefix = (supabaseUrl: string) => `${supabaseUrl.replace(/\/$/, '')}/storage/v1/object/public/${MEDIA_BUCKET}/`

export const mediaPublicUrl = (supabaseUrl: string, path: string) => `${mediaPublicPrefix(supabaseUrl)}${path}`

const EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
  'image/gif': 'gif',
  'application/pdf': 'pdf',
  'video/mp4': 'mp4',
  'video/webm': 'webm'
}

// {folder}/{year}/{uuid}.{ext}: never derived from the user's filename, so it can't collide or carry odd characters.
export const buildMediaPath = (folder: string, mime: string, now = new Date()) =>
  `${folder}/${now.getFullYear()}/${crypto.randomUUID()}.${EXTENSIONS[mime] ?? 'bin'}`

const FOLDER_NAME = /^[a-z0-9-]+$/

// The folder comes from the client: it never reaches the regex unchecked (crafted patterns, ReDoS).
export const isPathInFolder = (path: string, folder: string) =>
  FOLDER_NAME.test(folder) && new RegExp(`^${folder}/\\d{4}/[0-9a-f-]{36}\\.(jpg|png|webp|avif|gif|pdf|mp4|webm)$`).test(path)

export const AVATAR_SIZE = 256

// Profile photos live outside the library (no media row): avatars/{userId}/{uuid}.{ext}.
export const buildAvatarPath = (userId: string, mime: string) => `avatars/${userId}/${crypto.randomUUID()}.${EXTENSIONS[mime] ?? 'bin'}`

export const isAvatarPath = (path: string, userId: string) =>
  path.startsWith(`avatars/${userId}/`) && /^avatars\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.(jpg|png|webp)$/.test(path)

export const formatBytes = (bytes: number) =>
  bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`

// "1:05" for 65 seconds, "1:02:03" past an hour.
export const formatDuration = (seconds: number) => {
  const total = Math.max(0, Math.round(seconds))
  const minutes = Math.floor(total / 60) % 60
  const rest = String(total % 60).padStart(2, '0')
  const hours = Math.floor(total / 3600)
  return hours > 0 ? `${hours}:${String(minutes).padStart(2, '0')}:${rest}` : `${minutes}:${rest}`
}

export const EGRESS_SAMPLE_PLAYS = 1000

// Whole gigabytes the sample plays of a video cost (Storage serves the file whole), to one decimal.
export const egressGigabytes = (bytes: number, plays = EGRESS_SAMPLE_PLAYS) => Math.round((bytes * plays) / 1024 / 1024 / 1024 * 10) / 10

export interface MediaItemType {
  id: string
  path: string
  url: string
  filename: string
  folder: string
  alt: LocalizedTextType
  caption: LocalizedTextType
  mime: string
  size: number
  width: number | null
  height: number | null
  focalX: number | null
  focalY: number | null
  blurDataUrl: string | null
  // Videos: seconds, and the image shown before it plays (its URL when the server looked it up).
  duration: number | null
  posterId: string | null
  posterUrl: string | null
  createdAt: string
  deletedAt: string | null
}

// The columns of a `media` row that become an item; the generated Row type of the server satisfies it.
export interface MediaRowLikeType {
  id: string
  path: string
  filename: string
  folder: string
  alt: unknown
  caption: unknown
  mime: string
  size: number
  width: number | null
  height: number | null
  focal_x: number | null
  focal_y: number | null
  blur_data_url: string | null
  duration: number | null
  poster_id: string | null
  created_at: string
  deleted_at: string | null
}

const texts = (value: unknown): LocalizedTextType =>
  (isRecord(value) ? Object.fromEntries(Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === 'string')) : {})

export const mediaItemFrom = (supabaseUrl: string, row: MediaRowLikeType, posterPath: string | null = null): MediaItemType => ({
  id: row.id,
  path: row.path,
  url: mediaPublicUrl(supabaseUrl, row.path),
  filename: row.filename,
  folder: row.folder,
  alt: texts(row.alt),
  caption: texts(row.caption),
  mime: row.mime,
  size: row.size,
  width: row.width,
  height: row.height,
  focalX: row.focal_x,
  focalY: row.focal_y,
  blurDataUrl: row.blur_data_url,
  duration: row.duration,
  posterId: row.poster_id,
  posterUrl: posterPath ? mediaPublicUrl(supabaseUrl, posterPath) : null,
  createdAt: row.created_at,
  deletedAt: row.deleted_at
})

// Locales whose alt text is still empty while the default locale has one: what publishing asks for.
export const missingAltLocales = (config: Pick<CmsConfigType, 'locales' | 'defaultLocale'>, alt: LocalizedTextType): string[] =>
  (isBlank(alt[config.defaultLocale]) ? [] : config.locales.filter(locale => locale !== config.defaultLocale && isBlank(alt[locale])))
