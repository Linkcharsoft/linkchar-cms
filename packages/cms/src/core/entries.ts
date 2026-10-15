import type { CmsConfigType } from './config'
import type { CollectionEntry, PageEntry, SchemaEntry } from './define'

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

export const documentTitle = (entry: CollectionEntry, data: unknown): string => {
  const title = typeof data === 'object' && data !== null ? (data as Record<string, unknown>)[entry.titleField] : null
  return typeof title === 'string' && title.trim() ? title : `${entry.singularLabel} sin título`
}
