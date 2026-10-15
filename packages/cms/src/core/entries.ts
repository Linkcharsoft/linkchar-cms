import { resolveText } from './text'
import type { CmsConfigType } from './config'
import type { CollectionEntry, PageEntry, SchemaEntry } from './define'
import type { TextContextType } from './text'

export const getEntry = (config: CmsConfigType, id: string): SchemaEntry | null =>
  (Object.hasOwn(config.schema, id) ? config.schema[id] : null)

export const getPage = (config: CmsConfigType, id: string): PageEntry | null => {
  const entry = getEntry(config, id)
  return entry?.kind === 'page' ? entry : null
}

export const getCollection = (config: CmsConfigType, id: string): CollectionEntry | null => {
  const entry = getEntry(config, id)
  return entry?.kind === 'collection' ? entry : null
}

export const entryIds = (config: CmsConfigType): string[] => Object.keys(config.schema)

const lowerName = (entry: CollectionEntry, ctx: TextContextType) => resolveText(entry.singularLabel, ctx).toLocaleLowerCase(ctx.locale)

export const collectionNewLabel = (entry: CollectionEntry, ctx: TextContextType): string =>
  (entry.newLabel ? resolveText(entry.newLabel, ctx) : ctx.translator.t('collection.new', { name: lowerName(entry, ctx) }))

export const documentTitle = (entry: CollectionEntry, data: unknown, ctx: TextContextType): string => {
  const title = typeof data === 'object' && data !== null ? (data as Record<string, unknown>)[entry.titleField] : null
  if (typeof title === 'string' && title.trim()) return title
  return ctx.translator.t('collection.untitled', { name: resolveText(entry.singularLabel, ctx) })
}
