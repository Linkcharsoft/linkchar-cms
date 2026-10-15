import type { CmsConfigType } from '../config'
import type { ParamValueType, TranslatorType } from '../i18n/types'

// Every leaf field kind declares itself here, from its own file or from a project:
// declare module '@linkcharsoft/cms/core' { interface FieldTypes<F> { color: { field: ColorField, value: string, localize: false } } }
// `F` is the field as written in the schema, so a value can depend on its options (select, button).
export interface FieldTypes<F = unknown> {}

export type LeafKindType = keyof FieldTypes & string

export type LeafField = FieldTypes[LeafKindType]['field']

export type LeafValueType<F extends { kind: LeafKindType }> = FieldTypes<F>[F['kind']]['value']

// 'translate': one value per locale, a missing one blocks publishing. 'inherit': other locales use the
// default locale's value until someone sets another (images). An object localizes only those keys (button label).
export type LocalizeModeType = 'translate' | 'inherit' | false

export type LocalizeType = LocalizeModeType | { [key: string]: 'translate' }

export type ValidationModeType = 'draft' | 'publish'

export interface IssueType {
  // Relative to the field that reports it; '' is the field itself.
  path: string
  // Catalog key under `validation.`; ignored when `message` is set.
  code: string
  params?: Record<string, ParamValueType>
  message?: string
  locale?: string
}

export interface ReferencesType {
  relations: string[]
  media: string[]
}

export interface FieldContextType {
  config: CmsConfigType
  t: TranslatorType['t']
}

export interface ValidateContextType extends FieldContextType {
  mode: ValidationModeType
  // Required and publishing: an empty value is an issue.
  required: boolean
}

// Names for values that are ids: media (alt or filename) and related items (title).
export interface DiffNamesType {
  media?: Record<string, string>
  relations?: Record<string, string>
}

export interface SummaryContextType extends FieldContextType {
  names: DiffNamesType
}

export type FieldInputLoaderType = () => Promise<{ default: unknown }>

type FieldOf<K extends LeafKindType> = FieldTypes[K]['field']

type ValueOf<K extends LeafKindType> = FieldTypes[K]['value']

// Methods (not arrow properties) so a definition of one kind is assignable to the any-kind type.
export interface FieldDefinitionType<K extends LeafKindType = LeafKindType> {
  kind: K
  localize: FieldTypes[K]['localize']
  defaultValue (field: FieldOf<K>): ValueOf<K>
  // Repairs a stored value: keeps what is usable, falls back to the default for the rest.
  normalize (value: unknown, field: FieldOf<K>): ValueOf<K>
  isEmpty (value: unknown, field: FieldOf<K>): boolean
  // Format rules always; emptiness only when ctx.required. Runs on stored data, so `value` is unchecked.
  validate (value: unknown, field: FieldOf<K>, ctx: ValidateContextType): IssueType[]
  references (value: unknown, field: FieldOf<K>): Partial<ReferencesType>
  // One line for people (version diffs): never empty, never raw JSON.
  summarize (value: unknown, field: FieldOf<K>, ctx: SummaryContextType): string
  // Panel input, loaded only by the panel. Required from stage 3, when the inputs move to the package.
  input?: FieldInputLoaderType
}

type OptionsOf<K extends LeafKindType> = Omit<FieldOf<K>, 'kind'>

type NoExtraKeysType<O, T> = O & { [P in Exclude<keyof O, keyof T>]: never }

export type FieldBuilderType<K extends LeafKindType> = <const O extends OptionsOf<K>>(options: NoExtraKeysType<O, OptionsOf<K>>) => { kind: K } & O

// A definition is also the field's builder: `color({ label: 'Color' })` in a schema.
export type DefinedFieldType<K extends LeafKindType = LeafKindType> = FieldDefinitionType<K> & FieldBuilderType<K>

export const defineField = <K extends LeafKindType>(definition: FieldDefinitionType<K>): DefinedFieldType<K> => {
  const builder = ((options: OptionsOf<K>) => ({ kind: definition.kind, ...options })) as FieldBuilderType<K>
  return Object.assign(builder, definition)
}

export const noReferences = (): Partial<ReferencesType> => ({})

export const issue = (code: string, params?: Record<string, ParamValueType>, path = ''): IssueType => ({ path, code, params })
