import { defineField, issue, noReferences } from './registry'
import type { BaseOptions } from '../fields'

export interface BooleanField extends BaseOptions<boolean> { kind: 'boolean' }

declare module './registry' {
  interface FieldTypes<F> {
    boolean: { field: BooleanField, value: boolean, localize: false }
  }
}

export const boolean = defineField({
  kind: 'boolean',
  localize: false,
  defaultValue: () => false,
  normalize: value => value === true,
  // Off is an answer, not a missing value.
  isEmpty: value => typeof value !== 'boolean',
  validate: value => (value === undefined || typeof value === 'boolean' ? [] : [issue('invalid')]),
  references: noReferences,
  summarize: (value, _field, { t }) => (value ? t('common.yes') : t('common.no'))
})
