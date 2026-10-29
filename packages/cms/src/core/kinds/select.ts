import { defineField, issue, noReferences } from './registry'
import { countIssues, nullableIssues } from './shared'
import type { BaseOptions, OptionType } from '../fields'
import type { IssueType, SummaryContextType } from './registry'

// A 1-based line number, or what grid-column / grid-row take: '1 / 4', '2 / span 2'.
export type GridLineType = number | string

export interface GridPreviewCellType {
  column: GridLineType
  row: GridLineType
  // Only with a numeric line; a string carries its own span or end.
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

const LINE = /^\s*(\d+)\s*(?:\/\s*(?:span\s+(\d+)|(\d+)))?\s*$/

// The lines a cell starts and ends on along one axis, or null when the value is not a placement.
export const gridLines = (value: GridLineType, span = 1): { start: number, end: number } | null => {
  if (typeof value === 'number') return Number.isInteger(value) && Number.isInteger(span) && span >= 1 ? { start: value, end: value + span } : null
  const match = LINE.exec(value)
  if (!match) return null
  const start = Number(match[1])
  const end = match[2] ? start + Number(match[2]) : match[3] ? Number(match[3]) : start + span
  return end > start ? { start, end } : null
}

// What the card paints as grid-column or grid-row.
export const gridPlacement = (value: GridLineType, span = 1) => (typeof value === 'number' ? `${value} / span ${span}` : value.trim())

const cellProblem = (cell: GridPreviewCellType, columns: number, rows: number): 'invalid' | 'outside' | null => {
  const column = gridLines(cell.column, cell.columnSpan)
  const row = gridLines(cell.row, cell.rowSpan)
  if (!column || !row) return 'invalid'
  return column.start >= 1 && row.start >= 1 && column.end <= columns + 1 && row.end <= rows + 1 ? null : 'outside'
}

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
      const problems = cells.map(cell => cellProblem(cell, columns, rows))
      if (problems.includes('invalid')) return `option "${option.value}" has a grid cell with an invalid line: use a number, '1 / 4' or '1 / span 2'.`
      if (cells.length === 0 || problems.includes('outside')) return `option "${option.value}" has a grid cell outside its ${columns}×${rows} grid.`
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
