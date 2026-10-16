'use client'
import MfaChallengeForm from '../../account/MfaChallengeForm/MfaChallengeForm'
import { useCms, useT } from '../../client/context'
import CustomButton from '../../primitives/CustomButton/CustomButton'
import type { MfaDeviceType } from '../../../core/roles'

interface Props {
  devices: MfaDeviceType[]
}

const MfaVerifyPage = ({ devices }: Props) => {
  const { t } = useT()
  const { actions } = useCms()

  return (
    <main id='main' className='DashboardAuthLayout__Card'>
      <div className='DashboardAuthLayout__Header'>
        <h1 className='DashboardAuthLayout__Title'>{t('auth.mfa.title')}</h1>
        <p className='DashboardAuthLayout__Subtitle'>{t('auth.mfa.subtitle')}</p>
      </div>

      <MfaChallengeForm devices={devices} />

      <form action={actions.logout} className='flex justify-center'>
        <CustomButton type='submit' variant='ghost' size='sm'>{t('auth.mfa.otherAccount')}</CustomButton>
      </form>
    </main>
  )
}

export default MfaVerifyPage
