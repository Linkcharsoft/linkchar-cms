import { defineField, issue, noReferences } from './registry'
import { countIssues, nullableIssues } from './shared'
import type { BaseOptions, OptionType } from '../fields'
import type { IssueType, SummaryContextType } from './registry'

export interface GridPreviewCellType {
  // 1-based, like CSS grid lines.
  column: number
  row: number
  columnSpan?: number
  rowSpan?: number
}

// Serializable, so the config can cross to the browser: a PrimeIcons name, an image URL or a mosaic sketch.
export type SelectPreviewType =
  | { icon: string }
  | { image: string }
  | { grid: { columns: number, rows: number, cells: readonly GridPreviewCellType[] } }

export interface SelectOptionType<V extends string = string> extends OptionType<V> {
  preview?: SelectPreviewType
}

export interface SelectField<V extends string = string> extends BaseOptions<V | null> {
  kind: 'select'
  options: readonly SelectOptionType<V>[]
  // 'cards' shows one card per option with its preview; every option needs one.
  display?: 'dropdown' | 'cards'
}

export interface MultiSelectField<V extends string = string> extends BaseOptions<V[]> {
  kind: 'multiSelect'
  options: readonly OptionType<V>[]
  min?: number
  max?: number
}

type OptionValueType<F> = F extends { options: readonly { value: infer V extends string }[] } ? V : string

declare module './registry' {
  interface FieldTypes<F> {
    select: { field: SelectField, value: OptionValueType<F> | null, localize: false }
    multiSelect: { field: MultiSelectField, value: OptionValueType<F>[], localize: false }
  }
}

const optionLabel = (options: readonly OptionType[], value: unknown, ctx: SummaryContextType) => {
  const option = options.find(item => item.value === value)
  return option ? ctx.text(option.label) : String(value)
}

const isOption = (options: readonly OptionType[], value: unknown) => options.some(option => option.value === value)

const inGrid = (cell: GridPreviewCellType, columns: number, rows: number) =>
  Number.isInteger(cell.column) && Number.isInteger(cell.row) && cell.column >= 1 && cell.row >= 1
  && cell.column + (cell.columnSpan ?? 1) - 1 <= columns && cell.row + (cell.rowSpan ?? 1) - 1 <= rows

// Why a select can't be shown as cards, or null; `defineCmsConfig` reports it with the field's path.
export const selectDisplayProblem = (field: SelectField): string | null => {
  if (field.display !== 'cards') {
    return field.options.some(option => option.preview) ? 'has option previews: set display: \'cards\' to show them.' : null
  }
  for (const option of field.options) {
    const { preview } = option
    if (!preview) return `shows cards, so every option needs a preview ("${option.value}" has none).`
    if ('grid' in preview) {
      const { columns, rows, cells } = preview.grid
      if (!Number.isInteger(columns) || !Number.isInteger(rows) || columns < 1 || rows < 1) return `option "${option.value}" has a grid preview without columns and rows.`
      if (cells.length === 0 || cells.some(cell => !inGrid(cell, columns, rows))) return `option "${option.value}" has a grid cell outside its ${columns}×${rows} grid.`
    }
  }
  return null
}

export const select = defineField({
  kind: 'select',
  localize: false,
  defaultValue: () => null,
  normalize: value => (typeof value === 'string' ? value : null),
  isEmpty: value => typeof value !== 'string' || !value,
  validate: (value, field, ctx) => nullableIssues(value, ctx, current => (isOption(field.options, current) ? null : issue('option'))),
  references: noReferences,
  summarize: (value, field, ctx) => optionLabel(field.options, value, ctx)
})

export const multiSelect = defineField({
  kind: 'multiSelect',
  localize: false,
  defaultValue: () => [],
  normalize: value => (Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []),
  isEmpty: value => !Array.isArray(value) || value.length === 0,
  validate: (value, field, ctx) => {
    if (value === undefined || value === null) value = []
    if (!Array.isArray(value)) return [issue('invalid')]
    const invalid = value.flatMap((item, index): IssueType[] => (isOption(field.options, item) ? [] : [issue('option', undefined, String(index))]))
    return [...invalid, ...countIssues(value.length, field, ctx, { max: 'maxOptions', min: 'minOptions' })]
  },
  references: noReferences,
  summarize: (value, field, ctx) => (Array.isArray(value) ? value.map(item => optionLabel(field.options, item, ctx)).join(', ') : '')
})
