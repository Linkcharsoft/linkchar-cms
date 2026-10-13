import { WEEK_DAYS } from './fields'
import { dataFields } from './walk'
import type { BlockDef, DataField, FieldsRecord, LinkValueType } from './fields'
import type { ValuesOf } from './infer'

type DataRecord = Record<string, unknown>

const isRecord = (value: unknown): value is DataRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

export const newKey = (): string => crypto.randomUUID()

const emptyLink = (type: LinkValueType['type'] = 'internal'): LinkValueType => ({ type, href: '', newTab: false })

export const fieldDefault = (field: DataField): unknown => {
  if (field.kind === 'list' && field.default) {
    return field.default.map(item => ({ _key: newKey(), ...withDefaults(field.fields, item) }))
  }
  if ('default' in field && field.default !== undefined) return structuredClone(field.default)

  switch (field.kind) {
    case 'text':
    case 'textarea':
    case 'email':
    case 'phone':
    case 'url':
    case 'video':
    case 'slug':
      return ''
    case 'richText':
    case 'image':
    case 'file':
    case 'number':
    case 'date':
    case 'datetime':
    case 'select':
      return null
    case 'boolean':
      return false
    case 'multiSelect':
    case 'gallery':
      return []
    case 'link':
      return emptyLink(field.allow?.[0])
    case 'button':
      return { label: '', link: emptyLink(), variant: field.variants[0]?.value ?? '' }
    case 'openingHours':
      return { days: WEEK_DAYS.map(day => ({ day, closed: true, from: '', to: '' })), note: '' }
    case 'relation':
      return field.multiple ? [] : null
    case 'group':
      return buildDefaults(field.fields)
    case 'list':
    case 'blocks':
      return []
  }
}

export const buildDefaults = <F extends FieldsRecord>(fields: F): ValuesOf<F> =>
  Object.fromEntries(dataFields(fields).map(([key, field]) => [key, fieldDefault(field)])) as ValuesOf<F>

export const newListItem = (fields: FieldsRecord) => ({ _key: newKey(), ...buildDefaults(fields) })

export const newBlock = (type: string, block: BlockDef) => ({ _key: newKey(), _type: type, ...buildDefaults(block.fields) })

const withItemKey = (item: DataRecord) => (typeof item._key === 'string' && item._key ? item._key : newKey())

const valueWithDefault = (field: DataField, value: unknown): unknown => {
  if (value === undefined) return fieldDefault(field)

  switch (field.kind) {
    case 'group':
      return withDefaults(field.fields, value)
    case 'list':
      return Array.isArray(value)
        ? value.filter(isRecord).map(item => ({ _key: withItemKey(item), ...withDefaults(field.fields, item) }))
        : []
    case 'blocks':
      return Array.isArray(value)
        ? value.filter(isRecord).flatMap(item => {
          const type = typeof item._type === 'string' ? item._type : ''
          const block = field.blocks[type]
          return block ? [{ _key: withItemKey(item), _type: type, ...withDefaults(block.fields, item) }] : []
        })
        : []
    case 'link':
    case 'openingHours':
      return isRecord(value) ? { ...(fieldDefault(field) as DataRecord), ...value } : fieldDefault(field)
    case 'button': {
      if (!isRecord(value)) return fieldDefault(field)
      const fallback = fieldDefault(field) as DataRecord
      return { ...fallback, ...value, link: isRecord(value.link) ? { ...emptyLink(), ...value.link } : emptyLink() }
    }
    default:
      return value
  }
}

// Fills in whatever is missing (new fields, empty content) so a page never breaks; unknown keys are dropped.
export const withDefaults = <F extends FieldsRecord>(fields: F, data: unknown): ValuesOf<F> => {
  const source = isRecord(data) ? data : {}
  return Object.fromEntries(
    dataFields(fields).map(([key, field]) => [key, valueWithDefault(field, source[key])])
  ) as ValuesOf<F>
}
