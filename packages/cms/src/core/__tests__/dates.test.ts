import { describe, expect, it } from 'vitest'
import { dayRange } from '../dates'

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
