'use client'
import './AccountPage.sass'
import { useT } from '../../client/context'
import DashboardPageHeader from '../../primitives/DashboardPageHeader/DashboardPageHeader'
import MfaSettings from '../MfaSettings/MfaSettings'
import PasswordForm from '../PasswordForm/PasswordForm'
import ProfileForm from '../ProfileForm/ProfileForm'
import type { MfaDeviceType, RoleType } from '../../../core/roles'

interface Props {
  userId: string
  email: string
  role: RoleType
  name: string
  avatar: string | null
  devices: MfaDeviceType[]
}

const AccountPage = ({ userId, email, role, name, avatar, devices }: Props) => {
  const { t } = useT()

  return (
    <main id='main' className='AccountPage'>
      <section className='CmsContainer py-6'>
        <DashboardPageHeader title={t('shell.account')} subtitle={[email, t(`roles.${role}`)].filter(Boolean).join(' · ')} />

        <div className='AccountPage__Grid'>
          <section className='AccountPage__Card' aria-labelledby='account-profile'>
            <h2 id='account-profile' className='AccountPage__CardTitle'>{t('account.profile')}</h2>
            <ProfileForm userId={userId} name={name} avatar={avatar} />
          </section>

          <section className='AccountPage__Card' aria-labelledby='account-password' data-tour='account-password'>
            <h2 id='account-password' className='AccountPage__CardTitle'>{t('account.password')}</h2>
            <PasswordForm />
          </section>

          <section className='AccountPage__Card' aria-labelledby='account-mfa' data-tour='mfa'>
            <h2 id='account-mfa' className='AccountPage__CardTitle'>{t('account.mfaTitle')}</h2>
            <MfaSettings devices={devices} />
          </section>
        </div>
      </section>
    </main>
  )
}

export default AccountPage
