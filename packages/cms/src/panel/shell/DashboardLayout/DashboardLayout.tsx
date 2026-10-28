import './DashboardLayout.sass'
import DashboardHeader from '../DashboardHeader/DashboardHeader'
import DashboardSidebar from '../DashboardSidebar/DashboardSidebar'
import type { RoleType } from '../../../core/roles'
import type { PendingCountsType, PublishRecordType } from '../../../server/publish'
import type { NavGroupType } from '../navigation'
import type { ReactNode } from 'react'

interface Props {
  groups: NavGroupType[]
  brand: { name: string, icon?: string, footer?: string }
  user: { name: string, role: RoleType, avatar: string | null, seenTours: string[] }
  latestPublish: PublishRecordType | null
  pendingCounts: PendingCountsType
  children: ReactNode
}

const DashboardLayout = ({ groups, brand, user, latestPublish, pendingCounts, children }: Props) => (
  <div className='DashboardLayout'>
    <DashboardSidebar groups={groups} brand={brand} />

    <div className='DashboardLayout__Content'>
      <DashboardHeader
        name={user.name}
        role={user.role}
        avatar={user.avatar}
        seenTours={user.seenTours}
        latestPublish={latestPublish}
        pendingCounts={pendingCounts}
      />
      { children }
    </div>
  </div>
)

export default DashboardLayout
