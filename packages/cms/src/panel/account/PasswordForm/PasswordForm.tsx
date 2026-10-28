'use client'
import './PasswordForm.sass'
import { useFormik } from 'formik'
import { Checkbox } from 'primereact/checkbox'
import { Password } from 'primereact/password'
import { PASSWORD_MIN_LENGTH, validateChangePassword } from '../../../core/forms'
import { useCms, useT } from '../../client/context'
import { submitWithFocus, useFormValidation } from '../../forms/formik'
import CustomButton from '../../primitives/CustomButton/CustomButton'
import InputContainer from '../../primitives/InputContainer/InputContainer'
import { useNotify } from '../../providers/notify'
import type { ChangePasswordFormType } from '../../../core/forms'

type PasswordFieldType = 'currentPassword' | 'password' | 'confirmPassword'

const FIELDS = [
  { name: 'currentPassword', label: 'account.currentPassword', autoComplete: 'current-password', help: false },
  { name: 'password', label: 'account.newPassword', autoComplete: 'new-password', help: true },
  { name: 'confirmPassword', label: 'account.confirmNewPassword', autoComplete: 'new-password', help: false }
] as const satisfies { name: PasswordFieldType, label: string, autoComplete: string, help: boolean }[]

interface Props {
  // The account's address, for the browser's password manager; the form never sends it.
  email?: string
}

const PasswordForm = ({ email }: Props) => {
  const { t, translate } = useT()
  const { actions } = useCms()
  const notify = useNotify()

  const formik = useFormik<ChangePasswordFormType>({
    initialValues: { currentPassword: '', password: '', confirmPassword: '', signOutOthers: false },
    validate: useFormValidation(validateChangePassword),
    validateOnChange: true,
    validateOnBlur: false,
    onSubmit: async (values, { resetForm, setFieldError, setFieldTouched }) => {
      const result = await actions.changePassword(values)
      if (result.error === 'errors.account.wrongPassword') {
        await setFieldTouched('currentPassword', true, false)
        setFieldError('currentPassword', translate(result.error))
        document.getElementById('currentPassword')?.focus()
        return
      }
      if (result.error) return notify({ severity: 'error', summary: translate(result.error) })
      resetForm()
      notify({
        severity: 'success',
        summary: t('account.passwordChanged'),
        detail: values.signOutOthers ? t('account.othersSignedOut') : undefined
      })
    }
  })

  const error = (name: PasswordFieldType) => (formik.touched[name] ? formik.errors[name] : undefined)

  return (
    <form className='PasswordForm' onSubmit={submitWithFocus(formik, FIELDS.map(field => field.name))} noValidate>
      {email && <input type='email' name='username' autoComplete='username' value={email} readOnly hidden />}
      {FIELDS.map(field => (
        <InputContainer key={field.name} label={t(field.label)} htmlFor={field.name} error={error(field.name)} help={field.help ? t('account.newPasswordHelp', { min: PASSWORD_MIN_LENGTH }) : undefined}>
          <Password
            inputId={field.name}
            name={field.name}
            aria-describedby={field.help ? `${field.name}-help` : undefined}
            autoComplete={field.autoComplete}
            className='PasswordForm__Input'
            inputClassName='PasswordForm__Input'
            value={formik.values[field.name]}
            onChange={formik.handleChange}
            invalid={!!error(field.name)}
            feedback={false}
            toggleMask
          />
        </InputContainer>
      ))}

      <div className='flex items-center gap-2'>
        <Checkbox
          inputId='signOutOthers'
          checked={formik.values.signOutOthers}
          onChange={event => formik.setFieldValue('signOutOthers', !!event.checked)}
        />
        <label htmlFor='signOutOthers' className='PasswordForm__Check'>{t('account.signOutOthers')}</label>
      </div>

      <CustomButton type='submit' size='sm' className='self-start' loading={formik.isSubmitting}>
        {t('account.changePassword')}
      </CustomButton>
    </form>
  )
}

export default PasswordForm
