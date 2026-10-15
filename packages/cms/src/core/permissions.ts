import { fieldDefault } from './defaults'
import { dataFields } from './walk'
import type { CmsConfigType } from './config'
import type { FieldsRecord } from './fields'

type DataRecord = Record<string, unknown>

const isRecord = (value: unknown): value is DataRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

// Non-superadmins never see superadminOnly fields, so whatever they send for them is replaced by the stored value.
export const keepSuperadminFields = (config: CmsConfigType, fields: FieldsRecord, incoming: DataRecord, stored: unknown): DataRecord => {
  const current = isRecord(stored) ? stored : {}
  const result = { ...incoming }

  for (const [key, field] of dataFields(fields)) {
    if (field.superadminOnly) {
      result[key] = key in current ? current[key] : fieldDefault(config, field)
    } else if (field.kind === 'group' && isRecord(incoming[key])) {
      result[key] = keepSuperadminFields(config, field.fields, incoming[key], current[key])
    }
  }

  return result
}

// Hides superadminOnly fields from the form for everyone else.
export const visibleFields = (fields: FieldsRecord, isSuperadmin: boolean): FieldsRecord => {
  if (isSuperadmin) return fields
  return Object.fromEntries(
    Object.entries(fields)
      .filter(([, node]) => !('superadminOnly' in node && node.superadminOnly))
      .map(([key, node]) => {
        if (node.kind === 'tab' || node.kind === 'panel' || node.kind === 'row' || node.kind === 'group') {
          return [key, { ...node, fields: visibleFields(node.fields, false) }]
        }
        return [key, node]
      })
  )
}
