import type { RichTextDocType } from './richText/nodes'

export interface BaseOptions<V> {
  label: string
  help?: string
  required?: boolean
  default?: V
  // Technical fields hidden from clients (only superadmin sees and edits them).
  superadminOnly?: boolean
}

interface StringOptions extends BaseOptions<string> {
  maxLength?: number
  pattern?: RegExp
  patternMessage?: string
  placeholder?: string
}

export interface OptionType<V extends string = string> {
  label: string
  value: V
}

export type LinkKindType = 'internal' | 'external' | 'email' | 'tel' | 'anchor'

export interface LinkValueType {
  type: LinkKindType
  href: string
  newTab: boolean
}

export interface ButtonValueType<V extends string = string> {
  label: string
  link: LinkValueType
  variant: V
}

export const WEEK_DAYS = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'] as const

export type WeekDayType = typeof WEEK_DAYS[number]

export interface DayHoursType {
  day: WeekDayType
  closed: boolean
  from: string
  to: string
}

export interface OpeningHoursValueType {
  days: DayHoursType[]
  note: string
}

export interface TextField extends StringOptions { kind: 'text' }
export interface TextareaField extends StringOptions { kind: 'textarea', rows?: number }
export interface EmailField extends StringOptions { kind: 'email' }
export interface PhoneField extends StringOptions { kind: 'phone' }
export interface UrlField extends StringOptions { kind: 'url' }
export interface VideoField extends StringOptions { kind: 'video' }
export interface SlugField extends StringOptions { kind: 'slug', from: string }
export interface RichTextField extends BaseOptions<RichTextDocType | null> { kind: 'richText', headings?: (2 | 3 | 4)[] }
export interface NumberField extends BaseOptions<number | null> { kind: 'number', min?: number, max?: number, step?: number }
export interface BooleanField extends BaseOptions<boolean> { kind: 'boolean' }
export interface DateField extends BaseOptions<string | null> { kind: 'date' }
export interface DatetimeField extends BaseOptions<string | null> { kind: 'datetime' }
export interface SelectField<V extends string = string> extends BaseOptions<V | null> {
  kind: 'select'
  options: readonly OptionType<V>[]
}
export interface MultiSelectField<V extends string = string> extends BaseOptions<V[]> {
  kind: 'multiSelect'
  options: readonly OptionType<V>[]
  min?: number
  max?: number
}
export interface LinkField extends BaseOptions<LinkValueType> { kind: 'link', allow?: LinkKindType[] }
export interface ButtonField<V extends string = string> extends BaseOptions<ButtonValueType<V>> {
  kind: 'button'
  variants: readonly OptionType<V>[]
}
export interface OpeningHoursField extends BaseOptions<OpeningHoursValueType> { kind: 'openingHours' }
// Media fields store `media.id`; alt, caption and focal point live on the media row and are shared by every use.
interface MediaOptions<V> extends BaseOptions<V> {
  // Folder preselected when uploading from this field.
  folder?: string
}
export interface ImageField extends MediaOptions<string | null> { kind: 'image', focalPoint?: boolean }
export interface GalleryField extends MediaOptions<string[]> { kind: 'gallery', min?: number, max?: number }
export interface FileField extends MediaOptions<string | null> { kind: 'file' }
export interface RelationField<M extends boolean = boolean> extends BaseOptions<M extends true ? string[] : string | null> {
  kind: 'relation'
  to: string
  multiple: M
}
export interface SeoMarkType {
  // Data keys used when the SEO title or description is left empty.
  titleFrom?: string
  descriptionFrom?: string
  // Fixed page URL; otherwise the entry path with the document slug.
  path?: string
}

export interface GroupField<F extends FieldsRecord = FieldsRecord> extends Omit<BaseOptions<never>, 'default'> {
  kind: 'group'
  fields: F
  collapsed?: boolean
  // Shows the Google preview under the fields.
  seo?: SeoMarkType
}
export interface ListField<F extends FieldsRecord = FieldsRecord> extends Omit<BaseOptions<never>, 'default'> {
  kind: 'list'
  fields: F
  min?: number
  max?: number
  // Data key whose value summarizes a collapsed item.
  itemLabel?: string
}
export interface BlockDef<F extends FieldsRecord = FieldsRecord> {
  label: string
  fields: F
  icon?: string
  description?: string
  thumbnail?: string
}
export interface BlocksField<B extends Record<string, BlockDef> = Record<string, BlockDef>>
  extends Omit<BaseOptions<never>, 'default'> {
  kind: 'blocks'
  blocks: B
  min?: number
  max?: number
}

// Presentational: they order the form but never store data of their own.
export interface TabLayout<F extends FieldsRecord = FieldsRecord> { kind: 'tab', label: string, fields: F }
export interface RowLayout<F extends FieldsRecord = FieldsRecord> { kind: 'row', fields: F }
export interface NoteLayout { kind: 'note', text: string }

export type DataField =
  | TextField | TextareaField | EmailField | PhoneField | UrlField | VideoField | SlugField
  | RichTextField | NumberField | BooleanField | DateField | DatetimeField
  | SelectField | MultiSelectField | LinkField | ButtonField | OpeningHoursField | RelationField
  | ImageField | GalleryField | FileField
  | GroupField | ListField | BlocksField

