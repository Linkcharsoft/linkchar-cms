'use client'
import './PublishPanel.sass'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Tag } from 'primereact/tag'
import { classNames } from 'primereact/utils'
import { Fragment, useEffect, useState } from 'react'
import { publishDisplayStatus } from '../../../core/publish'
import { useCms, useFormatDate, useT } from '../../client/context'
import { useConfirm } from '../../primitives/ConfirmAction/ConfirmAction'
import CustomButton from '../../primitives/CustomButton/CustomButton'
import EmptyState from '../../primitives/EmptyState/EmptyState'
import Notice from '../../primitives/Notice/Notice'
import { useNotify } from '../../providers/notify'
import { PUBLISH_SEVERITIES } from '../../shell/PublishStatus/PublishStatus'
import type { PendingChangeType, PublishRecordType } from '../../../server/publish'
import type { Route } from 'next'

interface Props {
  changes: PendingChangeType[]
  history: PublishRecordType[]
  canPublish: boolean
  highlight?: string
}

const POLL_INTERVAL_MS = 10_000

// The confirmation names what goes out; past this many it summarizes the rest.
const MAX_CONFIRM_LISTED = 8

const GROUPS = [
  { id: 'new', filter: (change: PendingChangeType) => change.status === 'new' },
  { id: 'changed', filter: (change: PendingChangeType) => change.status === 'changed' },
  { id: 'removed', filter: (change: PendingChangeType) => change.action === 'unpublish' }
] as const

const changeId = (id: string) => `change-${id}`

const ChangeItem = ({ change, highlighted }: { change: PendingChangeType, highlighted: boolean }) => {
  const { t } = useT()
  const formatDate = useFormatDate()
  const meta = [change.entryLabel !== change.title && change.entryLabel, change.updatedBy, formatDate(change.updatedAt, 'shortDateTime')]
  const missing = [...new Map(change.missing.map(item => [item.label, item])).values()]

  return (
    <li id={changeId(change.id)} className={classNames('PublishPanel__Item', { 'PublishPanel__Item--Highlight': highlighted })}>
      <div className='PublishPanel__ItemMain'>
        <Link href={change.href as Route} className='PublishPanel__ItemTitle'>{change.title}</Link>
        <span className='PublishPanel__Meta'>{meta.filter(Boolean).join(' · ')}</span>
      </div>
      {change.sections.length > 0 && (
        <p className='PublishPanel__Sections'>
          {t('publishPanel.sectionsChanged')}
          {change.sections.map((section, index) => (
            <Fragment key={section.href}>
              {index > 0 && ', '}
              <Link href={section.href as Route} className='PublishPanel__SectionLink'>{section.label}</Link>
            </Fragment>
          ))}
        </p>
      )}
      {change.urlChanges.map(urlChange => (
        <p key={urlChange.locale} className='PublishPanel__Note'>
          <i className='pi pi-directions' aria-hidden='true' />
          {t('publishPanel.urlChange', urlChange)}
        </p>
      ))}
      {missing.length > 0 && (
        <p className='PublishPanel__Problem'>
          <i className='pi pi-exclamation-triangle' aria-hidden='true' />
          <span>
            {t('publishPanel.problems')}
            {missing.map((item, index) => (
              <Fragment key={item.label}>
                {index > 0 && ', '}
                <Link href={item.href as Route} className='PublishPanel__MissingLink'>{item.label}</Link>
              </Fragment>
            ))}
            .
          </span>
        </p>
      )}
      {change.warnings.map(warning => (
        <p key={warning} className='PublishPanel__Warning'>
          <i className='pi pi-exclamation-triangle' aria-hidden='true' />
          {warning}
        </p>
      ))}
    </li>
  )
}

