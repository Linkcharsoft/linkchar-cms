'use client'
import './PublishStatus.sass'
import { usePathname } from 'next/navigation'
import { Tag } from 'primereact/tag'
import { useEffect, useState } from 'react'
import { headerPublishStatus } from '../../../core/publish'
import { useCms, usePaths, useT } from '../../client/context'
import CustomButton from '../../primitives/CustomButton/CustomButton'
import type { PublishDisplayStatusType } from '../../../core/publish'
import type { PublishRecordType } from '../../../server/publish'

export const PUBLISH_SEVERITIES: Record<PublishDisplayStatusType, 'info' | 'success' | 'warning' | 'danger'> = {
  building: 'info',
  success: 'success',
  failed: 'danger',
  unconfirmed: 'warning'
}

interface Props {
  latest: PublishRecordType | null
  pendingCount: number
}

const POLL_INTERVAL_MS = 10_000

// The panel layout doesn't re-render on client navigation, so the counter refreshes itself.
const PublishStatus = ({ latest: initialLatest, pendingCount: initialCount }: Props) => {
  const { t } = useT()
  const { actions } = useCms()
  const paths = usePaths()
  const pathname = usePathname()
  const [latest, setLatest] = useState(initialLatest)
  const [pendingCount, setPendingCount] = useState(initialCount)
  const [props, setProps] = useState({ initialLatest, initialCount })

  // router.refresh() (after publishing) re-renders the layout with fresh props: adopt them.
  if (props.initialLatest !== initialLatest || props.initialCount !== initialCount) {
    setProps({ initialLatest, initialCount })
    setLatest(initialLatest)
    setPendingCount(initialCount)
  }

  const shown = latest ? headerPublishStatus(latest.buildStatus, latest.requestedAt) : null
  const status = shown?.status ?? null

  const label = () => {
    if (!shown) return ''
    if (shown.status !== 'building') return t(`publishStatus.${shown.status}`)
    return shown.minutes < 1 ? t('publishStatus.buildingStarted') : t('publishStatus.buildingFor', { minutes: shown.minutes })
  }

  const refresh = async () => {
    const next = await actions.getPublishStatus()
    setLatest(next.latest)
    setPendingCount(next.pendingCount)
  }

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
      <CustomButton href={paths.publish} size='sm' variant={pendingCount > 0 ? 'primary' : 'secondary'}>
        <i className='pi pi-send' aria-hidden='true' />
        <span className='PublishStatus__Label'>{t('shell.publish')}</span>
        {pendingCount > 0 && (
          <span className='PublishStatus__Count' aria-label={t('shell.pendingChanges', { count: pendingCount })}>{pendingCount}</span>
        )}
      </CustomButton>
    </div>
  )
}

export default PublishStatus
