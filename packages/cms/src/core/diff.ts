import { sameContent } from './merge'
import { dataFields } from './walk'
import type { DataField, FieldsRecord } from './fields'

export interface FieldDiffType {
  path: string
  // "Portada › Título", "Puntos 2 › Punto".
  label: string
  current: string
  version: string
}

// Names for values that are ids: media (alt or filename) and related items (title).
export interface DiffNamesType {
  media?: Record<string, string>
  relations?: Record<string, string>
}

const EMPTY = '—'
const MAX_LENGTH = 140

type DataRecord = Record<string, unknown>

const asRecord = (value: unknown): DataRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value) ? value as DataRecord : {}

const shorten = (text: string) => {
  const flat = text.replace(/\s+/g, ' ').trim()
  return flat.length > MAX_LENGTH ? `${flat.slice(0, MAX_LENGTH - 1)}…` : flat || EMPTY
}

const richTextPlain = (node: unknown): string => {
  const record = asRecord(node)
  if (typeof record.text === 'string') return record.text
  return Array.isArray(record.content) ? record.content.map(richTextPlain).join(' ') : ''
}

const isEmpty = (value: unknown) => value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0)

const summarize = (field: DataField, value: unknown, names: DiffNamesType): string => {
  if (field.kind === 'boolean') return value ? 'Sí' : 'No'
  if (isEmpty(value)) return EMPTY

  switch (field.kind) {
    case 'select':
      return field.options.find(option => option.value === value)?.label ?? String(value)
    case 'multiSelect':
      return (value as string[]).map(item => field.options.find(option => option.value === item)?.label ?? item).join(', ')
    case 'richText':
      return shorten(richTextPlain(value))
    case 'image':
    case 'file':
      return names.media?.[value as string] ?? 'Otro archivo'
    case 'gallery':
      return `${(value as string[]).length} imágenes`
    case 'relation': {
      const ids = Array.isArray(value) ? value as string[] : [value as string]
      return ids.map(id => names.relations?.[id] ?? 'Contenido eliminado').join(', ')
    }
    case 'link':
      return shorten(asRecord(value).href as string ?? '')
    case 'button': {
      const button = asRecord(value)
      return shorten(`${button.label ?? ''} → ${asRecord(button.link).href ?? ''}`)
    }
    case 'openingHours':
      return 'Horarios'
    default:
      return typeof value === 'object' ? 'Cambió' : shorten(String(value))
  }
}

const itemSummary = (fields: FieldsRecord, item: unknown, names: DiffNamesType) => {
  const first = dataFields(fields).find(([key]) => !isEmpty(asRecord(item)[key]))
  return first ? summarize(first[1], asRecord(item)[first[0]], names) : EMPTY
}

const walk = (fields: FieldsRecord, current: DataRecord, version: DataRecord, names: DiffNamesType, path: string, label: string): FieldDiffType[] =>
  dataFields(fields).flatMap(([key, field]) => {
    const a = current[key]
    const b = version[key]
    if (sameContent(a, b)) return []
    const fieldPath = `${path}${key}`
    const fieldLabel = `${label}${field.label}`

    if (field.kind === 'group') return walk(field.fields, asRecord(a), asRecord(b), names, `${fieldPath}.`, `${fieldLabel} › `)

    if (field.kind === 'list' || field.kind === 'blocks') {
      const before = Array.isArray(a) ? a : []
      const after = Array.isArray(b) ? b : []
      return Array.from({ length: Math.max(before.length, after.length) }, (_, index) => index).flatMap(index => {
        const itemA = before[index]
        const itemB = after[index]
        if (sameContent(itemA, itemB)) return []
        const typeA = asRecord(itemA)._type
        const typeB = asRecord(itemB)._type
        const itemFields = field.kind === 'list' ? field.fields : field.blocks[(typeA ?? typeB) as string]?.fields ?? {}
        const blockLabel = field.kind === 'blocks' ? field.blocks[(typeA ?? typeB) as string]?.label : null
        const itemLabel = `${fieldLabel} ${index + 1}${blockLabel ? ` (${blockLabel})` : ''}`

        if (itemA === undefined || itemB === undefined || typeA !== typeB) {
          return [{
            path: `${fieldPath}.${index}`,
            label: itemLabel,
            current: itemA === undefined ? EMPTY : itemSummary(itemFields, itemA, names),
            version: itemB === undefined ? EMPTY : itemSummary(itemFields, itemB, names)
          }]
        }
        return walk(itemFields, asRecord(itemA), asRecord(itemB), names, `${fieldPath}.${index}.`, `${itemLabel} › `)
      })
    }

    const before = summarize(field, a, names)
    const after = summarize(field, b, names)
    return [{ path: fieldPath, label: fieldLabel, current: before, version: after === before ? 'Cambió' : after }]
  })

// Fields that differ between the current draft and a saved version, labeled and summarized for people.
export const diffContent = (fields: FieldsRecord, current: unknown, version: unknown, names: DiffNamesType = {}): FieldDiffType[] =>
  walk(fields, asRecord(current), asRecord(version), names, '', '')

