'use client'
import './DateCell.sass'
import { useFormatDate, useT } from '../../client/context'
import type { DateStyleType } from '../../../core/dates'

interface Props {
  value: string | Date | null | undefined
  empty?: string
  style?: DateStyleType
}

const DateCell = ({ value, empty, style }: Props) => {
  const { t } = useT()
  const formatDate = useFormatDate()
  return <span className='DateCell'>{value ? formatDate(value, style) : empty ?? t('common.empty')}</span>
}

export default DateCell
