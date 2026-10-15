import { withDefaults } from './defaults'
import { getEntry } from './entries'
import { HIDDEN_KEY } from './fields'
import { sameContent } from './merge'
import { dataFields } from './walk'
import type { CmsConfigType } from './config'
import type { SchemaEntry } from './define'
import type { DataField, FieldsRecord, SectionMarkType } from './fields'
import type { TextType } from './text'

export interface PageSectionType {
  key: string
  label: TextType
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

export interface UsedEntryType {
  id: string
  kind: SchemaEntry['kind']
  // A collection shown as a tab ("Artículos") reads better than its menu name ("Blog").
  label: TextType
}

// Entries a page shows content from (its sections' `uses`), without repeats.
export const usedEntries = (config: CmsConfigType, sections: PageSectionType[]): UsedEntryType[] =>
  [...new Set(sections.flatMap(({ mark }) => mark?.uses ?? []))].flatMap(id => {
    const entry = getEntry(config, id)
    if (!entry) return []
    return [{ id, kind: entry.kind, label: entry.kind === 'collection' ? entry.tabLabel ?? entry.label : entry.label }]
  })

// Sections whose draft differs from what's published (missing values count as their defaults).
export const changedSections = (config: CmsConfigType, fields: FieldsRecord, draft: unknown, published: unknown): PageSectionType[] => {
  const current = withDefaults(config, fields, draft) as Record<string, unknown>
  const live = withDefaults(config, fields, published) as Record<string, unknown>
  return pageSections(fields).filter(({ key }) => !sameContent(current[key], live[key]))
}
