import { dataFields } from './walk'
import type { FieldsRecord } from './fields'

type DataRecord = Record<string, unknown>

export interface ReferencesType {
  relations: string[]
  media: string[]
}

const isRecord = (value: unknown): value is DataRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const ids = (value: unknown, multiple: boolean) =>
  (multiple ? (Array.isArray(value) ? value : []) : [value]).filter((id): id is string => typeof id === 'string' && !!id)

const collect = (fields: FieldsRecord, data: unknown, found: ReferencesType) => {
  const source = isRecord(data) ? data : {}

  for (const [key, field] of dataFields(fields)) {
    const value = source[key]
    switch (field.kind) {
      case 'relation':
        found.relations.push(...ids(value, field.multiple))
        break
      case 'image':
      case 'file':
        found.media.push(...ids(value, false))
        break
      case 'gallery':
        found.media.push(...ids(value, true))
        break
      case 'group':
        collect(field.fields, value, found)
        break
      case 'list':
        if (Array.isArray(value)) value.forEach(item => collect(field.fields, item, found))
        break
      case 'blocks':
        if (Array.isArray(value)) {
          value.filter(isRecord).forEach(item => {
            const block = typeof item._type === 'string' ? field.blocks[item._type] : undefined
            if (block) collect(block.fields, item, found)
          })
        }
        break
    }
  }

  return found
}

// Every referenced document and media id in `data`, so the editor resolves labels and thumbnails in one go.
export const documentReferences = (fields: FieldsRecord, data: unknown): ReferencesType => {
  const found = collect(fields, data, { relations: [], media: [] })
  return { relations: [...new Set(found.relations)], media: [...new Set(found.media)] }
}
