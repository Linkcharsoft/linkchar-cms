'use client'
import { useFormik } from 'formik'
import Link from 'next/link'
import { InputText } from 'primereact/inputtext'
import { useState } from 'react'
import { validatePasswordRecovery } from '../../../core/forms'
import { useCms, usePaths, useT } from '../../client/context'
import { submitWithFocus, useFormValidation } from '../../forms/formik'
import CustomButton from '../../primitives/CustomButton/CustomButton'
import InputContainer from '../../primitives/InputContainer/InputContainer'
import Notice from '../../primitives/Notice/Notice'
import type { PasswordRecoveryFormType } from '../../../core/forms'
import type { Route } from 'next'

const PasswordRecoveryPage = () => {
  const { t, translate } = useT()
  const { actions } = useCms()
  const paths = usePaths()
  const [sent, setSent] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const formik = useFormik<PasswordRecoveryFormType>({
    initialValues: { email: '' },
    validate: useFormValidation(validatePasswordRecovery),
    validateOnChange: true,
    validateOnBlur: false,
    onSubmit: async values => {
      setSubmitError(null)
      const result = await actions.requestPasswordReset(values)
      if (result.error) setSubmitError(translate(result.error))
      else setSent(true)
    }
  })

  return (
    <main id='main' className='DashboardAuthLayout__Card'>
      <div className='DashboardAuthLayout__Header'>
        <h1 className='DashboardAuthLayout__Title'>{t('auth.recovery.title')}</h1>
        <p className='DashboardAuthLayout__Subtitle'>{t('auth.recovery.subtitle')}</p>
      </div>

      {sent && (
        <Notice tone='success' role='status'>{t('auth.recovery.sent')}</Notice>
      )}

      {submitError && (
        <Notice tone='error'>{submitError}</Notice>
      )}

      {!sent && (
        <form className='DashboardAuthLayout__Form' onSubmit={submitWithFocus(formik, ['email'])} noValidate>
          <InputContainer label={t('auth.email')} htmlFor='email' error={formik.touched.email ? formik.errors.email : undefined}>
            <InputText
              id='email'
              name='email'
              type='email'
              autoComplete='email'
              className='DashboardAuthLayout__Input'
              value={formik.values.email}
              onChange={formik.handleChange}
              invalid={!!(formik.touched.email && formik.errors.email)}
            />
          </InputContainer>

          <CustomButton type='submit' className='DashboardAuthLayout__Submit' loading={formik.isSubmitting}>
            {t('auth.recovery.submit')}
          </CustomButton>
        </form>
      )}

      <Link href={paths.login as Route} className='DashboardAuthLayout__Link'>
        {t('auth.backToLogin')}
      </Link>
    </main>
  )
}

export default PasswordRecoveryPage
