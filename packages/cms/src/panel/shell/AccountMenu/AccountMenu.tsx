'use client'
import './AccountMenu.sass'
import { useRouter } from 'next/navigation'
import { Menu } from 'primereact/menu'
import { useRef, useState, useTransition } from 'react'
import { useCms, usePaths, useT } from '../../client/context'
import UserAvatar from '../../primitives/UserAvatar/UserAvatar'
import type { RoleType } from '../../../core/roles'
import type { Route } from 'next'
import type { MenuItem } from 'primereact/menuitem'

interface Props {
  name: string
  role: RoleType
  avatar: string | null
}

const AccountMenu = ({ name, role, avatar }: Props) => {
  const { t } = useT()
  const { actions } = useCms()
  const paths = usePaths()
  const menuRef = useRef<Menu>(null)
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [leaving, startLeaving] = useTransition()

  const items: MenuItem[] = [
    { label: t('shell.account'), icon: 'pi pi-user', command: () => router.push(paths.account as Route) },
    { separator: true },
    {
      label: leaving ? t('shell.signingOut') : t('shell.signOut'),
      icon: 'pi pi-sign-out',
      disabled: leaving,
      command: () => startLeaving(() => actions.logout())
    }
  ]

  return (
    <>
      <button
        type='button'
        className='AccountMenu'
        aria-label={t('shell.accountOf', { name })}
        aria-haspopup='menu'
        aria-expanded={open}
        aria-controls='cms-account-menu'
        data-tour='account'
        onClick={event => menuRef.current?.toggle(event)}
      >
        <UserAvatar name={name} avatar={avatar} />
        <span className='AccountMenu__Who'>
          <span className='AccountMenu__Name'>{name}</span>
          <span className='AccountMenu__Role'>{t(`roles.${role}`)}</span>
        </span>
        <i className='pi pi-chevron-down AccountMenu__Chevron' aria-hidden='true' />
      </button>
      <Menu
        id='cms-account-menu'
        ref={menuRef}
        model={items}
        popup
        onShow={() => setOpen(true)}
        onHide={() => setOpen(false)}
      />
    </>
  )
}

export default AccountMenu
