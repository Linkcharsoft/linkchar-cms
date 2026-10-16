'use client'
import { useFormik } from 'formik'
import { useRouter } from 'next/navigation'
import { Password } from 'primereact/password'
import { useState } from 'react'
import { PASSWORD_MIN_LENGTH, validatePasswordReset } from '../../../core/forms'
import { useCms, useT } from '../../client/context'
import { submitWithFocus, useFormValidation } from '../../forms/formik'
import CustomButton from '../../primitives/CustomButton/CustomButton'
import InputContainer from '../../primitives/InputContainer/InputContainer'
import Notice from '../../primitives/Notice/Notice'
import type { PasswordResetFormType } from '../../../core/forms'
import type { Route } from 'next'

const PasswordResetPage = () => {
  const { t, translate } = useT()
  const { actions } = useCms()
  const router = useRouter()
  const [submitError, setSubmitError] = useState<string | null>(null)

  const formik = useFormik<PasswordResetFormType>({
    initialValues: { password: '', confirmPassword: '' },
    validate: useFormValidation(validatePasswordReset),
    validateOnChange: false,
    validateOnBlur: false,
    onSubmit: async values => {
      setSubmitError(null)
      const result = await actions.updatePassword(values)
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
        <h1 className='DashboardAuthLayout__Title'>{t('auth.reset.title')}</h1>
        <p className='DashboardAuthLayout__Subtitle'>{t('auth.reset.subtitle', { min: PASSWORD_MIN_LENGTH })}</p>
      </div>

      {submitError && (
        <Notice tone='error'>{submitError}</Notice>
      )}

      <form className='DashboardAuthLayout__Form' onSubmit={submitWithFocus(formik, ['password', 'confirmPassword'])} noValidate>
        <InputContainer label={t('auth.newPassword')} htmlFor='password' error={formik.touched.password ? formik.errors.password : undefined}>
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
          {t('auth.reset.submit')}
        </CustomButton>
      </form>
    </main>
  )
}

export default PasswordResetPage
