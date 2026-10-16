'use client'
import './ProfileForm.sass'
import { useFormik } from 'formik'
import { useRouter } from 'next/navigation'
import { InputText } from 'primereact/inputtext'
import { useRef, useState } from 'react'
import { NAME_MAX_LENGTH, validateProfile } from '../../../core/forms'
import { AVATAR_SIZE, buildAvatarPath, isImageMime, MEDIA_BUCKET } from '../../../core/media'
import { useCms, useT } from '../../client/context'
import { useBrowserSupabase } from '../../client/supabase'
import { submitWithFocus, useFormValidation } from '../../forms/formik'
import processImage from '../../media/processImage'
import CustomButton from '../../primitives/CustomButton/CustomButton'
import InputContainer from '../../primitives/InputContainer/InputContainer'
import UserAvatar from '../../primitives/UserAvatar/UserAvatar'
import { useNotify } from '../../providers/notify'
import type { ProfileFormType } from '../../../core/forms'

interface Props {
  userId: string
  name: string
  avatar: string | null
}

const ProfileForm = ({ userId, name, avatar }: Props) => {
  const { t, translate } = useT()
  const { actions } = useCms()
  const supabase = useBrowserSupabase()
  const router = useRouter()
  const notify = useNotify()
  const inputRef = useRef<HTMLInputElement>(null)
  const [photoBusy, setPhotoBusy] = useState(false)

  const formik = useFormik<ProfileFormType>({
    initialValues: { name },
    validate: useFormValidation(validateProfile),
    validateOnChange: false,
    validateOnBlur: false,
    enableReinitialize: true,
    onSubmit: async values => {
      const result = await actions.updateProfile(values)
      if (result.error) return notify({ severity: 'error', summary: translate(result.error) })
      notify({ severity: 'success', summary: t('account.nameSaved') })
      router.refresh()
    }
  })

  const savePhoto = async (path: string | null) => {
    const result = await actions.updateAvatar(path)
    if (result.error) return notify({ severity: 'error', summary: translate(result.error) })
    notify({ severity: 'success', summary: path ? t('account.photoSaved') : t('account.photoRemoved') })
    router.refresh()
  }

  const uploadPhoto = async (file: File) => {
    if (!isImageMime(file.type) || file.type === 'image/gif') return notify({ severity: 'error', summary: t('account.photoType') })
    setPhotoBusy(true)
    try {
      const processed = await processImage(file, AVATAR_SIZE)
      const path = buildAvatarPath(userId, processed.mime)
      const { error } = await supabase.storage.from(MEDIA_BUCKET)
        .upload(path, processed.blob, { contentType: processed.mime, cacheControl: '31536000', upsert: false })
      if (error) throw error
      await savePhoto(path)
    } catch {
      notify({ severity: 'error', summary: t('account.photoUploadFailed') })
    } finally {
      setPhotoBusy(false)
    }
  }

  return (
    <div className='ProfileForm'>
      <div className='ProfileForm__Photo'>
        <UserAvatar name={formik.values.name || name} avatar={avatar} size='large' />
        <div className='flex flex-wrap gap-2'>
          <CustomButton type='button' variant='secondary' size='sm' loading={photoBusy} onClick={() => inputRef.current?.click()}>
            <i className='pi pi-camera' aria-hidden='true' />
            {avatar ? t('account.changePhoto') : t('account.uploadPhoto')}
          </CustomButton>
          {avatar && (
            <CustomButton type='button' variant='ghost' size='sm' disabled={photoBusy} onClick={() => savePhoto(null)}>
              {t('account.removePhoto')}
            </CustomButton>
          )}
        </div>
        <input
          ref={inputRef}
          type='file'
          accept='image/jpeg,image/png,image/webp'
          className='sr-only'
          aria-label={t('account.choosePhoto')}
          onChange={event => {
            const file = event.target.files?.[0]
            if (file) uploadPhoto(file)
            event.target.value = ''
          }}
        />
      </div>

      <form className='ProfileForm__Form' onSubmit={submitWithFocus(formik, ['name'])} noValidate>
        <InputContainer label={t('account.name')} htmlFor='name' error={formik.touched.name ? formik.errors.name : undefined}>
          <InputText
            id='name'
            name='name'
            autoComplete='name'
            maxLength={NAME_MAX_LENGTH}
            value={formik.values.name}
            onChange={formik.handleChange}
            invalid={!!(formik.touched.name && formik.errors.name)}
          />
        </InputContainer>
        <CustomButton type='submit' size='sm' className='self-start' loading={formik.isSubmitting} disabled={formik.values.name === name}>
          {t('account.saveName')}
        </CustomButton>
      </form>
    </div>
  )
}

export default ProfileForm
