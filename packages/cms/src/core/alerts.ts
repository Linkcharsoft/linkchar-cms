import { panelPaths } from './paths'
import { headerPublishStatus } from './publish'
import type { CmsConfigType } from './config'
import type { PublishTimingType } from './publish'

export type AlertPublishType = PublishTimingType

export interface AlertChangeType {
  title: string
  href: string
  problems: string[]
  // The first one opens the missing field itself.
  missing?: { href: string }[]
  warnings: string[]
}

// A hidden draft nobody touched for a while: forgotten, or never meant to go out.
export interface AlertDraftType {
  title: string
  href: string
  days: number
}

export const STALE_DRAFT_DAYS = 14

interface AlertBaseType {
  tone: 'warning' | 'error'
  // Where it gets solved.
  href: string
}

export type OverviewAlertType = AlertBaseType & (
  | { code: 'publish', status: 'failed' | 'unconfirmed' }
  | { code: 'incomplete', title: string, fields: string[] }
  | { code: 'reference', title: string, warning: string }
  | { code: 'stale', title: string, days: number }
)

// Things that need someone: a publish that failed or wasn't confirmed, changes that won't go out as expected, drafts left behind.
export const overviewAlerts = (
  config: CmsConfigType,
  latest: AlertPublishType | null,
  changes: AlertChangeType[],
  now = Date.now(),
  staleDrafts: AlertDraftType[] = []
): OverviewAlertType[] => {
  const publish = latest ? headerPublishStatus(latest, now) : null
  const publishAlerts: OverviewAlertType[] = publish && (publish.status === 'failed' || publish.status === 'unconfirmed')
    ? [{ code: 'publish', status: publish.status, tone: publish.status === 'failed' ? 'error' : 'warning', href: panelPaths(config).publish }]
    : []

  return [
    ...publishAlerts,
    ...changes.flatMap((change): OverviewAlertType[] => [
      ...(change.problems.length > 0
        ? [{ code: 'incomplete' as const, tone: 'warning' as const, title: change.title, fields: change.problems, href: change.missing?.[0]?.href ?? change.href }]
        : []),
      ...change.warnings.map(warning => ({ code: 'reference' as const, tone: 'warning' as const, title: change.title, warning, href: change.href }))
    ]),
    ...staleDrafts.map((draft): OverviewAlertType => ({ code: 'stale', tone: 'warning', title: draft.title, days: draft.days, href: draft.href }))
  ]
}
