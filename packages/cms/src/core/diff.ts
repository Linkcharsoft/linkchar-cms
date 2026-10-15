import { fieldDefinition, textContext } from './config'
import { languageName } from './i18n/translator'
import { isRecord } from './kinds/shared'
import { fieldLocalize, leafVariants } from './locales'
import { sameContent } from './merge'
import { resolveText } from './text'
import { dataFields } from './walk'
import type { CmsConfigType } from './config'
import type { DataField, FieldsRecord } from './fields'
import type { DiffNamesType, LeafField, SummaryContextType } from './kinds/registry'

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

const pick = (value: unknown, parts: string[] | null) =>
  (parts === null ? value : Object.fromEntries(parts.map(part => [part, asRecord(value)[part]])))

// Localized fields differ per locale: "Portada › Título (Inglés)". Shared parts of a button show once.
const leafDiffs = (field: LeafField, a: unknown, b: unknown, ctx: SummaryContextType, path: string, label: string): FieldDiffType[] => {
  const { config } = ctx
  const many = fieldLocalize(config, field) !== false && config.locales.length > 1
  const before = new Map(leafVariants(config, field, a).map(variant => [variant.locale, variant]))
  const after = new Map(leafVariants(config, field, b).map(variant => [variant.locale, variant]))

  return config.locales.flatMap(locale => {
    const variant = before.get(locale) ?? after.get(locale)
    if (!variant) return []
    const valueA = before.get(locale)?.value
    const valueB = after.get(locale)?.value
    if (sameContent(pick(valueA, variant.parts), pick(valueB, variant.parts))) return []
    const current = summarize(field, valueA, ctx)
    const version = summarize(field, valueB, ctx)
    const suffix = many && !(variant.primary && variant.parts === null && typeof fieldLocalize(config, field) === 'object')
      ? ` (${languageName(locale, config.panelLocale)})`
      : ''
    return [{
      path: join(path, variant.path(variant.parts?.length === 1 ? variant.parts[0] : '')),
      label: `${label}${suffix}`,
      current,
      version: version === current ? ctx.t('common.changed') : version
    }]
  })
}

const join = (head: string, inner: string) => (inner ? `${head}.${inner}` : head)

const walk = (fields: FieldsRecord, current: DataRecord, version: DataRecord, ctx: SummaryContextType, path: string, label: string): FieldDiffType[] =>
  dataFields(fields).flatMap(([key, field]) => {
    const a = current[key]
    const b = version[key]
    if (sameContent(a, b)) return []
    const fieldPath = `${path}${key}`
    const fieldLabel = `${label}${ctx.text(field.label)}`

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
        const itemLabel = `${fieldLabel} ${index + 1}${block ? ` (${ctx.text(block.label)})` : ''}`

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

    return leafDiffs(field, a, b, ctx, fieldPath, fieldLabel)
  })

// Fields that differ between the current draft and a saved version, labeled and summarized for people.
export const diffContent = (config: CmsConfigType, fields: FieldsRecord, current: unknown, version: unknown, names: DiffNamesType = {}): FieldDiffType[] => {
  const texts = textContext(config)
  const ctx = { config, t: texts.translator.t, text: (value: Parameters<typeof resolveText>[0]) => resolveText(value, texts), names }
  return walk(fields, asRecord(current), asRecord(version), ctx, '', '')
}

export type { DiffNamesType }
