import { translatorFor } from '../../core/config'
import { hasRole } from '../../core/roles'
import { TRASH_PAGE_SIZE, TRASH_RETENTION_DAYS } from '../../server/documents'
import DashboardPageHeader from '../primitives/DashboardPageHeader/DashboardPageHeader'
import { navItems } from '../shell/navigation'
import TrashList from '../trash/TrashList/TrashList'
import type { CmsServerType } from '../../server/next'
import type { Metadata } from 'next'

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

const param = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) ?? ''

export const trashRoute = (cms: CmsServerType) => {
  const metadata: Metadata = { title: navItems(cms.config).trash.label }

  const Page = async ({ searchParams }: Props) => {
    const [{ profile }, query] = await Promise.all([cms.queries.requireRole(), searchParams])
    await cms.queries.purgeExpiredDocuments()
    const search = param(query.q)
    const { items, total, page } = await cms.queries.listTrash({ search, page: Number(param(query.page)) || 1 })
    const { t } = translatorFor(cms.config)
    const nav = navItems(cms.config)

    return (
      <main id='main' className='flex-1'>
        <section className='CmsContainer py-6'>
          <DashboardPageHeader
            title={nav.trash.label}
            subtitle={t('trashList.subtitle', { days: TRASH_RETENTION_DAYS, media: nav.media.label })}
          />
          <TrashList items={items} total={total} page={page} pageSize={TRASH_PAGE_SIZE} search={search} canPurge={hasRole(profile.role, 'admin')} />
        </section>
      </main>
    )
  }

  return { Page, metadata }
}
