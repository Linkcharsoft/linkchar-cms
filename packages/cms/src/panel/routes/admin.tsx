import type { CmsServerType } from '../../server/next'
import type { ReactNode } from 'react'

// Guards in a layout so the redirect happens before the route's loading.tsx starts streaming.
export const adminLayout = (cms: CmsServerType) => {
  const Layout = async ({ children }: { children: ReactNode }) => {
    await cms.queries.requireRole('admin')
    return children
  }
  return { Layout }
}
