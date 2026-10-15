import { fieldDefinition } from './config'
import { isRecord } from './kinds/shared'
import { dataFields } from './walk'
import type { CmsConfigType } from './config'
import type { BlockDef, DataField, FieldsRecord } from './fields'
import type { ValuesOf } from './infer'
import type { DataRecord } from './kinds/shared'

export const newKey = (): string => crypto.randomUUID()

export const fieldDefault = (config: CmsConfigType, field: DataField): unknown => {
  switch (field.kind) {
    case 'group':
      return buildDefaults(config, field.fields)
    case 'list':
      return (field.default ?? []).map(item => ({ _key: newKey(), ...withDefaults(config, field.fields, item) }))
    case 'blocks':
      return []
  }
  const definition = fieldDefinition(config, field.kind)
  return field.default !== undefined
    ? definition.normalize(structuredClone(field.default), field)
    : definition.defaultValue(field)
}

export const buildDefaults = <F extends FieldsRecord>(config: CmsConfigType, fields: F): ValuesOf<F> =>
  Object.fromEntries(dataFields(fields).map(([key, field]) => [key, fieldDefault(config, field)])) as ValuesOf<F>

export const newListItem = (config: CmsConfigType, fields: FieldsRecord) => ({ _key: newKey(), ...buildDefaults(config, fields) })

export const newBlock = (config: CmsConfigType, type: string, block: BlockDef) =>
  ({ _key: newKey(), _type: type, ...buildDefaults(config, block.fields) })

const itemKey = (item: DataRecord) => (typeof item._key === 'string' && item._key ? item._key : newKey())

const valueWithDefault = (config: CmsConfigType, field: DataField, value: unknown): unknown => {
  if (value === undefined) return fieldDefault(config, field)

  switch (field.kind) {
    case 'group':
      return withDefaults(config, field.fields, value)
    case 'list':
      return Array.isArray(value)
        ? value.filter(isRecord).map(item => ({ _key: itemKey(item), ...withDefaults(config, field.fields, item) }))
        : []
    case 'blocks':
      return Array.isArray(value)
        ? value.filter(isRecord).flatMap(item => {
          const type = typeof item._type === 'string' ? item._type : ''
          const block = Object.hasOwn(field.blocks, type) ? field.blocks[type] : undefined
          return block ? [{ _key: itemKey(item), _type: type, ...withDefaults(config, block.fields, item) }] : []
        })
        : []
    default:
      return fieldDefinition(config, field.kind).normalize(value, field)
  }
}

// Fills in whatever is missing (new fields, empty content) so a page never breaks; unknown keys are dropped.
export const withDefaults = <F extends FieldsRecord>(config: CmsConfigType, fields: F, data: unknown): ValuesOf<F> => {
  const source = isRecord(data) ? data : {}
  return Object.fromEntries(
    dataFields(fields).map(([key, field]) => [key, valueWithDefault(config, field, source[key])])
  ) as ValuesOf<F>
}
