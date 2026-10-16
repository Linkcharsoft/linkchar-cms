import { translatorFor } from '../../core/config'
import { hasRole } from '../../core/roles'
import MediaLibrary from '../media/MediaLibrary/MediaLibrary'
import { navItems } from '../shell/navigation'
import type { CmsServerType } from '../../server/next'
import type { Metadata } from 'next'

export const mediaRoute = (cms: CmsServerType) => {
  const metadata: Metadata = { title: navItems(cms.config).media.label }

  const Page = async () => {
    const { profile } = await cms.queries.requireRole()
    await cms.queries.purgeExpiredMedia()
    const { items, total } = await cms.queries.listMedia()
    const { t } = translatorFor(cms.config)

    return (
      <main id='main' className='flex-1'>
        <section className='CmsContainer py-6'>
          <MediaLibrary
            header={{ title: navItems(cms.config).media.label, subtitle: t('media.subtitle') }}
            mode='manage'
            initialItems={items}
            initialTotal={total}
            canPurge={hasRole(profile.role, 'admin')}
          />
        </section>
      </main>
    )
  }

  return { Page, metadata }
}
