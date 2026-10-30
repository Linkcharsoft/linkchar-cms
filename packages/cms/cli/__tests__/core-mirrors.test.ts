import { describe, expect, it } from 'vitest'
import { amplifyConsoleUrl, BUILD_CONFIRMATION_TIMEOUT_MS } from '../../src/core/publish'
import { consoleUrlOf, OPEN_WINDOW_MS } from '../build.js'

// build:report stays plain JS without jiti, so these two mirror core by hand; this is what keeps them from drifting.
describe('what the CLI mirrors from core', () => {
  it('waits for an open publish as long as the panel does', () => {
    expect(OPEN_WINDOW_MS).toBe(BUILD_CONFIRMATION_TIMEOUT_MS)
  })

  it('links the same Amplify deployment', () => {
    const job = { region: 'us-east-1', appId: 'd1abc', branch: 'feature/x', jobId: '7' }
    expect(consoleUrlOf({ region: job.region, app_id: job.appId, branch: job.branch, job_id: job.jobId })).toBe(amplifyConsoleUrl(job))
    expect(consoleUrlOf({ region: null, app_id: 'd1abc', branch: 'main', job_id: '7' })).toBe(amplifyConsoleUrl({ ...job, region: null }))
  })
})
