import { withDefaults } from '../core/defaults'
import { getCollection, getEntry } from '../core/entries'
import { documentReferences } from '../core/references'
import { alternates, absoluteUrl, entryUrls } from '../core/urls'
import { mediaItemFrom } from '../server/media'
import { resolveSiteContent } from './resolve'
import type { LinkTargetType, SiteRefsType } from './resolve'
import type { SiteDocumentType } from './types'
import type { CmsConfigType, CollectionIdType, EntryIdType } from '../core/config'
import type { SchemaEntry } from '../core/define'
import type { MediaItemType } from '../core/media'
import type { CmsClientType } from '../server/context'
import type { MetadataRoute } from 'next'

export interface SiteSourceType {
  db: CmsClientType
  // True in Draft Mode with a panel session: drafts are read instead of what is published.
  draft: boolean
}

export interface SiteReadersOptionsType {
  config: CmsConfigType
  supabaseUrl: string
  // Where each read goes: the published copy, or the drafts while previewing.
  source: () => Promise<SiteSourceType>
  // Published content only, for what is built ahead (static params, sitemap).
  published: () => CmsClientType
}

export type FixedEntryIdType = Exclude<EntryIdType, CollectionIdType>

interface LocaleOptionsType {
  locale?: string
}

export interface ListOptionsType extends LocaleOptionsType {
  limit?: number
  offset?: number
}

interface RowType {
  id: string
  type: string
  data: unknown
  slugs: unknown
  published_at?: string | null
}

const PUBLISHED = 'id, type, data, slugs, published_at'
const DRAFT = 'id, type, data, slugs'

const strings = (value: unknown): Record<string, string> =>
  (value && typeof value === 'object' && !Array.isArray(value)
    ? Object.fromEntries(Object.entries(value).filter((pair): pair is [string, string] => typeof pair[1] === 'string' && !!pair[1]))
    : {})

