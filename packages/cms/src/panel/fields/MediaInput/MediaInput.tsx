'use client'
import './MediaInput.sass'
import { useField } from 'formik'
import Image from 'next/image'
import { useState } from 'react'
import { formatBytes, isImageMime } from '../../../core/media'
import { useCms, useT } from '../../client/context'
import MediaDetails from '../../media/MediaDetails/MediaDetails'
import MediaPicker from '../../media/MediaPicker/MediaPicker'
import { useMediaText } from '../../media/mediaText'
import CustomButton from '../../primitives/CustomButton/CustomButton'
import InputContainer from '../../primitives/InputContainer/InputContainer'
import { navItems } from '../../shell/navigation'
import { fieldId, useFieldError, useFieldLabel, useText, useValuePath } from '../fieldUtils'
import { useMediaRegistry } from '../referencesContext'
import type { FileField, ImageField } from '../../../core/fields'
import type { MediaItemType } from '../../../core/media'

interface Props {
  name: string
  field: ImageField | FileField
}

// Single image or PDF. Stores the media id; alt text and focal point are edited on the media item itself.
const MediaInput = ({ name, field }: Props) => {
  const { t } = useT()
  const { config } = useCms()
  const text = useText()
  const label = useFieldLabel()
  const mediaText = useMediaText()
  const path = useValuePath(name, field)
  const [{ value }, , { setValue, setTouched }] = useField<string | null>(path)
  const error = useFieldError(path)
  const { media: known, remember } = useMediaRegistry()
  const [isPicking, setIsPicking] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const id = fieldId(name)
  const item = value ? known[value] : undefined
  const isImageField = field.kind === 'image'
  const kind = isImageField ? 'image' : 'file'
  const fieldName = text(field.label)

  const commit = (next: MediaItemType | null) => {
    if (next) remember(next)
    setValue(next?.id ?? null)
    setTouched(true, false)
  }

  return (
    <InputContainer label={label(field)} htmlFor={id} error={error} help={text(field.help)}>
      <div className='MediaInput'>
        {item ? (
          <>
            <div className='MediaInput__Preview'>
              {isImageMime(item.mime) ? (
                <Image
                  src={item.url}
                  alt={mediaText(item.alt)}
                  fill
                  sizes='240px'
                  className='MediaInput__Image'
                  style={{ objectPosition: `${(item.focalX ?? 0.5) * 100}% ${(item.focalY ?? 0.5) * 100}%` }}
                />
              ) : (
                <i className='pi pi-file-pdf MediaInput__Pdf' aria-hidden='true' />
              )}
            </div>
            <div className='MediaInput__Info'>
              <p className='MediaInput__Name'>{item.filename || mediaText(item.alt)}</p>
              <p className='MediaInput__Meta'>
                {isImageMime(item.mime) ? t('mediaInput.altText', { alt: mediaText(item.alt) }) : formatBytes(item.size)}
              </p>
              {item.deletedAt && (
                <p role='alert' className='MediaInput__Warning'>{t('mediaInput.trashed', { media: navItems(config).media.label })}</p>
              )}
              <div className='MediaInput__Actions'>
                {/* The field label points at this button (htmlFor), so it gets a name that keeps the action. */}
                <CustomButton
                  id={id}
                  type='button'
                  variant='secondary'
                  size='sm'
                  aria-label={t(`mediaInput.${kind}.changeOf`, { label: fieldName })}
                  onClick={() => setIsPicking(true)}
                >
                  <i className='pi pi-sync' aria-hidden='true' />
                  {t('mediaInput.change')}
                </CustomButton>
                <CustomButton type='button' variant='secondary' size='sm' onClick={() => setIsEditing(true)}>
                  <i className='pi pi-pencil' aria-hidden='true' />
                  {isImageField && field.focalPoint ? t('mediaInput.editAltAndFocal') : t('mediaInput.edit')}
                </CustomButton>
                <CustomButton type='button' variant='ghost' size='sm' onClick={() => commit(null)}>
                  <i className='pi pi-times' aria-hidden='true' />
                  {t('mediaInput.remove')}
                </CustomButton>
              </div>
            </div>
          </>
        ) : (
          <div className='MediaInput__Empty'>
            {value && <p role='alert' className='MediaInput__Warning'>{t('mediaInput.missing')}</p>}
            <CustomButton
              id={id}
              type='button'
              variant='secondary'
              aria-label={t(`mediaInput.${kind}.chooseFor`, { label: fieldName })}
              onClick={() => setIsPicking(true)}
            >
              <i className={isImageField ? 'pi pi-image' : 'pi pi-file-pdf'} aria-hidden='true' />
              {t(`mediaInput.${kind}.choose`)}
            </CustomButton>
          </div>
        )}
      </div>

      {isPicking && (
        <MediaPicker
          header={t(`mediaInput.${kind}.choose`)}
          accept={isImageField ? 'image' : 'document'}
          defaultFolder={field.folder}
          onHide={() => setIsPicking(false)}
          onPick={([picked]) => {
            commit(picked)
            setIsPicking(false)
          }}
        />
      )}

      {isEditing && item && (
        <MediaDetails
          item={item}
          canPurge={false}
          onChanged={remember}
          onRemoved={() => remember({ ...item, deletedAt: new Date().toISOString() })}
          onHide={() => setIsEditing(false)}
        />
      )}
    </InputContainer>
  )
}

export default MediaInput
