import { fieldDefinition } from './config'
import { withDefaults } from './defaults'
import { isRecord } from './kinds/shared'
import { leafVariants } from './locales'
import { missingTranslations } from './translations'
import { validateContent } from './validation'
import { dataFields } from './walk'
import type { CmsConfigType } from './config'
import type { FieldsRecord } from './fields'
import type { LocalizedTextType } from './text'

export interface MissingContentType {
  // Data path: "hero.title.en", "photos.es.0", or the image field for an alt text.
  path: string
  // The field without its locale ("hero.title"): what the editor focuses.
  field: string
  // null for a value shared by every language.
  locale: string | null
  kind: 'field' | 'alt' | 'poster'
}

// "cta.label.en" → { field: 'cta.label', locale: 'en' }; a path without a locale segment stays whole.
export const splitLocale = (config: CmsConfigType, path: string): { field: string, locale: string | null } => {
  const segments = path.split('.')
  const index = segments.findLastIndex(segment => config.locales.includes(segment))
  return index <= 0 ? { field: path, locale: null } : { field: segments.slice(0, index).join('.'), locale: segments[index] }
}

interface MissingContentOptionsType {
  // Alt text of a media item per locale; without it, alt texts are not checked.
  mediaAlt?: (id: string) => LocalizedTextType | undefined
  // true for a video that has no poster yet; without it, posters are not checked.
  mediaPoster?: (id: string) => boolean | undefined
}

type PosterCheckType = NonNullable<MissingContentOptionsType['mediaPoster']>

// The video fields whose file still has no poster, in any language they are used in.
const missingPosters = (config: CmsConfigType, fields: FieldsRecord, data: unknown, path: string, mediaPoster: PosterCheckType): MissingContentType[] => {
  const source = isRecord(data) ? data : {}
  return dataFields(fields).flatMap(([key, field]): MissingContentType[] => {
    const fieldPath = path ? `${path}.${key}` : key
    const value = source[key]
    switch (field.kind) {
      case 'group':
        return missingPosters(config, field.fields, value, fieldPath, mediaPoster)
      case 'list':
        return (Array.isArray(value) ? value : []).flatMap((item, index) => missingPosters(config, field.fields, item, `${fieldPath}.${index}`, mediaPoster))
      case 'blocks':
        return (Array.isArray(value) ? value : []).flatMap((item, index) => {
          const type = isRecord(item) ? item._type : undefined
          const block = typeof type === 'string' && Object.hasOwn(field.blocks, type) ? field.blocks[type] : undefined
          return block ? missingPosters(config, block.fields, item, `${fieldPath}.${index}`, mediaPoster) : []
        })
      default: {
        if (field.kind !== 'videoFile' || value === undefined) return []
        const definition = fieldDefinition(config, field.kind)
        const ids = leafVariants(config, field, value).flatMap(variant => (variant.value === undefined ? [] : definition.references(variant.value, field).media ?? []))
        return ids.some(id => mediaPoster(id)) ? [{ path: fieldPath, field: fieldPath, locale: null, kind: 'poster' }] : []
      }
    }
  })
}

// Everything that keeps a document out of the publication: required values, translations and alt texts.
export const missingContent = async (
  config: CmsConfigType, fields: FieldsRecord, data: unknown, { mediaAlt, mediaPoster }: MissingContentOptionsType = {}
): Promise<MissingContentType[]> => {
  const stored = withDefaults(config, fields, data)
  const { errors } = await validateContent(config, fields, stored, { mode: 'publish' })
  const values = Object.keys(errors ?? {}).map(path => ({ path, ...splitLocale(config, path), kind: 'field' as const }))
  const alts = mediaAlt
    ? missingTranslations(config, fields, stored, { mediaAlt })
      .filter(item => item.kind === 'alt')
      .map(item => ({ path: item.path, field: item.path, locale: item.locale, kind: 'alt' as const }))
    : []
  const posters = mediaPoster ? missingPosters(config, fields, stored, '', mediaPoster) : []
  return [...values, ...alts, ...posters]
}

// Missing items per locale, every locale listed; shared values count in the default one.
export const countByLocale = (config: CmsConfigType, missing: Pick<MissingContentType, 'locale'>[]): Record<string, number> =>
  Object.fromEntries(config.locales.map(locale => [
    locale,
    missing.filter(item => (item.locale ?? config.defaultLocale) === locale).length
  ]))

// The same per page section (the first segment of the field path).
export const countBySectionAndLocale = (
  config: CmsConfigType, missing: Pick<MissingContentType, 'field' | 'locale'>[]
): Record<string, Record<string, number>> => {
  const sections = missing.reduce<Record<string, typeof missing>>((acc, item) => {
    const key = item.field.split('.')[0]
    acc[key] = [...(acc[key] ?? []), item]
    return acc
  }, {})
  return Object.fromEntries(Object.entries(sections).map(([key, items]) => [key, countByLocale(config, items)]))
}
