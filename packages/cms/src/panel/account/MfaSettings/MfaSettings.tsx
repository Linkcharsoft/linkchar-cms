'use client'
import './MfaSettings.sass'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Dialog } from 'primereact/dialog'
import { InputText } from 'primereact/inputtext'
import { useState } from 'react'
import { useCms, useFormatDate, useT } from '../../client/context'
import { useBrowserSupabase } from '../../client/supabase'
import { useConfirm } from '../../primitives/ConfirmAction/ConfirmAction'
import CustomButton from '../../primitives/CustomButton/CustomButton'
import DialogFooter from '../../primitives/DialogFooter/DialogFooter'
import InputContainer from '../../primitives/InputContainer/InputContainer'
import { useNotify } from '../../providers/notify'
import type { MfaDeviceType } from '../../../core/roles'

interface Props {
  devices: MfaDeviceType[]
}

interface EnrollmentType {
  factorId: string
  qrCode: string
  secret: string
}

const MAX_NAME = 40

// Supabase returns the QR as a raw "data:image/svg+xml;utf-8,<svg…>" string, which next/image rejects unencoded.
const qrDataUrl = (qrCode: string) => {
  const comma = qrCode.indexOf(',')
  return `${qrCode.slice(0, comma + 1)}${encodeURIComponent(qrCode.slice(comma + 1).trim())}`
}

// Mounted only while open. Cancelling drops the half-created factor so it never lingers as "unverified".
const AddDeviceDialog = ({ onHide, onAdded }: { onHide: () => void, onAdded: (name: string) => void }) => {
  const { t } = useT()
  const supabase = useBrowserSupabase()
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [enrollment, setEnrollment] = useState<EnrollmentType | null>(null)
  const [error, setError] = useState<string>()
  const [busy, setBusy] = useState(false)

  const start = async () => {
    const friendlyName = name.trim()
    if (!friendlyName) return setError(t('account.mfa.nameRequired'))
    setBusy(true)
    setError(undefined)
    const { mfa } = supabase.auth
    const { data: factors } = await mfa.listFactors()
    await Promise.all((factors?.all ?? []).filter(factor => factor.status === 'unverified').map(factor => mfa.unenroll({ factorId: factor.id })))

    const { data, error: enrollError } = await mfa.enroll({ factorType: 'totp', friendlyName })
    setBusy(false)
    if (enrollError || !data) {
      return setError(enrollError?.code === 'mfa_factor_name_conflict' ? t('account.mfa.nameTaken') : t('account.mfa.enrollFailed'))
    }
    setEnrollment({ factorId: data.id, qrCode: qrDataUrl(data.totp.qr_code), secret: data.totp.secret })
  }

  const verify = async () => {
    if (!enrollment) return
    if (!/^\d{6}$/.test(code.trim())) return setError(t('forms.codeFormat'))
    setBusy(true)
    setError(undefined)
    const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({ factorId: enrollment.factorId, code: code.trim() })
    setBusy(false)
    if (verifyError) {
      setCode('')
      return setError(t('auth.mfa.wrongCode'))
    }
    onAdded(name.trim())
  }

  const cancel = () => {
    if (enrollment) supabase.auth.mfa.unenroll({ factorId: enrollment.factorId })
    onHide()
  }

  return (
    <Dialog
      visible
      header={t('account.mfa.addTitle')}
      modal
      className='MfaSettings__Dialog'
      onHide={cancel}
      footer={(
        <DialogFooter>
          <CustomButton type='button' variant='secondary' onClick={cancel}>{t('ui.cancel')}</CustomButton>
          <CustomButton type='button' loading={busy} onClick={enrollment ? verify : start}>
            {enrollment ? t('account.mfa.activate') : t('account.mfa.continue')}
          </CustomButton>
        </DialogFooter>
      )}
    >
      <form className='MfaSettings__Form' noValidate onSubmit={event => { event.preventDefault(); if (enrollment) verify(); else start() }}>
        {!enrollment
          ? (
            <InputContainer label={t('account.mfa.deviceName')} htmlFor='mfa-device-name' error={error}>
              <InputText
                id='mfa-device-name'
                value={name}
                maxLength={MAX_NAME}
                placeholder={t('account.mfa.deviceNamePlaceholder')}
                autoComplete='off'
                invalid={!!error}
                onChange={event => setName(event.target.value)}
              />
            </InputContainer>
          )
          : (
            <>
              <ol className='MfaSettings__Steps'>
                <li>{t('account.mfa.stepInstall')}</li>
                <li>{t('account.mfa.stepScan')}</li>
                <li>{t('account.mfa.stepCode')}</li>
              </ol>
              <Image src={enrollment.qrCode} alt={t('account.mfa.qrAlt')} width={180} height={180} unoptimized className='MfaSettings__Qr' />
              <p className='MfaSettings__Secret'>
                {t('account.mfa.secret')} <code>{enrollment.secret}</code>
              </p>
              <InputContainer label={t('account.mfa.code')} htmlFor='mfa-device-code' error={error}>
                <InputText
                  id='mfa-device-code'
                  value={code}
                  inputMode='numeric'
                  autoComplete='one-time-code'
                  maxLength={6}
                  invalid={!!error}
                  onChange={event => setCode(event.target.value)}
                />
              </InputContainer>
            </>
          )}
      </form>
    </Dialog>
  )
}

