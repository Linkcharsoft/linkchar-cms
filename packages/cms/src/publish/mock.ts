import type { PublishTargetType } from './types'
import type { BuildEventStatusType } from '../core/publish'

export interface MockBuildOptionsType {
  result?: 'success' | 'failed' | 'cancelled'
  seconds?: number
  // A simulated success against a hosted project hides that no site was built; only a deliberate setup asks for it.
  allowRemote?: boolean
}

const OUTCOMES: Record<NonNullable<MockBuildOptionsType['result']>, BuildEventStatusType> = { success: 'succeeded', failed: 'failed', cancelled: 'cancelled' }

// Stands in for the build in development: reports "started" and then the result, as the webhook would.
export const mockBuild = ({ result = 'success', seconds = 15, allowRemote = false }: MockBuildOptionsType = {}): PublishTargetType => ({
  name: 'mock',
  revalidateOnPublish: true,
  localOnly: !allowRemote,

  trigger: async ({ report, logger }) => {
    const jobId = `mock-${Date.now()}`
    const send = (status: BuildEventStatusType) =>
      report({ jobId, status }).catch(error => logger.error('[mock-build] report failed:', error))

    setTimeout(() => send('started'), 1000)
    setTimeout(() => send(OUTCOMES[result] ?? 'succeeded'), Math.max(seconds, 1) * 1000 + 100)
    return { ok: true, jobId }
  }
})
