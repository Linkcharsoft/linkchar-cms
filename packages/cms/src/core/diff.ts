import { fieldDefinition, translatorFor } from './config'
import { isRecord } from './kinds/shared'
import { sameContent } from './merge'
import { dataFields } from './walk'
import type { CmsConfigType } from './config'
import type { DataField, FieldsRecord } from './fields'
import type { DiffNamesType, SummaryContextType } from './kinds/registry'

export interface FieldDiffType {
  path: string
  // "Portada › Título", "Puntos 2 › Punto".
  label: string
  current: string
  version: string
}

type DataRecord = Record<string, unknown>

const asRecord = (value: unknown): DataRecord => (isRecord(value) ? value : {})

const summarize = (field: DataField, value: unknown, ctx: SummaryContextType): string => {
  const empty = ctx.t('common.empty')
  if (field.kind === 'group' || field.kind === 'list' || field.kind === 'blocks') return empty
  const definition = fieldDefinition(ctx.config, field.kind)
  if (value === undefined || definition.isEmpty(value, field)) return empty
  return definition.summarize(value, field, ctx) || empty
}

const itemSummary = (fields: FieldsRecord, item: unknown, ctx: SummaryContextType) => {
  const first = dataFields(fields).find(([key, field]) => summarize(field, asRecord(item)[key], ctx) !== ctx.t('common.empty'))
  return first ? summarize(first[1], asRecord(item)[first[0]], ctx) : ctx.t('common.empty')
}

const walk = (fields: FieldsRecord, current: DataRecord, version: DataRecord, ctx: SummaryContextType, path: string, label: string): FieldDiffType[] =>
  dataFields(fields).flatMap(([key, field]) => {
    const a = current[key]
    const b = version[key]
    if (sameContent(a, b)) return []
    const fieldPath = `${path}${key}`
    const fieldLabel = `${label}${field.label}`

    if (field.kind === 'group') return walk(field.fields, asRecord(a), asRecord(b), ctx, `${fieldPath}.`, `${fieldLabel} › `)

    if (field.kind === 'list' || field.kind === 'blocks') {
      const before = Array.isArray(a) ? a : []
      const after = Array.isArray(b) ? b : []
      return Array.from({ length: Math.max(before.length, after.length) }, (_, index) => index).flatMap(index => {
        const itemA = before[index]
        const itemB = after[index]
        if (sameContent(itemA, itemB)) return []
        const typeA = asRecord(itemA)._type
        const typeB = asRecord(itemB)._type
        const block = field.kind === 'blocks' ? field.blocks[(typeA ?? typeB) as string] : undefined
        const itemFields = field.kind === 'list' ? field.fields : block?.fields ?? {}
        const itemLabel = `${fieldLabel} ${index + 1}${block ? ` (${block.label})` : ''}`

        if (itemA === undefined || itemB === undefined || typeA !== typeB) {
          return [{
            path: `${fieldPath}.${index}`,
            label: itemLabel,
            current: itemA === undefined ? ctx.t('common.empty') : itemSummary(itemFields, itemA, ctx),
            version: itemB === undefined ? ctx.t('common.empty') : itemSummary(itemFields, itemB, ctx)
          }]
        }
        return walk(itemFields, asRecord(itemA), asRecord(itemB), ctx, `${fieldPath}.${index}.`, `${itemLabel} › `)
      })
    }

    const before = summarize(field, a, ctx)
    const after = summarize(field, b, ctx)
    return [{ path: fieldPath, label: fieldLabel, current: before, version: after === before ? ctx.t('common.changed') : after }]
  })

// Fields that differ between the current draft and a saved version, labeled and summarized for people.
export const diffContent = (config: CmsConfigType, fields: FieldsRecord, current: unknown, version: unknown, names: DiffNamesType = {}): FieldDiffType[] =>
  walk(fields, asRecord(current), asRecord(version), { config, t: translatorFor(config).t, names }, '', '')

export type { DiffNamesType }
