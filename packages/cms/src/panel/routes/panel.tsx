import { textContext } from '../../core/config'
import { resolveText } from '../../core/text'
import DashboardLayout from '../shell/DashboardLayout/DashboardLayout'
import { buildPanelNav } from '../shell/navigation'
import type { CmsServerType } from '../../server/next'
import type { ReactNode } from 'react'

export const panelLayout = (cms: CmsServerType) => {
  const Layout = async ({ children }: { children: ReactNode }) => {
    const { user, profile } = await cms.queries.requireRole()
    const [latestPublish, pendingCounts] = await Promise.all([cms.queries.getLatestPublish(), cms.queries.getPendingCounts()])
    const ctx = textContext(cms.config)
    const { name, icon, footer } = cms.config.branding

    return (
      <DashboardLayout
        groups={buildPanelNav(cms.config, profile.role)}
        brand={{ name, icon, footer: footer ? resolveText(footer, ctx) : undefined }}
        user={{ name: profile.name || user.email || ctx.translator.t('shell.someone'), role: profile.role, avatar: profile.avatar, seenTours: profile.seen_tours }}
        latestPublish={latestPublish}
        pendingCounts={pendingCounts}
      >
        {children}
      </DashboardLayout>
    )
  }
  return { Layout }
}
