'use client'
import './MediaDetails.sass'
import Link from 'next/link'
import { Dialog } from 'primereact/dialog'
import { Dropdown } from 'primereact/dropdown'
import { InputText } from 'primereact/inputtext'
import { InputTextarea } from 'primereact/inputtextarea'
import { useEffect, useState } from 'react'
import { languageName } from '../../../core/i18n/translator'
import { formatBytes, isImageMime, MAX_MEDIA_BYTES } from '../../../core/media'
import { useCms, useFormatDate, useT } from '../../client/context'
import { useText } from '../../fields/fieldUtils'
import { useConfirm } from '../../primitives/ConfirmAction/ConfirmAction'
import CustomButton from '../../primitives/CustomButton/CustomButton'
import DialogFooter from '../../primitives/DialogFooter/DialogFooter'
import InputContainer from '../../primitives/InputContainer/InputContainer'
import Loader from '../../primitives/Loader/Loader'
import Notice from '../../primitives/Notice/Notice'
import { useNotify } from '../../providers/notify'
import FocalPointPicker from '../FocalPointPicker/FocalPointPicker'
import { useMediaLocales } from '../mediaText'
import type { MediaItemType } from '../../../core/media'
import type { MediaUsageType } from '../../../server/media'
import type { Route } from 'next'

interface Props {
  item: MediaItemType
  canPurge: boolean
  onChanged: (item: MediaItemType) => void
  onRemoved: (id: string) => void
  onHide: () => void
}

