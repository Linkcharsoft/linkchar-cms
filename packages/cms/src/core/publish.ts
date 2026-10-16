import type { DocumentStatusType } from './status'

export type BuildStatusType = 'pending' | 'building' | 'success' | 'failed'

export type PublishDisplayStatusType = 'building' | 'success' | 'failed' | 'unconfirmed'

export type BuildEventStatusType = 'started' | 'succeeded' | 'failed'

export interface BuildEventType {
  jobId: string
  status: BuildEventStatusType
}

// Stored in publish_log.error_code; the panel translates them (errors.build.*).
export type BuildErrorCodeType = 'target_missing' | 'hook_refused' | 'hook_unreachable' | 'build_failed'

const DOCUMENT_STATUSES: readonly DocumentStatusType[] = ['hidden', 'new', 'published', 'changed', 'unpublishing']

export const isDocumentStatus = (value: unknown): value is DocumentStatusType =>
  typeof value === 'string' && (DOCUMENT_STATUSES as readonly string[]).includes(value)

// Build events are delivered best effort: past this, the panel stops waiting and no event is matched to it.
export const BUILD_CONFIRMATION_TIMEOUT_MS = 30 * 60 * 1000

export const publishDisplayStatus = (buildStatus: BuildStatusType, requestedAt: string, now = Date.now()): PublishDisplayStatusType => {
  if (buildStatus === 'success' || buildStatus === 'failed') return buildStatus
  return now - Date.parse(requestedAt) > BUILD_CONFIRMATION_TIMEOUT_MS ? 'unconfirmed' : 'building'
}

// An old "unconfirmed" says nothing new: the header stops showing it after a day (the history keeps it).
export const UNCONFIRMED_HEADER_MS = 24 * 60 * 60 * 1000

// What the header shows about the latest publish; null when there's nothing to say.
export const headerPublishStatus = (buildStatus: BuildStatusType, requestedAt: string, now = Date.now()) => {
  const status = publishDisplayStatus(buildStatus, requestedAt, now)
  if (status === 'success') return null
  if (status === 'unconfirmed' && now - Date.parse(requestedAt) > UNCONFIRMED_HEADER_MS) return null
  return { status, minutes: Math.floor((now - Date.parse(requestedAt)) / 60_000) }
}
