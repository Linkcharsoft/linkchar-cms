import { redirect } from 'next/navigation'
import { translatorFor } from '../../core/config'
import { panelPaths } from '../../core/paths'
import { verifiedDevices } from '../../core/roles'
import MfaVerifyPage from '../screens/MfaVerifyPage/MfaVerifyPage'
import type { CmsServerType } from '../../server/next'
import type { Metadata } from 'next'

export const mfaVerifyRoute = (cms: CmsServerType) => {
  const metadata: Metadata = { title: translatorFor(cms.config).t('auth.mfa.title') }
  const Page = async () => {
    const paths = panelPaths(cms.config)
    const { user, mfaPending } = await cms.queries.getCurrentProfile()
    if (!user) redirect(paths.login)
    if (!mfaPending) redirect(paths.home)
    return <MfaVerifyPage devices={verifiedDevices(user.factors)} />
  }
  return { Page, metadata }
}
