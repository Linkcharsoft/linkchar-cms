import { translatorFor } from '../../core/config'
import AcceptInvitePage from '../screens/AcceptInvitePage/AcceptInvitePage'
import type { CmsServerType } from '../../server/next'
import type { Metadata } from 'next'

export const acceptInviteRoute = (cms: CmsServerType) => {
  const metadata: Metadata = { title: translatorFor(cms.config).t('auth.invite.title') }
  const Page = async () => {
    const { user, profile } = await cms.queries.getCurrentProfile()
    return <AcceptInvitePage name={profile?.name ?? ''} email={user?.email ?? ''} />
  }
  return { Page, metadata }
}