// Mounted per opened item, so the form always starts from that item's values.
const MediaDetails = ({ item, canPurge, onChanged, onRemoved, onHide }: Props) => {
  const { t, translate } = useT()
  const { config, actions } = useCms()
  const notify = useNotify()
  const confirm = useConfirm()
  const formatDate = useFormatDate()
  const text = useText()
  const locales = useMediaLocales()
  const [alt, setAlt] = useState<Record<string, string>>({ ...item.alt })
  const [caption, setCaption] = useState<Record<string, string>>({ ...item.caption })
  const [folder, setFolder] = useState(item.folder)
  const [focal, setFocal] = useState({ x: item.focalX, y: item.focalY })
  const [error, setError] = useState<string>()
  const [isSaving, setIsSaving] = useState(false)
  // null while loading.
  const [usage, setUsage] = useState<MediaUsageType[] | null>(null)
  const isImage = isImageMime(item.mime)
  const inTrash = !!item.deletedAt
  const inUse = !!usage && usage.length > 0
  const multilingual = locales.length > 1
  const folderOptions = config.mediaFolders.map(option => ({ value: option.value, label: text(option.label) }))

  useEffect(() => {
    void actions.getMediaUsage(item.id).then(setUsage)
  }, [item.id])

  const altLabel = (locale: string) => {
    const language = languageName(locale, config.panelLocale)
    const label = isImage
      ? (multilingual ? t('media.texts.altIn', { language }) : t('media.texts.alt'))
      : (multilingual ? t('media.texts.descriptionIn', { language }) : t('media.texts.description'))
    return isImage && locale === config.defaultLocale ? `${label} *` : label
  }

  const captionLabel = (locale: string) =>
    (multilingual ? t('media.texts.captionIn', { language: languageName(locale, config.panelLocale) }) : t('media.texts.caption'))

  const save = async () => {
    setIsSaving(true)
    const result = await actions.updateMedia(item.id, { alt, caption, folder, focalX: focal.x, focalY: focal.y })
    setIsSaving(false)
    if (!result.ok) {
      setError(translate(result.error, { max: MAX_MEDIA_BYTES / 1024 / 1024 }))
      return
    }
    notify({ severity: 'success', summary: t('media.details.saved') })
    onChanged(result.item)
    onHide()
  }

  const toggleTrash = async () => {
    const result = inTrash ? await actions.restoreMedia(item.id) : await actions.trashMedia(item.id)
    if (!result.ok) {
      if (result.usage.length > 0) setUsage(result.usage)
      notify({ severity: 'error', summary: result.usage.length > 0 ? t('media.details.inUse') : t('media.details.actionFailed') })
      return
    }
    notify({ severity: 'success', summary: inTrash ? t('media.details.restored') : t('media.details.trashed') })
    onRemoved(item.id)
    onHide()
  }

  const askPurge = () => confirm({
    header: t('media.details.purgeHeader'),
    message: t('media.details.purgeMessage'),
    acceptLabel: t('media.details.purge'),
    tone: 'danger',
    accept: async () => {
      const result = await actions.purgeMedia(item.id)
      if (!result.ok) {
        if (result.usage.length > 0) setUsage(result.usage)
        notify({ severity: 'error', summary: result.usage.length > 0 ? t('media.details.inUse') : t('media.details.purgeFailed') })
        return
      }
      onRemoved(item.id)
      onHide()
    }
  })

  const meta = [
    formatBytes(item.size),
    item.width && item.height ? t('media.details.dimensions', { width: item.width, height: item.height }) : null,
    t('media.details.uploadedOn', { date: formatDate(item.createdAt, 'date') })
  ].filter(Boolean).join(' · ')

  return (
    <Dialog
      visible
      header={item.filename || t('media.details.fallbackTitle')}
      modal
      dismissableMask
      className='MediaDetails'
      onHide={onHide}
      footer={(
        <DialogFooter
          start={inTrash && canPurge && (
            <CustomButton type='button' variant='danger' disabled={usage === null || inUse} onClick={askPurge}>
              <i className='pi pi-trash' aria-hidden='true' />
              {t('media.details.purge')}
            </CustomButton>
          )}
        >
          <CustomButton type='button' variant='secondary' disabled={!inTrash && (usage === null || inUse)} onClick={toggleTrash}>
            <i className={inTrash ? 'pi pi-replay' : 'pi pi-trash'} aria-hidden='true' />
            {inTrash ? t('media.details.restore') : t('media.library.trash')}
          </CustomButton>
          {!inTrash && <CustomButton type='button' loading={isSaving} onClick={save}>{t('media.details.save')}</CustomButton>}
        </DialogFooter>
      )}
    >
      <div className='MediaDetails__Layout'>
        <div className='MediaDetails__Preview'>
          {isImage && item.width && item.height ? (
            <FocalPointPicker
              src={item.url}
              width={item.width}
              height={item.height}
              x={focal.x}
              y={focal.y}
              onChange={(x, y) => setFocal({ x, y })}
            />
          ) : (
            <a href={item.url} target='_blank' rel='noopener noreferrer' className='MediaDetails__Pdf'>
              <i className='pi pi-file-pdf' aria-hidden='true' />
              {t('media.details.openPdf')}
            </a>
          )}
          <p className='MediaDetails__Meta'>{meta}</p>
          {isImage && <p className='MediaDetails__Meta'>{t('media.details.focalHelp')}</p>}
        </div>

        <div className='MediaDetails__Form'>
          {error && <Notice tone='error'>{error}</Notice>}
          {locales.map((locale, index) => {
            const id = `media-alt-${locale}`
            const withHelp = isImage && index === 0
            return (
              <InputContainer key={id} label={altLabel(locale)} htmlFor={id} help={withHelp ? t('media.texts.altHelp') : undefined} error={undefined}>
                <InputTextarea
                  id={id}
                  value={alt[locale] ?? ''}
                  rows={3}
                  maxLength={300}
                  autoResize
                  disabled={inTrash}
                  aria-describedby={withHelp ? `${id}-help` : undefined}
                  onChange={event => setAlt(current => ({ ...current, [locale]: event.target.value }))}
                />
              </InputContainer>
            )
          })}
          {locales.map(locale => {
            const id = `media-caption-${locale}`
            return (
              <InputContainer key={id} label={captionLabel(locale)} htmlFor={id} error={undefined}>
                <InputText
                  id={id}
                  value={caption[locale] ?? ''}
                  maxLength={300}
                  autoComplete='off'
                  disabled={inTrash}
                  onChange={event => setCaption(current => ({ ...current, [locale]: event.target.value }))}
                />
              </InputContainer>
            )
          })}
          <InputContainer label={t('media.texts.folder')} htmlFor='media-folder' error={undefined}>
            <Dropdown inputId='media-folder' value={folder} options={folderOptions} disabled={inTrash} onChange={event => setFolder(event.value)} />
          </InputContainer>
          <div className='MediaDetails__Usage' aria-busy={usage === null}>
            <p className='MediaDetails__UsageTitle'>{t('media.details.usageTitle')}</p>
            {usage === null ? (
              <Loader />
            ) : usage.length === 0 ? (
              <p className='MediaDetails__Meta'>{t('media.details.unused')}</p>
            ) : (
              <>
                <ul className='MediaDetails__UsageList'>
                  {usage.map(place => (
                    <li key={place.documentId}>
                      <Link href={place.href as Route} className='MediaDetails__UsageLink'>{place.label}</Link>
                      {place.trashed && <span className='MediaDetails__Meta'> · {t('media.details.usageTrashed')}</span>}
                      {place.onlyPublished && <span className='MediaDetails__Meta'> · {t('media.details.usageOnlyPublished')}</span>}
                    </li>
                  ))}
                </ul>
                <Notice tone='warning'>
                  {inTrash ? t('media.details.blockedPurge') : t('media.details.blockedTrash')}
                </Notice>
              </>
            )}
          </div>
          <InputContainer label={t('media.details.url')} htmlFor='media-url' error={undefined}>
            <div className='flex gap-2'>
              <InputText id='media-url' value={item.url} readOnly className='MediaDetails__Url' />
              <CustomButton
                type='button'
                variant='secondary'
                iconOnly
                icon='pi pi-copy'
                aria-label={t('media.details.copyUrl')}
                onClick={async () => {
                  await navigator.clipboard.writeText(item.url)
                  notify({ severity: 'info', summary: t('media.details.copied') })
                }}
              />
            </div>
          </InputContainer>
        </div>
      </div>
    </Dialog>
  )
}

export default MediaDetails
