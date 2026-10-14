import { seo } from './fields'
import type { FieldsRecord } from './fields'
import type { ValuesOf } from './infer'
import type { MetadataRoute } from 'next'

interface EntryOptions {
  icon?: string
  // Public URL of the entry (preview, canonical, sitemap, redirects); collections use ":slug".
  path?: string
  // id of the element the preview scrolls to (header, footer…).
  anchor?: string
}

interface EntryBase<F extends FieldsRecord> extends EntryOptions {
  label: string
  fields: F
}

// Unique content, like site settings, navigation or footer.
export interface SingletonEntry<F extends FieldsRecord = FieldsRecord> extends EntryBase<F> {
  kind: 'singleton'
}

export interface PageSitemapType {
  priority: number
  changeFrequency: NonNullable<MetadataRoute.Sitemap[number]['changeFrequency']>
}

interface PageOptions<P extends string | undefined> extends Omit<EntryOptions, 'path' | 'anchor'> {
  path?: P
  // Defaults of the page's SEO group, added when the page has a path.
  seo?: { title?: string, description?: string }
  sitemap?: PageSitemapType
}

// One site page: its sections (section() groups) plus its SEO, stored as a single document.
export interface PageEntry<F extends FieldsRecord = FieldsRecord> extends EntryBase<F> {
  kind: 'page'
  sitemap?: PageSitemapType
}

export interface CollectionOptions<F extends FieldsRecord> extends EntryOptions {
  singularLabel: string
  titleField: keyof ValuesOf<F> & string
  slugField?: keyof ValuesOf<F> & string
  // Manual order (team, testimonials…) instead of most recent first.
  orderable?: boolean
  // Parent collection: shown as one of its tabs instead of its own menu item.
  under?: string
  // Label of this collection's own tab when others live under it.
  tabLabel?: string
  // Only exists to be referenced (authors, categories): always visible, so a picked item never vanishes from the site.
  referenceOnly?: boolean
}

// Repeatable content with its own listing, like blog posts.
export interface CollectionEntry<F extends FieldsRecord = FieldsRecord> extends EntryBase<F> {
  kind: 'collection'
  singularLabel: string
  titleField: string
  slugField?: string
  orderable: boolean
  under?: string
  tabLabel?: string
  referenceOnly: boolean
}

export type SchemaEntry = SingletonEntry | PageEntry | CollectionEntry

export type ContentSchema = Record<string, SchemaEntry>

export const singleton = <const F extends FieldsRecord>(label: string, fields: F, options: EntryOptions = {}): SingletonEntry<F> =>
  ({ kind: 'singleton', label, fields, ...options })

type SeoGroup = ReturnType<typeof seo>

type PageFields<F extends FieldsRecord, P extends string | undefined> = P extends string ? F & { seo: SeoGroup } : F

// Pages with a URL get a trailing SEO section; system pages (404) don't.
export const page = <const F extends FieldsRecord, const P extends string | undefined = undefined>(
  label: string,
  sections: F,
  { seo: seoDefaults, ...options }: PageOptions<P> = {}
): PageEntry<PageFields<F, P>> => ({
  kind: 'page',
  label,
  ...options,
  fields: (options.path
    ? {
      ...sections,
      seo: {
        ...seo({ path: options.path, label: 'Cómo aparece en Google y al compartir', ...seoDefaults }),
        section: { icon: 'pi-google', hideable: false }
      }
    }
    : sections) as PageFields<F, P>
})

export const collection = <const F extends FieldsRecord>(label: string, fields: F, options: CollectionOptions<F>): CollectionEntry<F> =>
  ({ kind: 'collection', label, fields, ...options, orderable: options.orderable ?? false, referenceOnly: options.referenceOnly ?? false })

export const defineSchema = <const S extends ContentSchema>(schema: S): S => schema

export type EntryValues<E extends SchemaEntry> = E extends { fields: infer F extends FieldsRecord } ? ValuesOf<F> : never
