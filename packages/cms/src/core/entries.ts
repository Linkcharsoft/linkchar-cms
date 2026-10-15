import type { CollectionEntry, ContentSchema, PageEntry, SchemaEntry } from './define'

export const getEntry = (schema: ContentSchema, id: string): SchemaEntry | null => (Object.hasOwn(schema, id) ? schema[id] : null)

export const getPage = (schema: ContentSchema, id: string): PageEntry | null => {
  const entry = getEntry(schema, id)
  return entry?.kind === 'page' ? entry : null
}

export const getCollection = (schema: ContentSchema, id: string): CollectionEntry | null => {
  const entry = getEntry(schema, id)
  return entry?.kind === 'collection' ? entry : null
}

export const documentTitle = (entry: CollectionEntry, data: unknown): string => {
  const title = typeof data === 'object' && data !== null ? (data as Record<string, unknown>)[entry.titleField] : null
  return typeof title === 'string' && title.trim() ? title : `${entry.singularLabel} sin título`
}
