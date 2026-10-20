import type { PublishTargetType } from './types'

export interface MockBuildOptionsType {
  result?: 'success' | 'failed'
  seconds?: number
}

// Stands in for the build in development: reports "started" and then the result, as the webhook would.
export const mockBuild = ({ result = 'success', seconds = 15 }: MockBuildOptionsType = {}): PublishTargetType => ({
  name: 'mock',
  revalidateOnPublish: true,

  trigger: async ({ report }) => {
    const jobId = `mock-${Date.now()}`
    const send = (status: 'started' | 'succeeded' | 'failed') =>
      report({ jobId, status }).catch(error => console.error('[mock-build] report failed:', error))

    setTimeout(() => send('started'), 1000)
    setTimeout(() => send(result === 'failed' ? 'failed' : 'succeeded'), Math.max(seconds, 1) * 1000 + 100)
    return { ok: true, jobId }
  }
})
