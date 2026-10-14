import { contentSchema } from './schema'
import type { CollectionEntry, EntryValues, PageEntry, SchemaEntry } from './define'

export type EntryIdType = keyof typeof contentSchema & string

export type PageIdType = { [K in EntryIdType]: typeof contentSchema[K] extends { kind: 'page' } ? K : never }[EntryIdType]

// Exact data type of an entry, e.g. ContentOf<'home'>['hero']['title'] is string.
export type ContentOf<K extends EntryIdType> = EntryValues<typeof contentSchema[K]>

const entries: Record<string, SchemaEntry> = contentSchema

export const ENTRY_IDS = Object.keys(contentSchema) as EntryIdType[]

export const getEntry = (id: string): SchemaEntry | null => (Object.hasOwn(entries, id) ? entries[id] : null)

export const getPage = (id: string): PageEntry | null => {
  const entry = getEntry(id)
  return entry?.kind === 'page' ? entry : null
}

export const getCollection = (id: string): CollectionEntry | null => {
  const entry = getEntry(id)
  return entry?.kind === 'collection' ? entry : null
}
