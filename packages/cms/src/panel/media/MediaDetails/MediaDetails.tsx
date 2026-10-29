'use client'
import './MediaDetails.sass'
import Image from 'next/image'
import Link from 'next/link'
import { Dialog } from 'primereact/dialog'
import { Dropdown } from 'primereact/dropdown'
import { InputText } from 'primereact/inputtext'
import { InputTextarea } from 'primereact/inputtextarea'
import { useEffect, useRef, useState } from 'react'
import { languageName } from '../../../core/i18n/translator'
import { buildMediaPath, EGRESS_SAMPLE_PLAYS, egressGigabytes, formatBytes, formatDuration, isImageMime, isVideoMime, MAX_MEDIA_BYTES, missingAltLocales } from '../../../core/media'
import { useCms, useFormatDate, useT } from '../../client/context'
import { useBrowserSupabase } from '../../client/supabase'
import { useText } from '../../fields/fieldUtils'
import { useConfirm } from '../../primitives/ConfirmAction/ConfirmAction'
import CustomButton from '../../primitives/CustomButton/CustomButton'
import DialogFooter from '../../primitives/DialogFooter/DialogFooter'
import InputContainer from '../../primitives/InputContainer/InputContainer'
import Loader from '../../primitives/Loader/Loader'
import Notice from '../../primitives/Notice/Notice'
import { useNotify } from '../../providers/notify'
import { capturePoster } from '../capturePoster'
import FocalPointPicker from '../FocalPointPicker/FocalPointPicker'
import MediaPicker from '../MediaPicker/MediaPicker'
import { useMediaLocales } from '../mediaText'
import uploadToStorage from '../uploadToStorage'
import type { MediaItemType } from '../../../core/media'
import type { MediaUsageType } from '../../../server/media'
import type { Route } from 'next'

interface Props {
  item: MediaItemType
  canPurge: boolean
  onChanged: (item: MediaItemType) => void
  onRemoved: (id: string) => void
  onHide: () => void
  // Opens on the alt text of this language: the one a field said was missing.
  focusLocale?: string
}

