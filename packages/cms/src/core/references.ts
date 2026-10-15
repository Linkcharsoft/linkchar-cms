import { fieldDefinition } from './config'
import { isRecord } from './kinds/shared'
import { leafVariants } from './locales'
import { dataFields } from './walk'
import type { CmsConfigType } from './config'
import type { FieldsRecord } from './fields'
import type { ReferencesType } from './kinds/registry'

const collect = (config: CmsConfigType, fields: FieldsRecord, data: unknown, found: ReferencesType) => {
  const source = isRecord(data) ? data : {}

  for (const [key, field] of dataFields(fields)) {
    const value = source[key]
    switch (field.kind) {
      case 'group':
        collect(config, field.fields, value, found)
        break
      case 'list':
        if (Array.isArray(value)) value.forEach(item => collect(config, field.fields, item, found))
        break
      case 'blocks':
        if (Array.isArray(value)) {
          value.filter(isRecord).forEach(item => {
            const block = typeof item._type === 'string' && Object.hasOwn(field.blocks, item._type) ? field.blocks[item._type] : undefined
            if (block) collect(config, block.fields, item, found)
          })
        }
        break
      default: {
        if (value === undefined) break
        const definition = fieldDefinition(config, field.kind)
        for (const variant of leafVariants(config, field, value)) {
          if (variant.value === undefined) continue
          const { relations = [], media = [] } = definition.references(variant.value, field)
          found.relations.push(...relations)
          found.media.push(...media)
        }
      }
    }
  }

  return found
}

// Every referenced document and media id in `data`, so the editor resolves labels and thumbnails in one go.
export const documentReferences = (config: CmsConfigType, fields: FieldsRecord, data: unknown): ReferencesType => {
  const found = collect(config, fields, data, { relations: [], media: [] })
  return { relations: [...new Set(found.relations)], media: [...new Set(found.media)] }
}

export type { ReferencesType }
