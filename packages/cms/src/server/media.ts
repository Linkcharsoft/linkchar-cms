import { mediaPublicUrl } from '../core/media'
import { asRecord } from './context'
import type { CmsContextType } from './context'
import type { Database } from './database'
import type { MediaItemType } from '../core/media'
import type { LocalizedTextType } from '../core/text'

export type MediaRowType = Database['public']['Tables']['media']['Row']

const texts = (value: unknown): LocalizedTextType =>
  Object.fromEntries(Object.entries(asRecord(value)).filter((entry): entry is [string, string] => typeof entry[1] === 'string'))

export const toMediaItem = (ctx: CmsContextType, row: MediaRowType): MediaItemType => ({
  id: row.id,
  path: row.path,
  url: mediaPublicUrl(ctx.supabaseUrl, row.path),
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

export const getMediaByIds = async (ctx: CmsContextType, ids: string[]): Promise<Record<string, MediaItemType>> => {
  if (ids.length === 0) return {}
  const { data } = await ctx.db.from('media').select('*').in('id', ids)
  return Object.fromEntries((data ?? []).map(row => [row.id, toMediaItem(ctx, row)]))
}

// How a file is named in summaries: its alt text in the default locale, else its filename.
export const mediaName = (ctx: CmsContextType, item: MediaItemType) => item.alt[ctx.config.defaultLocale] || item.filename
