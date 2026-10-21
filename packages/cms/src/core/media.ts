import { isRecord } from './kinds/shared'
import { isBlank } from './locales'
import type { CmsConfigType } from './config'
import type { LocalizedTextType } from './text'

// Mirrors the `media` bucket in supabase/migrations (file_size_limit and allowed_mime_types).
export const MAX_MEDIA_BYTES = 10 * 1024 * 1024
export const MAX_IMAGE_DIMENSION = 2560

export const IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif'] as const
export const DOCUMENT_MIME_TYPES = ['application/pdf'] as const
export const MEDIA_MIME_TYPES: readonly string[] = [...IMAGE_MIME_TYPES, ...DOCUMENT_MIME_TYPES]

export const MEDIA_BUCKET = 'media'

export const isImageMime = (mime: string) => (IMAGE_MIME_TYPES as readonly string[]).includes(mime)

export const mediaPublicPrefix = (supabaseUrl: string) => `${supabaseUrl.replace(/\/$/, '')}/storage/v1/object/public/${MEDIA_BUCKET}/`

export const mediaPublicUrl = (supabaseUrl: string, path: string) => `${mediaPublicPrefix(supabaseUrl)}${path}`

const EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
  'image/gif': 'gif',
  'application/pdf': 'pdf'
}

// {folder}/{year}/{uuid}.{ext}: never derived from the user's filename, so it can't collide or carry odd characters.
export const buildMediaPath = (folder: string, mime: string, now = new Date()) =>
  `${folder}/${now.getFullYear()}/${crypto.randomUUID()}.${EXTENSIONS[mime] ?? 'bin'}`

const FOLDER_NAME = /^[a-z0-9-]+$/

// The folder comes from the client: it never reaches the regex unchecked (crafted patterns, ReDoS).
export const isPathInFolder = (path: string, folder: string) =>
  FOLDER_NAME.test(folder) && new RegExp(`^${folder}/\\d{4}/[0-9a-f-]{36}\\.(jpg|png|webp|avif|gif|pdf)$`).test(path)

export const AVATAR_SIZE = 256

// Profile photos live outside the library (no media row): avatars/{userId}/{uuid}.{ext}.
export const buildAvatarPath = (userId: string, mime: string) => `avatars/${userId}/${crypto.randomUUID()}.${EXTENSIONS[mime] ?? 'bin'}`

export const isAvatarPath = (path: string, userId: string) =>
  path.startsWith(`avatars/${userId}/`) && /^avatars\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.(jpg|png|webp)$/.test(path)

export const formatBytes = (bytes: number) =>
  bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`

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
  created_at: string
  deleted_at: string | null
}

const texts = (value: unknown): LocalizedTextType =>
  (isRecord(value) ? Object.fromEntries(Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === 'string')) : {})

export const mediaItemFrom = (supabaseUrl: string, row: MediaRowLikeType): MediaItemType => ({
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
  createdAt: row.created_at,
  deletedAt: row.deleted_at
})

// Locales whose alt text is still empty while the default locale has one: what publishing asks for.
export const missingAltLocales = (config: Pick<CmsConfigType, 'locales' | 'defaultLocale'>, alt: LocalizedTextType): string[] =>
  (isBlank(alt[config.defaultLocale]) ? [] : config.locales.filter(locale => locale !== config.defaultLocale && isBlank(alt[locale])))
