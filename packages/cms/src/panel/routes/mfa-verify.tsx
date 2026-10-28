import { redirect } from 'next/navigation'
import { translatorFor } from '../../core/config'
import { panelPaths } from '../../core/paths'
import { verifiedDevices } from '../../core/roles'
import MfaVerifyPage from '../screens/MfaVerifyPage/MfaVerifyPage'
import type { CmsServerType } from '../../server/next'
import type { Metadata, Route } from 'next'

interface Props {
  searchParams: Promise<{ next?: string }>
}

export const mfaVerifyRoute = (cms: CmsServerType) => {
  const metadata: Metadata = { title: translatorFor(cms.config).t('auth.mfa.title') }
  const Page = async ({ searchParams }: Props) => {
    const paths = panelPaths(cms.config)
    const [{ user, mfaPending }, { next }] = await Promise.all([cms.queries.getCurrentProfile(), searchParams])
    if (!user) redirect(paths.login as Route)
    if (!mfaPending) redirect(paths.home as Route)
    return <MfaVerifyPage devices={verifiedDevices(user.factors)} next={next} />
  }
  return { Page, metadata }
}
