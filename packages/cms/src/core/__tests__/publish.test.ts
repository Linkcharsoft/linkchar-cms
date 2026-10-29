import { describe, expect, it } from 'vitest'
import { amplifyConsoleUrl, BUILD_CONFIRMATION_TIMEOUT_MS, headerPublishStatus, isDocumentStatus, publishDisplayStatus, UNCONFIRMED_HEADER_MS } from '../publish'
import type { BuildStatusType } from '../publish'

describe('publishDisplayStatus', () => {
  const requestedAt = '2026-10-14T12:00:00.000Z'
  const start = Date.parse(requestedAt)
  const row = (buildStatus: BuildStatusType, builtAt: string | null = null) => ({ buildStatus, requestedAt, builtAt })

  it('keeps final build results', () => {
    expect(publishDisplayStatus(row('success'), start + BUILD_CONFIRMATION_TIMEOUT_MS * 2)).toBe('success')
    expect(publishDisplayStatus(row('failed'), start)).toBe('failed')
  })

  it('shows pending and building publications as building until the timeout', () => {
    expect(publishDisplayStatus(row('pending'), start + 1000)).toBe('building')
    expect(publishDisplayStatus(row('building'), start + BUILD_CONFIRMATION_TIMEOUT_MS)).toBe('building')
  })

  it('stops waiting after the timeout', () => {
    expect(publishDisplayStatus(row('building'), start + BUILD_CONFIRMATION_TIMEOUT_MS + 1)).toBe('unconfirmed')
  })

  it('waits for the deploy from the end of the build, not from the request', () => {
    const builtAt = new Date(start + 25 * 60_000).toISOString()
    expect(publishDisplayStatus(row('built', builtAt), start + 40 * 60_000)).toBe('deploying')
    expect(publishDisplayStatus(row('built', builtAt), start + 25 * 60_000 + BUILD_CONFIRMATION_TIMEOUT_MS + 1)).toBe('unconfirmed')
    expect(publishDisplayStatus(row('built'), start + BUILD_CONFIRMATION_TIMEOUT_MS + 1)).toBe('unconfirmed')
  })
})

describe('amplifyConsoleUrl', () => {
  it('links the deployment when the build reported where it ran', () => {
    expect(amplifyConsoleUrl({ region: 'us-east-1', appId: 'd1abc', branch: 'release/2026', jobId: '7' }))
      .toBe('https://us-east-1.console.aws.amazon.com/amplify/apps/d1abc/branches/release%2F2026/deployments/7')
    expect(amplifyConsoleUrl({ region: null, appId: 'd1abc', branch: 'main', jobId: '7' })).toBeNull()
  })
})

describe('headerPublishStatus', () => {
  const start = Date.parse('2026-10-14T12:00:00Z')
  const requestedAt = new Date(start).toISOString()

  const row = (buildStatus: BuildStatusType) => ({ buildStatus, requestedAt })

  it('says how long a publish has been running', () => {
    expect(headerPublishStatus(row('building'), start + 20_000)).toEqual({ status: 'building', minutes: 0 })
    expect(headerPublishStatus(row('building'), start + 3 * 60_000)).toEqual({ status: 'building', minutes: 3 })
    expect(headerPublishStatus({ ...row('built'), builtAt: new Date(start + 4 * 60_000).toISOString() }, start + 5 * 60_000)).toEqual({ status: 'deploying', minutes: 5 })
  })

  it('keeps errors and stops showing an old unconfirmed publish', () => {
    expect(headerPublishStatus(row('success'), start)).toBeNull()
    expect(headerPublishStatus(row('failed'), start + UNCONFIRMED_HEADER_MS * 2)?.status).toBe('failed')
    expect(headerPublishStatus(row('building'), start + BUILD_CONFIRMATION_TIMEOUT_MS + 1)?.status).toBe('unconfirmed')
    expect(headerPublishStatus(row('building'), start + UNCONFIRMED_HEADER_MS + 1)).toBeNull()
  })
})

describe('isDocumentStatus', () => {
  it('accepts only known statuses', () => {
    expect(isDocumentStatus('changed')).toBe(true)
    expect(isDocumentStatus('toString')).toBe(false)
    expect(isDocumentStatus(undefined)).toBe(false)
  })
})
