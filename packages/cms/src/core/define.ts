import { seo } from './fields'
import type { FieldsRecord } from './fields'
import type { ValuesOf } from './infer'
import type { LocalizedTextType, TextType } from './text'
import type { EntryPathType } from './urls'

interface EntryOptions {
  icon?: string
  // Public URL of the entry (preview, canonical, sitemap, redirects), one for all locales or one per locale;
  // collections end in ":slug". Locales other than the default one get their prefix ("/en").
  path?: EntryPathType
  // id of the element the preview scrolls to (header, footer…).
  anchor?: string
  // Where the preview opens an entry that has no URL of its own (a footer previewed on the home page).
  previewPath?: EntryPathType
}

interface EntryBase<F extends FieldsRecord> extends EntryOptions {
  label: TextType
  fields: F
}

// Unique content, like site settings, navigation or footer.
export interface SingletonEntry<F extends FieldsRecord = FieldsRecord> extends EntryBase<F> {
  kind: 'singleton'
}

export type ChangeFrequencyType = 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never'

export interface PageSitemapType {
  priority: number
  changeFrequency: ChangeFrequencyType
}

interface PageOptions<P extends EntryPathType | undefined> extends Omit<EntryOptions, 'path' | 'anchor'> {
  path?: P
  // Defaults of the page's SEO group, added when the page has a path.
  seo?: { title?: string | LocalizedTextType, description?: string | LocalizedTextType }
  sitemap?: PageSitemapType
}

// One site page: its sections (section() groups) plus its SEO, stored as a single document.
export interface PageEntry<F extends FieldsRecord = FieldsRecord> extends EntryBase<F> {
  kind: 'page'
  sitemap?: PageSitemapType
}

export interface CollectionOptions<F extends FieldsRecord> extends EntryOptions {
  singularLabel: TextType
  // Create button ("Nueva categoría"); defaults to the catalog's "Nuevo {name}".
  newLabel?: TextType
  titleField: keyof ValuesOf<F> & string
  slugField?: keyof ValuesOf<F> & string
  // Manual order (team, testimonials…) instead of most recent first.
  orderable?: boolean
  // Parent collection: shown as one of its tabs instead of its own menu item.
  under?: string
  // Label of this collection's own tab when others live under it.
  tabLabel?: TextType
  // Only exists to be referenced (authors, categories): always visible, so a picked item never vanishes from the site.
  referenceOnly?: boolean
  // How its documents are listed in the sitemap; false leaves them out.
  sitemap?: PageSitemapType | false
}

// Repeatable content with its own listing, like blog posts.
export interface CollectionEntry<F extends FieldsRecord = FieldsRecord> extends EntryBase<F> {
  kind: 'collection'
  singularLabel: TextType
  newLabel?: TextType
  titleField: string
  slugField?: string
  orderable: boolean
  under?: string
  tabLabel?: TextType
  referenceOnly: boolean
  sitemap?: PageSitemapType | false
}

export type SchemaEntry = SingletonEntry | PageEntry | CollectionEntry

export type ContentSchema = Record<string, SchemaEntry>

export const singleton = <const F extends FieldsRecord>(label: TextType, fields: F, options: EntryOptions = {}): SingletonEntry<F> =>
  ({ kind: 'singleton', label, fields, ...options })

type SeoGroup = ReturnType<typeof seo>

type PageFields<F extends FieldsRecord, P extends EntryPathType | undefined> = P extends EntryPathType ? F & { seo: SeoGroup } : F

// Pages with a URL get a trailing SEO section; system pages (404) don't.
export const page = <const F extends FieldsRecord, const P extends EntryPathType | undefined = undefined>(
  label: TextType,
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
        ...seo(seoDefaults),
        section: { icon: 'pi-google', hideable: false }
      }
    }
    : sections) as PageFields<F, P>
})

export const collection = <const F extends FieldsRecord>(label: TextType, fields: F, options: CollectionOptions<F>): CollectionEntry<F> =>
  ({
    kind: 'collection',
    label,
    fields,
    ...options,
    orderable: options.orderable ?? false,
    referenceOnly: options.referenceOnly ?? false
  })

export const defineSchema = <const S extends ContentSchema>(schema: S): S => schema

export type EntryValues<E extends SchemaEntry> = E extends { fields: infer F extends FieldsRecord } ? ValuesOf<F> : never

export type StoredEntryValues<E extends SchemaEntry> = E extends { fields: infer F extends FieldsRecord } ? ValuesOf<F, true> : never
