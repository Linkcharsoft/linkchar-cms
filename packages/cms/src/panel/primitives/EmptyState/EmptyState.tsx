import './EmptyState.sass'
import type { ReactNode } from 'react'

interface Props {
  title: ReactNode
  description?: ReactNode
  icon?: string
  action?: ReactNode
  compact?: boolean
  className?: string
}

const EmptyState = ({ title, description, icon = 'pi pi-inbox', action, compact = false, className }: Props) => (
  <div className={['EmptyState', compact && 'EmptyState--Compact', className].filter(Boolean).join(' ')}>
    <span className='EmptyState__Icon' aria-hidden='true'>
      <i className={icon} />
    </span>
    <p className='EmptyState__Title'>{title}</p>
    {description && <p className='EmptyState__Description'>{description}</p>}
    {action && <div className='EmptyState__Action'>{action}</div>}
  </div>
)

export default EmptyState
