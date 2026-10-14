import { HIDDEN_KEY } from './fields'
import { dataFields } from './walk'
import type { DataField, FieldsRecord, SectionMarkType } from './fields'

export interface PageSectionType {
  key: string
  label: string
  field: DataField
  // null for a top-level field that isn't a section() (e.g. a blocks zone).
  mark: SectionMarkType | null
}

// Top-level parts of a page in display order: its sections, its block zone if any, and its SEO.
export const pageSections = (fields: FieldsRecord): PageSectionType[] =>
  dataFields(fields).map(([key, field]) => ({
    key,
    label: field.label,
    field,
    mark: field.kind === 'group' ? field.section ?? null : null
  }))

export const isSectionHidden = (value: unknown): boolean =>
  typeof value === 'object' && value !== null && (value as Record<string, unknown>)[HIDDEN_KEY] === true

// One line that identifies a closed section: its title, or else its first filled-in text.
export const sectionSummary = (value: unknown): string => {
  if (typeof value !== 'object' || value === null) return ''
  const record = value as Record<string, unknown>
  const texts = [record.title, ...Object.values(record)].filter((item): item is string => typeof item === 'string' && !!item.trim())
  return texts[0]?.replace(/\s+/g, ' ').trim() ?? ''
}

// Error paths ("hero.title", "seo.description") counted by the section they belong to.
export const countBySection = (paths: string[]): Record<string, number> =>
  paths.reduce<Record<string, number>>((counts, path) => {
    const key = path.split('.')[0]
    counts[key] = (counts[key] ?? 0) + 1
    return counts
  }, {})
