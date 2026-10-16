const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/

// Minutes ahead of UTC in `timeZone` at that instant ("GMT-03:00" → -180).
const offsetMinutes = (instant: number, timeZone: string) => {
  const name = new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'longOffset' })
    .formatToParts(instant).find(part => part.type === 'timeZoneName')?.value ?? 'GMT'
  const match = name.match(/GMT([+-])(\d{2}):(\d{2})/)
  return match ? (match[1] === '-' ? -1 : 1) * (Number(match[2]) * 60 + Number(match[3])) : 0
}

// Local midnight as a UTC instant; the second pass corrects days that start or end a daylight saving period.
const startOfDay = (year: number, month: number, day: number, timeZone: string) => {
  const guess = Date.UTC(year, month - 1, day)
  const first = guess - offsetMinutes(guess, timeZone) * 60_000
  return guess - offsetMinutes(first, timeZone) * 60_000
}

// A calendar day ("2026-10-13") in the site's time zone, as the UTC range a timestamp filter needs.
export const dayRange = (day: string, timeZone: string) => {
  const match = day.match(DATE_ONLY)
  if (!match) return null
  const [year, month, date] = [Number(match[1]), Number(match[2]), Number(match[3])]
  const from = startOfDay(year, month, date, timeZone)
  const to = startOfDay(year, month, date + 1, timeZone) - 1
  return { from: new Date(from).toISOString(), to: new Date(to).toISOString() }
}

export type DateStyleType = 'dateTime' | 'shortDateTime' | 'date' | 'time' | 'longDate'

const DATE_STYLES: Record<DateStyleType, Intl.DateTimeFormatOptions> = {
  dateTime: { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' },
  shortDateTime: { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' },
  date: { day: '2-digit', month: '2-digit', year: 'numeric' },
  time: { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' },
  longDate: { day: 'numeric', month: 'long', year: 'numeric' }
}

// Servers render in UTC and browsers in local time: always format in the site's zone so both agree.
// A calendar date ("2026-10-13") has no zone, so it is read and written in UTC to stay on its day.
export const formatDate = (value: string | Date, style: DateStyleType, { locale, timeZone }: { locale: string, timeZone: string }) => {
  const isCalendarDate = typeof value === 'string' && DATE_ONLY.test(value)
  const date = isCalendarDate ? new Date(`${value}T00:00:00Z`) : new Date(value)
  return new Intl.DateTimeFormat(locale, { ...DATE_STYLES[style], timeZone: isCalendarDate ? 'UTC' : timeZone }).format(date)
}
