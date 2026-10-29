import type { DocumentStatusType } from './status'

// `built`: the build ended and reported (linkchar-cms build:report --ok); success comes when the site serves its stamp.
export type BuildStatusType = 'pending' | 'building' | 'built' | 'success' | 'failed'

export type PublishDisplayStatusType = 'building' | 'deploying' | 'success' | 'failed' | 'unconfirmed'

export type BuildEventStatusType = 'started' | 'succeeded' | 'failed' | 'cancelled'

export interface BuildEventType {
  jobId: string
  status: BuildEventStatusType
}

// Stored in publish_log.error_code; the panel translates them (errors.build.*).
export type BuildErrorCodeType = 'target_missing' | 'hook_refused' | 'hook_unreachable' | 'build_failed' | 'build_cancelled'

const DOCUMENT_STATUSES: readonly DocumentStatusType[] = ['hidden', 'new', 'published', 'changed', 'unpublishing']

export const isDocumentStatus = (value: unknown): value is DocumentStatusType =>
  typeof value === 'string' && (DOCUMENT_STATUSES as readonly string[]).includes(value)

// Job ids of the simulated build: its publishes never built a site.
export const MOCK_JOB_PREFIX = 'mock-'

export const isSimulatedJob = (jobId: string | null | undefined) => !!jobId && jobId.startsWith(MOCK_JOB_PREFIX)

// What the publish log says about the site's build circuit: never used, never confirmed by a real build, or confirmed.
export type PublishCircuitType = 'unused' | 'unconfirmed' | 'confirmed'

// Build events are delivered best effort: past this, the panel stops waiting and no event is matched to it.
export const BUILD_CONFIRMATION_TIMEOUT_MS = 30 * 60 * 1000

// What a publish row says about its timing: the build is waited for from the request, the deploy from the build's end.
export interface PublishTimingType {
  buildStatus: BuildStatusType
  requestedAt: string
  builtAt?: string | null
}

export const publishDisplayStatus = ({ buildStatus, requestedAt, builtAt }: PublishTimingType, now = Date.now()): PublishDisplayStatusType => {
  if (buildStatus === 'success' || buildStatus === 'failed') return buildStatus
  if (buildStatus === 'built') return now - Date.parse(builtAt ?? requestedAt) > BUILD_CONFIRMATION_TIMEOUT_MS ? 'unconfirmed' : 'deploying'
  return now - Date.parse(requestedAt) > BUILD_CONFIRMATION_TIMEOUT_MS ? 'unconfirmed' : 'building'
}

export interface AmplifyJobType {
  region: string | null
  appId: string | null
  branch: string | null
  jobId: string | null
}

// The deployment in the Amplify console, for whoever publishes to see the build's log.
export const amplifyConsoleUrl = ({ region, appId, branch, jobId }: AmplifyJobType) =>
  (region && appId && branch && jobId
    ? `https://${region}.console.aws.amazon.com/amplify/apps/${appId}/branches/${encodeURIComponent(branch)}/deployments/${jobId}`
    : null)

// An old "unconfirmed" says nothing new: the header stops showing it after a day (the history keeps it).
export const UNCONFIRMED_HEADER_MS = 24 * 60 * 60 * 1000

// Whole minutes since a publish was requested.
export const publishMinutes = (requestedAt: string, now = Date.now()) => Math.max(0, Math.floor((now - Date.parse(requestedAt)) / 60_000))

// What the header shows about the latest publish; null when there's nothing to say.
export const headerPublishStatus = (timing: PublishTimingType, now = Date.now()) => {
  const status = publishDisplayStatus(timing, now)
  if (status === 'success') return null
  if (status === 'unconfirmed' && now - Date.parse(timing.requestedAt) > UNCONFIRMED_HEADER_MS) return null
  return { status, minutes: publishMinutes(timing.requestedAt, now) }
}
