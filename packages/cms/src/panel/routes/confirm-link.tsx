import { redirect } from 'next/navigation'
import { translatorFor } from '../../core/config'
import { emailLinkTarget, isEmailLinkType, panelPaths } from '../../core/paths'
import ConfirmLinkPage from '../screens/ConfirmLinkPage/ConfirmLinkPage'
import type { CmsServerType } from '../../server/next'
import type { Metadata, Route } from 'next'

interface Props {
  searchParams: Promise<{ token_hash?: string, type?: string }>
}

// Landing point of the invite and recovery emails: the token is spent on the button, not on opening the link.
export const confirmLinkRoute = (cms: CmsServerType) => {
  const metadata: Metadata = { title: translatorFor(cms.config).t('auth.confirm.title') }
  const Page = async ({ searchParams }: Props) => {
    const { token_hash: tokenHash, type } = await searchParams
    if (!tokenHash || !isEmailLinkType(type)) redirect(`${panelPaths(cms.config).login}?error=link-invalido` as Route)
    return <ConfirmLinkPage tokenHash={tokenHash} type={type} target={emailLinkTarget(cms.config, type)} />
  }
  return { Page, metadata }
}