// Mounted per opened item, so the form always starts from that item's values.
const MediaDetails = ({ item, canPurge, onChanged, onRemoved, onHide, focusLocale }: Props) => {
  const { t, translate } = useT()
  const { config, actions, supabase } = useCms()
  const notify = useNotify()
  const confirm = useConfirm()
  const formatDate = useFormatDate()
  const formatNumber = (value: number) => new Intl.NumberFormat(config.panelLocale, { useGrouping: 'always' }).format(value)
  const text = useText()
  const locales = useMediaLocales()
  const browserSupabase = useBrowserSupabase()
  const videoRef = useRef<HTMLVideoElement>(null)
  const [alt, setAlt] = useState<Record<string, string>>({ ...item.alt })
  const [caption, setCaption] = useState<Record<string, string>>({ ...item.caption })
  const [folder, setFolder] = useState(item.folder)
  const [focal, setFocal] = useState({ x: item.focalX, y: item.focalY })
  const [poster, setPoster] = useState<{ id: string, url: string } | null>(item.posterId && item.posterUrl ? { id: item.posterId, url: item.posterUrl } : null)
  const [isPickingPoster, setIsPickingPoster] = useState(false)
  const [isCapturing, setIsCapturing] = useState(false)
  const [error, setError] = useState<string>()
  const [isSaving, setIsSaving] = useState(false)
  const [isMoving, setIsMoving] = useState(false)
  // null while loading; 'failed' when the lookup broke (the server still refuses to trash a file in use).
  const [usage, setUsage] = useState<MediaUsageType[] | null | 'failed'>(null)
  const isImage = isImageMime(item.mime)
  const isVideo = isVideoMime(item.mime)
  const inTrash = !!item.deletedAt
  const inUse = Array.isArray(usage) && usage.length > 0
  const usageKnown = usage !== null
  const multilingual = locales.length > 1
  const lacking = isImage ? missingAltLocales(config, alt) : []
  const folderOptions = config.mediaFolders.map(option => ({ value: option.value, label: text(option.label) }))

  const loadUsage = () => {
    setUsage(null)
    actions.getMediaUsage(item.id).then(setUsage, () => setUsage('failed'))
  }

  useEffect(loadUsage, [item.id])

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
    const result = await actions.updateMedia(item.id, { alt, caption, folder, focalX: focal.x, focalY: focal.y, ...(isVideo ? { posterId: poster?.id ?? null } : {}) })
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
    setIsMoving(true)
    const result = await (inTrash ? actions.restoreMedia(item.id) : actions.trashMedia(item.id)).finally(() => setIsMoving(false))
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
      notify({ severity: 'success', summary: t('media.details.purged') })
      onRemoved(item.id)
      onHide()
    }
  })

  // The frame on screen becomes an image of the library, in the video's folder, and its poster.
  const captureFrame = async () => {
    const video = videoRef.current
    if (!video) return
    setIsCapturing(true)
    try {
      const frame = await capturePoster(video)
      const { data } = await browserSupabase.auth.getSession()
      const token = data.session?.access_token
      if (!token) throw new Error('No session')
      const path = buildMediaPath(item.folder, frame.mime)
      await uploadToStorage({ supabase, path, blob: frame.blob, accessToken: token })
      const name = item.filename || t('media.details.fallbackTitle')
      const result = await actions.registerMedia({
        path,
        filename: `${name.replace(/\.[a-z0-9]+$/i, '')}-poster.webp`,
        folder: item.folder,
        alt: { [config.defaultLocale]: t('media.details.posterAlt', { name }) },
        caption: {},
        mime: frame.mime,
        size: frame.blob.size,
        width: frame.width,
        height: frame.height,
        blurDataUrl: frame.blurDataUrl,
        hash: null
      })
      if (!result.ok) throw new Error(result.error)
      setPoster({ id: result.item.id, url: result.item.url })
      notify({ severity: 'success', summary: t('media.details.posterCaptured') })
    } catch {
      notify({ severity: 'error', summary: t('media.details.posterCaptureFailed') })
    } finally {
      setIsCapturing(false)
    }
  }

  const meta = [
    formatBytes(item.size),
    item.width && item.height ? t('media.details.dimensions', { width: item.width, height: item.height }) : null,
    isVideo && item.duration !== null ? t('media.details.duration', { duration: formatDuration(item.duration) }) : null,
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
      onShow={() => focusLocale && document.getElementById(`media-alt-${focusLocale}`)?.focus()}
      footer={(
        <DialogFooter
          start={inTrash && canPurge && (
            <CustomButton type='button' variant='danger' disabled={!usageKnown || inUse} onClick={askPurge}>
              <i className='pi pi-trash' aria-hidden='true' />
              {t('media.details.purge')}
            </CustomButton>
          )}
        >
          <CustomButton type='button' variant='secondary' disabled={!inTrash && (!usageKnown || inUse)} loading={isMoving} onClick={toggleTrash}>
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
          ) : isVideo ? (
            // eslint-disable-next-line jsx-a11y/media-has-caption -- editors' own videos; captions are the site's job.
            <video
              ref={videoRef}
              src={item.url}
              poster={poster?.url}
              controls
              preload='metadata'
              playsInline
              crossOrigin='anonymous'
              className='MediaDetails__Video'
            />
          ) : (
            <a href={item.url} target='_blank' rel='noopener noreferrer' className='MediaDetails__Pdf'>
              <i className='pi pi-file-pdf' aria-hidden='true' />
              {t('media.details.openPdf')}
            </a>
          )}
          <p className='MediaDetails__Meta'>{meta}</p>
          {isImage && <p className='MediaDetails__Meta'>{t('media.details.focalHelp')}</p>}
          {isVideo && (
            <p className='MediaDetails__Meta'>
              {t('media.details.egress', { plays: formatNumber(EGRESS_SAMPLE_PLAYS), gigabytes: formatNumber(egressGigabytes(item.size)) })}
              {' '}
              {t('media.details.egressHelp')}
            </p>
          )}
          {isVideo && !inTrash && (
            <div className='MediaDetails__Poster'>
              <p className='MediaDetails__UsageTitle'>
                {t('media.details.poster')}
                {!poster && <span className='MediaDetails__Missing'>{t('media.details.posterMissing')}</span>}
              </p>
              {poster && (
                <span className='MediaDetails__PosterThumb'>
                  <Image src={poster.url} alt='' fill sizes='160px' className='MediaDetails__PosterImage' />
                </span>
              )}
              <p className='MediaDetails__Meta'>{t('media.details.posterHelp')}</p>
              <div className='MediaDetails__PosterActions'>
                <CustomButton type='button' variant='secondary' size='sm' onClick={() => setIsPickingPoster(true)}>
                  <i className='pi pi-image' aria-hidden='true' />
                  {poster ? t('media.details.changePoster') : t('media.details.choosePoster')}
                </CustomButton>
                <CustomButton type='button' variant='secondary' size='sm' loading={isCapturing} onClick={captureFrame}>
                  <i className='pi pi-camera' aria-hidden='true' />
                  {t('media.details.capturePoster')}
                </CustomButton>
                {poster && (
                  <CustomButton type='button' variant='ghost' size='sm' onClick={() => setPoster(null)}>
                    <i className='pi pi-times' aria-hidden='true' />
                    {t('media.details.removePoster')}
                  </CustomButton>
                )}
              </div>
            </div>
          )}
        </div>

        <div className='MediaDetails__Form'>
          {error && <Notice tone='error'>{error}</Notice>}
          {locales.map((locale, index) => {
            const id = `media-alt-${locale}`
            const withHelp = isImage && index === 0
            return (
              <InputContainer
                key={id}
                label={altLabel(locale)}
                htmlFor={id}
                help={withHelp ? t('media.texts.altHelp') : undefined}
                error={undefined}
                badge={lacking.includes(locale) && <span className='MediaDetails__Missing'>{t('media.texts.altMissing')}</span>}
              >
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
            ) : usage === 'failed' ? (
              <Notice tone='error' action={<CustomButton type='button' variant='secondary' size='sm' onClick={loadUsage}>{t('ui.retry')}</CustomButton>}>
                {t('media.details.usageFailed')}
              </Notice>
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
                  try {
                    await navigator.clipboard.writeText(item.url)
                    notify({ severity: 'info', summary: t('media.details.copied') })
                  } catch {
                    notify({ severity: 'error', summary: t('media.details.copyFailed') })
                  }
                }}
              />
            </div>
          </InputContainer>
        </div>
      </div>

      {isPickingPoster && (
        <MediaPicker
          header={t('media.details.choosePoster')}
          accept='image'
          defaultFolder={item.folder}
          onHide={() => setIsPickingPoster(false)}
          onPick={([picked]) => {
            setPoster({ id: picked.id, url: picked.url })
            setIsPickingPoster(false)
          }}
        />
      )}
    </Dialog>
  )
}

export default MediaDetails
