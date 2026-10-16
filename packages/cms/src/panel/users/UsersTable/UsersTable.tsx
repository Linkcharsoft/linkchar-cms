'use client'
import './UsersTable.sass'
import { useFormik } from 'formik'
import { useRouter } from 'next/navigation'
import { Column } from 'primereact/column'
import { DataTable } from 'primereact/datatable'
import { Dialog } from 'primereact/dialog'
import { Dropdown } from 'primereact/dropdown'
import { InputSwitch } from 'primereact/inputswitch'
import { InputText } from 'primereact/inputtext'
import { Menu } from 'primereact/menu'
import { Tag } from 'primereact/tag'
import { useRef, useState } from 'react'
import { NAME_MAX_LENGTH, validateInviteUser, validateUserAccess } from '../../../core/forms'
import { assignableRoles, canManageUser, ROLES } from '../../../core/roles'
import { useCms, useT } from '../../client/context'
import { useFormValidation } from '../../forms/formik'
import { useConfirm } from '../../primitives/ConfirmAction/ConfirmAction'
import CustomButton from '../../primitives/CustomButton/CustomButton'
import DashboardPageHeader from '../../primitives/DashboardPageHeader/DashboardPageHeader'
import DashboardToolbar from '../../primitives/DashboardToolbar/DashboardToolbar'
import DateCell from '../../primitives/DateCell/DateCell'
import DialogFooter from '../../primitives/DialogFooter/DialogFooter'
import EmptyState from '../../primitives/EmptyState/EmptyState'
import InputContainer from '../../primitives/InputContainer/InputContainer'
import Notice from '../../primitives/Notice/Notice'
import SearchInput from '../../primitives/SearchInput/SearchInput'
import UserAvatar from '../../primitives/UserAvatar/UserAvatar'
import { useNotify } from '../../providers/notify'
import type { InviteUserFormType } from '../../../core/forms'
import type { RoleType, UserStatusType } from '../../../core/roles'
import type { SessionResultType } from '../../../server/session'
import type { PanelUserType } from '../../../server/users'
import type { MenuItem } from 'primereact/menuitem'

interface Props {
  title: string
  users: PanelUserType[]
  currentUserId: string
  currentRole: RoleType
}

const ALL = 'all'

const STATUS_SEVERITIES: Record<UserStatusType, 'success' | 'info' | 'secondary'> = {
  active: 'success',
  invited: 'info',
  inactive: 'secondary'
}

const matches = (user: PanelUserType, search: string) =>
  !search || `${user.name} ${user.email}`.toLowerCase().includes(search.toLowerCase())

