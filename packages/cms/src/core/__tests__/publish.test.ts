import { describe, expect, it } from 'vitest'
import { BUILD_CONFIRMATION_TIMEOUT_MS, headerPublishStatus, isDocumentStatus, publishDisplayStatus, UNCONFIRMED_HEADER_MS } from '../publish'

describe('publishDisplayStatus', () => {
  const requestedAt = '2026-10-14T12:00:00.000Z'
  const start = Date.parse(requestedAt)

  it('keeps final build results', () => {
    expect(publishDisplayStatus('success', requestedAt, start + BUILD_CONFIRMATION_TIMEOUT_MS * 2)).toBe('success')
    expect(publishDisplayStatus('failed', requestedAt, start)).toBe('failed')
  })

  it('shows pending and building publications as building until the timeout', () => {
    expect(publishDisplayStatus('pending', requestedAt, start + 1000)).toBe('building')
    expect(publishDisplayStatus('building', requestedAt, start + BUILD_CONFIRMATION_TIMEOUT_MS)).toBe('building')
  })

  it('stops waiting after the timeout', () => {
    expect(publishDisplayStatus('building', requestedAt, start + BUILD_CONFIRMATION_TIMEOUT_MS + 1)).toBe('unconfirmed')
  })
})

describe('headerPublishStatus', () => {
  const start = Date.parse('2026-10-14T12:00:00Z')
  const requestedAt = new Date(start).toISOString()

  it('says how long a publish has been running', () => {
    expect(headerPublishStatus('building', requestedAt, start + 20_000)).toEqual({ status: 'building', minutes: 0 })
    expect(headerPublishStatus('building', requestedAt, start + 3 * 60_000)).toEqual({ status: 'building', minutes: 3 })
  })

  it('keeps errors and stops showing an old unconfirmed publish', () => {
    expect(headerPublishStatus('success', requestedAt, start)).toBeNull()
    expect(headerPublishStatus('failed', requestedAt, start + UNCONFIRMED_HEADER_MS * 2)?.status).toBe('failed')
    expect(headerPublishStatus('building', requestedAt, start + BUILD_CONFIRMATION_TIMEOUT_MS + 1)?.status).toBe('unconfirmed')
    expect(headerPublishStatus('building', requestedAt, start + UNCONFIRMED_HEADER_MS + 1)).toBeNull()
  })
})

describe('isDocumentStatus', () => {
  it('accepts only known statuses', () => {
    expect(isDocumentStatus('changed')).toBe(true)
    expect(isDocumentStatus('toString')).toBe(false)
    expect(isDocumentStatus(undefined)).toBe(false)
  })
})
