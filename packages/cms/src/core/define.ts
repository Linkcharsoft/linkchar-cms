import type { FieldsRecord } from './fields'
import type { ValuesOf } from './infer'

interface EntryOptions {
  icon?: string
  // Public URL of the entry (preview, canonical, sitemap, redirects); collections use ":slug".
  path?: string
}

interface EntryBase<F extends FieldsRecord> extends EntryOptions {
  label: string
  fields: F
}

// Unique content, like site settings, navigation or footer.
export interface SingletonEntry<F extends FieldsRecord = FieldsRecord> extends EntryBase<F> {
  kind: 'singleton'
}

// A fixed section of one page, like the home hero.
export interface SectionEntry<F extends FieldsRecord = FieldsRecord> extends EntryBase<F> {
  kind: 'section'
}

export interface CollectionOptions<F extends FieldsRecord> extends EntryOptions {
  singularLabel: string
  titleField: keyof ValuesOf<F> & string
  slugField?: keyof ValuesOf<F> & string
  // Manual order (team, testimonials…) instead of most recent first.
  orderable?: boolean
}

// Repeatable content with its own listing, like blog posts.
export interface CollectionEntry<F extends FieldsRecord = FieldsRecord> extends EntryBase<F> {
  kind: 'collection'
  singularLabel: string
  titleField: string
  slugField?: string
  orderable: boolean
}

export type SchemaEntry = SingletonEntry | SectionEntry | CollectionEntry

export type ContentSchema = Record<string, SchemaEntry>

export const singleton = <const F extends FieldsRecord>(label: string, fields: F, options: EntryOptions = {}): SingletonEntry<F> =>
  ({ kind: 'singleton', label, fields, ...options })

export const section = <const F extends FieldsRecord>(label: string, fields: F, options: EntryOptions = {}): SectionEntry<F> =>
  ({ kind: 'section', label, fields, ...options })

export const collection = <const F extends FieldsRecord>(label: string, fields: F, options: CollectionOptions<F>): CollectionEntry<F> =>
  ({ kind: 'collection', label, fields, ...options, orderable: options.orderable ?? false })

export const defineSchema = <const S extends ContentSchema>(schema: S): S => schema

export type EntryValues<E extends SchemaEntry> = E extends { fields: infer F extends FieldsRecord } ? ValuesOf<F> : never
