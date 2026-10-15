import { defineField, issue } from './registry'
import { isUuid, nullableIssues, strings } from './shared'
import type { BaseOptions } from '../fields'
import type { IssueType } from './registry'

export interface RelationField<M extends boolean = boolean> extends BaseOptions<M extends true ? string[] : string | null> {
  kind: 'relation'
  // Collection id.
  to: string
  multiple: M
}

type RelationValueType<F> = F extends { multiple: true } ? string[] : F extends { multiple: false } ? string | null : string[] | string | null

declare module './registry' {
  interface FieldTypes<F> {
    relation: { field: RelationField, value: RelationValueType<F>, localize: false }
  }
}

const relationField = defineField({
  kind: 'relation',
  localize: false,
  defaultValue: field => (field.multiple ? [] : null),
  normalize: (value, field) => (field.multiple ? strings(value) : typeof value === 'string' && value ? value : null),
  isEmpty: value => strings(Array.isArray(value) ? value : [value]).length === 0,
  validate: (value, field, ctx) => {
    if (!field.multiple) return nullableIssues(value, ctx, current => (isUuid(current) ? null : issue('reference')))
    if (value === undefined || value === null) value = []
    if (!Array.isArray(value)) return [issue('invalid')]
    const invalid = value.flatMap((item, index): IssueType[] => (isUuid(item) ? [] : [issue('reference', undefined, String(index))]))
    return [...invalid, ...(ctx.required && value.length === 0 ? [issue('required')] : [])]
  },
  references: (value, field) => ({ relations: field.multiple ? strings(value) : strings([value]) }),
  summarize: (value, _field, { names, t }) => strings(Array.isArray(value) ? value : [value])
    .map(id => names.relations?.[id] ?? t('diff.deleted'))
    .join(', ')
})

type RelationOptions = Omit<RelationField, 'kind' | 'multiple' | 'default'>

export const relation = <const O extends RelationOptions>(options: O) =>
  ({ kind: 'relation', ...options, multiple: false }) as { kind: 'relation', multiple: false } & O

export const relations = <const O extends RelationOptions>(options: O) =>
  ({ kind: 'relation', ...options, multiple: true }) as { kind: 'relation', multiple: true } & O

export { relationField }
