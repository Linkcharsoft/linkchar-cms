import { translatorFor } from '../../core/config'
import DashboardAuthLayout from '../shell/DashboardAuthLayout/DashboardAuthLayout'
import type { CmsServerType } from '../../server/next'
import type { ReactNode } from 'react'

export const authLayout = (cms: CmsServerType) => {
  const Layout = ({ children }: { children: ReactNode }) => {
    const { name, icon } = cms.config.branding
    const { t } = translatorFor(cms.config)
    return <DashboardAuthLayout brand={{ name, icon }} tagline={t('shell.tagline')} brandTag={t('shell.brandTag')}>{children}</DashboardAuthLayout>
  }
  return { Layout }
}
