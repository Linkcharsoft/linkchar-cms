import { translatorFor } from '../../core/config'
import PasswordResetPage from '../screens/PasswordResetPage/PasswordResetPage'
import type { CmsServerType } from '../../server/next'
import type { Metadata } from 'next'

export const passwordResetRoute = (cms: CmsServerType) => {
  const metadata: Metadata = { title: translatorFor(cms.config).t('auth.reset.title') }
  const Page = () => <PasswordResetPage />
  return { Page, metadata }
}
