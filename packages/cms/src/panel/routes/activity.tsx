import { isActivityGroup } from '../../core/activity'
import { translatorFor } from '../../core/config'
import { ACTIVITY_PAGE_SIZE } from '../../server/activity'
import ActivityTable from '../activity/ActivityTable/ActivityTable'
import DashboardPageHeader from '../primitives/DashboardPageHeader/DashboardPageHeader'
import { navItems } from '../shell/navigation'
import type { CmsServerType } from '../../server/next'
import type { Metadata } from 'next'

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

const param = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) ?? ''

// Query params keep Hologramas' Spanish names (accion, usuario, desde, hasta, pagina) so saved links keep working.
export const activityRoute = (cms: CmsServerType) => {
  const metadata: Metadata = { title: navItems(cms.config).activity.label }

  const Page = async ({ searchParams }: Props) => {
    await cms.queries.requireRole('admin')
    await cms.queries.purgeExpiredActivity()

    const query = await searchParams
    const groupParam = param(query.accion)
    const group = isActivityGroup(groupParam) ? groupParam : undefined
    const userId = param(query.usuario)
    const from = param(query.desde)
    const to = param(query.hasta)
    const { items, total, page, users } = await cms.queries.listActivity({
      group,
      userId: userId || undefined,
      from: from || undefined,
      to: to || undefined,
      page: Number(param(query.pagina)) || 1
    })

    return (
      <main id='main' className='flex-1'>
        <section className='CmsContainer py-6'>
          <DashboardPageHeader title={navItems(cms.config).activity.label} subtitle={translatorFor(cms.config).t('activityScreen.subtitle')} />
          <ActivityTable
            items={items}
            total={total}
            page={page}
            pageSize={ACTIVITY_PAGE_SIZE}
            users={users}
            group={group ?? ''}
            userId={userId}
            from={from}
            to={to}
          />
        </section>
      </main>
    )
  }

  return { Page, metadata }
}
