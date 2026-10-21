import { overviewAlerts } from '../../core/alerts'
import OverviewPage from '../overview/OverviewPage/OverviewPage'
import { navItems } from '../shell/navigation'
import type { CmsServerType } from '../../server/next'
import type { Metadata } from 'next'

interface Props {
  searchParams: Promise<{ error?: string }>
}

export const overviewRoute = (cms: CmsServerType) => {
  const metadata: Metadata = { title: navItems(cms.config).overview.label }

  const Page = async ({ searchParams }: Props) => {
    await cms.queries.requireRole()
    const { error } = await searchParams
    const [drafts, changes, latest, pages] = await Promise.all([
      cms.queries.getRecentDrafts(),
      cms.queries.getPendingChanges(),
      cms.queries.getLatestPublish(),
      cms.queries.listPages()
    ])

    return (
      <OverviewPage
        drafts={drafts}
        pendingCount={changes.filter(change => change.action === 'unpublish' || change.problems.length === 0).length}
        latest={latest}
        pages={pages}
        alerts={overviewAlerts(cms.config, latest, changes)}
        forbidden={error === 'sin-permiso'}
      />
    )
  }

  return { Page, metadata }
}
