import { isLayout } from './fields'
import type { DataField, FieldsRecord } from './fields'

// Data fields of a record with tabs and rows flattened, in declaration order.
export const dataFields = (fields: FieldsRecord): [string, DataField][] =>
  Object.entries(fields).flatMap(([key, node]): [string, DataField][] => {
    if (!isLayout(node)) return [[key, node]]
    return node.kind === 'note' ? [] : dataFields(node.fields)
  })

// Labels for every data path ("items.0.title" → "Servicios › Título"), used in validation summaries.
export const fieldLabel = (fields: FieldsRecord, path: string): string => {
  const [head, ...rest] = path.split('.')
  const field = dataFields(fields).find(([key]) => key === head)?.[1]
  if (!field) return path
  if (rest.length === 0) return field.label

  if (field.kind === 'group') return `${field.label} › ${fieldLabel(field.fields, rest.join('.'))}`
  if (field.kind === 'list' && rest.length > 1) {
    return `${field.label} ${Number(rest[0]) + 1} › ${fieldLabel(field.fields, rest.slice(1).join('.'))}`
  }

  return field.label
}
