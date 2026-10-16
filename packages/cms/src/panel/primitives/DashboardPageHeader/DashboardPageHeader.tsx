import './DashboardPageHeader.sass'
import type { ReactNode } from 'react'

interface Props {
  title: ReactNode
  subtitle?: ReactNode
  meta?: ReactNode
  actions?: ReactNode
  size?: 'page' | 'editor'
  className?: string
}

const DashboardPageHeader = ({ title, subtitle, meta, actions, size = 'page', className }: Props) => (
  <div className={['DashboardPageHeader', `DashboardPageHeader--${size === 'page' ? 'Page' : 'Editor'}`, className].filter(Boolean).join(' ')}>
    <div className='DashboardPageHeader__Text'>
      <h1 className='DashboardPageHeader__Title'>{title}</h1>
      {meta && <div className='DashboardPageHeader__Meta'>{meta}</div>}
      {subtitle && <p className='DashboardPageHeader__Subtitle'>{subtitle}</p>}
    </div>
    {actions && <div className='DashboardPageHeader__Actions'>{actions}</div>}
  </div>
)

export default DashboardPageHeader
