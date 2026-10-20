import { CmsConfigError, fieldDefinition } from './config'
import { withDefaults } from './defaults'
import { isRecord } from './kinds/shared'
import { fieldLocalize, inheritsOriginal, isBlank, leafVariants, missingInLeaf } from './locales'
import { missingAltLocales } from './media'
import { dataFields } from './walk'
import type { CmsConfigType } from './config'
import type { DataField, FieldsRecord } from './fields'
import type { ValuesOf } from './infer'
import type { LeafField } from './kinds/registry'
import type { LocalizedTextType } from './text'

type DataRecord = Record<string, unknown>

const asRecord = (value: unknown): DataRecord => (isRecord(value) ? value : {})

const resolveLeaf = (config: CmsConfigType, field: LeafField, stored: unknown, locale: string): unknown => {
  const mode = fieldLocalize(config, field)
  if (mode === false) return stored
  const map = asRecord(stored)
  const { defaultLocale } = config

  if (mode === 'translate') {
    const own = map[locale]
    return own !== undefined && !fieldDefinition(config, field.kind).isEmpty(own, field) ? own : map[defaultLocale]
  }
  if (mode === 'inherit') return inheritsOriginal(map[locale]) ? map[defaultLocale] : map[locale]

  const parts = Object.fromEntries(Object.keys(mode).map(part => {
    const values = asRecord(map[part])
    return [part, isBlank(values[locale]) ? values[defaultLocale] : values[locale]]
  }))
  return { ...map, ...parts }
}

const resolveField = (config: CmsConfigType, field: DataField, stored: unknown, locale: string): unknown => {
  switch (field.kind) {
    case 'group':
      return resolveFields(config, field.fields, stored, locale)
    case 'list':
      return (Array.isArray(stored) ? stored : []).map(item => ({ _key: asRecord(item)._key, ...resolveFields(config, field.fields, item, locale) }))
    case 'blocks':
      return (Array.isArray(stored) ? stored : []).map(item => {
        const { _key, _type } = asRecord(item)
        return { _key, _type, ...resolveFields(config, field.blocks[_type as string].fields, item, locale) }
      })
    default:
      return resolveLeaf(config, field, stored, locale)
  }
}

const resolveFields = (config: CmsConfigType, fields: FieldsRecord, stored: unknown, locale: string): DataRecord => {
  const source = asRecord(stored)
  return Object.fromEntries(dataFields(fields).map(([key, field]) => [key, resolveField(config, field, source[key], locale)]))
}

// The content as the site reads it in one locale: plain values, typed from the schema. A text that is still
// missing falls back to the default locale (publishing blocks it anyway); images use their override or the original.
export const resolveContent = <F extends FieldsRecord>(config: CmsConfigType, fields: F, data: unknown, locale: string = config.defaultLocale): ValuesOf<F> => {
  if (!config.locales.includes(locale)) throw new CmsConfigError(`"${locale}" is not one of the locales (${config.locales.join(', ')}).`)
  return resolveFields(config, fields, withDefaults(config, fields, data), locale) as ValuesOf<F>
}

export interface MissingType {
  // Data path of what is missing: "hero.title.en", "cta.label.en", or the image field for an alt text.
  path: string
  locale: string
  kind: 'text' | 'alt'
}

interface MissingOptionsType {
  // Alt text of a media item per locale; without it, alt texts are not checked.
  mediaAlt?: (id: string) => LocalizedTextType | undefined
}

const missingAlt = (config: CmsConfigType, field: LeafField, value: unknown, path: string, mediaAlt: NonNullable<MissingOptionsType['mediaAlt']>): MissingType[] => {
  const definition = fieldDefinition(config, field.kind)
  const variants = new Map(leafVariants(config, field, value).map(variant => [variant.locale, variant]))
  const original = variants.get(config.defaultLocale)?.value

  return config.locales.filter(locale => locale !== config.defaultLocale).flatMap(locale => {
    const used = variants.get(locale)?.value ?? original
    if (used === undefined) return []
    const ids = definition.references(used, field).media ?? []
    const lacking = ids.some(id => missingAltLocales(config, mediaAlt(id) ?? {}).includes(locale))
    return lacking ? [{ path, locale, kind: 'alt' as const }] : []
  })
}

const collectMissing = (config: CmsConfigType, fields: FieldsRecord, data: unknown, path: string, options: MissingOptionsType): MissingType[] => {
  const source = asRecord(data)
  return dataFields(fields).flatMap(([key, field]) => {
    const fieldPath = path ? `${path}.${key}` : key
    const value = source[key]
    switch (field.kind) {
      case 'group':
        return collectMissing(config, field.fields, value, fieldPath, options)
      case 'list':
        return (Array.isArray(value) ? value : []).flatMap((item, index) => collectMissing(config, field.fields, item, `${fieldPath}.${index}`, options))
      case 'blocks':
        return (Array.isArray(value) ? value : []).flatMap((item, index) => {
          const type = asRecord(item)._type
          const block = typeof type === 'string' && Object.hasOwn(field.blocks, type) ? field.blocks[type] : undefined
          return block ? collectMissing(config, block.fields, item, `${fieldPath}.${index}`, options) : []
        })
      default: {
        if (value === undefined) return []
        const texts = missingInLeaf(config, field, value).map(missing => ({ path: `${fieldPath}.${missing.path}`, locale: missing.locale, kind: 'text' as const }))
        const alts = options.mediaAlt ? missingAlt(config, field, value, fieldPath, options.mediaAlt) : []
        return [...texts, ...alts]
      }
    }
  })
}

// What blocks publishing in other locales: texts filled in the default locale but not in another one,
// and alt texts of the images in use. Inherited images are never missing.
export const missingTranslations = (config: CmsConfigType, fields: FieldsRecord, data: unknown, options: MissingOptionsType = {}): MissingType[] =>
  (config.locales.length > 1 ? collectMissing(config, fields, data, '', options) : [])

// "Inglés · faltan 4": missing values per locale, every non-default locale listed.
export const localeProgress = (config: CmsConfigType, missing: MissingType[]): Record<string, number> =>
  Object.fromEntries(config.locales
    .filter(locale => locale !== config.defaultLocale)
    .map(locale => [locale, missing.filter(item => item.locale === locale).length]))
