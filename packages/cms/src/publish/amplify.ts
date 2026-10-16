import { createHash, timingSafeEqual } from 'node:crypto'
import type { PublishTargetType } from './types'
import type { BuildEventStatusType, BuildEventType } from '../core/publish'

export interface AmplifyOptionsType {
  // Amplify's incoming webhook for the production branch; each call queues one build.
  hookUrl: string | undefined
  // Shared with the EventBridge API destination, sent as `Authorization: Bearer <secret>`.
  webhookSecret: string | undefined
  timeoutMs?: number
}

const EVENT_STATUSES: Record<string, BuildEventStatusType> = {
  STARTED: 'started',
  SUCCEED: 'succeeded',
  FAILED: 'failed'
}

// Amplify's "Amplify Deployment Status Change" event, as EventBridge delivers it.
export const parseAmplifyEvent = (body: unknown): BuildEventType | null => {
  if (typeof body !== 'object' || body === null) return null
  const detail = (body as { detail?: unknown }).detail
  if (typeof detail !== 'object' || detail === null) return null

  const { jobId, jobStatus } = detail as { jobId?: unknown, jobStatus?: unknown }
  if (typeof jobId !== 'string' || !jobId || typeof jobStatus !== 'string') return null

  const status = EVENT_STATUSES[jobStatus]
  return status ? { jobId, status } : null
}

const digest = (value: string) => createHash('sha256').update(value).digest()

const isAuthorized = (secret: string | undefined, header: string | null) =>
  !!secret && !!header && timingSafeEqual(digest(header), digest(`Bearer ${secret}`))

export const amplify = ({ hookUrl, webhookSecret, timeoutMs = 10_000 }: AmplifyOptionsType): PublishTargetType => ({
  name: 'amplify',

  trigger: async () => {
    if (!hookUrl) return { ok: false, code: 'target_missing' }
    try {
      const response = await fetch(hookUrl, { method: 'POST', signal: AbortSignal.timeout(timeoutMs) })
      if (!response.ok) return { ok: false, code: 'hook_refused', detail: String(response.status) }
      const body = await response.json().catch(() => null) as { jobId?: unknown } | null
      return { ok: true, jobId: typeof body?.jobId === 'string' ? body.jobId : null }
    } catch (error) {
      console.error('[publish] build hook failed:', error instanceof Error ? error.message : error)
      return { ok: false, code: 'hook_unreachable' }
    }
  },

  readWebhook: async request => {
    if (!isAuthorized(webhookSecret, request.headers.get('authorization'))) return 'unauthorized'
    return parseAmplifyEvent(await request.json().catch(() => null)) ?? 'invalid'
  }
})
