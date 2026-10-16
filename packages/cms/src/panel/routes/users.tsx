import { navItems } from '../shell/navigation'
import UsersTable from '../users/UsersTable/UsersTable'
import type { CmsServerType } from '../../server/next'
import type { Metadata } from 'next'

export const usersRoute = (cms: CmsServerType) => {
  const metadata: Metadata = { title: navItems(cms.config).users.label }

  const Page = async () => {
    const { user, profile } = await cms.queries.requireRole('admin')
    const users = await cms.queries.listPanelUsers()

    return (
      <main id='main' className='flex-1'>
        <section className='CmsContainer py-6'>
          <UsersTable title={navItems(cms.config).users.label} users={users} currentUserId={user.id} currentRole={profile.role} />
        </section>
      </main>
    )
  }

  return { Page, metadata }
}
