import './DashboardToolbar.sass'
import type { ReactNode } from 'react'

interface Props {
  children?: ReactNode
  actions?: ReactNode
  className?: string
  'data-tour'?: string
}

const DashboardToolbar = ({ children, actions, className, ...props }: Props) => (
  <div className={['DashboardToolbar', className].filter(Boolean).join(' ')} data-tour={props['data-tour']}>
    {children && <div className='DashboardToolbar__Filters'>{children}</div>}
    {actions && <div className='DashboardToolbar__Actions'>{actions}</div>}
  </div>
)

export default DashboardToolbar
