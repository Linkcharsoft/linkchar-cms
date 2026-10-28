'use client'
import { useFormik } from 'formik'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { InputText } from 'primereact/inputtext'
import { Password } from 'primereact/password'
import { useState } from 'react'
import { validateLogin } from '../../../core/forms'
import { safePanelPath } from '../../../core/paths'
import { useCms, usePaths, useT } from '../../client/context'
import { submitWithFocus, useFormValidation } from '../../forms/formik'
import CustomButton from '../../primitives/CustomButton/CustomButton'
import InputContainer from '../../primitives/InputContainer/InputContainer'
import Notice from '../../primitives/Notice/Notice'
import type { LoginFormType } from '../../../core/forms'
import type { Route } from 'next'

const URL_ERRORS = ['inactivo', 'sesion', 'link-invalido', 'link-vencido'] as const

interface Props {
  error?: string
  // Panel screen to come back to after signing in, as the proxy wrote it.
  next?: string
}

const LoginPage = ({ error, next }: Props) => {
  const { t, translate } = useT()
  const { actions, config } = useCms()
  const paths = usePaths()
  const router = useRouter()
  const urlError = URL_ERRORS.find(code => code === error)
  const [submitError, setSubmitError] = useState<string | null>(urlError ? t(`auth.urlErrors.${urlError}`) : null)
  const [navigating, setNavigating] = useState(false)

  const formik = useFormik<LoginFormType>({
    initialValues: { email: '', password: '' },
    validate: useFormValidation(validateLogin),
    validateOnChange: true,
    validateOnBlur: false,
    onSubmit: async values => {
      setSubmitError(null)
      const result = await actions.login(values)
      if (result.error) setSubmitError(translate(result.error))
      if (result.redirectTo) {
        const target = safePanelPath(next, config)
        const to = !target ? result.redirectTo : result.redirectTo === paths.mfaVerify ? `${paths.mfaVerify}?next=${encodeURIComponent(target)}` : target
        setNavigating(true)
        router.replace(to as Route)
        router.refresh()
      }
    }
  })

  return (
    <main id='main' className='DashboardAuthLayout__Card'>
      <div className='DashboardAuthLayout__Header'>
        <h1 className='DashboardAuthLayout__Title'>{t('auth.login.title')}</h1>
        <p className='DashboardAuthLayout__Subtitle'>{t('auth.login.subtitle')}</p>
      </div>

      {submitError && (
        <Notice tone='error'>{submitError}</Notice>
      )}

      <form className='DashboardAuthLayout__Form' onSubmit={submitWithFocus(formik, ['email', 'password'])} noValidate>
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

        <InputContainer label={t('auth.password')} htmlFor='password' error={formik.touched.password ? formik.errors.password : undefined}>
          <Password
            inputId='password'
            name='password'
            autoComplete='current-password'
            className='DashboardAuthLayout__Input'
            inputClassName='DashboardAuthLayout__Input'
            value={formik.values.password}
            onChange={formik.handleChange}
            invalid={!!(formik.touched.password && formik.errors.password)}
            feedback={false}
            toggleMask
          />
        </InputContainer>

        <CustomButton type='submit' className='DashboardAuthLayout__Submit' loading={formik.isSubmitting || navigating}>
          {t('auth.login.submit')}
        </CustomButton>
      </form>

      <Link href={paths.passwordRecovery as Route} className='DashboardAuthLayout__Link'>
        {t('auth.login.forgot')}
      </Link>
    </main>
  )
}

export default LoginPage
