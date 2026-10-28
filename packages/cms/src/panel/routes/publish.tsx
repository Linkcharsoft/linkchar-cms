import { translatorFor } from '../../core/config'
import { panelPaths } from '../../core/paths'
import { canPublish, hasRole } from '../../core/roles'
import DashboardPageHeader from '../primitives/DashboardPageHeader/DashboardPageHeader'
import PublishPanel from '../publish/PublishPanel/PublishPanel'
import type { CmsServerType } from '../../server/next'
import type { Metadata } from 'next'

interface Props {
  // The editor's "Review and publish" sends its document here to point out its change.
  searchParams: Promise<{ doc?: string | string[] }>
}

export const publishRoute = (cms: CmsServerType) => {
  const { t } = translatorFor(cms.config)
  const metadata: Metadata = { title: t('publishPanel.title') }

  const Page = async ({ searchParams }: Props) => {
    const [{ profile }, { doc }] = await Promise.all([cms.queries.requireRole(), searchParams])
    const [changes, history] = await Promise.all([cms.queries.getPendingChanges(), cms.queries.getPublishHistory()])

    return (
      <main id='main' className='flex-1'>
        <section className='CmsContainer py-6'>
          <DashboardPageHeader title={t('publishPanel.title')} subtitle={t('publishPanel.subtitle')} />
          <PublishPanel
            changes={changes}
            history={history}
            canPublish={canPublish(profile)}
            highlight={typeof doc === 'string' ? doc : undefined}
            activityHref={hasRole(profile.role, 'admin') ? `${panelPaths(cms.config).activity}?accion=publishing` : undefined}
          />
        </section>
      </main>
    )
  }

  return { Page, metadata }
}
