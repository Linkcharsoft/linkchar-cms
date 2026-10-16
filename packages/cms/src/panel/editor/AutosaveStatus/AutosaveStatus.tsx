'use client'
import './AutosaveStatus.sass'
import { classNames } from 'primereact/utils'
import { useFormatDate, useT } from '../../client/context'
import type { AutosaveStatusType } from '../useAutosave'

interface Props {
  status: AutosaveStatusType
  savedAt: Date | null
}

const LOOKS: Record<AutosaveStatusType, { icon: string, tone: 'Muted' | 'Ok' | 'Warn' | 'Error' }> = {
  idle: { icon: 'pi-check', tone: 'Muted' },
  pending: { icon: 'pi-pencil', tone: 'Muted' },
  saving: { icon: 'pi-spin pi-spinner', tone: 'Muted' },
  saved: { icon: 'pi-check-circle', tone: 'Ok' },
  invalid: { icon: 'pi-exclamation-triangle', tone: 'Warn' },
  conflict: { icon: 'pi-users', tone: 'Warn' },
  error: { icon: 'pi-times-circle', tone: 'Error' }
}

const AutosaveStatus = ({ status, savedAt }: Props) => {
  const { t } = useT()
  const formatDate = useFormatDate()
  const { icon, tone } = LOOKS[status]
  const text = status === 'saved' && savedAt ? t('editor.autosave.savedAt', { time: formatDate(savedAt, 'time') }) : t(`editor.autosave.${status}`)

  return (
    <p role='status' aria-live='polite' className={classNames('AutosaveStatus', `AutosaveStatus--${tone}`)} data-tour='autosave'>
      <i className={classNames('pi', icon)} aria-hidden='true' />
      {text}
    </p>
  )
}

export default AutosaveStatus
