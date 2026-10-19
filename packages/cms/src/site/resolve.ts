import { isRecord } from '../core/kinds/shared'
import { sanitizeHref } from '../core/richText/nodes'
import { resolveContent } from '../core/translations'
import { entryPath } from '../core/urls'
import { dataFields } from '../core/walk'
import type { SiteFileType, SiteImageType, SiteLinkType, SiteValuesOf } from './types'
import type { CmsConfigType } from '../core/config'
import type { DataField, FieldsRecord } from '../core/fields'
import type { MediaItemType } from '../core/media'
import type { RichTextDocType, RichTextMarkType, RichTextNodeType } from '../core/richText/nodes'
import type { LocalizedTextType } from '../core/text'

type DataRecord = Record<string, unknown>

export interface LinkTargetType {
  type: string
  slugs: Record<string, string>
}

// What a document's content points to, loaded once per request: its files and the documents its links reach.
export interface SiteRefsType {
  media: ReadonlyMap<string, MediaItemType>
  documents: ReadonlyMap<string, LinkTargetType>
}

interface ResolveContextType {
  config: CmsConfigType
  refs: SiteRefsType
  locale: string
}

const asRecord = (value: unknown): DataRecord => (isRecord(value) ? value : {})

const textIn = ({ config, locale }: ResolveContextType, value: LocalizedTextType) =>
  (value[locale]?.trim() ? value[locale] : value[config.defaultLocale] ?? '')

export const siteImage = (ctx: ResolveContextType, item: MediaItemType): SiteImageType => ({
  id: item.id,
  src: item.url,
  alt: textIn(ctx, item.alt),
  caption: textIn(ctx, item.caption),
  width: item.width,
  height: item.height,
  focalX: item.focalX,
  focalY: item.focalY,
  blurDataUrl: item.blurDataUrl
})

const siteFile = (item: MediaItemType): SiteFileType => ({ id: item.id, src: item.url, filename: item.filename, mime: item.mime, size: item.size })

const mediaOf = ({ refs }: ResolveContextType, id: unknown) => (typeof id === 'string' ? refs.media.get(id) : undefined)

// The URL of a page or document of the site in the locale being read; '' when it is not on the site.
const entryHref = ({ config, refs, locale }: ResolveContextType, value: DataRecord) => {
  const entry = typeof value.entry === 'string' && Object.hasOwn(config.schema, value.entry) ? config.schema[value.entry] : undefined
  if (!entry) return ''
  let path: string | null
  if (entry.kind === 'collection') {
    const target = typeof value.id === 'string' ? refs.documents.get(value.id) : undefined
    if (!target || target.type !== value.entry) return ''
    path = entryPath(config, entry, { locale, slug: target.slugs[locale] ?? target.slugs[config.defaultLocale] })
  } else {
    path = entryPath(config, entry, { locale })
  }
  if (!path) return ''
  return typeof value.anchor === 'string' && value.anchor ? `${path}#${value.anchor}` : path
}

const hrefOf = (ctx: ResolveContextType, value: DataRecord) => {
  const href = typeof value.href === 'string' ? value.href.trim() : ''
  switch (value.type) {
    case 'entry':
      return entryHref(ctx, value)
    case 'email':
      return href ? `mailto:${href}` : ''
    case 'tel':
      return href ? `tel:${href.replace(/[^\d+]/g, '')}` : ''
    default:
      return sanitizeHref(href) ?? ''
  }
}

export const siteLink = (ctx: ResolveContextType, value: unknown): SiteLinkType => {
  const link = asRecord(value)
  return { href: hrefOf(ctx, link), newTab: link.newTab === true, external: link.type === 'external' }
}

const resolveMark = (ctx: ResolveContextType, mark: RichTextMarkType): RichTextMarkType => {
  if (mark.type !== 'link') return mark
  const attrs = asRecord(mark.attrs)
  const href = attrs.entry ? entryHref(ctx, attrs) : sanitizeHref(attrs.href) ?? ''
  return { type: 'link', attrs: { href, target: attrs.target === '_blank' ? '_blank' : null } }
}

const resolveNodes = (ctx: ResolveContextType, nodes: RichTextNodeType[]): RichTextNodeType[] => nodes.flatMap(node => {
  if (node.type === 'image') {
    const item = mediaOf(ctx, node.attrs?.mediaId)
    if (!item) return []
    const image = siteImage(ctx, item)
    const caption = typeof node.attrs?.caption === 'string' && node.attrs.caption ? node.attrs.caption : image.caption
    return [{ type: 'image', attrs: { mediaId: item.id, src: image.src, alt: image.alt, width: image.width, height: image.height, caption } }]
  }
  return [{
    ...node,
    ...(node.marks ? { marks: node.marks.map(mark => resolveMark(ctx, mark)) } : {}),
    ...(node.content ? { content: resolveNodes(ctx, node.content) } : {})
  }]
})

const resolveField = (ctx: ResolveContextType, field: DataField, value: unknown): unknown => {
  switch (field.kind) {
    case 'group':
      return resolveFields(ctx, field.fields, value)
    case 'list':
      return (Array.isArray(value) ? value : []).map(item => ({ ...asRecord(item), ...resolveFields(ctx, field.fields, item) }))
    case 'blocks':
      return (Array.isArray(value) ? value : []).map(item => {
        const type = asRecord(item)._type
        const block = typeof type === 'string' && Object.hasOwn(field.blocks, type) ? field.blocks[type] : undefined
        return block ? { ...asRecord(item), ...resolveFields(ctx, block.fields, item) } : asRecord(item)
      })
    case 'image': {
      const item = mediaOf(ctx, value)
      return item ? siteImage(ctx, item) : null
    }
    case 'file': {
      const item = mediaOf(ctx, value)
      return item ? siteFile(item) : null
    }
    case 'gallery':
      return (Array.isArray(value) ? value : []).flatMap(id => {
        const item = mediaOf(ctx, id)
        return item ? [siteImage(ctx, item)] : []
      })
    case 'link':
      return siteLink(ctx, value)
    case 'button': {
      const button = asRecord(value)
      return { label: typeof button.label === 'string' ? button.label : '', variant: button.variant, link: siteLink(ctx, button.link) }
    }
    case 'richText': {
      const doc = value as RichTextDocType | null
      return doc ? { ...doc, content: resolveNodes(ctx, doc.content ?? []) } : null
    }
    default:
      return value
  }
}

const resolveFields = (ctx: ResolveContextType, fields: FieldsRecord, values: unknown): DataRecord => {
  const source = asRecord(values)
  return Object.fromEntries(dataFields(fields).map(([key, field]) => [key, resolveField(ctx, field, source[key])]))
}

// The content of a page or document as the site renders it in one locale.
export const resolveSiteContent = <F extends FieldsRecord>(config: CmsConfigType, fields: F, data: unknown, locale: string, refs: SiteRefsType): SiteValuesOf<F> =>
  resolveFields({ config, refs, locale }, fields, resolveContent(config, fields, data, locale)) as SiteValuesOf<F>
