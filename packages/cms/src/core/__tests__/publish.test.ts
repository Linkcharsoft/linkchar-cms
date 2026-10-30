import { describe, expect, it } from 'vitest'
import { amplifyConsoleUrl, BUILD_CONFIRMATION_TIMEOUT_MS, headerPublishStatus, isDocumentStatus, needsSiteStamp, publishDisplayStatus, settlePublishRows, UNCONFIRMED_HEADER_MS } from '../publish'
import type { BuildStatusType, SettleRowType } from '../publish'

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

  it('reads a publish closed as unconfirmed the way it read before it was closed', () => {
    expect(publishDisplayStatus({ ...row('failed'), errorCode: 'unconfirmed' }, start + 1000)).toBe('unconfirmed')
    expect(publishDisplayStatus({ ...row('failed'), errorCode: 'build_failed' }, start + 1000)).toBe('failed')
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

describe('settlePublishRows', () => {
  const requestedAt = '2026-10-14T12:00:00.000Z'
  const start = Date.parse(requestedAt)
  const minute = 60_000
  const at = (minutes: number) => new Date(start + minutes * minute).toISOString()
  const row = (id: number, buildStatus: BuildStatusType, extra: Partial<SettleRowType> = {}): SettleRowType => ({ id, buildStatus, requestedAt, builtAt: null, buildStamp: null, ...extra })

  it('confirms a built publish the site serves however late, and closes the open ones nothing confirmed in time', () => {
    const rows = [
      row(1, 'built', { buildStamp: 'd1.main.7', builtAt: at(5) }),
      row(2, 'built', { buildStamp: 'd1.main.6', builtAt: at(5) }),
      row(3, 'building'),
      row(4, 'pending', { requestedAt: at(50) }),
      row(5, 'success', { buildStamp: 'd1.main.5' }),
      row(6, 'failed', { errorCode: 'unconfirmed' })
    ]
    expect(settlePublishRows(rows, 'd1.main.7', start + 60 * minute)).toEqual({ confirm: [1], close: [2, 3] })
    expect(settlePublishRows(rows, 'd1.main.7', start + 10 * minute)).toEqual({ confirm: [1], close: [] })
    expect(settlePublishRows(rows, null, start + 60 * minute)).toEqual({ confirm: [], close: [1, 2, 3] })
  })

  it('asks the site only while a built publish with a stamp is open', () => {
    expect(needsSiteStamp([row(1, 'building'), row(2, 'built')])).toBe(false)
    expect(needsSiteStamp([row(1, 'built', { buildStamp: 'x' })])).toBe(true)
  })
})
