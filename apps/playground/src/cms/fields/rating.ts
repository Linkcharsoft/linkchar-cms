import { defineField, issue, noReferences } from '@linkcharsoft/cms/core'
import type { BaseOptions } from '@linkcharsoft/cms/core'

// A project kind: proves a field type can be added without touching the package.
export interface RatingField extends BaseOptions<number> {
  kind: 'rating'
  stars: number
}

declare module '@linkcharsoft/cms/core' {
  interface FieldTypes<F> {
    rating: { field: RatingField, value: number, localize: false }
  }
}

export const rating = defineField({
  kind: 'rating',
  localize: false,
  defaultValue: () => 0,
  normalize: value => (typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : 0),
  isEmpty: value => !value,
  validate: (value, field, ctx) => {
    if (value === null || value === undefined || value === 0) return ctx.required ? [issue('required')] : []
    if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) return [issue('number')]
    return value > field.stars ? [issue('max', { max: field.stars })] : []
  },
  references: noReferences,
  summarize: value => '★'.repeat(Number(value))
})
