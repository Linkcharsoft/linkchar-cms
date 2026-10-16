import { createTranslator } from './i18n/translator'
import { BUILTIN_FIELDS } from './kinds/builtins'
import { dataFields } from './walk'
import type { ContentSchema, EntryValues, StoredEntryValues } from './define'
import type { DataField, FieldsRecord } from './fields'
import type { MessageOverridesType, TranslatorType } from './i18n/types'
import type { FieldDefinitionType } from './kinds/registry'
import type { TextContextType, TextType } from './text'

export interface MediaFolderType {
  value: string
  label: TextType
}

export interface BrandingType {
  name: string
  logo?: string
  // Line under the sidebar, e.g. who to contact for support.
  footer?: TextType
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
  extensions?: readonly CmsExtensionType[]
  // Opt-in kinds (openingHours) and the project's own, made with defineField.
  fields?: readonly FieldDefinitionType[]
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
  extensions: readonly CmsExtensionType[]
  fieldTypes: ReadonlyMap<string, FieldDefinitionType>
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

type FieldTypesMap = ReadonlyMap<string, FieldDefinitionType>

const isStructuralKind = (kind: string) => kind === 'group' || kind === 'list' || kind === 'blocks'

interface CheckContextType {
  schema: ContentSchema
  types: FieldTypesMap
  folders: readonly MediaFolderType[]
}

const checkFields = (ctx: CheckContextType, fields: FieldsRecord, where: string) => {
  const { schema, types, folders } = ctx
  const keys = dataFields(fields).map(([key]) => key)
  for (const [key, field] of dataFields(fields)) {
    const path = `${where}.${key}`
    if (!isStructuralKind(field.kind) && !types.has(field.kind)) {
      throw new CmsConfigError(`${path} uses the field kind "${field.kind}", which is not registered: add it to \`fields\`.`)
    }
    if (field.kind === 'relation' && schema[field.to]?.kind !== 'collection') {
      throw new CmsConfigError(`${path} points to "${field.to}", which is not a collection.`)
    }
    if (field.kind === 'slug' && !keys.includes(field.from)) {
      throw new CmsConfigError(`${path} is generated from "${field.from}", which is not a field next to it.`)
    }
    const { folder } = field as { folder?: string }
    if (folder && !folders.some(item => item.value === folder)) {
      throw new CmsConfigError(`${path} uploads to the folder "${folder}", which is not one of the mediaFolders.`)
    }
    nestedFields(field).forEach(inner => checkFields(ctx, inner, path))
  }
}

const checkSchema = (ctx: CheckContextType) => {
  const { schema } = ctx
  for (const [id, entry] of Object.entries(schema)) {
    checkFields(ctx, entry.fields, id)
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
  const fieldTypes = new Map<string, FieldDefinitionType>()
  for (const definition of [...BUILTIN_FIELDS, ...(input.fields ?? [])]) {
    if (fieldTypes.has(definition.kind) || isStructuralKind(definition.kind)) throw new CmsConfigError(`The field kind "${definition.kind}" is defined twice.`)
    fieldTypes.set(definition.kind, definition)
  }
  checkSchema({ schema: input.schema, types: fieldTypes, folders: input.mediaFolders ?? [] })

  return Object.freeze({
    schema: input.schema,
    locales: Object.freeze([...locales]),
    defaultLocale,
    panelLocale: input.panelLocale ?? 'es',
    basePath,
    timeZone: input.timeZone ?? 'America/Argentina/Buenos_Aires',
    branding: input.branding ?? { name: 'CMS' },
    mediaFolders: input.mediaFolders ?? [],
    extensions: input.extensions ?? [],
    fieldTypes,
    messages: input.messages ?? {}
  })
}

export const fieldDefinition = (config: CmsConfigType, kind: string): FieldDefinitionType => {
  const definition = config.fieldTypes.get(kind)
  if (!definition) throw new CmsConfigError(`The field kind "${kind}" is not registered: add it to \`fields\`.`)
  return definition
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

// Texts read in the panel language unless another one is asked for.
export const textContext = (config: CmsConfigType, locale = config.panelLocale): TextContextType =>
  ({ locale, defaultLocale: config.defaultLocale, translator: translatorFor(config, locale) })

// Projects register their config so the package types follow their schema:
// declare module '@linkcharsoft/cms/core' { interface Register { config: typeof cmsConfig } }
export interface Register {}

export type RegisteredConfigType = Register extends { config: infer C extends CmsConfigType } ? C : CmsConfigType

export type RegisteredSchemaType = RegisteredConfigType['schema']

export type EntryIdType = keyof RegisteredSchemaType & string

export type PageIdType = { [K in EntryIdType]: RegisteredSchemaType[K] extends { kind: 'page' } ? K : never }[EntryIdType]

export type CollectionIdType = { [K in EntryIdType]: RegisteredSchemaType[K] extends { kind: 'collection' } ? K : never }[EntryIdType]

export type LocaleType = RegisteredConfigType['locales'][number]

// Exact data type of an entry, e.g. ContentOf<'home'>['hero']['title'] is string.
export type ContentOf<K extends EntryIdType> = EntryValues<RegisteredSchemaType[K]>

// The same entry as stored, with its localized values as { es, en } maps.
export type StoredContentOf<K extends EntryIdType> = StoredEntryValues<RegisteredSchemaType[K]>
