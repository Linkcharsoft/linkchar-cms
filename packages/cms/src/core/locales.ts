import { fieldDefinition } from './config'
import { isRecord } from './kinds/shared'
import type { CmsConfigType } from './config'
import type { FieldDefinitionType, LeafField, LocalizeType } from './kinds/registry'

// How a localized value is stored: one entry per locale, e.g. { es: 'Hola', en: 'Hello' }.
export type LocalizedType<T> = { [locale: string]: T }

export const localizeOf = (definition: FieldDefinitionType, field: LeafField): LocalizeType => {
  const { localized } = field as { localized?: boolean }
  if (localized === false) return false
  if (localized === true && definition.localize === false) return 'translate'
  return definition.localize
}

export const fieldLocalize = (config: CmsConfigType, field: LeafField): LocalizeType =>
  localizeOf(fieldDefinition(config, field.kind), field)

const partsOf = (mode: LocalizeType) => (typeof mode === 'object' ? Object.keys(mode) : [])

const LOCALE_KEY = /^[a-z]{2,3}(-[A-Z]{2})?$/

// Keys shaped like locale codes, one of them configured: a map, even with a locale the project dropped.
export const isLocaleMap = (value: unknown, locales: readonly string[]): value is Record<string, unknown> => {
  if (!isRecord(value)) return false
  const keys = Object.keys(value)
  return keys.length === 0 || (keys.every(key => LOCALE_KEY.test(key)) && keys.some(key => locales.includes(key)))
}

// A plain (not yet localized) value belongs to the default locale: content saved before a field was localized.
const atLocale = (config: CmsConfigType, value: unknown, locale: string): unknown =>
  (isLocaleMap(value, config.locales) ? value[locale] : locale === config.defaultLocale ? value : undefined)

const join = (head: string, inner: string) => (inner ? `${head}.${inner}` : head)

// An image, file or gallery of another locale that holds nothing reuses the original: null and [] included.
export const inheritsOriginal = (value: unknown) => value === undefined || value === null || (Array.isArray(value) && value.length === 0)

// Emptiness of a localized part (button label, opening hours note).
export const isBlank = (value: unknown) =>
  value === undefined || value === null || (typeof value === 'string' && !value.trim()) || (Array.isArray(value) && value.length === 0)

// The value as stored: localized fields as complete maps (translate) or the original plus overrides (inherit).
// Missing values take the schema default, which may itself be a { es, en } map.
export const storedLeaf = (config: CmsConfigType, field: LeafField, value: unknown): unknown => {
  const definition = fieldDefinition(config, field.kind)
  const mode = localizeOf(definition, field)
  const { defaultLocale, locales } = config
  const schemaDefault = (field as { default?: unknown }).default

  const seed = (locale: string): unknown => {
    if (schemaDefault === undefined) return definition.defaultValue(field)
    const seeded = mode !== false && isLocaleMap(schemaDefault, locales) ? schemaDefault[locale]
      : locale === defaultLocale || mode === false ? schemaDefault : undefined
    return seeded === undefined ? definition.defaultValue(field) : definition.normalize(structuredClone(seeded), field)
  }

  const plain = (locale: string): unknown => {
    const current = value === undefined ? undefined : atLocale(config, value, locale)
    return current === undefined ? seed(locale) : definition.normalize(current, field)
  }

  if (mode === false) {
    if (value === undefined) return seed(defaultLocale)
    const shared = isLocaleMap(value, locales) && Object.keys(value).length > 0 ? value[defaultLocale] : value
    return shared === undefined ? seed(defaultLocale) : definition.normalize(shared, field)
  }

  if (mode === 'translate') return Object.fromEntries(locales.map(locale => [locale, plain(locale)]))

  if (mode === 'inherit') {
    const overrides = locales.filter(locale => locale !== defaultLocale && isLocaleMap(value, locales) && value[locale] !== undefined)
    return Object.fromEntries([defaultLocale, ...overrides].map(locale => [locale, plain(locale)]))
  }

  const source = isRecord(value) ? value : undefined
  const record = (plainValue: unknown) => plainValue as Record<string, unknown>
  const base = record(source === undefined ? seed(defaultLocale) : definition.normalize(
    { ...source, ...Object.fromEntries(partsOf(mode).map(part => [part, atLocale(config, source[part], defaultLocale)])) },
    field
  ))
  const stored = { ...base }
  for (const part of partsOf(mode)) {
    stored[part] = Object.fromEntries(locales.map(locale => {
      if (locale === defaultLocale) return [locale, base[part]]
      const own = source === undefined ? undefined : atLocale(config, source[part], locale)
      const filled = own === undefined ? seed(locale) : definition.normalize({ ...base, [part]: own }, field)
      return [locale, record(filled)[part]]
    }))
  }
  return stored
}

