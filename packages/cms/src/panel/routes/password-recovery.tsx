import { translatorFor } from '../../core/config'
import PasswordRecoveryPage from '../screens/PasswordRecoveryPage/PasswordRecoveryPage'
import type { CmsServerType } from '../../server/next'
import type { Metadata } from 'next'

export const passwordRecoveryRoute = (cms: CmsServerType) => {
  const metadata: Metadata = { title: translatorFor(cms.config).t('auth.recovery.title') }
  const Page = () => <PasswordRecoveryPage />
  return { Page, metadata }
}
