import { defineField, issue, noReferences } from './registry'
import { nullableIssues } from './shared'
import type { BaseOptions } from '../fields'

export interface NumberField extends BaseOptions<number | null> {
  kind: 'number'
  min?: number
  max?: number
  step?: number
}

declare module './registry' {
  interface FieldTypes<F> {
    number: { field: NumberField, value: number | null, localize: false }
  }
}

const isNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value)

export const number = defineField({
  kind: 'number',
  localize: false,
  defaultValue: () => null,
  normalize: value => (isNumber(value) ? value : null),
  isEmpty: value => !isNumber(value),
  validate: (value, field, ctx) => nullableIssues(value, ctx, current => {
    if (!isNumber(current)) return issue('number')
    if (field.min !== undefined && current < field.min) return issue('min', { min: field.min })
    if (field.max !== undefined && current > field.max) return issue('max', { max: field.max })
    return null
  }),
  references: noReferences,
  summarize: (value, _field, { config }) => (isNumber(value) ? value.toLocaleString(config.panelLocale) : String(value))
})
