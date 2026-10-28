'use client'
import './PublishPanel.sass'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Checkbox } from 'primereact/checkbox'
import { Tag } from 'primereact/tag'
import { classNames } from 'primereact/utils'
import { Fragment, useEffect, useState } from 'react'
import { publishDisplayStatus } from '../../../core/publish'
import { selectionWarnings } from '../../../core/publishSelection'
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

const selectId = (id: string) => `select-${id}`

interface ChangeItemProps {
  change: PendingChangeType
  highlighted: boolean
  warnings: string[]
  // Only changes the publish can take are ticked; incomplete ones show why they are not.
  checked: boolean | null
  onToggle: () => void
}

const ChangeItem = ({ change, highlighted, warnings, checked, onToggle }: ChangeItemProps) => {
  const { t } = useT()
  const formatDate = useFormatDate()
  const meta = [change.entryLabel !== change.title && change.entryLabel, change.updatedBy, formatDate(change.updatedAt, 'shortDateTime')]
  const missing = [...new Map(change.missing.map(item => [item.label, item])).values()]

  return (
    <li id={changeId(change.id)} className={classNames('PublishPanel__Item', { 'PublishPanel__Item--Highlight': highlighted, 'PublishPanel__Item--Skipped': checked === false })}>
      <div className='PublishPanel__ItemMain'>
        {checked !== null && (
          <span className='PublishPanel__Select'>
            <Checkbox inputId={selectId(change.id)} checked={checked} onChange={onToggle} />
            <label htmlFor={selectId(change.id)} className='sr-only'>{t('publishPanel.include', { title: change.title })}</label>
          </span>
        )}
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
      {warnings.map(warning => (
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
  // Ticked by default: the ids the user left out of this publish.
  const [excluded, setExcluded] = useState<ReadonlySet<string>>(new Set())

  const takeable = (change: PendingChangeType) => change.action === 'unpublish' || change.problems.length === 0
  const ready = changes.filter(change => change.action === 'publish' && change.problems.length === 0)
  const removals = changes.filter(change => change.action === 'unpublish')
  const incomplete = changes.length - ready.length - removals.length
  const total = ready.length + removals.length
  const selected = new Set(changes.filter(change => takeable(change) && !excluded.has(change.id)).map(change => change.id))
  const selectedReady = ready.filter(change => selected.has(change.id))
  const selectedRemovals = removals.filter(change => selected.has(change.id))
  const building = history[0] && publishDisplayStatus(history[0].buildStatus, history[0].requestedAt) === 'building'

  useEffect(() => {
    if (highlight) window.document.getElementById(changeId(highlight))?.scrollIntoView({ block: 'center' })
  }, [highlight])

  useEffect(() => {
    if (!building) return
    const interval = setInterval(() => router.refresh(), POLL_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [building, router])

  const toggle = (id: string) => setExcluded(previous => {
    const next = new Set(previous)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    return next
  })

  const setGroup = (items: PendingChangeType[], included: boolean) => setExcluded(previous => {
    const next = new Set(previous)
    for (const change of items) {
      if (included) next.delete(change.id)
      else next.add(change.id)
    }
    return next
  })

  const publish = async () => {
    setPublishing(true)
    const result = await actions.publishChanges({
      publish: selectedReady.map(({ id, revision }) => ({ id, revision })),
      remove: selectedRemovals.map(change => change.id)
    })
    setPublishing(false)

    if (!result.ok) {
      notify({ severity: 'error', summary: t('publishPanel.failed'), detail: translate(result.error), life: 6000 })
      router.refresh()
      return
    }

    setExcluded(new Set())
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
        <ConfirmList items={selectedReady} title={t('publishPanel.confirm.publishes')} />
        <ConfirmList items={selectedRemovals} title={t('publishPanel.confirm.removes')} />
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
        <div className='PublishPanel__Header' data-tour='publish-summary'>
          <div>
            <h2 id='pending-title' className='PublishPanel__CardTitle'>{t('publishPanel.pending')}</h2>
            <p className='PublishPanel__Meta'>{changes.length === 0 ? t('publishPanel.allLive') : summary}</p>
          </div>
          <CustomButton type='button' onClick={askPublish} loading={publishing} disabled={!canPublish || selected.size === 0} data-tour='publish-button'>
            <i className='pi pi-send' aria-hidden='true' />
            {selected.size > 0 ? t('publishPanel.publishCount', { count: selected.size }) : t('publishPanel.publish')}
          </CustomButton>
        </div>

        {!canPublish && <Notice icon='pi pi-lock'>{t('publishPanel.cannotPublish')}</Notice>}
        {canPublish && total > 0 && selected.size === 0 && <Notice tone='warning'>{t('publishPanel.noneSelected')}</Notice>}

        {GROUPS.map(group => {
          const items = changes.filter(group.filter)
          if (items.length === 0) return null
          const selectable = items.filter(takeable)
          return (
            <div key={group.id} className='PublishPanel__Group'>
              <div className='PublishPanel__GroupHead'>
                <p className='PublishPanel__GroupTitle'>{t(`publishPanel.groups.${group.id}`)}</p>
                {selectable.length > 1 && (
                  <span className='PublishPanel__GroupActions'>
                    <CustomButton type='button' variant='ghost' size='xs' onClick={() => setGroup(selectable, true)}>{t('publishPanel.selectAll')}</CustomButton>
                    <CustomButton type='button' variant='ghost' size='xs' onClick={() => setGroup(selectable, false)}>{t('publishPanel.selectNone')}</CustomButton>
                  </span>
                )}
              </div>
              <ul className='PublishPanel__List'>
                {items.map(change => (
                  <ChangeItem
                    key={change.id}
                    change={change}
                    highlighted={change.id === highlight}
                    warnings={selectionWarnings(change, selected, t)}
                    checked={takeable(change) ? selected.has(change.id) : null}
                    onToggle={() => toggle(change.id)}
                  />
                ))}
              </ul>
            </div>
          )
        })}
      </section>

      <section className='PublishPanel__Card' aria-labelledby='history-title' data-tour='publish-history'>
        <h2 id='history-title' className='PublishPanel__CardTitle' data-tour='publish-log'>{t('publishPanel.history')}</h2>
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
