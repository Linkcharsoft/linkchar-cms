'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useCms, usePaths, useT } from '../../client/context'
import CustomButton from '../../primitives/CustomButton/CustomButton'
import Notice from '../../primitives/Notice/Notice'
import type { EmailLinkType } from '../../../core/paths'
import type { Route } from 'next'
import type { FormEvent } from 'react'

interface Props {
  tokenHash: string
  type: EmailLinkType
  // Where the person goes once the token is verified; a sign-in may already be ahead of it (the proxy).
  target: string
}

// Mail scanners open links before people do: the token is only spent when the person presses the button.
const ConfirmLinkPage = ({ tokenHash, type, target }: Props) => {
  const { t, translate } = useT()
  const { actions } = useCms()
  const paths = usePaths()
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setBusy(true)
    setError(null)
    const result = await actions.confirmLink({ tokenHash, type })
    if (result.error) {
      setError(translate(result.error))
      setBusy(false)
      return
    }
    router.replace((result.redirectTo ?? target) as Route)
    router.refresh()
  }

  return (
    <main id='main' className='DashboardAuthLayout__Card'>
      <div className='DashboardAuthLayout__Header'>
        <h1 className='DashboardAuthLayout__Title'>{t(`auth.confirm.${type}.title`)}</h1>
        <p className='DashboardAuthLayout__Subtitle'>{t(`auth.confirm.${type}.subtitle`)}</p>
      </div>

      {error && (
        <Notice tone='error'>{error}</Notice>
      )}

      <form className='DashboardAuthLayout__Form' onSubmit={onSubmit}>
        <CustomButton type='submit' className='DashboardAuthLayout__Submit' loading={busy}>
          {t('auth.confirm.submit')}
        </CustomButton>
      </form>

      <Link href={paths.login as Route} className='DashboardAuthLayout__Link'>
        {t('auth.backToLogin')}
      </Link>
    </main>
  )
}

export default ConfirmLinkPage
