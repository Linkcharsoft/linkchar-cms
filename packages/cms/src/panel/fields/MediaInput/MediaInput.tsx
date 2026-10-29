'use client'
import './MediaInput.sass'
import { useField } from 'formik'
import Image from 'next/image'
import { use, useState } from 'react'
import { languageName } from '../../../core/i18n/translator'
import { formatBytes, formatDuration, isImageMime, isVideoMime, mediaTypeOf } from '../../../core/media'
import { useCms, useT } from '../../client/context'
import MediaDetails from '../../media/MediaDetails/MediaDetails'
import MediaPicker from '../../media/MediaPicker/MediaPicker'
import { useMediaText } from '../../media/mediaText'
import { useConfirm } from '../../primitives/ConfirmAction/ConfirmAction'
import CustomButton from '../../primitives/CustomButton/CustomButton'
import InputContainer from '../../primitives/InputContainer/InputContainer'
import { navItems } from '../../shell/navigation'
import { EntryContext } from '../entryContext'
import { fieldId, useFieldError, useFieldLabel, useMediaVariant, useText } from '../fieldUtils'
import { LocaleBadge } from '../LocaleNote/LocaleNote'
import MissingAlt from '../MissingAlt/MissingAlt'
import { useMediaRegistry } from '../referencesContext'
import type { FileField, ImageField, VideoFileField } from '../../../core/fields'
import type { MediaItemType } from '../../../core/media'

interface Props {
  name: string
  field: ImageField | FileField | VideoFileField
}

const PICKS = { image: 'image', file: 'document', videoFile: 'video' } as const

const ICONS = { image: 'pi pi-image', file: 'pi pi-file-pdf', videoFile: 'pi pi-video' } as const

// One image, PDF or video by media id (alt, focal point and poster live on the item); other languages reuse the original.
const MediaInput = ({ name, field }: Props) => {
  const { t } = useT()
  const { config } = useCms()
  const { locale } = use(EntryContext)
  const text = useText()
  const label = useFieldLabel()
  const mediaText = useMediaText()
  const confirm = useConfirm()
  const variant = useMediaVariant(name)
  const [{ value }, , { setValue, setTouched }] = useField<string | null>(variant.path)
  const error = useFieldError(variant.path)
  const { media: known, remember } = useMediaRegistry()
  const [isPicking, setIsPicking] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const id = fieldId(name)
  const item = value ? known[value] : undefined
  const isImageField = field.kind === 'image'
  const kind = field.kind
  const fieldName = text(field.label)
  const language = languageName(locale || config.defaultLocale, config.panelLocale)
  const original = languageName(config.defaultLocale, config.panelLocale)
  // While translating only this language's alt text counts: the original's would hide that it's missing.
  const altShown = item ? (variant.translating ? item.alt[locale]?.trim() ?? '' : mediaText(item.alt)) : ''
  // Translating with the original on screen: picking gives this language its own file instead of replacing it.
  const inherited = variant.translating && !variant.overridden

  const commit = (next: MediaItemType | null) => {
    if (next) remember(next)
    if (inherited) {
      variant.override(next?.id ?? null)
      return
    }
    setValue(next?.id ?? null, true)
    setTouched(true, false)
  }

  const askRemove = () => confirm({
    header: t('mediaInput.removeHeader'),
    message: t('mediaInput.removeMessage', { title: item?.filename || mediaText(item?.alt ?? {}), label: fieldName }),
    acceptLabel: t('mediaInput.remove'),
    tone: 'danger',
    accept: () => commit(null)
  })

  const badge = variant.translating
    ? <LocaleBadge own={variant.overridden}>{variant.overridden ? t('mediaInput.onlyFor', { language }) : t('mediaInput.sameAs', { language: original })}</LocaleBadge>
    : null

  const pickButton = (
    <CustomButton
      id={id}
      type='button'
      variant='secondary'
      size={item ? 'sm' : undefined}
      aria-label={inherited
        ? t(`mediaInput.${kind}.overrideOf`, { language, label: fieldName })
        : item ? t(`mediaInput.${kind}.changeOf`, { label: fieldName }) : t(`mediaInput.${kind}.chooseFor`, { label: fieldName })}
      onClick={() => setIsPicking(true)}
    >
      <i className={item ? 'pi pi-sync' : ICONS[kind]} aria-hidden='true' />
      {inherited ? t(`mediaInput.${kind}.override`, { language }) : item ? t('mediaInput.change') : t(`mediaInput.${kind}.choose`)}
    </CustomButton>
  )

  const restoreButton = variant.overridden && (
    <CustomButton type='button' variant='ghost' size='sm' onClick={variant.restore}>
      <i className='pi pi-undo' aria-hidden='true' />
      {t(`mediaInput.${kind}.restore`)}
    </CustomButton>
  )

  return (
    <InputContainer label={label(field)} htmlFor={id} error={error} help={text(field.help)} badge={badge}>
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
                />
              ) : mediaTypeOf(item.mime) === 'video' && item.posterUrl ? (
                <Image src={item.posterUrl} alt='' fill sizes='240px' className='MediaInput__Image' />
              ) : (
                <i className={mediaTypeOf(item.mime) === 'video' ? 'pi pi-video MediaInput__Video' : 'pi pi-file-pdf MediaInput__Pdf'} aria-hidden='true' />
              )}
            </div>
            <div className='MediaInput__Info'>
              <p className='MediaInput__Name'>{item.filename || mediaText(item.alt)}</p>
              {isImageMime(item.mime)
                ? altShown && <p className='MediaInput__Meta'>{t('mediaInput.altText', { alt: altShown })}</p>
                : <p className='MediaInput__Meta'>{[formatBytes(item.size), item.duration !== null && t('media.details.duration', { duration: formatDuration(item.duration) })].filter(Boolean).join(' · ')}</p>}
              {variant.translating && isImageMime(item.mime) && <MissingAlt ids={[item.id]} />}
              {isVideoMime(item.mime) && !item.posterId && <p role='alert' className='MediaInput__Warning'>{t('mediaInput.posterMissing')}</p>}
              {item.deletedAt && (
                <p role='alert' className='MediaInput__Warning'>{t('mediaInput.trashed', { media: navItems(config).media.label })}</p>
              )}
              <div className='MediaInput__Actions'>
                {/* The field label points at this button (htmlFor), so it gets a name that keeps the action. */}
                {pickButton}
                <CustomButton type='button' variant='secondary' size='sm' onClick={() => setIsEditing(true)}>
                  <i className='pi pi-pencil' aria-hidden='true' />
                  {isImageField && field.focalPoint ? t('mediaInput.editAltAndFocal') : t('mediaInput.edit')}
                </CustomButton>
                {restoreButton}
                {!variant.translating && (
                  <CustomButton type='button' variant='ghost' size='sm' onClick={askRemove}>
                    <i className='pi pi-times' aria-hidden='true' />
                    {t('mediaInput.remove')}
                  </CustomButton>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className='MediaInput__Empty'>
            {value && <p role='alert' className='MediaInput__Warning'>{t('mediaInput.missing')}</p>}
            {inherited && !value && <p className='MediaInput__Meta'>{t(`mediaInput.${kind}.noOriginal`, { language: original })}</p>}
            <div className='MediaInput__Actions'>
              {pickButton}
              {restoreButton}
            </div>
          </div>
        )}
      </div>

      {isPicking && (
        <MediaPicker
          header={inherited ? t(`mediaInput.${kind}.override`, { language }) : t(`mediaInput.${kind}.choose`)}
          accept={PICKS[kind]}
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
