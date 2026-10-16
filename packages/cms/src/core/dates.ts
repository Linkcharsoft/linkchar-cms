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
