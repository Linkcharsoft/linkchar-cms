'use client'
import { useFormik } from 'formik'
import { Dropdown } from 'primereact/dropdown'
import { InputText } from 'primereact/inputtext'
import { useState } from 'react'
import { validateMfaCode } from '../../../core/forms'
import { safePanelPath } from '../../../core/paths'
import { useCms, useT } from '../../client/context'
import { useBrowserSupabase } from '../../client/supabase'
import { submitWithFocus, useFormValidation } from '../../forms/formik'
import CustomButton from '../../primitives/CustomButton/CustomButton'
import InputContainer from '../../primitives/InputContainer/InputContainer'
import Notice from '../../primitives/Notice/Notice'
import type { MfaCodeFormType } from '../../../core/forms'
import type { MfaDeviceType } from '../../../core/roles'

interface Props {
  devices: MfaDeviceType[]
  next?: string
}

const MfaChallengeForm = ({ devices, next }: Props) => {
  const { t } = useT()
  const { actions, config } = useCms()
  const supabase = useBrowserSupabase()
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [navigating, setNavigating] = useState(false)

  const formik = useFormik<MfaCodeFormType>({
    initialValues: { factorId: devices[0]?.id ?? '', code: '' },
    validate: useFormValidation(validateMfaCode),
    validateOnChange: true,
    validateOnBlur: false,
    onSubmit: async values => {
      setSubmitError(null)
      const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: values.factorId, code: values.code.trim() })
      if (error) {
        formik.setFieldValue('code', '')
        return setSubmitError(error.code === 'over_request_rate_limit' ? t('auth.mfa.rateLimit') : t('auth.mfa.wrongCode'))
      }
      const result = await actions.completeSecondFactor()
      // Full load: the client router cache still holds the redirects it got while the session was aal1.
      if (result.redirectTo) {
        setNavigating(true)
        window.location.replace(safePanelPath(next, config) ?? result.redirectTo)
      }
    }
  })

  return (
    <>
      {submitError && (
        <Notice tone='error'>{submitError}</Notice>
      )}

      <form className='DashboardAuthLayout__Form' onSubmit={submitWithFocus(formik, ['factorId', 'code'])} noValidate>
        {devices.length > 1 && (
          <InputContainer label={t('auth.mfa.device')} htmlFor='factorId' error={formik.touched.factorId ? formik.errors.factorId : undefined}>
            <Dropdown
              inputId='factorId'
              className='DashboardAuthLayout__Input'
              value={formik.values.factorId}
              options={devices.map(device => ({ label: device.name, value: device.id }))}
              onChange={event => formik.setFieldValue('factorId', event.value)}
            />
          </InputContainer>
        )}

        <InputContainer label={t('auth.mfa.code')} htmlFor='code' error={formik.touched.code ? formik.errors.code : undefined}>
          <InputText
            id='code'
            name='code'
            inputMode='numeric'
            autoComplete='one-time-code'
            maxLength={6}
            className='DashboardAuthLayout__Input'
            value={formik.values.code}
            onChange={formik.handleChange}
            invalid={!!(formik.touched.code && formik.errors.code)}
          />
        </InputContainer>

        <CustomButton type='submit' className='DashboardAuthLayout__Submit' loading={formik.isSubmitting || navigating}>
          {t('auth.mfa.submit')}
        </CustomButton>
      </form>
    </>
  )
}

export default MfaChallengeForm
