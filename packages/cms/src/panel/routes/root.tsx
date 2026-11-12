import '@fontsource-variable/bricolage-grotesque'
import '@fontsource-variable/hanken-grotesk'
import '../theme/styles.css'
import { connection } from 'next/server'
import { translatorFor } from '../../core/config'
import type { CmsServerType } from '../../server/next'
import type { CmsClientPropsType } from '../client/createCmsClient'
import type { Metadata } from 'next'
import type { ComponentType, ReactNode } from 'react'

const ICON_TYPES: Record<string, string> = { svg: 'image/svg+xml', png: 'image/png', ico: 'image/x-icon' }

// The brand icon of the sidebar as the tab favicon; iOS takes only a PNG as the home screen icon.
const iconsOf = (icon: string | undefined): Pick<Metadata, 'icons'> => {
  if (!icon) return {}
  const extension = new URL(icon, 'https://cms.invalid').pathname.split('.').pop()?.toLowerCase() ?? ''
  const type = ICON_TYPES[extension]
  return { icons: { icon: [type ? { url: icon, type } : { url: icon }], ...(extension === 'png' ? { apple: icon } : {}) } }
}

// The panel's own root layout: its <html> carries the panel language and the CmsClient of the project.
export const rootLayout = (cms: CmsServerType, CmsClient: ComponentType<CmsClientPropsType>) => {
  const { t } = translatorFor(cms.config)
  const metadata: Metadata = {
    title: { template: `%s · ${cms.config.branding.name}`, default: t('shell.tagline') },
    robots: { index: false, follow: false },
    ...iconsOf(cms.config.branding.icon)
  }

  const Layout = async ({ children }: { children: ReactNode }) => {
    // Rendered per request: the Supabase settings come from the runtime environment, never baked in at build.
    await connection()
    const { url, publishableKey } = cms.browserSupabase()
    return (
      <html lang={cms.config.panelLocale}>
        <body className='CmsRoot'>
          <a href='#main' className='CmsSkipLink'>{t('shell.skipToContent')}</a>
          <CmsClient supabaseUrl={url} publishableKey={publishableKey}>{children}</CmsClient>
        </body>
      </html>
    )
  }

  return { Layout, metadata }
}
