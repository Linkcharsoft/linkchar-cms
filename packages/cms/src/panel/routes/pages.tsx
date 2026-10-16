import { translatorFor } from '../../core/config'
import PageList from '../lists/PageList/PageList'
import DashboardPageHeader from '../primitives/DashboardPageHeader/DashboardPageHeader'
import { navItems } from '../shell/navigation'
import type { CmsServerType } from '../../server/next'
import type { Metadata } from 'next'

export const pagesRoute = (cms: CmsServerType) => {
  const metadata: Metadata = { title: navItems(cms.config).pages.label }

  const Page = async () => {
    await cms.queries.requireRole()
    const pages = await cms.queries.listPages()
    const { t } = translatorFor(cms.config)

    return (
      <main id='main' className='flex-1'>
        <section className='CmsContainer py-6'>
          <DashboardPageHeader title={navItems(cms.config).pages.label} subtitle={t('pagesList.subtitle')} />
          <PageList pages={pages} />
        </section>
      </main>
    )
  }

  return { Page, metadata }
}
