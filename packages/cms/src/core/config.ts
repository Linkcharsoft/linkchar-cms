import { createTranslator } from './i18n/translator'
import { BUILTIN_FIELDS } from './kinds/builtins'
import { selectDisplayProblem } from './kinds/select'
import { AUTH_SEGMENT, DEFAULT_PANEL_SEGMENTS } from './paths'
import { pathProblems } from './urls'
import { dataFields } from './walk'
import type { ContentSchema, EntryValues, StoredEntryValues } from './define'
import type { DataField, FieldsRecord } from './fields'
import type { MessageOverridesType, TranslatorType } from './i18n/types'
import type { FieldDefinitionType } from './kinds/registry'
import type { PanelSegmentType } from './paths'
import type { RoleType } from './roles'
import type { TextContextType, TextType } from './text'

export interface MediaFolderType {
  value: string
  label: TextType
}

// The product slot of an Inferencia-branded panel: its name and its square icon, by default the site's favicon.
export interface BrandingType {
  name: string
  icon?: string
  // Line under the sidebar, e.g. who to contact for support.
  footer?: TextType
}

// Fields of a page or singleton that fill in what a page's SEO leaves empty, e.g. the site's tagline and share image.
export type SiteDefaultsType<S extends ContentSchema = ContentSchema> = {
  [K in keyof S & string]: S[K] extends { kind: 'collection' } ? never : {
    entry: K
    description?: keyof EntryValues<S[K]> & string
    image?: keyof EntryValues<S[K]> & string
  }
}[keyof S & string]

export interface SiteType<S extends ContentSchema = ContentSchema, L extends string = string> {
  // Public origin of the site ("https://acme.com"), for the Google preview and links out of the panel.
  url?: string
  // How pages title themselves, e.g. "%s | Acme".
  titleTemplate?: string
  defaults?: SiteDefaultsType<S>
  // The locale hreflang's x-default points to, for visitors no locale matches; defaultLocale unless set.
  xDefault?: L
}

interface SiteDefaultsRefType {
  readonly entry: string
  readonly description: string | null
  readonly image: string | null
}

// A project menu item: its own panel screen (a route the project adds under (panel)) or an external link.
export interface CmsExtensionType {
  id: string
  label: TextType
  // PrimeIcons class, e.g. 'pi-chart-bar'.
  icon?: string
  // Menu group; 'admin' items are listed for admins only.
  group?: 'content' | 'site' | 'admin'
  // URL segment of the screen under basePath, e.g. 'estadisticas'.
  path?: string
  href?: string
  minRole?: RoleType
}

export interface CmsConfigInputType<S extends ContentSchema, L extends string> {
  schema: S
  locales?: readonly L[]
  defaultLocale?: NoInfer<L>
  // The default locale's URLs start with its code too ("/es/blog/casa"), like every other locale's.
  prefixDefaultLocale?: boolean
  // Language of the panel itself, independent from the content locales.
  panelLocale?: string
  basePath?: string
  // URL segments of the panel screens under basePath; the rest keep their defaults.
  paths?: Partial<Record<PanelSegmentType, string>>
  timeZone?: string
  branding?: BrandingType
  site?: SiteType<S, NoInfer<L>>
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
  prefixDefaultLocale: boolean
  panelLocale: string
  basePath: string
  paths: Readonly<Record<PanelSegmentType, string>>
  timeZone: string
  branding: BrandingType
  site: { readonly url: string | null, readonly titleTemplate: string, readonly defaults: SiteDefaultsRefType | null, readonly xDefault: L }
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

const SEGMENT = /^[a-z0-9]+(-[a-z0-9]+)*$/

const checkExtensions = (extensions: readonly CmsExtensionType[], segments: Readonly<Record<PanelSegmentType, string>>) => {
  const taken = new Set<string>([...Object.values(segments), AUTH_SEGMENT])
  const ids = new Set<string>()
  for (const extension of extensions) {
    const where = `extensions "${extension.id}"`
    if (ids.has(extension.id)) throw new CmsConfigError(`${where} is defined twice.`)
    ids.add(extension.id)
    if (!extension.path === !extension.href) throw new CmsConfigError(`${where} needs either a path (a panel screen) or an href (a link).`)
    if (extension.href && !/^https?:\/\//.test(extension.href)) throw new CmsConfigError(`${where} href must start with https://.`)
    if (extension.path) {
      if (!SEGMENT.test(extension.path)) throw new CmsConfigError(`${where} path "${extension.path}" must be lowercase letters, numbers and dashes.`)
      if (taken.has(extension.path)) throw new CmsConfigError(`${where} path "${extension.path}" is already a panel screen.`)
      taken.add(extension.path)
    }
  }
}

const panelSegments = (overrides: Partial<Record<PanelSegmentType, string>> = {}) => {
  const segments = { ...DEFAULT_PANEL_SEGMENTS, ...overrides }
  for (const [key, segment] of Object.entries(segments)) {
    if (!SEGMENT.test(segment)) throw new CmsConfigError(`paths.${key} "${segment}" must be lowercase letters, numbers and dashes.`)
    if (segment === AUTH_SEGMENT) throw new CmsConfigError(`paths.${key} can't be "${AUTH_SEGMENT}": the panel uses it for sign-in links.`)
  }
  const values = Object.values(segments)
  const repeated = values.find((segment, index) => values.indexOf(segment) !== index)
  if (repeated) throw new CmsConfigError(`paths has "${repeated}" for two screens.`)
  return Object.freeze(segments)
}

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
  locales: readonly string[]
  defaultLocale: string
  prefixDefaultLocale: boolean
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
    if (field.kind === 'richText' && field.inline && field.headings?.length) {
      throw new CmsConfigError(`${path} is inline: it can't have headings.`)
    }
    const display = field.kind === 'select' ? selectDisplayProblem(field) : null
    if (display) throw new CmsConfigError(`${path} ${display}`)
    if (field.kind === 'slug' && !keys.includes(field.from)) {
      throw new CmsConfigError(`${path} is generated from "${field.from}", which is not a field next to it.`)
    }
    if (field.kind === 'list' && field.thumbnail && dataFields(field.fields).find(([key]) => key === field.thumbnail)?.[1].kind !== 'image') {
      throw new CmsConfigError(`${path}.thumbnail "${field.thumbnail}" is not an image field of its items.`)
    }
    const { folder } = field as { folder?: string }
    if (folder && !folders.some(item => item.value === folder)) {
      throw new CmsConfigError(`${path} uploads to the folder "${folder}", which is not one of the mediaFolders.`)
    }
    nestedFields(field).forEach(inner => checkFields(ctx, inner, path))
  }
}