export type LayoutNode = TabLayout | RowLayout | NoteLayout

export type FieldNode = DataField | LayoutNode

export interface FieldsRecord {
  [key: string]: FieldNode
}

type Options<F extends { kind: string }> = Omit<F, 'kind'>

export const text = (options: Options<TextField>): TextField => ({ kind: 'text', ...options })
export const textarea = (options: Options<TextareaField>): TextareaField => ({ kind: 'textarea', ...options })
export const email = (options: Options<EmailField>): EmailField => ({ kind: 'email', ...options })
export const phone = (options: Options<PhoneField>): PhoneField => ({ kind: 'phone', ...options })
export const url = (options: Options<UrlField>): UrlField => ({ kind: 'url', ...options })
export const video = (options: Options<VideoField>): VideoField => ({ kind: 'video', ...options })
export const slug = (options: Options<SlugField>): SlugField => ({ kind: 'slug', ...options })
export const richText = (options: Options<RichTextField>): RichTextField => ({ kind: 'richText', ...options })
export const number = (options: Options<NumberField>): NumberField => ({ kind: 'number', ...options })
export const boolean = (options: Options<BooleanField>): BooleanField => ({ kind: 'boolean', ...options })
export const date = (options: Options<DateField>): DateField => ({ kind: 'date', ...options })
export const datetime = (options: Options<DatetimeField>): DatetimeField => ({ kind: 'datetime', ...options })
export const link = (options: Options<LinkField>): LinkField => ({ kind: 'link', ...options })
export const openingHours = (options: Options<OpeningHoursField>): OpeningHoursField => ({ kind: 'openingHours', ...options })
export const image = (options: Options<ImageField>): ImageField => ({ kind: 'image', ...options })
export const gallery = (options: Options<GalleryField>): GalleryField => ({ kind: 'gallery', ...options })
export const file = (options: Options<FileField>): FileField => ({ kind: 'file', ...options })

export const select = <const V extends string>(options: Options<SelectField<V>>): SelectField<V> =>
  ({ kind: 'select', ...options })

export const multiSelect = <const V extends string>(options: Options<MultiSelectField<V>>): MultiSelectField<V> =>
  ({ kind: 'multiSelect', ...options })

export const button = <const V extends string>(options: Options<ButtonField<V>>): ButtonField<V> =>
  ({ kind: 'button', ...options })

type RelationOptions = Omit<Options<RelationField>, 'multiple' | 'default'>

export const relation = (options: RelationOptions): RelationField<false> =>
  ({ kind: 'relation', ...options, multiple: false })

export const relations = (options: RelationOptions): RelationField<true> =>
  ({ kind: 'relation', ...options, multiple: true })

export const group = <const F extends FieldsRecord>(options: Omit<Options<GroupField<F>>, 'fields'>, fields: F): GroupField<F> =>
  ({ kind: 'group', ...options, fields })

export const list = <const F extends FieldsRecord>(options: Omit<Options<ListField<F>>, 'fields'>, fields: F): ListField<F> =>
  ({ kind: 'list', ...options, fields })

export const block = <const F extends FieldsRecord>(label: string, fields: F, options: Omit<BlockDef<F>, 'label' | 'fields'> = {}): BlockDef<F> =>
  ({ label, fields, ...options })

export const blocks = <const B extends Record<string, BlockDef>>(options: Omit<Options<BlocksField<B>>, 'blocks'>, allowed: B): BlocksField<B> =>
  ({ kind: 'blocks', ...options, blocks: allowed })

// A group, so defaults, validation and media references need nothing special.
export const seo = ({ title, description, ...mark }: SeoMarkType & { title?: string, description?: string } = {}) => group({
  label: 'SEO',
  collapsed: true,
  help: 'Cómo se ve esta página en Google y al compartir el link.',
  seo: mark
}, {
  title: text({
    label: 'Título para Google',
    maxLength: 70,
    help: mark.titleFrom ? 'Ideal hasta 60 caracteres. Si lo dejás vacío, se usa el título.' : 'Ideal hasta 60 caracteres.',
    default: title ?? ''
  }),
  description: textarea({
    label: 'Descripción para Google',
    maxLength: 160,
    rows: 3,
    help: mark.descriptionFrom ? 'Si la dejás vacía, se usa el resumen.' : undefined,
    default: description ?? ''
  }),
  image: image({ label: 'Imagen al compartir', folder: 'sitio', help: 'Se ve al compartir el link en WhatsApp o redes. Ideal 1200 × 630 px.' })
})

export const tab = <const F extends FieldsRecord>(label: string, fields: F): TabLayout<F> => ({ kind: 'tab', label, fields })
export const row = <const F extends FieldsRecord>(fields: F): RowLayout<F> => ({ kind: 'row', fields })
export const note = (text: string): NoteLayout => ({ kind: 'note', text })

export const isLayout = (node: FieldNode): node is LayoutNode =>
  node.kind === 'tab' || node.kind === 'row' || node.kind === 'note'