const ConfirmList = ({ items, title }: { items: PendingChangeType[], title: string }) => {
  const { t } = useT()
  if (items.length === 0) return null
  const extra = items.length - MAX_CONFIRM_LISTED
  return (
    <>
      <p className='PublishPanel__ConfirmTitle'>{title}</p>
      <ul className='PublishPanel__ConfirmList'>
        {items.slice(0, MAX_CONFIRM_LISTED).map(change => (
          <li key={change.id}>
            {change.entryLabel !== change.title ? t('publishPanel.confirm.item', { title: change.title, entry: change.entryLabel }) : change.title}
          </li>
        ))}
        {extra > 0 && <li>{t('publishPanel.confirm.more', { count: extra })}</li>}
      </ul>
    </>
  )
}

const HistoryItem = ({ record, onRetry }: { record: PublishRecordType, onRetry?: () => Promise<void> }) => {
  const { t } = useT()
  const [retrying, setRetrying] = useState(false)
  const formatDate = useFormatDate()
  const displayed = publishDisplayStatus(record.buildStatus, record.requestedAt)

  return (
    <li className='PublishPanel__Item'>
      <div className='PublishPanel__ItemMain'>
        <span className='PublishPanel__ItemTitle'>
          {[formatDate(record.requestedAt), record.requestedBy].filter(Boolean).join(' · ')}
        </span>
        <span className='PublishPanel__ItemTags'>
          {record.retryOf !== null && <Tag value={t('publishPanel.retryOf')} severity='secondary' />}
          <Tag value={t(`publishStatus.${displayed}`)} severity={PUBLISH_SEVERITIES[displayed]} />
        </span>
      </div>
      <details className='PublishPanel__Details'>
        <summary className='PublishPanel__Meta'>
          {[
            t('publishPanel.published', { count: record.published }),
            record.removed > 0 && t('publishPanel.removed', { count: record.removed })
          ].filter(Boolean).join(' · ')}
        </summary>
        <ul className='PublishPanel__Detail'>
          {record.items.map(item => {
            const title = item.title ?? t('diff.deleted')
            return <li key={`${item.action}-${item.id}`}>{item.action === 'unpublish' ? t('publishPanel.removedItem', { title }) : title}</li>
          })}
        </ul>
      </details>
      {(displayed === 'failed' || displayed === 'unconfirmed') && (
        <p className={displayed === 'failed' ? 'PublishPanel__Problem' : 'PublishPanel__Warning'}>
          <i className='pi pi-info-circle' aria-hidden='true' />
          {t(`publishStatusHelp.${displayed}`)}
        </p>
      )}
      {record.errorCode && <p className='PublishPanel__Note'>{t('publishPanel.errorReason', { reason: t(`errors.build.${record.errorCode}`) })}</p>}
      {record.errorDetail && <p className='PublishPanel__Note'>{t('publishPanel.errorDetail', { detail: record.errorDetail })}</p>}
      {onRetry && (
        <CustomButton
          type='button'
          size='sm'
          variant='secondary'
          className='PublishPanel__Retry'
          loading={retrying}
          onClick={async () => {
            setRetrying(true)
            await onRetry()
            setRetrying(false)
          }}
        >
          <i className='pi pi-refresh' aria-hidden='true' />
          {t('publishPanel.retry')}
        </CustomButton>
      )}
    </li>
  )
}

