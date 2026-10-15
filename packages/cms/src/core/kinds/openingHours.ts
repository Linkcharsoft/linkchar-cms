import { defineField, issue, noReferences } from './registry'
import { isRecord } from './shared'
import type { BaseOptions } from '../fields'
import type { IssueType } from './registry'

// Opt-in kind: projects enable it with `fields: [openingHours]` in defineCmsConfig.
export const WEEK_DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const

export type WeekDayType = typeof WEEK_DAYS[number]

export interface DayHoursType {
  day: WeekDayType
  closed: boolean
  from: string
  to: string
}

export interface OpeningHoursValueType {
  days: DayHoursType[]
  note: string
}

export interface OpeningHoursField extends BaseOptions<OpeningHoursValueType> { kind: 'openingHours' }

declare module './registry' {
  interface FieldTypes<F> {
    openingHours: { field: OpeningHoursField, value: OpeningHoursValueType, localize: { note: 'translate' } }
  }
}

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/
const MAX_NOTE = 200
// 2024-01-01 was a Monday.
const MONDAY = Date.UTC(2024, 0, 1)

export const weekDayName = (day: WeekDayType, locale: string, width: 'long' | 'short' = 'long') => {
  const name = new Intl.DateTimeFormat(locale, { weekday: width, timeZone: 'UTC' }).format(MONDAY + WEEK_DAYS.indexOf(day) * 86_400_000)
  return name.charAt(0).toLocaleUpperCase(locale) + name.slice(1)
}

const emptyHours = (): OpeningHoursValueType => ({ days: WEEK_DAYS.map(day => ({ day, closed: true, from: '', to: '' })), note: '' })

const dayIssues = (day: unknown, index: number): IssueType[] => {
  const at = (key: string) => `days.${index}.${key}`
  if (!isRecord(day)) return [issue('invalid', undefined, `days.${index}`)]
  const issues: IssueType[] = []
  if (!WEEK_DAYS.includes(day.day as WeekDayType)) issues.push(issue('invalid', undefined, at('day')))
  for (const key of ['from', 'to'] as const) {
    const time = day[key] ?? ''
    if (typeof time !== 'string' || (time && !TIME.test(time))) issues.push(issue('time', undefined, at(key)))
  }
  if (issues.length === 0 && day.from && day.to && (day.from as string) >= (day.to as string)) issues.push(issue('timeOrder', undefined, at('to')))
  return issues
}

export const openingHours = defineField({
  kind: 'openingHours',
  localize: { note: 'translate' },
  defaultValue: emptyHours,
  normalize: value => (isRecord(value) ? { ...emptyHours(), ...value } as OpeningHoursValueType : emptyHours()),
  isEmpty: value => !isRecord(value) || !Array.isArray(value.days) || value.days.every(day => !isRecord(day) || day.closed !== false),
  validate: value => {
    if (value === undefined) return []
    if (!isRecord(value) || !Array.isArray(value.days)) return [issue('invalid')]
    const note = value.note ?? ''
    const noteIssues = typeof note !== 'string' ? [issue('invalid', undefined, 'note')]
      : note.length > MAX_NOTE ? [issue('maxLength', { max: MAX_NOTE }, 'note')] : []
    return [...value.days.flatMap(dayIssues), ...noteIssues]
  },
  references: noReferences,
  summarize: (_value, _field, { t }) => t('diff.openingHours')
})
