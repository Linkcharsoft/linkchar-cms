import { createTranslator } from './i18n/translator'
import { dataFields } from './walk'
import type { ContentSchema, EntryValues } from './define'
import type { DataField, FieldsRecord } from './fields'
import type { MessageOverridesType, TranslatorType } from './i18n/types'

export interface MediaFolderType {
  value: string
  label: string
}

export interface BrandingType {
  name: string
  logo?: string
  // Line under the sidebar, e.g. who to contact for support.
  footer?: string
}

// Filled in by the publish adapters (stage 2): Amplify build hook first.
export interface PublishTargetType {
  name: string
}

// Project screens and menu items with the panel layout (stage 3).
export interface CmsExtensionType {
  id: string
}

export interface CmsConfigInputType<S extends ContentSchema, L extends string> {
  schema: S
  locales?: readonly L[]
  defaultLocale?: NoInfer<L>
  // Language of the panel itself, independent from the content locales.
  panelLocale?: string
  basePath?: string
  timeZone?: string
  branding?: BrandingType
  mediaFolders?: readonly MediaFolderType[]
  publishTarget?: PublishTargetType
  extensions?: readonly CmsExtensionType[]
  messages?: MessageOverridesType
}

export interface CmsConfigType<S extends ContentSchema = ContentSchema, L extends string = string> {
  schema: S
  locales: readonly L[]
  defaultLocale: L
  panelLocale: string
  basePath: string
  timeZone: string
  branding: BrandingType
  mediaFolders: readonly MediaFolderType[]
  publishTarget: PublishTargetType | null
  extensions: readonly CmsExtensionType[]
  messages: MessageOverridesType
}

export class CmsConfigError extends Error {
  constructor (message: string) {
    super(`[@linkcharsoft/cms] ${message}`)
    this.name = 'CmsConfigError'
  }
}

const LOCALE = /^[a-z]{2,3}(-[A-Z]{2})?$/

const nestedFields = (field: DataField): FieldsRecord[] => {
  if (field.kind === 'group' || field.kind === 'list') return [field.fields]
  if (field.kind === 'blocks') return Object.values(field.blocks).map(block => block.fields)
  return []
}

const checkFields = (schema: ContentSchema, fields: FieldsRecord, where: string) => {
  const keys = dataFields(fields).map(([key]) => key)
  for (const [key, field] of dataFields(fields)) {
    const path = `${where}.${key}`
    if (field.kind === 'relation' && schema[field.to]?.kind !== 'collection') {
      throw new CmsConfigError(`${path} points to "${field.to}", which is not a collection.`)
    }
    if (field.kind === 'slug' && !keys.includes(field.from)) {
      throw new CmsConfigError(`${path} is generated from "${field.from}", which is not a field next to it.`)
    }
    nestedFields(field).forEach(inner => checkFields(schema, inner, path))
  }
}

const checkSchema = (schema: ContentSchema) => {
  for (const [id, entry] of Object.entries(schema)) {
    checkFields(schema, entry.fields, id)
    if (entry.kind !== 'collection') continue
    const keys = dataFields(entry.fields).map(([key]) => key)
    if (!keys.includes(entry.titleField)) throw new CmsConfigError(`${id}.titleField "${entry.titleField}" is not one of its fields.`)
    if (entry.slugField && !keys.includes(entry.slugField)) throw new CmsConfigError(`${id}.slugField "${entry.slugField}" is not one of its fields.`)
    if (entry.under && schema[entry.under]?.kind !== 'collection') throw new CmsConfigError(`${id}.under "${entry.under}" is not a collection.`)
  }
}

export const defineCmsConfig = <const S extends ContentSchema, const L extends string = 'es'>(
  input: CmsConfigInputType<S, L>
): CmsConfigType<S, L> => {
  const locales = input.locales ?? (['es'] as unknown as readonly L[])
  const defaultLocale = input.defaultLocale ?? locales[0]
  const basePath = input.basePath ?? '/dashboard'

  if (locales.length === 0) throw new CmsConfigError('locales needs at least one locale.')
  if (new Set(locales).size !== locales.length) throw new CmsConfigError('locales has repeated values.')
  const invalid = locales.find(locale => !LOCALE.test(locale))
  if (invalid) throw new CmsConfigError(`"${invalid}" is not a locale code like "es" or "pt-BR".`)
  if (!locales.includes(defaultLocale)) throw new CmsConfigError(`defaultLocale "${defaultLocale}" is not in locales.`)
  if (!/^\/[\w-]+(\/[\w-]+)*$/.test(basePath)) throw new CmsConfigError(`basePath "${basePath}" must start with / and have no trailing slash.`)
  checkSchema(input.schema)

  return Object.freeze({
    schema: input.schema,
    locales: Object.freeze([...locales]),
    defaultLocale,
    panelLocale: input.panelLocale ?? 'es',
    basePath,
    timeZone: input.timeZone ?? 'America/Argentina/Buenos_Aires',
    branding: input.branding ?? { name: 'CMS' },
    mediaFolders: input.mediaFolders ?? [],
    publishTarget: input.publishTarget ?? null,
    extensions: input.extensions ?? [],
    messages: input.messages ?? {}
  })
}

const translators = new WeakMap<CmsConfigType, Map<string, TranslatorType>>()

// Texts in the panel language unless another one is asked for; cached per config.
export const translatorFor = (config: CmsConfigType, locale = config.panelLocale): TranslatorType => {
  const byLocale = translators.get(config) ?? new Map<string, TranslatorType>()
  translators.set(config, byLocale)
  const cached = byLocale.get(locale)
  if (cached) return cached
  const translator = createTranslator({ locale, overrides: config.messages })
  byLocale.set(locale, translator)
  return translator
}

// Projects register their config so the package types follow their schema:
// declare module '@linkcharsoft/cms/core' { interface Register { config: typeof cmsConfig } }
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface Register {}

export type RegisteredConfigType = Register extends { config: infer C extends CmsConfigType } ? C : CmsConfigType

export type RegisteredSchemaType = RegisteredConfigType['schema']

export type EntryIdType = keyof RegisteredSchemaType & string

export type PageIdType = { [K in EntryIdType]: RegisteredSchemaType[K] extends { kind: 'page' } ? K : never }[EntryIdType]

export type CollectionIdType = { [K in EntryIdType]: RegisteredSchemaType[K] extends { kind: 'collection' } ? K : never }[EntryIdType]

export type LocaleType = RegisteredConfigType['locales'][number]

// Exact data type of an entry, e.g. ContentOf<'home'>['hero']['title'] is string.
export type ContentOf<K extends EntryIdType> = EntryValues<RegisteredSchemaType[K]>
