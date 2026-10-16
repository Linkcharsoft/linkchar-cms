import { translatorFor } from '../../core/config'
import { verifiedDevices } from '../../core/roles'
import AccountPage from '../account/AccountPage/AccountPage'
import type { CmsServerType } from '../../server/next'
import type { Metadata } from 'next'

export const accountRoute = (cms: CmsServerType) => {
  const metadata: Metadata = { title: translatorFor(cms.config).t('shell.account') }

  const Page = async () => {
    const { user, profile } = await cms.queries.requireRole()
    return (
      <AccountPage
        userId={user.id}
        email={user.email ?? ''}
        role={profile.role}
        name={profile.name}
        avatar={profile.avatar}
        devices={verifiedDevices(user.factors)}
      />
    )
  }

  return { Page, metadata }
}
