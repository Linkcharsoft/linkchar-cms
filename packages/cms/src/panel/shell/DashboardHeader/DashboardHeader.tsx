'use client'
import './DashboardHeader.sass'
import { useT } from '../../client/context'
import CustomButton from '../../primitives/CustomButton/CustomButton'
import AccountMenu from '../AccountMenu/AccountMenu'
import PublishStatus from '../PublishStatus/PublishStatus'
import type { RoleType } from '../../../core/roles'
import type { PublishRecordType } from '../../../server/publish'

interface Props {
  name: string
  role: RoleType
  avatar: string | null
  latestPublish: PublishRecordType | null
  pendingCount: number
}

const DashboardHeader = ({ name, role, avatar, latestPublish, pendingCount }: Props) => {
  const { t } = useT()

  return (
    <header className='DashboardHeader'>
      <AccountMenu name={name} role={role} avatar={avatar} />

      <div className='DashboardHeader__Actions'>
        <PublishStatus latest={latestPublish} pendingCount={pendingCount} />

        <CustomButton href='/' target='_blank' variant='ghost' size='sm' aria-label={t('shell.viewSiteNewTab')} data-tour='view-site'>
          <i className='pi pi-external-link' aria-hidden='true' />
          <span className='DashboardHeader__Label'>{t('shell.viewSite')}</span>
        </CustomButton>
      </div>
    </header>
  )
}

export default DashboardHeader
