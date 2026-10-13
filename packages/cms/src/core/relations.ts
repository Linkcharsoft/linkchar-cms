import { dataFields } from './walk'
import type { FieldsRecord } from './fields'

type DataRecord = Record<string, unknown>

const isRecord = (value: unknown): value is DataRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

// Every referenced document id in `data`, so the editor can show labels without one request per field.
export const relationIds = (fields: FieldsRecord, data: unknown): string[] => {
  const source = isRecord(data) ? data : {}
  const ids = dataFields(fields).flatMap(([key, field]): string[] => {
    const value = source[key]
    switch (field.kind) {
      case 'relation': {
        const candidates = field.multiple ? (Array.isArray(value) ? value : []) : [value]
        return candidates.filter((id): id is string => typeof id === 'string' && !!id)
      }
      case 'group':
        return relationIds(field.fields, value)
      case 'list':
        return Array.isArray(value) ? value.flatMap(item => relationIds(field.fields, item)) : []
      case 'blocks':
        return Array.isArray(value)
          ? value.filter(isRecord).flatMap(item => {
            const block = typeof item._type === 'string' ? field.blocks[item._type] : undefined
            return block ? relationIds(block.fields, item) : []
          })
          : []
      default:
        return []
    }
  })
  return [...new Set(ids)]
}
