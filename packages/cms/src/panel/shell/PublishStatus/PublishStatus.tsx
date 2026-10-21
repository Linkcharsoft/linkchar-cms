'use client'
import './PublishStatus.sass'
import { usePathname } from 'next/navigation'
import { Tag } from 'primereact/tag'
import { useEffect, useEffectEvent, useState } from 'react'
import { headerPublishStatus } from '../../../core/publish'
import { useCms, usePaths, useT } from '../../client/context'
import CustomButton from '../../primitives/CustomButton/CustomButton'
import type { PublishDisplayStatusType } from '../../../core/publish'
import type { PendingCountsType, PublishRecordType } from '../../../server/publish'

export const PUBLISH_SEVERITIES: Record<PublishDisplayStatusType, 'info' | 'success' | 'warning' | 'danger'> = {
  building: 'info',
  success: 'success',
  failed: 'danger',
  unconfirmed: 'warning'
}

interface Props {
  latest: PublishRecordType | null
  counts: PendingCountsType
}

type SnapshotType = { latest: PublishRecordType | null, counts: PendingCountsType }

const POLL_INTERVAL_MS = 10_000

const sameCounts = (a: PendingCountsType, b: PendingCountsType) => a.ready === b.ready && a.incomplete === b.incomplete

// The panel layout doesn't re-render on client navigation, so the counter refreshes itself.
const PublishStatus = ({ latest: initialLatest, counts: initialCounts }: Props) => {
  const { t } = useT()
  const { actions } = useCms()
  const paths = usePaths()
  const pathname = usePathname()
  const [polled, setPolled] = useState<{ over: SnapshotType, snapshot: SnapshotType } | null>(null)

  // A poll only stands until the layout brings newer props, e.g. router.refresh() after publishing.
  const { latest, counts } = polled && polled.over.latest === initialLatest && sameCounts(polled.over.counts, initialCounts)
    ? polled.snapshot
    : { latest: initialLatest, counts: initialCounts }

  const shown = latest ? headerPublishStatus(latest.buildStatus, latest.requestedAt) : null
  const status = shown?.status ?? null
  const onlyIncomplete = counts.ready === 0 && counts.incomplete > 0

  const label = () => {
    if (!shown) return ''
    if (shown.status !== 'building') return t(`publishStatus.${shown.status}`)
    return shown.minutes < 1 ? t('publishStatus.buildingStarted') : t('publishStatus.buildingFor', { minutes: shown.minutes })
  }

  const refresh = useEffectEvent(async () => {
    const over = { latest: initialLatest, counts: initialCounts }
    setPolled({ over, snapshot: await actions.getPublishStatus() })
  })

  useEffect(() => {
    void refresh()
  }, [pathname])

  useEffect(() => {
    if (status !== 'building') return
    const interval = setInterval(() => void refresh(), POLL_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [status])

  return (
    <div className='PublishStatus' data-tour='publish'>
      {shown && (
        <CustomButton
          href={paths.publish}
          variant='ghost'
          size='xs'
          className='PublishStatus__State'
          aria-label={`${label()}. ${t(`publishStatusHelp.${shown.status}`)}`}
          tooltip={t(`publishStatusHelp.${shown.status}`)}
        >
          <Tag value={label()} severity={PUBLISH_SEVERITIES[shown.status]} aria-live='polite' data-testid='build-status' />
        </CustomButton>
      )}
      <CustomButton
        href={paths.publish}
        size='sm'
        variant={counts.ready > 0 ? 'primary' : 'secondary'}
        tooltip={onlyIncomplete ? t('shell.incompleteChanges', { count: counts.incomplete }) : undefined}
      >
        <i className='pi pi-send' aria-hidden='true' />
        <span className='PublishStatus__Label'>{t('shell.publish')}</span>
        {counts.ready > 0 && (
          <span className='PublishStatus__Count' aria-label={t('shell.pendingChanges', { count: counts.ready })} data-testid='publish-count'>{counts.ready}</span>
        )}
        {onlyIncomplete && <span className='sr-only'>{t('shell.incompleteChanges', { count: counts.incomplete })}</span>}
      </CustomButton>
    </div>
  )
}

export default PublishStatus
