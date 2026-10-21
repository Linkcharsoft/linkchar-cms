import type { CmsLoggerType } from '../core/logger'
import type { BuildErrorCodeType, BuildEventType } from '../core/publish'

export type { BuildEventType }

export type TriggerResultType =
  | { ok: true, jobId: string | null }
  | { ok: false, code: Exclude<BuildErrorCodeType, 'build_failed' | 'build_cancelled'>, detail?: string }

export interface TriggerContextType {
  // Applies a build status change, as the webhook would; targets that report in-process (the mock) use it.
  report: (event: BuildEventType) => Promise<unknown>
  logger: CmsLoggerType
}

export type WebhookResultType = BuildEventType | 'unauthorized' | 'invalid'

// Where "Publicar cambios" sends the site to be rebuilt: Amplify's build hook, a local mock, others later.
export interface PublishTargetType {
  name: string
  trigger: (ctx: TriggerContextType) => Promise<TriggerResultType>
  // No real build runs (the local mock): the running site revalidates its pages instead.
  revalidateOnPublish?: boolean
  // Reads a build status notification sent to the panel's webhook route.
  readWebhook?: (request: Request) => Promise<WebhookResultType>
}