const DEFAULT_KINDS = { description: ['text', 'textarea'], image: ['image'] } as const

const siteDefaults = (schema: ContentSchema, defaults: SiteDefaultsType | undefined): SiteDefaultsRefType | null => {
  if (!defaults) return null
  const entry = schema[defaults.entry]
  if (!entry || entry.kind === 'collection') throw new CmsConfigError(`site.defaults.entry "${defaults.entry}" must be a page or singleton of the schema.`)
  const fields = new Map(dataFields(entry.fields))
  for (const role of ['description', 'image'] as const) {
    const key = defaults[role]
    if (!key) continue
    const kind = fields.get(key)?.kind
    if (!kind || !(DEFAULT_KINDS[role] as readonly string[]).includes(kind)) {
      throw new CmsConfigError(`site.defaults.${role} "${key}" must be a ${DEFAULT_KINDS[role].join(' or ')} field of "${defaults.entry}".`)
    }
  }
  return Object.freeze({ entry: defaults.entry, description: defaults.description ?? null, image: defaults.image ?? null })
}

const checkSchema = (ctx: CheckContextType) => {
  const { schema } = ctx
  const urls = new Map<string, string>()
  for (const [id, entry] of Object.entries(schema)) {
    checkFields(ctx, entry.fields, id)
    const [problem] = pathProblems(id, entry, ctx, urls)
    if (problem) throw new CmsConfigError(problem)
    // A preview location is not a URL the entry owns: no :slug, and other entries may share it.
    const [previewProblem] = pathProblems(id, { kind: 'singleton', path: entry.previewPath }, ctx, new Map(), 'previewPath')
    if (previewProblem) throw new CmsConfigError(previewProblem)
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
  const prefixDefaultLocale = input.prefixDefaultLocale ?? false

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
  checkSchema({ schema: input.schema, types: fieldTypes, folders: input.mediaFolders ?? [], locales, defaultLocale, prefixDefaultLocale })
  const paths = panelSegments(input.paths)
  checkExtensions(input.extensions ?? [], paths)
  const titleTemplate = input.site?.titleTemplate ?? '%s'
  if (!titleTemplate.includes('%s')) throw new CmsConfigError(`site.titleTemplate "${titleTemplate}" needs %s where the page title goes.`)
  if (input.site?.url && !/^https?:\/\/[^/]+$/.test(input.site.url)) throw new CmsConfigError(`site.url "${input.site.url}" must be an origin like https://acme.com.`)
  const xDefault = input.site?.xDefault ?? defaultLocale
  if (!locales.includes(xDefault)) throw new CmsConfigError(`site.xDefault "${xDefault}" is not in locales.`)
  if (input.branding && 'logo' in input.branding) throw new CmsConfigError('branding.logo is now branding.icon: a square image, like the favicon.')
  // withCms sets CMS_BRAND_ICON at build from the project's favicon files.
  const icon = input.branding?.icon ?? process.env.CMS_BRAND_ICON
  if (icon && !/^(\/|https:\/\/)/.test(icon)) throw new CmsConfigError(`branding.icon "${icon}" must be a path like /icon.svg or an https URL.`)

  return Object.freeze({
    schema: input.schema,
    locales: Object.freeze([...locales]),
    defaultLocale,
    prefixDefaultLocale,
    panelLocale: input.panelLocale ?? 'es',
    basePath,
    paths,
    timeZone: input.timeZone ?? 'America/Argentina/Buenos_Aires',
    branding: Object.freeze({ name: input.branding?.name ?? 'CMS', icon: icon || undefined, footer: input.branding?.footer }),
    site: Object.freeze({ url: input.site?.url ?? null, titleTemplate, defaults: siteDefaults(input.schema, input.site?.defaults as SiteDefaultsType | undefined), xDefault }),
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
// declare module '@linkcharsoft/cms/core' { interface Register { config: typeof cmsConfig, database: Database } }
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
