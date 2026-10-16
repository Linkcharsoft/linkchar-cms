import './Notice.sass'
import type { ReactNode } from 'react'

export type NoticeToneType = 'info' | 'success' | 'warning' | 'error'

interface Props {
  tone?: NoticeToneType
  icon?: string | null
  action?: ReactNode
  role?: 'alert' | 'status'
  className?: string
  'data-tour'?: string
  children: ReactNode
}

const ICONS: Record<NoticeToneType, string> = {
  info: 'pi pi-info-circle',
  success: 'pi pi-check-circle',
  warning: 'pi pi-exclamation-triangle',
  error: 'pi pi-exclamation-circle'
}

const TONES: Record<NoticeToneType, string> = {
  info: 'Notice--Info',
  success: 'Notice--Success',
  warning: 'Notice--Warning',
  error: 'Notice--Error'
}

const Notice = ({ tone = 'info', icon, action, role, className, children, ...props }: Props) => {
  const iconClass = icon === undefined ? ICONS[tone] : icon

  return (
    <div
      className={['Notice', TONES[tone], className].filter(Boolean).join(' ')}
      role={role ?? (tone === 'error' ? 'alert' : undefined)}
      data-tour={props['data-tour']}
    >
      {iconClass && <i className={`Notice__Icon ${iconClass}`} aria-hidden='true' />}
      <div className='Notice__Body'>{children}</div>
      {action && <div className='Notice__Action'>{action}</div>}
    </div>
  )
}

export default Notice
