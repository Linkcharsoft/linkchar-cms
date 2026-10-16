import { translatorFor } from '../../core/config'
import { hasRole } from '../../core/roles'
import { TRASH_RETENTION_DAYS } from '../../server/documents'
import DashboardPageHeader from '../primitives/DashboardPageHeader/DashboardPageHeader'
import { navItems } from '../shell/navigation'
import TrashList from '../trash/TrashList/TrashList'
import type { CmsServerType } from '../../server/next'
import type { Metadata } from 'next'

export const trashRoute = (cms: CmsServerType) => {
  const metadata: Metadata = { title: navItems(cms.config).trash.label }

  const Page = async () => {
    const { profile } = await cms.queries.requireRole()
    await cms.queries.purgeExpiredDocuments()
    const items = await cms.queries.listTrash()
    const { t } = translatorFor(cms.config)
    const nav = navItems(cms.config)

    return (
      <main id='main' className='flex-1'>
        <section className='CmsContainer py-6'>
          <DashboardPageHeader
            title={nav.trash.label}
            subtitle={t('trashList.subtitle', { days: TRASH_RETENTION_DAYS, media: nav.media.label })}
          />
          <TrashList items={items} canPurge={hasRole(profile.role, 'admin')} />
        </section>
      </main>
    )
  }

  return { Page, metadata }
}
