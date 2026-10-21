'use client'
import './DashboardHeader.sass'
import { useT } from '../../client/context'
import CustomButton from '../../primitives/CustomButton/CustomButton'
import HelpMenu from '../../tours/HelpMenu/HelpMenu'
import AccountMenu from '../AccountMenu/AccountMenu'
import PublishStatus from '../PublishStatus/PublishStatus'
import type { RoleType } from '../../../core/roles'
import type { PendingCountsType, PublishRecordType } from '../../../server/publish'

interface Props {
  name: string
  role: RoleType
  avatar: string | null
  seenTours: string[]
  latestPublish: PublishRecordType | null
  pendingCounts: PendingCountsType
}

const DashboardHeader = ({ name, role, avatar, seenTours, latestPublish, pendingCounts }: Props) => {
  const { t } = useT()

  return (
    <header className='DashboardHeader'>
      <AccountMenu name={name} role={role} avatar={avatar} />

      <div className='DashboardHeader__Actions'>
        <PublishStatus latest={latestPublish} counts={pendingCounts} />

        <HelpMenu seenTours={seenTours} />

        <CustomButton href='/' target='_blank' variant='ghost' size='sm' aria-label={t('shell.viewSiteNewTab')} data-tour='view-site'>
          <i className='pi pi-external-link' aria-hidden='true' />
          <span className='DashboardHeader__Label'>{t('shell.viewSite')}</span>
        </CustomButton>
      </div>
    </header>
  )
}

export default DashboardHeader
