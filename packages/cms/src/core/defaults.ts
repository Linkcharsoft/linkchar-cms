import { isRecord } from './kinds/shared'
import { storedLeaf } from './locales'
import { dataFields } from './walk'
import type { CmsConfigType } from './config'
import type { BlockDef, DataField, FieldsRecord } from './fields'
import type { StoredValuesOf } from './infer'
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
  return storedLeaf(config, field, undefined)
}

export const buildDefaults = <F extends FieldsRecord>(config: CmsConfigType, fields: F): StoredValuesOf<F> =>
  Object.fromEntries(dataFields(fields).map(([key, field]) => [key, fieldDefault(config, field)])) as StoredValuesOf<F>

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
      return storedLeaf(config, field, value)
  }
}

const givenKey = (item: unknown) => (isRecord(item) && typeof item._key === 'string' && item._key ? item._key : null)

const keyedItems = (items: unknown[], stored: unknown, fieldsOf: (item: DataRecord) => FieldsRecord | undefined) => {
  const previous = Array.isArray(stored) ? stored : []
  const taken = new Set(items.map(givenKey).filter(key => key !== null))
  return items.map((item, index) => {
    if (!isRecord(item)) return item
    const candidate: unknown = previous[index]
    const before = isRecord(candidate) && candidate._type === item._type ? candidate : undefined
    let key = givenKey(item)
    if (!key) {
      const reused = givenKey(before)
      key = reused && !taken.has(reused) ? reused : newKey()
      taken.add(key)
    }
    const fields = fieldsOf(item)
    return { _key: key, ...(fields ? withItemKeys(fields, item, before) : item) }
  })
}

const keyedValue = (field: DataField, value: unknown, stored: unknown): unknown => {
  switch (field.kind) {
    case 'group':
      return isRecord(value) ? withItemKeys(field.fields, value, stored) : value
    case 'list':
      return Array.isArray(value) ? keyedItems(value, stored, () => field.fields) : value
    case 'blocks':
      return Array.isArray(value)
        ? keyedItems(value, stored, item => (typeof item._type === 'string' && Object.hasOwn(field.blocks, item._type) ? field.blocks[item._type].fields : undefined))
        : value
    default:
      return value
  }
}

// Items without a `_key` take the stored one in the same place (same `_type`): rewriting content keeps the JSON.
export const withItemKeys = (fields: FieldsRecord, data: DataRecord, stored?: unknown): DataRecord => {
  const before = isRecord(stored) ? stored : {}
  const known = new Map(dataFields(fields))
  return Object.fromEntries(Object.entries(data).map(([key, value]) => {
    const field = known.get(key)
    return [key, field ? keyedValue(field, value, before[key]) : value]
  }))
}

// Fills in whatever is missing (new fields, new locales, empty content) so a page never breaks; unknown keys
// and locales are dropped, and values saved before a field was localized move to the default locale.
export const withDefaults = <F extends FieldsRecord>(config: CmsConfigType, fields: F, data: unknown): StoredValuesOf<F> => {
  const source = isRecord(data) ? data : {}
  return Object.fromEntries(
    dataFields(fields).map(([key, field]) => [key, valueWithDefault(config, field, source[key])])
  ) as StoredValuesOf<F>
}