export interface LeafVariantType {
  locale: string
  // What the kind's own functions understand: the plain value for this locale.
  value: unknown
  // Data path of something inside `value` ('' is the value itself) for this locale.
  path: (inner: string) => string
  // Only these keys belong to this locale (localized parts); null means the whole value does.
  parts: string[] | null
  // A localized value of the default locale, or a non-localized one.
  primary: boolean
}

// One entry per locale that has a value of its own; inherited images skip the locales that reuse the original.
export const leafVariants = (config: CmsConfigType, field: LeafField, value: unknown): LeafVariantType[] => {
  const mode = fieldLocalize(config, field)
  const { defaultLocale, locales } = config

  if (mode === false) {
    const shared = isLocaleMap(value, locales) && Object.keys(value).length > 0 ? value[defaultLocale] : value
    return [{ locale: defaultLocale, value: shared, path: inner => inner, parts: null, primary: true }]
  }

  if (mode === 'translate' || mode === 'inherit') {
    const own = mode === 'translate' ? locales : locales.filter(locale => locale === defaultLocale || !inheritsOriginal(atLocale(config, value, locale)))
    return own.map(locale => ({
      locale,
      value: atLocale(config, value, locale),
      path: inner => join(locale, inner),
      parts: null,
      primary: locale === defaultLocale
    }))
  }

  const parts = partsOf(mode)
  const source = isRecord(value) ? value : undefined
  return locales.map(locale => ({
    locale,
    value: source === undefined ? undefined : { ...source, ...Object.fromEntries(parts.map(part => [part, atLocale(config, source[part], locale)])) },
    path: inner => {
      const part = parts.find(name => inner === name || inner.startsWith(`${name}.`))
      return part ? `${part}.${locale}${inner.slice(part.length)}` : inner
    },
    parts: locale === defaultLocale ? null : parts,
    primary: locale === defaultLocale
  }))
}

export interface MissingTranslationType {
  // Inner path of the missing value, from the field ('en', 'label.en').
  path: string
  locale: string
}

// The publishing rule: what is filled in the default locale must be filled in every locale.
export const missingInLeaf = (config: CmsConfigType, field: LeafField, value: unknown): MissingTranslationType[] => {
  const definition = fieldDefinition(config, field.kind)
  const mode = localizeOf(definition, field)
  if (mode === false || mode === 'inherit') return []
  const variants = leafVariants(config, field, value)
  const primary = variants.find(variant => variant.primary)
  if (!primary) return []

  if (mode === 'translate') {
    if (primary.value === undefined || definition.isEmpty(primary.value, field)) return []
    return variants
      .filter(variant => !variant.primary && (variant.value === undefined || definition.isEmpty(variant.value, field)))
      .map(variant => ({ path: variant.path(''), locale: variant.locale }))
  }

  return partsOf(mode).flatMap(part => {
    const filled = !isBlank((primary.value as Record<string, unknown> | undefined)?.[part])
    if (!filled) return []
    return variants
      .filter(variant => !variant.primary && isBlank((variant.value as Record<string, unknown> | undefined)?.[part]))
      .map(variant => ({ path: variant.path(part), locale: variant.locale }))
  })
}