const MfaSettings = ({ devices }: Props) => {
  const { t } = useT()
  const { actions } = useCms()
  const supabase = useBrowserSupabase()
  const router = useRouter()
  const notify = useNotify()
  const confirm = useConfirm()
  const formatDate = useFormatDate()
  const [adding, setAdding] = useState(false)

  const added = async (name: string) => {
    setAdding(false)
    await actions.recordMfaChange('enroll', name)
    notify({ severity: 'success', summary: t('account.mfa.enabled'), detail: t('account.mfa.enabledDetail', { name }) })
    router.refresh()
  }

  const askRemove = (device: MfaDeviceType) => confirm({
    header: t('account.mfa.removeHeader'),
    message: devices.length === 1 ? t('account.mfa.removeLast') : t('account.mfa.removeOne', { name: device.name }),
    acceptLabel: t('account.mfa.remove'),
    tone: 'danger',
    accept: async () => {
      const { error } = await supabase.auth.mfa.unenroll({ factorId: device.id })
      if (error) return notify({ severity: 'error', summary: t('account.mfa.removeFailed') })
      await actions.recordMfaChange('unenroll', device.name)
      notify({ severity: 'success', summary: t('account.mfa.removed', { name: device.name }) })
      router.refresh()
    }
  })

  return (
    <div className='MfaSettings'>
      <p className='MfaSettings__Text'>{devices.length ? t('account.mfa.on') : t('account.mfa.off')}</p>

      {devices.length > 0 && (
        <ul className='MfaSettings__List'>
          {devices.map(device => (
            <li key={device.id} className='MfaSettings__Device'>
              <i className='pi pi-mobile' aria-hidden='true' />
              <span className='MfaSettings__DeviceName'>
                {device.name}
                <span className='MfaSettings__DeviceMeta'>{t('account.mfa.addedOn', { date: formatDate(device.createdAt, 'date') })}</span>
              </span>
              <CustomButton type='button' variant='danger-ghost' size='sm' onClick={() => askRemove(device)}>
                {t('account.mfa.remove')}
              </CustomButton>
            </li>
          ))}
        </ul>
      )}

      <CustomButton type='button' variant={devices.length ? 'secondary' : 'primary'} size='sm' className='self-start' onClick={() => setAdding(true)}>
        <i className='pi pi-plus' aria-hidden='true' />
        {devices.length ? t('account.mfa.addAnother') : t('account.mfa.enable')}
      </CustomButton>

      {adding && <AddDeviceDialog onHide={() => setAdding(false)} onAdded={added} />}
    </div>
  )
}

export default MfaSettings
