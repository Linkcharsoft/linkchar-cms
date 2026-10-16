'use client'
import { useFormik } from 'formik'
import { useRouter } from 'next/navigation'
import { InputText } from 'primereact/inputtext'
import { Password } from 'primereact/password'
import { useState } from 'react'
import { validateAcceptInvite } from '../../../core/forms'
import { useCms, useT } from '../../client/context'
import { submitWithFocus, useFormValidation } from '../../forms/formik'
import CustomButton from '../../primitives/CustomButton/CustomButton'
import InputContainer from '../../primitives/InputContainer/InputContainer'
import Notice from '../../primitives/Notice/Notice'
import type { AcceptInviteFormType } from '../../../core/forms'
import type { Route } from 'next'

interface Props {
  // Name the admin typed when inviting: the invitee only confirms or fixes it.
  name: string
}

const AcceptInvitePage = ({ name }: Props) => {
  const { t, translate } = useT()
  const { actions } = useCms()
  const router = useRouter()
  const [submitError, setSubmitError] = useState<string | null>(null)

  const formik = useFormik<AcceptInviteFormType>({
    initialValues: { name, password: '', confirmPassword: '' },
    validate: useFormValidation(validateAcceptInvite),
    validateOnChange: false,
    validateOnBlur: false,
    onSubmit: async values => {
      setSubmitError(null)
      const result = await actions.acceptInvite(values)
      if (result.error) setSubmitError(translate(result.error))
      if (result.redirectTo) {
        router.replace(result.redirectTo as Route)
        router.refresh()
      }
    }
  })

  return (
    <main id='main' className='DashboardAuthLayout__Card'>
      <div className='DashboardAuthLayout__Header'>
        <h1 className='DashboardAuthLayout__Title'>{t('auth.invite.title')}</h1>
        <p className='DashboardAuthLayout__Subtitle'>{t('auth.invite.subtitle')}</p>
      </div>

      {submitError && (
        <Notice tone='error'>{submitError}</Notice>
      )}

      <form
        className='DashboardAuthLayout__Form'
        onSubmit={submitWithFocus(formik, ['name', 'password', 'confirmPassword'])}
        noValidate
      >
        <InputContainer label={t('auth.fullName')} htmlFor='name' error={formik.touched.name ? formik.errors.name : undefined}>
          <InputText
            id='name'
            name='name'
            autoComplete='name'
            className='DashboardAuthLayout__Input'
            value={formik.values.name}
            onChange={formik.handleChange}
            invalid={!!(formik.touched.name && formik.errors.name)}
          />
        </InputContainer>

        <InputContainer label={t('auth.password')} htmlFor='password' error={formik.touched.password ? formik.errors.password : undefined}>
          <Password
            inputId='password'
            name='password'
            autoComplete='new-password'
            className='DashboardAuthLayout__Input'
            inputClassName='DashboardAuthLayout__Input'
            value={formik.values.password}
            onChange={formik.handleChange}
            invalid={!!(formik.touched.password && formik.errors.password)}
            feedback={false}
            toggleMask
          />
        </InputContainer>

        <InputContainer
          label={t('auth.confirmPassword')}
          htmlFor='confirmPassword'
          error={formik.touched.confirmPassword ? formik.errors.confirmPassword : undefined}
        >
          <Password
            inputId='confirmPassword'
            name='confirmPassword'
            autoComplete='new-password'
            className='DashboardAuthLayout__Input'
            inputClassName='DashboardAuthLayout__Input'
            value={formik.values.confirmPassword}
            onChange={formik.handleChange}
            invalid={!!(formik.touched.confirmPassword && formik.errors.confirmPassword)}
            feedback={false}
            toggleMask
          />
        </InputContainer>

        <CustomButton type='submit' className='DashboardAuthLayout__Submit' loading={formik.isSubmitting}>
          {t('auth.invite.submit')}
        </CustomButton>
      </form>
    </main>
  )
}

export default AcceptInvitePage
