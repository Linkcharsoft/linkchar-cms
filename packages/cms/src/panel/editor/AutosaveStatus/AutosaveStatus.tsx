'use client'
import './AutosaveStatus.sass'
import { classNames } from 'primereact/utils'
import { useEffect, useState } from 'react'
import { useFormatDate, useT } from '../../client/context'
import CustomButton from '../../primitives/CustomButton/CustomButton'
import type { AutosaveStatusType } from '../useAutosave'

interface Props {
  status: AutosaveStatusType
  savedAt: Date | null
  onRetry?: () => void
}

const LOOKS: Record<AutosaveStatusType, { icon: string, tone: 'Muted' | 'Ok' | 'Warn' | 'Error' }> = {
  idle: { icon: 'pi-check', tone: 'Muted' },
  pending: { icon: 'pi-pencil', tone: 'Muted' },
  saving: { icon: 'pi-spin pi-spinner', tone: 'Muted' },
  saved: { icon: 'pi-check-circle', tone: 'Ok' },
  partial: { icon: 'pi-exclamation-triangle', tone: 'Warn' },
  invalid: { icon: 'pi-exclamation-triangle', tone: 'Warn' },
  conflict: { icon: 'pi-users', tone: 'Warn' },
  error: { icon: 'pi-times-circle', tone: 'Error' }
}

// Only outcomes are read aloud: every pending and saving in between would talk over the editor.
const ANNOUNCED: AutosaveStatusType[] = ['saved', 'partial', 'invalid', 'conflict', 'error']

const AutosaveStatus = ({ status, savedAt, onRetry }: Props) => {
  const { t } = useT()
  const formatDate = useFormatDate()
  const { icon, tone } = LOOKS[status]
  const text = status === 'saved' && savedAt ? t('editor.autosave.savedAt', { time: formatDate(savedAt, 'time') }) : t(`editor.autosave.${status}`)
  const [announced, setAnnounced] = useState('')

  useEffect(() => {
    if (ANNOUNCED.includes(status)) setAnnounced(text)
  }, [status, text])

  return (
    <div className={classNames('AutosaveStatus', `AutosaveStatus--${tone}`)} data-tour='autosave'>
      <i className={classNames('pi', icon)} aria-hidden='true' />
      <span className='AutosaveStatus__Text'>{text}</span>
      <span role='status' aria-live='polite' className='sr-only'>{announced}</span>
      {status === 'error' && onRetry && (
        <CustomButton type='button' variant='ghost' size='xs' onClick={onRetry}>
          <i className='pi pi-refresh' aria-hidden='true' />
          {t('editor.autosave.retry')}
        </CustomButton>
      )}
    </div>
  )
}

export default AutosaveStatus