export const createSiteReaders = ({ config, supabaseUrl, source, published }: SiteReadersOptionsType) => {
  const localeOf = (options: LocaleOptionsType = {}) => {
    const locale = options.locale ?? config.defaultLocale
    if (!config.locales.includes(locale)) throw new Error(`[@linkcharsoft/cms] "${locale}" is not one of the locales (${config.locales.join(', ')}).`)
    return locale
  }

  const entryOf = (id: string): SchemaEntry => {
    const entry = getEntry(config, id)
    if (!entry) throw new Error(`[@linkcharsoft/cms] "${id}" is not an entry of the schema.`)
    return entry
  }

  // The files and link targets of every row, loaded in two queries.
  const loadRefs = async ({ db, draft }: SiteSourceType, rows: RowType[]): Promise<SiteRefsType> => {
    const found = rows.map(row => {
      const { fields } = entryOf(row.type)
      return documentReferences(config, fields, withDefaults(config, fields, row.data))
    })
    const mediaIds = [...new Set(found.flatMap(refs => refs.media))]
    const documentIds = [...new Set(found.flatMap(refs => refs.relations))]
    const [media, documents] = await Promise.all([
      mediaIds.length > 0 ? db.from('media').select('*').in('id', mediaIds).is('deleted_at', null).then(({ data }) => data ?? []) : [],
      documentIds.length === 0
        ? []
        : draft
          ? db.from('documents').select('id, type, slugs').in('id', documentIds).is('deleted_at', null).then(({ data }) => data ?? [])
          : db.from('published_documents').select('id, type, slugs').in('id', documentIds).then(({ data }) => data ?? [])
    ])
    return {
      media: new Map<string, MediaItemType>(media.map(row => [row.id, mediaItemFrom(supabaseUrl, row)])),
      documents: new Map<string, LinkTargetType>(documents.map(row => [row.id, { type: row.type, slugs: strings(row.slugs) }]))
    }
  }

  const toDocument = <K extends EntryIdType>(entryId: K, row: RowType | null, locale: string, from: SiteSourceType, refs: SiteRefsType): SiteDocumentType<K> => {
    const entry = entryOf(entryId)
    const slugs = row ? strings(row.slugs) : {}
    const urls = entryUrls(config, entry, slugs)
    return {
      id: row?.id ?? null,
      entry: entryId,
      locale,
      slug: slugs[locale] ?? null,
      path: urls[locale] ?? null,
      urls,
      publishedAt: row?.published_at ?? null,
      draft: from.draft,
      content: resolveSiteContent(config, entry.fields, row?.data ?? {}, locale, refs) as SiteDocumentType<K>['content']
    }
  }

  const documentsOf = async <K extends EntryIdType>(entryId: K, rows: RowType[], locale: string, from: SiteSourceType) => {
    const refs = await loadRefs(from, rows)
    return rows.map(row => toDocument(entryId, row, locale, from, refs))
  }

  // A page or singleton in one locale; before its first publish it reads as the schema defaults.
  const getEntryContent = async <K extends FixedEntryIdType>(id: K, options?: LocaleOptionsType): Promise<SiteDocumentType<K>> => {
    const locale = localeOf(options)
    if (entryOf(id).kind === 'collection') throw new Error(`[@linkcharsoft/cms] "${id}" is a collection: use getDocumentBySlug or listDocuments.`)
    const from = await source()
    const { data } = from.draft
      ? await from.db.from('documents').select(DRAFT).eq('type', id).eq('key', id).is('deleted_at', null).maybeSingle()
      : await from.db.from('published_documents').select(PUBLISHED).eq('type', id).eq('key', id).maybeSingle()
    const row = data as RowType | null
    return toDocument(id, row, locale, from, await loadRefs(from, row ? [row] : []))
  }

  const collectionOf = (id: string) => {
    const entry = getCollection(config, id)
    if (!entry) throw new Error(`[@linkcharsoft/cms] "${id}" is not a collection.`)
    return entry
  }

  const documentsQuery = ({ db, draft }: SiteSourceType, collection: string) => (draft
    ? db.from('documents').select(DRAFT).eq('type', collection).eq('visible', true).is('deleted_at', null)
    : db.from('published_documents').select(PUBLISHED).eq('type', collection))

  // A document of a collection by its slug in one locale; null when there is none.
  const getDocumentBySlug = async <K extends CollectionIdType>(collection: K, slug: string, options?: LocaleOptionsType): Promise<SiteDocumentType<K> | null> => {
    const locale = localeOf(options)
    collectionOf(collection)
    const from = await source()
    const { data } = await documentsQuery(from, collection).contains('slugs', { [locale]: slug }).limit(1)
    const rows = (data ?? []) as RowType[]
    return rows.length > 0 ? (await documentsOf(collection, rows, locale, from))[0] : null
  }

  // Manual order for orderable collections, most recent first for the rest.
  const listDocuments = async <K extends CollectionIdType>(collection: K, { limit = 100, offset = 0, ...options }: ListOptionsType = {}): Promise<SiteDocumentType<K>[]> => {
    const locale = localeOf(options)
    const entry = collectionOf(collection)
    const from = await source()
    const query = documentsQuery(from, collection)
    const ordered = entry.orderable
      ? query.order('sort_order', { ascending: true })
      : query.order(from.draft ? 'updated_at' : 'published_at', { ascending: false })
    const { data } = await ordered.range(offset, offset + limit - 1)
    return documentsOf(collection, (data ?? []) as RowType[], locale, from)
  }

  // Picked documents (a relation field), in the order they were picked; missing ones are left out.
  const getDocuments = async <K extends CollectionIdType>(collection: K, ids: readonly string[], options?: LocaleOptionsType): Promise<SiteDocumentType<K>[]> => {
    const locale = localeOf(options)
    collectionOf(collection)
    if (ids.length === 0) return []
    const from = await source()
    const { data } = await documentsQuery(from, collection).in('id', [...ids])
    const rows = (data ?? []) as RowType[]
    const documents = await documentsOf(collection, rows, locale, from)
    return ids.flatMap(id => documents.filter(document => document.id === id))
  }

  // For generateStaticParams: the slug of every published document in one locale.
  const staticParams = async (collection: CollectionIdType, options?: LocaleOptionsType): Promise<{ slug: string }[]> => {
    const locale = localeOf(options)
    collectionOf(collection)
    const { data } = await published().from('published_documents').select('slugs').eq('type', collection)
    return (data ?? []).flatMap(row => {
      const slug = strings(row.slugs)[locale]
      return slug ? [{ slug }] : []
    })
  }

  const sitemapOf = (entry: SchemaEntry) => (entry.kind === 'singleton' ? undefined : entry.sitemap)

  // Every published URL in every locale, each with the other languages as alternates.
  const sitemap = async (): Promise<MetadataRoute.Sitemap> => {
    const listed = Object.entries(config.schema).filter(([, entry]) => entry.path && sitemapOf(entry) !== false).map(([id]) => id)
    if (listed.length === 0) return []
    const { data } = await published().from('published_documents').select('type, slugs, paths, published_at').in('type', listed)
    return (data ?? []).flatMap(row => {
      const entry = entryOf(row.type)
      const paths = strings(row.paths)
      const urls = Object.keys(paths).length > 0 ? paths : entryUrls(config, entry, strings(row.slugs))
      const { languages } = alternates(config, urls, config.defaultLocale)
      const options = sitemapOf(entry) || null
      return Object.values(urls).map(path => ({
        url: absoluteUrl(config, path),
        lastModified: row.published_at,
        ...(options ? { changeFrequency: options.changeFrequency, priority: options.priority } : {}),
        alternates: { languages }
      }))
    })
  }

  return { getEntryContent, getDocumentBySlug, listDocuments, getDocuments, staticParams, sitemap }
}

export type SiteReadersType = ReturnType<typeof createSiteReaders>
