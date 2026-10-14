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
