import '../theme/styles.css'
import { connection } from 'next/server'
import { translatorFor } from '../../core/config'
import type { CmsServerType } from '../../server/next'
import type { CmsClientPropsType } from '../client/createCmsClient'
import type { Metadata } from 'next'
import type { ComponentType, ReactNode } from 'react'

interface RootLayoutOptionsType {
  // Classes for <body>, e.g. next/font variables that --cms-font-sans and --cms-font-display read.
  className?: string
}

// The panel's own root layout: its <html> carries the panel language and the CmsClient of the project.
export const rootLayout = (cms: CmsServerType, CmsClient: ComponentType<CmsClientPropsType>, { className }: RootLayoutOptionsType = {}) => {
  const { t } = translatorFor(cms.config)
  const metadata: Metadata = {
    title: { template: `%s · ${cms.config.branding.name}`, default: t('shell.tagline') },
    robots: { index: false, follow: false }
  }

  const Layout = async ({ children }: { children: ReactNode }) => {
    // Rendered per request: the Supabase settings come from the runtime environment, never baked in at build.
    await connection()
    const { url, publishableKey } = cms.browserSupabase()
    return (
      <html lang={cms.config.panelLocale}>
        <body className={['CmsRoot', className].filter(Boolean).join(' ')}>
          <CmsClient supabaseUrl={url} publishableKey={publishableKey}>{children}</CmsClient>
        </body>
      </html>
    )
  }

  return { Layout, metadata }
}
