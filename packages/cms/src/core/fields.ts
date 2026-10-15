import { boolean } from './kinds/boolean'
import { image } from './kinds/media'
import { textarea, text } from './kinds/strings'
import type { ValuesOf } from './infer'
import type { FieldInputLoaderType, LeafField } from './kinds/registry'

export interface BaseOptions<V> {
  label: string
  help?: string
  required?: boolean
  default?: V
  // Technical fields hidden from clients (only superadmin sees and edits them).
  superadminOnly?: boolean
  // Replaces the kind's input in the panel for this field only.
  component?: FieldInputLoaderType
}

export interface OptionType<V extends string = string> {
  label: string
  value: V
}

export interface SeoMarkType {
  // Data keys used when the SEO title or description is left empty.
  titleFrom?: string
  descriptionFrom?: string
  // Fixed page URL; otherwise the entry path with the document slug.
  path?: string
}

export interface SectionMarkType {
  // id of the matching element on the site: the preview scrolls to it and menu anchors point to it.
  anchor?: string
  icon?: string
  // Entries edited elsewhere whose content this section shows.
  uses?: readonly string[]
  hideable: boolean
}

type StructuralOptions = Omit<BaseOptions<never>, 'default' | 'component'>

export interface GroupField<F extends FieldsRecord = FieldsRecord> extends StructuralOptions {
  kind: 'group'
  fields: F
  collapsed?: boolean
  // Shows the Google preview under the fields.
  seo?: SeoMarkType
  // A page section: a top-level group of a page() with its own place on the site.
  section?: SectionMarkType
}
export interface ListField<F extends FieldsRecord = FieldsRecord> extends StructuralOptions {
  kind: 'list'
  fields: F
  min?: number
  max?: number
  // Data key whose value summarizes a collapsed item.
  itemLabel?: string
  // Missing keys are filled from the item fields' own defaults; list() types each item.
  default?: Record<string, unknown>[]
}
export interface BlockDef<F extends FieldsRecord = FieldsRecord> {
  label: string
  fields: F
  icon?: string
  description?: string
  thumbnail?: string
}
export interface BlocksField<B extends Record<string, BlockDef> = Record<string, BlockDef>> extends StructuralOptions {
  kind: 'blocks'
  blocks: B
  min?: number
  max?: number
}

// Presentational: they order the form but never store data of their own.
export interface TabLayout<F extends FieldsRecord = FieldsRecord> { kind: 'tab', label: string, fields: F }
// Stacked, collapsible card: for forms whose parts all matter (site data), where tabs would hide fields.
export interface PanelLayout<F extends FieldsRecord = FieldsRecord> { kind: 'panel', label: string, fields: F, collapsed?: boolean }
export interface RowLayout<F extends FieldsRecord = FieldsRecord> { kind: 'row', fields: F }
export interface NoteLayout { kind: 'note', text: string }

export type StructuralField = GroupField | ListField | BlocksField

export type DataField = LeafField | StructuralField

export type LayoutNode = TabLayout | PanelLayout | RowLayout | NoteLayout

export type FieldNode = DataField | LayoutNode

export interface FieldsRecord {
  [key: string]: FieldNode
}

type Options<F extends { kind: string }> = Omit<F, 'kind'>

export const group = <const F extends FieldsRecord>(options: Omit<Options<GroupField<F>>, 'fields'>, fields: F): GroupField<F> =>
  ({ kind: 'group', ...options, fields })

export const list = <const F extends FieldsRecord>(
  options: Omit<Options<ListField<F>>, 'fields' | 'default'> & { default?: Partial<ValuesOf<F>>[] },
  fields: F
): ListField<F> =>
  ({ kind: 'list', ...options, fields })

export const block = <const F extends FieldsRecord>(label: string, fields: F, options: Omit<BlockDef<F>, 'label' | 'fields'> = {}): BlockDef<F> =>
  ({ label, fields, ...options })

export const blocks = <const B extends Record<string, BlockDef>>(options: Omit<Options<BlocksField<B>>, 'blocks'>, allowed: B): BlocksField<B> =>
  ({ kind: 'blocks', ...options, blocks: allowed })

// A group, so defaults, validation and media references need nothing special.
export const seo = ({ title, description, label = 'Cómo aparece en Google y al compartir', ...mark }: SeoMarkType & { title?: string, description?: string, label?: string } = {}) => group({
  label,
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
  image: image({ label: 'Imagen al compartir', help: 'Se ve al compartir el link en WhatsApp o redes. Ideal 1200 × 630 px.' })
})

export const HIDDEN_KEY = '_hidden'

type HiddenFields<H extends boolean> = H extends true ? { _hidden: ReturnType<typeof hiddenSwitch> } : unknown

interface SectionOptions<H extends boolean> extends Omit<SectionMarkType, 'hideable'> {
  help?: string
  // Adds a "Mostrar esta sección" switch, stored as `_hidden`; the site skips hidden sections.
  hideable?: H
}

const hiddenSwitch = () => boolean({ label: 'Ocultar esta sección', default: false })

// A group too, so the engine treats a page section like any other nested data.
export const section = <const F extends FieldsRecord, const H extends boolean = false>(
  label: string,
  fields: F,
  { help, hideable, ...mark }: SectionOptions<H> = {}
): GroupField<F & HiddenFields<H>> => ({
  kind: 'group',
  label,
  help,
  section: { ...mark, hideable: !!hideable },
  fields: (hideable ? { ...fields, [HIDDEN_KEY]: hiddenSwitch() } : fields) as F & HiddenFields<H>
})

export const tab = <const F extends FieldsRecord>(label: string, fields: F): TabLayout<F> => ({ kind: 'tab', label, fields })
export const panel = <const F extends FieldsRecord>(label: string, fields: F, options: { collapsed?: boolean } = {}): PanelLayout<F> =>
  ({ kind: 'panel', label, fields, ...options })
export const row = <const F extends FieldsRecord>(fields: F): RowLayout<F> => ({ kind: 'row', fields })
export const note = (text: string): NoteLayout => ({ kind: 'note', text })

export const isLayout = (node: FieldNode): node is LayoutNode =>
  node.kind === 'tab' || node.kind === 'panel' || node.kind === 'row' || node.kind === 'note'

export const isStructural = (field: DataField): field is StructuralField =>
  field.kind === 'group' || field.kind === 'list' || field.kind === 'blocks'

export * from './kinds/boolean'
export * from './kinds/button'
export * from './kinds/dates'
export * from './kinds/link'
export * from './kinds/media'
export * from './kinds/number'
export * from './kinds/relation'
export * from './kinds/richText'
export * from './kinds/select'
export * from './kinds/strings'
