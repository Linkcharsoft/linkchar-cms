'use client'
import './OverviewPage.sass'
import Link from 'next/link'
import { Tag } from 'primereact/tag'
import { collectionNewLabel } from '../../../core/entries'
import { formatList } from '../../../core/i18n/translator'
import { publishDisplayStatus } from '../../../core/publish'
import { useCms, useFormatDate, usePaths, useT, useTextContext } from '../../client/context'
import CreateDocumentButton from '../../lists/CreateDocumentButton/CreateDocumentButton'
import { DOCUMENT_SEVERITIES } from '../../lists/documentStatus'
import CustomButton from '../../primitives/CustomButton/CustomButton'
import DashboardPageHeader from '../../primitives/DashboardPageHeader/DashboardPageHeader'
import EmptyState from '../../primitives/EmptyState/EmptyState'
import Notice from '../../primitives/Notice/Notice'
import { navItems } from '../../shell/navigation'
import type { OverviewAlertType } from '../../../core/alerts'
import type { SchemaEntry } from '../../../core/define'
import type { PageListItemType } from '../../../server/pages'
import type { PublishRecordType } from '../../../server/publish'
import type { Route } from 'next'

export interface RecentDraftType {
  id: string
  label: string
  entryLabel: string
  href: string
  updatedAt: string
}

interface Props {
  drafts: RecentDraftType[]
  pendingCount: number
  latest: PublishRecordType | null
  pages: PageListItemType[]
  alerts: OverviewAlertType[]
  // Sent here from a screen the user's role can't open.
  forbidden?: boolean
}

const OverviewPage = ({ drafts, pendingCount, latest, pages, alerts, forbidden = false }: Props) => {
  const { t, locale } = useT()
  const { config } = useCms()
  const ctx = useTextContext()
  const paths = usePaths()
  const formatDate = useFormatDate()
  const items = navItems(config)

  // Collections with pages of their own (blog posts) are what gets written most: each gets a "new" task.
  const createTasks = Object.entries(config.schema as Record<string, SchemaEntry>).flatMap(([id, entry]) =>
    entry.kind === 'collection' && entry.path && !entry.under
      ? [{ id, label: collectionNewLabel(entry, ctx), icon: entry.icon ?? 'pi-plus' }]
      : [])

  const alertText = (alert: OverviewAlertType) => {
    if (alert.code === 'publish') return t(`publishStatusHelp.${alert.status}`)
    if (alert.code === 'incomplete') return t('overview.incomplete', { title: alert.title, fields: formatList(locale, alert.fields) })
    if (alert.code === 'stale') return t('overview.staleDraft', { title: alert.title, days: alert.days })
    return t('overview.reference', { title: alert.title, warning: alert.warning })
  }

  return (
    <main id='main' className='OverviewPage'>
      <section className='CmsContainer py-6'>
        <DashboardPageHeader title={items.overview.label} />
        {forbidden && <Notice tone='warning' className='OverviewPage__Forbidden'>{t('overview.forbidden')}</Notice>}

        <div className='OverviewPage__Grid'>
          <div className='OverviewPage__Card' data-tour='overview-tasks'>
            <h2 className='OverviewPage__CardTitle'>{t('overview.todo')}</h2>
            <div className='OverviewPage__Tasks'>
              {createTasks.map(task => (
                <CreateDocumentButton key={task.id} entryId={task.id} label={task.label} icon={task.icon} variant='secondary' className='OverviewPage__Task' tour='overview-new' />
              ))}
              {pages.length > 0 && (
                <CustomButton href={items.pages.href} variant='secondary' className='OverviewPage__Task'>
                  <i className={`pi ${items.pages.icon}`} aria-hidden='true' />
                  {t('overview.editPage')}
                </CustomButton>
              )}
              <CustomButton href={items.media.href} variant='secondary' className='OverviewPage__Task'>
                <i className={`pi ${items.media.icon}`} aria-hidden='true' />
                {t('overview.uploadImages')}
              </CustomButton>
            </div>
          </div>

          <div className='OverviewPage__Card' data-tour='overview-alerts'>
            <h2 className='OverviewPage__CardTitle'>{t('overview.alerts')}</h2>
            {alerts.length === 0 ? (
              <EmptyState compact icon='pi pi-check-circle' title={t('overview.allGood')} />
            ) : (
              <ul className='OverviewPage__Alerts'>
                {alerts.map((alert, index) => (
                  <li key={`${alert.href}-${index}`}>
                    <Notice tone={alert.tone} action={<CustomButton href={alert.href} variant='secondary' size='xs'>{t('overview.view')}</CustomButton>}>
                      {alertText(alert)}
                    </Notice>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className='OverviewPage__Card' data-tour='overview-publish'>
            <h2 className='OverviewPage__CardTitle'>{t('overview.publishing')}</h2>
            <Link href={paths.publish as Route} className='OverviewPage__Item'>
              <span className='OverviewPage__ItemTitle'>
                {pendingCount === 0 ? t('overview.noPending') : t('overview.pending', { count: pendingCount })}
              </span>
              <span className='OverviewPage__ItemMeta'>
                {latest
                  ? t('overview.latest', {
                    date: formatDate(latest.requestedAt, 'shortDateTime'),
                    status: t(`publishStatus.${publishDisplayStatus(latest.buildStatus, latest.requestedAt)}`)
                  })
                  : t('overview.neverPublished')}
              </span>
            </Link>
          </div>

          {pages.length > 0 && (
            <div className='OverviewPage__Card' data-tour='overview-pages'>
              <h2 className='OverviewPage__CardTitle'>{items.pages.label}</h2>
              <ul className='OverviewPage__List'>
                {pages.map(page => (
                  <li key={page.id}>
                    <Link href={page.href as Route} className='OverviewPage__Row'>
                      <span className='OverviewPage__ItemTitle'>{page.label}</span>
                      {page.status
                        ? <Tag value={t(`documentStatus.${page.status}`)} severity={DOCUMENT_SEVERITIES[page.status]} />
                        : <Tag value={t('overview.noContent')} severity='secondary' />}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className='OverviewPage__Card' data-tour='overview-recent'>
            <h2 className='OverviewPage__CardTitle'>{t('overview.recent')}</h2>
            {drafts.length > 0 ? (
              <ul className='OverviewPage__List'>
                {drafts.map(draft => (
                  <li key={draft.id}>
                    <Link href={draft.href as Route} className='OverviewPage__Item'>
                      <span className='OverviewPage__ItemTitle'>{draft.label}</span>
                      <span className='OverviewPage__ItemMeta'>
                        {draft.entryLabel !== draft.label
                          ? t('overview.recentMeta', { entry: draft.entryLabel, date: formatDate(draft.updatedAt, 'shortDateTime') })
                          : formatDate(draft.updatedAt, 'shortDateTime')}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState compact icon='pi pi-pencil' title={t('overview.noRecent')} />
            )}
          </div>
        </div>
      </section>
    </main>
  )
}

export default OverviewPage
