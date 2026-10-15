import { defineField, issue, noReferences } from './registry'
import { countIssues, nullableIssues } from './shared'
import type { BaseOptions, OptionType } from '../fields'
import type { IssueType, SummaryContextType } from './registry'

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
