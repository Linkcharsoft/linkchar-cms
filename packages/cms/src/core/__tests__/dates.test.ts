import { describe, expect, it } from 'vitest'
import { dayRange, formatDate } from '../dates'

describe('dayRange', () => {
  it('covers the whole day in the site time zone', () => {
    expect(dayRange('2026-10-13', 'America/Argentina/Buenos_Aires')).toEqual({ from: '2026-10-13T03:00:00.000Z', to: '2026-10-14T02:59:59.999Z' })
    expect(dayRange('2026-10-13', 'UTC')).toEqual({ from: '2026-10-13T00:00:00.000Z', to: '2026-10-13T23:59:59.999Z' })
  })

  it('follows daylight saving changes', () => {
    expect(dayRange('2026-03-29', 'Europe/Madrid')).toEqual({ from: '2026-03-28T23:00:00.000Z', to: '2026-03-29T21:59:59.999Z' })
  })

  it('rejects other formats', () => {
    expect(dayRange('13/10/2026', 'UTC')).toBeNull()
  })
})

describe('formatDate', () => {
  const argentina = { locale: 'es', timeZone: 'America/Argentina/Buenos_Aires' }

  it('formats in the site time zone, whatever the machine zone', () => {
    expect(formatDate('2026-10-13T02:30:00Z', 'dateTime', argentina)).toBe('12/10/2026, 23:30')
    expect(formatDate('2026-10-13T02:30:00Z', 'time', argentina)).toBe('23:30')
    expect(formatDate('2026-10-13T02:30:00Z', 'date', { locale: 'en', timeZone: 'UTC' })).toBe('10/13/2026')
  })

  it('keeps calendar dates on their day', () => {
    expect(formatDate('2026-10-13', 'longDate', argentina)).toBe('13 de octubre de 2026')
    expect(formatDate('2026-10-13', 'longDate', { locale: 'en', timeZone: 'Pacific/Auckland' })).toBe('October 13, 2026')
  })
})
