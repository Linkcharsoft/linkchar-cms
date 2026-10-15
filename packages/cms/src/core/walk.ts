import { isLayout } from './fields'
import { resolveText } from './text'
import type { DataField, FieldsRecord } from './fields'
import type { TextContextType } from './text'

// Data fields of a record with tabs and rows flattened, in declaration order.
export const dataFields = (fields: FieldsRecord): [string, DataField][] =>
  Object.entries(fields).flatMap(([key, node]): [string, DataField][] => {
    if (!isLayout(node)) return [[key, node]]
    return node.kind === 'note' ? [] : dataFields(node.fields)
  })

// Labels for every data path ("items.0.title" → "Servicios › Título"), used in validation summaries.
export const fieldLabel = (fields: FieldsRecord, path: string, ctx: TextContextType): string => {
  const [head, ...rest] = path.split('.')
  const field = dataFields(fields).find(([key]) => key === head)?.[1]
  if (!field) return path
  const label = resolveText(field.label, ctx)
  if (rest.length === 0) return label

  if (field.kind === 'group') return `${label} › ${fieldLabel(field.fields, rest.join('.'), ctx)}`
  if (field.kind === 'list' && rest.length > 1) {
    return `${label} ${Number(rest[0]) + 1} › ${fieldLabel(field.fields, rest.slice(1).join('.'), ctx)}`
  }

  return label
}