// Mounted only while open. Without `user` it invites; with one it edits the role and the publish permission.
const UserDialog = ({ user, roles, onHide, onSaved }: { user?: PanelUserType, roles: RoleType[], onHide: () => void, onSaved: (message: string) => void }) => {
  const { t, translate } = useT()
  const { actions } = useCms()
  const [submitError, setSubmitError] = useState<string>()
  const validateInvite = useFormValidation(validateInviteUser)
  const validateAccess = useFormValidation(validateUserAccess)

  const formik = useFormik<InviteUserFormType>({
    initialValues: { email: user?.email ?? '', name: user?.name ?? '', role: user?.role ?? 'editor', canPublish: user?.role === 'editor' ? user.canPublish : false },
    validate: values => (user ? validateAccess({ role: values.role, canPublish: values.canPublish }) : validateInvite(values)),
    validateOnChange: false,
    validateOnBlur: false,
    onSubmit: async values => {
      setSubmitError(undefined)
      const result = user ? await actions.updateUserAccess(user.id, { role: values.role, canPublish: values.canPublish }) : await actions.inviteUser(values)
      if (result.error) return setSubmitError(translate(result.error))
      onSaved(user ? t('usersScreen.done.saved') : t('usersScreen.done.invited', { email: values.email.trim() }))
    }
  })

  const fieldError = (name: 'email' | 'name' | 'role') => (formik.touched[name] ? formik.errors[name] : undefined)

  return (
    <Dialog
      visible
      header={user ? t('usersScreen.dialog.editTitle', { name: user.name || user.email }) : t('usersScreen.invite')}
      modal
      className='UsersTable__Dialog'
      onHide={onHide}
      footer={(
        <DialogFooter>
          <CustomButton type='button' variant='secondary' onClick={onHide}>{t('ui.cancel')}</CustomButton>
          <CustomButton type='button' loading={formik.isSubmitting} onClick={() => formik.handleSubmit()}>
            {user ? t('usersScreen.dialog.save') : t('usersScreen.dialog.send')}
          </CustomButton>
        </DialogFooter>
      )}
    >
      <form className='UsersTable__Form' noValidate onSubmit={formik.handleSubmit}>
        {submitError && (
          <Notice tone='error'>{submitError}</Notice>
        )}
        {!user && (
          <>
            <InputContainer label={t('auth.email')} htmlFor='user-email' error={fieldError('email')}>
              <InputText id='user-email' name='email' type='email' autoComplete='off' value={formik.values.email} onChange={formik.handleChange} invalid={!!fieldError('email')} />
            </InputContainer>
            <InputContainer label={t('usersScreen.dialog.name')} htmlFor='user-name' error={fieldError('name')}>
              <InputText id='user-name' name='name' autoComplete='off' maxLength={NAME_MAX_LENGTH} value={formik.values.name} onChange={formik.handleChange} invalid={!!fieldError('name')} />
            </InputContainer>
          </>
        )}
        <InputContainer label={t('usersScreen.role')} htmlFor='user-role' error={fieldError('role')}>
          <Dropdown
            inputId='user-role'
            value={formik.values.role}
            options={roles.map(role => ({ label: t(`roles.${role}`), value: role }))}
            onChange={event => formik.setFieldValue('role', event.value)}
          />
        </InputContainer>
        <p className='UsersTable__Help'>{t(`roleHelp.${formik.values.role}`)}</p>
        {formik.values.role === 'editor' && (
          <div className='flex items-center gap-3'>
            <InputSwitch inputId='user-can-publish' checked={formik.values.canPublish} onChange={event => formik.setFieldValue('canPublish', !!event.value)} />
            <label htmlFor='user-can-publish' className='UsersTable__Switch'>{t('usersScreen.dialog.canPublish')}</label>
          </div>
        )}
        {!user && <p className='UsersTable__Help'>{t('usersScreen.dialog.inviteHelp')}</p>}
      </form>
    </Dialog>
  )
}