const PublishPanel = ({ changes, history, canPublish, highlight }: Props) => {
  const { t, translate } = useT()
  const { actions } = useCms()
  const router = useRouter()
  const notify = useNotify()
  const confirm = useConfirm()
  const [publishing, setPublishing] = useState(false)

  const ready = changes.filter(change => change.action === 'publish' && change.problems.length === 0)
  const removals = changes.filter(change => change.action === 'unpublish')
  const incomplete = changes.length - ready.length - removals.length
  const total = ready.length + removals.length
  const building = history[0] && publishDisplayStatus(history[0].buildStatus, history[0].requestedAt) === 'building'

  useEffect(() => {
    if (highlight) window.document.getElementById(changeId(highlight))?.scrollIntoView({ block: 'center' })
  }, [highlight])

  useEffect(() => {
    if (!building) return
    const interval = setInterval(() => router.refresh(), POLL_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [building, router])

  const publish = async () => {
    setPublishing(true)
    const result = await actions.publishChanges({
      publish: ready.map(({ id, revision }) => ({ id, revision })),
      remove: removals.map(change => change.id)
    })
    setPublishing(false)

    if (!result.ok) {
      notify({ severity: 'error', summary: t('publishPanel.failed'), detail: translate(result.error), life: 6000 })
      router.refresh()
      return
    }

    notify(result.buildStatus === 'failed'
      ? { severity: 'warn', summary: t('publishPanel.done'), detail: t('publishPanel.buildNotStarted'), life: 8000 }
      : { severity: 'success', summary: t('publishPanel.done'), detail: t('publishPanel.eta') })
    router.refresh()
  }

  const retry = async (publishId: number) => {
    const result = await actions.retryPublish(publishId)
    if (!result.ok) {
      notify({ severity: 'error', summary: t('publishPanel.retryFailed'), detail: translate(result.error), life: 6000 })
    } else {
      notify(result.buildStatus === 'failed'
        ? { severity: 'warn', summary: t('publishPanel.retryFailed'), detail: t('publishPanel.buildNotStarted'), life: 8000 }
        : { severity: 'success', summary: t('publishPanel.retrying'), detail: t('publishPanel.eta') })
    }
    router.refresh()
  }

  const askPublish = () => confirm({
    header: t('publishPanel.title'),
    message: (
      <div className='PublishPanel__Confirm'>
        <ConfirmList items={ready} title={t('publishPanel.confirm.publishes')} />
        <ConfirmList items={removals} title={t('publishPanel.confirm.removes')} />
        <p>{t('publishPanel.eta')}</p>
      </div>
    ),
    acceptLabel: t('publishPanel.confirm.accept'),
    accept: publish
  })

  const readyText = t('publishPanel.ready', { count: total })
  const summary = incomplete > 0
    ? t('publishPanel.summaryIncomplete', { ready: readyText, incomplete: t('publishPanel.incomplete', { count: incomplete }) })
    : t('publishPanel.summary', { ready: readyText })

  return (
    <div className='PublishPanel'>
      <section className='PublishPanel__Card' aria-labelledby='pending-title' data-tour='publish-pending'>
        <div className='PublishPanel__Header'>
          <div>
            <h2 id='pending-title' className='PublishPanel__CardTitle'>{t('publishPanel.pending')}</h2>
            <p className='PublishPanel__Meta'>{changes.length === 0 ? t('publishPanel.allLive') : summary}</p>
          </div>
          <CustomButton type='button' onClick={askPublish} loading={publishing} disabled={!canPublish || total === 0} data-tour='publish-button'>
            <i className='pi pi-send' aria-hidden='true' />
            {total > 0 ? t('publishPanel.publishCount', { count: total }) : t('publishPanel.publish')}
          </CustomButton>
        </div>

        {!canPublish && <Notice icon='pi pi-lock'>{t('publishPanel.cannotPublish')}</Notice>}

        {GROUPS.map(group => {
          const items = changes.filter(group.filter)
          if (items.length === 0) return null
          return (
            <div key={group.id} className='PublishPanel__Group'>
              <p className='PublishPanel__GroupTitle'>{t(`publishPanel.groups.${group.id}`)}</p>
              <ul className='PublishPanel__List'>
                {items.map(change => <ChangeItem key={change.id} change={change} highlighted={change.id === highlight} />)}
              </ul>
            </div>
          )
        })}
      </section>

      <section className='PublishPanel__Card' aria-labelledby='history-title' data-tour='publish-history'>
        <h2 id='history-title' className='PublishPanel__CardTitle'>{t('publishPanel.history')}</h2>
        {history.length === 0
          ? <EmptyState compact icon='pi pi-send' title={t('publishPanel.historyEmpty')} />
          : (
            <ul className='PublishPanel__List'>
              {history.map((record, index) => (
                <HistoryItem
                  key={record.id}
                  record={record}
                  onRetry={index === 0 && canPublish && record.buildStatus === 'failed' ? () => retry(record.id) : undefined}
                />
              ))}
            </ul>
          )}
      </section>
    </div>
  )
}

export default PublishPanel
