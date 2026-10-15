import { issue } from './registry'
import type { IssueType, ValidateContextType } from './registry'

export type DataRecord = Record<string, unknown>

export const isRecord = (value: unknown): value is DataRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export const isUuid = (value: unknown): value is string => typeof value === 'string' && UUID.test(value)

export const strings = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && !!item) : []

const MAX_SUMMARY = 140

export const shorten = (text: string) => {
  const flat = text.replace(/\s+/g, ' ').trim()
  return flat.length > MAX_SUMMARY ? `${flat.slice(0, MAX_SUMMARY - 1)}…` : flat
}

// Single nullable values (date, select, image…): empty is null or ''.
export const nullableIssues = (
  value: unknown,
  ctx: ValidateContextType,
  check: (value: unknown) => IssueType | null
): IssueType[] => {
  if (value === null || value === undefined || value === '') return ctx.required ? [issue('required')] : []
  const found = check(value)
  return found ? [found] : []
}

interface CountRules {
  min?: number
  max?: number
  required?: boolean
}

// Lists of values (multiSelect, gallery, relations): max always, the minimum only when publishing.
export const countIssues = (count: number, rules: CountRules, ctx: ValidateContextType, codes: { max: string, min: string }): IssueType[] => {
  if (rules.max !== undefined && count > rules.max) return [issue(codes.max, { max: rules.max })]
  if (ctx.mode !== 'publish') return []
  const min = rules.min ?? (ctx.required ? 1 : 0)
  if (count >= min) return []
  return [min === 1 ? issue('required') : issue(codes.min, { min, count: min })]
}