const UsersTable = ({ title, users, currentUserId, currentRole }: Props) => {
  const { t, translate } = useT()
  const { actions } = useCms()
  const router = useRouter()
  const notify = useNotify()
  const confirm = useConfirm()
  const menuRef = useRef<Menu>(null)
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<RoleType | typeof ALL>(ALL)
  const [dialog, setDialog] = useState<{ user?: PanelUserType } | null>(null)
  const roles = assignableRoles(currentRole)
  const actor = { id: currentUserId, role: currentRole }

  const visible = users.filter(user => matches(user, search) && (roleFilter === ALL || user.role === roleFilter))

  const run = async (action: Promise<SessionResultType>, success: string) => {
    const result = await action
    if (result.error) return notify({ severity: 'error', summary: translate(result.error) })
    notify({ severity: 'success', summary: success })
    router.refresh()
  }

  const ask = (header: string, message: string, acceptLabel: string, accept: () => void, danger = false) =>
    confirm({ header, message, acceptLabel, tone: danger ? 'danger' : 'primary', accept })

  const actionsFor = (user: PanelUserType): MenuItem[] => {
    const name = user.name || user.email
    const items: MenuItem[] = [{ label: t('usersScreen.menu.edit'), icon: 'pi pi-user-edit', command: () => setDialog({ user }) }]
    if (user.status === 'invited') {
      items.push(
        {
          label: t('usersScreen.menu.resend'),
          icon: 'pi pi-envelope',
          command: () => run(actions.resendInvite(user.id), t('usersScreen.done.resent', { email: user.email }))
        },
        {
          label: t('usersScreen.menu.deleteInvite'),
          icon: 'pi pi-trash',
          command: () => ask(
            t('usersScreen.confirm.deleteInviteHeader'),
            t('usersScreen.confirm.deleteInvite', { name }),
            t('usersScreen.confirm.deleteInviteAccept'),
            () => run(actions.deleteInvite(user.id), t('usersScreen.done.inviteDeleted')),
            true
          )
        }
      )
    }
    if (user.status === 'inactive') {
      items.push({
        label: t('usersScreen.menu.reactivate'),
        icon: 'pi pi-check-circle',
        command: () => run(actions.setUserActive(user.id, true), t('usersScreen.done.reactivated', { name }))
      })
    } else if (user.status === 'active') {
      items.push({
        label: t('usersScreen.menu.deactivate'),
        icon: 'pi pi-ban',
        command: () => ask(
          t('usersScreen.confirm.deactivateHeader'),
          t('usersScreen.confirm.deactivate', { name }),
          t('usersScreen.confirm.deactivateAccept'),
          () => run(actions.setUserActive(user.id, false), t('usersScreen.done.deactivated', { name })),
          true
        )
      })
    }
    if (user.mfa) {
      items.push({
        label: t('usersScreen.menu.resetMfa'),
        icon: 'pi pi-mobile',
        command: () => ask(
          t('usersScreen.confirm.resetMfaHeader'),
          t('usersScreen.confirm.resetMfa', { name }),
          t('usersScreen.confirm.resetMfaAccept'),
          () => run(actions.resetUserMfa(user.id), t('usersScreen.done.mfaReset'))
        )
      })
    }
    return items
  }

  const userTemplate = (user: PanelUserType) => {
    const name = user.name || t('usersScreen.noName')
    return (
      <div className='UsersTable__User'>
        <UserAvatar name={user.name || user.email} avatar={user.avatar} />
        <span className='UsersTable__Who'>
          <span className='UsersTable__Name'>{user.id === currentUserId ? t('usersScreen.you', { name }) : name}</span>
          <span className='UsersTable__Email'>{user.email}</span>
        </span>
      </div>
    )
  }

  const statusTemplate = (user: PanelUserType) => <Tag value={t(`userStatus.${user.status}`)} severity={STATUS_SEVERITIES[user.status]} />

  const lastSignInTemplate = (user: PanelUserType) => <DateCell value={user.lastSignInAt} empty={t('ui.never')} />

  const actionsTemplate = (user: PanelUserType) => (!canManageUser(actor, user) ? null : (
    <CustomButton
      type='button'
      variant='ghost'
      size='md'
      iconOnly
      aria-label={t('usersScreen.actionsFor', { name: user.name || user.email })}
      onClick={event => {
        setMenuItems(actionsFor(user))
        menuRef.current?.toggle(event)
      }}
    >
      <i className='pi pi-ellipsis-v' aria-hidden='true' />
    </CustomButton>
  ))

  return (
    <div className='UsersTable'>
      <DashboardPageHeader
        title={title}
        subtitle={t('usersScreen.subtitle')}
        actions={(
          <CustomButton type='button' onClick={() => setDialog({})} data-tour='users-invite'>
            <i className='pi pi-user-plus' aria-hidden='true' />
            {t('usersScreen.invite')}
          </CustomButton>
        )}
      />

      <DashboardToolbar>
        <SearchInput placeholder={t('usersScreen.search')} onChange={value => setSearch(value?.trim() ?? '')} />
        <Dropdown
          inputId='users-role'
          aria-label={t('usersScreen.role')}
          value={roleFilter}
          options={[{ label: t('usersScreen.allRoles'), value: ALL }, ...ROLES.map(role => ({ label: t(`roles.${role}`), value: role }))]}
          onChange={event => setRoleFilter(event.value)}
        />
      </DashboardToolbar>

      <DataTable
        responsiveLayout='stack'
        breakpoint='767px'
        value={visible}
        dataKey='id'
        emptyMessage={<EmptyState compact icon='pi pi-users' title={t('usersScreen.noMatches')} />}
        className='UsersTable__Table'
      >
        <Column header={t('usersScreen.columns.user')} body={userTemplate} />
        <Column header={t('usersScreen.columns.role')} body={(user: PanelUserType) => t(`roles.${user.role}`)} />
        <Column header={t('usersScreen.columns.publishes')} body={(user: PanelUserType) => (user.canPublish ? t('common.yes') : t('common.no'))} />
        <Column header={t('usersScreen.columns.status')} body={statusTemplate} />
        <Column header={t('usersScreen.columns.mfa')} body={(user: PanelUserType) => (user.mfa ? t('usersScreen.mfaOn') : t('common.empty'))} />
        <Column header={t('usersScreen.columns.lastSignIn')} body={lastSignInTemplate} />
        <Column header={<span className='sr-only'>{t('usersScreen.columns.actions')}</span>} body={actionsTemplate} className='UsersTable__Actions' />
      </DataTable>

      <Menu model={menuItems} popup ref={menuRef} />
      {dialog && (
        <UserDialog
          user={dialog.user}
          roles={roles}
          onHide={() => setDialog(null)}
          onSaved={message => {
            setDialog(null)
            notify({ severity: 'success', summary: message })
            router.refresh()
          }}
        />
      )}
    </div>
  )
}

export default UsersTable
