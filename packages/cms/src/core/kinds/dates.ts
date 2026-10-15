import { defineField, issue, noReferences } from './registry'
import { nullableIssues } from './shared'
import type { BaseOptions } from '../fields'

export interface DateField extends BaseOptions<string | null> { kind: 'date' }
export interface DatetimeField extends BaseOptions<string | null> { kind: 'datetime' }

declare module './registry' {
  interface FieldTypes<F> {
    date: { field: DateField, value: string | null, localize: false }
    datetime: { field: DatetimeField, value: string | null, localize: false }
  }
}

const isDate = (value: unknown): value is string => typeof value === 'string' && !Number.isNaN(Date.parse(value))

// Dates are stored as ISO strings; datetimes in UTC, shown in the site's time zone.
const dateKind = <K extends 'date' | 'datetime'>(kind: K, format: Intl.DateTimeFormatOptions) => defineField<K>({
  kind,
  localize: false,
  defaultValue: () => null,
  normalize: value => (isDate(value) ? value : null),
  isEmpty: value => !isDate(value),
  validate: (value, _field, ctx) => nullableIssues(value, ctx, current => (isDate(current) ? null : issue('date'))),
  references: noReferences,
  summarize: (value, _field, { config }) => (isDate(value)
    ? new Intl.DateTimeFormat(config.panelLocale, { timeZone: config.timeZone, ...format }).format(new Date(value))
    : String(value))
})

export const date = dateKind('date', { dateStyle: 'medium', timeZone: 'UTC' })
export const datetime = dateKind('datetime', { dateStyle: 'medium', timeStyle: 'short' })
