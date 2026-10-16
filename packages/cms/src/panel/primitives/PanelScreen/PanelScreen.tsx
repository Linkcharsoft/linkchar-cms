import DashboardPageHeader from '../DashboardPageHeader/DashboardPageHeader'
import type { ReactNode } from 'react'

interface Props {
  title: ReactNode
  subtitle?: ReactNode
  actions?: ReactNode
  children: ReactNode
}

// The frame of a panel screen, for the project's own screens (extensions) too.
const PanelScreen = ({ title, subtitle, actions, children }: Props) => (
  <main id='main' className='flex-1'>
    <section className='CmsContainer py-6'>
      <DashboardPageHeader title={title} subtitle={subtitle} actions={actions} />
      {children}
    </section>
  </main>
)

export default PanelScreen
