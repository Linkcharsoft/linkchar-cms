import { translatorFor } from '../../core/config'
import LoginPage from '../screens/LoginPage/LoginPage'
import type { CmsServerType } from '../../server/next'
import type { Metadata } from 'next'

interface Props {
  searchParams: Promise<{ error?: string }>
}

export const loginRoute = (cms: CmsServerType) => {
  const metadata: Metadata = { title: translatorFor(cms.config).t('auth.login.title') }
  const Page = async ({ searchParams }: Props) => {
    const { error } = await searchParams
    return <LoginPage error={error} />
  }
  return { Page, metadata }
}
