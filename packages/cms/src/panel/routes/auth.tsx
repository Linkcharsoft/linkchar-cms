import { translatorFor } from '../../core/config'
import DashboardAuthLayout from '../shell/DashboardAuthLayout/DashboardAuthLayout'
import type { CmsServerType } from '../../server/next'
import type { ReactNode } from 'react'

export const authLayout = (cms: CmsServerType) => {
  const Layout = ({ children }: { children: ReactNode }) => {
    const { name, logo } = cms.config.branding
    return <DashboardAuthLayout brand={{ name, logo }} tagline={translatorFor(cms.config).t('shell.tagline')}>{children}</DashboardAuthLayout>
  }
  return { Layout }
}
