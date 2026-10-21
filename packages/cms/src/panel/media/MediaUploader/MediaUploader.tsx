'use client'
import './MediaUploader.sass'
import Image from 'next/image'
import { Dropdown } from 'primereact/dropdown'
import { InputText } from 'primereact/inputtext'
import { ProgressBar } from 'primereact/progressbar'
import { classNames } from 'primereact/utils'
import { useEffect, useRef, useState } from 'react'
import { languageName } from '../../../core/i18n/translator'
import { buildMediaPath, formatBytes, isImageMime, MAX_MEDIA_BYTES, MEDIA_MIME_TYPES } from '../../../core/media'
import { useCms, useT } from '../../client/context'
import { useBrowserSupabase } from '../../client/supabase'
import { useText } from '../../fields/fieldUtils'
import CustomButton from '../../primitives/CustomButton/CustomButton'
import InputContainer from '../../primitives/InputContainer/InputContainer'
import Notice from '../../primitives/Notice/Notice'
import { sha256Hex } from '../hashBlob'
import processImage from '../processImage'
import uploadToStorage, { UploadError } from '../uploadToStorage'
import type { MediaItemType } from '../../../core/media'
import type { DragEvent } from 'react'

interface Props {
  defaultFolder?: string
  accept?: 'image' | 'document' | 'any'
  onUploaded: (items: MediaItemType[]) => void
}

interface QueueItemType {
  key: string
  file: File
  previewUrl: string | null
  alt: string
  // checking: hashing and asking the library; duplicate: the same bytes are already there.
  status: 'checking' | 'ready' | 'duplicate' | 'uploading' | 'done' | 'error'
  progress: number
  error: string | null
  hash: string | null
  existing: MediaItemType | null
}

// Raw photos are compressed before upload; this only guards the browser against huge files.
const MAX_RAW_IMAGE_BYTES = 50 * 1024 * 1024

const MAX_MB = MAX_MEDIA_BYTES / 1024 / 1024

const ACCEPT = {
  image: 'image/jpeg,image/png,image/webp,image/avif,image/gif',
  document: 'application/pdf',
  any: MEDIA_MIME_TYPES.join(',')
}

const UPLOAD_ERRORS = {
  tooLarge: 'media.uploader.errors.storageTooLarge',
  failed: 'media.uploader.errors.failed',
  network: 'media.uploader.errors.network'
} as const

class ReadableError extends Error {}

const rejectReason = (file: File, accept: Props['accept']) => {
  if (!MEDIA_MIME_TYPES.includes(file.type)) return 'media.uploader.errors.invalidType'
  if (accept === 'image' && !isImageMime(file.type)) return 'media.uploader.errors.onlyImages'
  if (accept === 'document' && isImageMime(file.type)) return 'media.uploader.errors.onlyDocuments'
  if (isImageMime(file.type) ? file.size > MAX_RAW_IMAGE_BYTES : file.size > MAX_MEDIA_BYTES) return 'media.uploader.errors.tooLarge'
  return null
}

const MediaUploader = ({ defaultFolder, accept = 'any', onUploaded }: Props) => {
  const { t, translate } = useT()
  const { config, actions, supabase } = useCms()
  const browserSupabase = useBrowserSupabase()
  const text = useText()
  const [folder, setFolder] = useState(defaultFolder ?? config.mediaFolders[0]?.value ?? '')
  const [queue, setQueue] = useState<QueueItemType[]>([])
  const [rejected, setRejected] = useState<string[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  // Library files the user chose instead of uploading a copy; handed over with the uploads.
  const [reused, setReused] = useState<MediaItemType[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const previewUrls = useRef<string[]>([])
  const folderOptions = config.mediaFolders.map(option => ({ value: option.value, label: text(option.label) }))
  const altLabel = config.locales.length > 1
    ? t('media.texts.altIn', { language: languageName(config.defaultLocale, config.panelLocale) })
    : t('media.texts.alt')

  useEffect(() => () => previewUrls.current.forEach(url => URL.revokeObjectURL(url)), [])

  useEffect(() => {
    if (queue.length === 0 && reused.length > 0) {
      setReused([])
      onUploaded(reused)
    }
  }, [queue, reused])

  const remove = (key: string) => setQueue(current => current.filter(item => {
    if (item.key === key && item.previewUrl) URL.revokeObjectURL(item.previewUrl)
    return item.key !== key
  }))

  const patch = (key: string, changes: Partial<QueueItemType>) =>
    setQueue(current => current.map(item => (item.key === key ? { ...item, ...changes } : item)))

  const trackPreview = (url: string) => {
    previewUrls.current.push(url)
    return url
  }

  const addFiles = (files: FileList | File[]) => {
    const errors: string[] = []
    const added = [...files].flatMap(file => {
      const reason = rejectReason(file, accept)
      if (reason) {
        errors.push(t('media.uploader.rejected', { name: file.name, reason: translate(reason, { max: MAX_MB }) }))
        return []
      }
      return [{
        key: crypto.randomUUID(),
        file,
        previewUrl: isImageMime(file.type) ? trackPreview(URL.createObjectURL(file)) : null,
        alt: '',
        status: 'checking' as const,
        progress: 0,
        error: null,
        hash: null,
        existing: null
      }]
    })
    setRejected(errors)
    setQueue(current => [...current, ...added])
    added.forEach(item => void check(item))
  }

  // A failed lookup never blocks an upload: the file just goes up as new.
  const check = async (item: QueueItemType) => {
    const hash = await sha256Hex(item.file).catch(() => null)
    const existing = hash ? await actions.findMediaByHash(hash).catch(() => null) : null
    patch(item.key, { hash, existing, status: existing ? 'duplicate' : 'ready' })
  }

  const keepExisting = (item: QueueItemType) => {
    const found = item.existing
    if (found) setReused(current => (current.some(entry => entry.id === found.id) ? current : [...current, found]))
    remove(item.key)
  }

  const pending = queue.filter(item => item.status === 'ready' || item.status === 'error')
  const checking = queue.some(item => item.status === 'checking')
  const missingAlt = pending.some(item => isImageMime(item.file.type) && !item.alt.trim())

  // HEIC and other formats a browser can't decode fail here: surfaced as a readable error.
  const processSafely = async (file: File) => {
    try {
      return await processImage(file)
    } catch {
      throw new ReadableError(t('media.uploader.errors.unreadable'))
    }
  }

  const uploadOne = async (item: QueueItemType, accessToken: string): Promise<MediaItemType | null> => {
    patch(item.key, { status: 'uploading', progress: 0, error: null })
    try {
      const processed = await processSafely(item.file)
      if (processed.blob.size > MAX_MEDIA_BYTES) throw new ReadableError(t('media.uploader.errors.tooLargeCompressed', { max: MAX_MB }))

      const path = buildMediaPath(folder, processed.mime)
      await uploadToStorage({ supabase, path, blob: processed.blob, accessToken, onProgress: progress => patch(item.key, { progress }) })

      const result = await actions.registerMedia({
        path,
        filename: item.file.name,
        folder,
        alt: { [config.defaultLocale]: item.alt },
        caption: {},
        mime: processed.mime,
        size: processed.blob.size,
        width: processed.width,
        height: processed.height,
        blurDataUrl: processed.blurDataUrl,
        hash: item.hash
      })
      if (!result.ok) throw new ReadableError(translate(result.error, { max: MAX_MB }))

      patch(item.key, { status: 'done', progress: 1 })
      return result.item
    } catch (error) {
      const message = error instanceof ReadableError
        ? error.message
        : t(error instanceof UploadError ? UPLOAD_ERRORS[error.reason] : 'media.uploader.errors.failed')
      patch(item.key, { status: 'error', error: message })
      return null
    }
  }

  const uploadAll = async () => {
    setIsUploading(true)
    const { data } = await browserSupabase.auth.getSession()
    const token = data.session?.access_token
    const uploaded: MediaItemType[] = []

    for (const item of pending) {
      if (!token) {
        patch(item.key, { status: 'error', error: t('media.uploader.errors.sessionExpired') })
        continue
      }
      const result = await uploadOne(item, token)
      if (result) uploaded.push(result)
    }

    setIsUploading(false)
    const results = [...uploaded, ...reused]
    setReused([])
    setQueue(current => current.filter(item => item.status !== 'done'))
    if (results.length) onUploaded(results)
  }

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsDragging(false)
    addFiles(event.dataTransfer.files)
  }

  return (
    <div className='MediaUploader'>
      <div
        className={classNames('MediaUploader__Drop', { 'MediaUploader__Drop--Active': isDragging })}
        onDragOver={event => {
          event.preventDefault()
          setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
      >
        <i className='pi pi-cloud-upload MediaUploader__DropIcon' aria-hidden='true' />
        <p className='MediaUploader__DropText'>{t('media.uploader.dropHere')}</p>
        <CustomButton type='button' variant='secondary' size='sm' onClick={() => inputRef.current?.click()}>
          {t('media.uploader.choose')}
        </CustomButton>
        <p className='MediaUploader__Hint'>{t('media.uploader.hint', { max: MAX_MB })}</p>
        <input
          ref={inputRef}
          type='file'
          multiple
          accept={ACCEPT[accept]}
          className='sr-only'
          aria-label={t('media.uploader.inputLabel')}
          onChange={event => {
            if (event.target.files) addFiles(event.target.files)
            event.target.value = ''
          }}
        />
      </div>

      {rejected.length > 0 && (
        <Notice tone='error'>
          <ul>
            {rejected.map(message => <li key={message}>{message}</li>)}
          </ul>
        </Notice>
      )}

      {queue.length > 0 && (
        <>
          <InputContainer label={t('media.texts.folder')} htmlFor='media-upload-folder' error={undefined}>
            <Dropdown
              inputId='media-upload-folder'
              value={folder}
              options={folderOptions}
              disabled={isUploading}
              onChange={event => setFolder(event.value)}
            />
          </InputContainer>

          <ul className='MediaUploader__Queue'>
            {queue.map(item => {
              const isImage = isImageMime(item.file.type)
              const altId = `alt-${item.key}`
              return (
                <li key={item.key} className='MediaUploader__Item'>
                  <div className='MediaUploader__Preview'>
                    {item.previewUrl
                      // Local blob: previews can't go through the image optimizer.
                      ? <Image src={item.previewUrl} alt='' fill sizes='96px' unoptimized className='MediaUploader__Thumb' />
                      : <i className='pi pi-file-pdf MediaUploader__PdfIcon' aria-hidden='true' />}
                  </div>
                  <div className='MediaUploader__Body'>
                    <p className='MediaUploader__Name'>{item.file.name} · {formatBytes(item.file.size)}</p>
                    {isImage && (
                      <InputContainer label={`${altLabel} *`} htmlFor={altId} help={t('media.texts.altHelp')} error={undefined}>
                        <InputText
                          id={altId}
                          value={item.alt}
                          maxLength={300}
                          autoComplete='off'
                          disabled={item.status === 'uploading' || item.status === 'done'}
                          placeholder={t('media.texts.altPlaceholder')}
                          aria-describedby={`${altId}-help`}
                          onChange={event => patch(item.key, { alt: event.target.value })}
                        />
                      </InputContainer>
                    )}
                    {item.status === 'checking' && <p className='MediaUploader__Meta'>{t('media.uploader.checking')}</p>}
                    {item.status === 'duplicate' && item.existing && (
                      <div className='MediaUploader__Duplicate'>
                        <p>{t('media.uploader.duplicate', { name: item.existing.alt[config.defaultLocale] || item.existing.filename })}</p>
                        <div className='MediaUploader__DuplicateActions'>
                          <CustomButton type='button' size='xs' onClick={() => keepExisting(item)}>{t('media.uploader.useExisting')}</CustomButton>
                          <CustomButton type='button' size='xs' variant='secondary' onClick={() => patch(item.key, { status: 'ready' })}>{t('media.uploader.uploadAnyway')}</CustomButton>
                        </div>
                      </div>
                    )}
                    {item.status === 'uploading' && <ProgressBar value={Math.round(item.progress * 100)} className='MediaUploader__Progress' />}
                    {item.error && <p role='alert' className='MediaUploader__Error'>{item.error}</p>}
                  </div>
                  <CustomButton
                    type='button'
                    variant='ghost'
                    size='sm'
                    iconOnly
                    icon='pi pi-times'
                    aria-label={t('media.uploader.remove', { name: item.file.name })}
                    disabled={item.status === 'uploading'}
                    onClick={() => remove(item.key)}
                  />
                </li>
              )
            })}
          </ul>

          <div className='MediaUploader__Footer'>
            {missingAlt && <p className='MediaUploader__Blocked'>{t('media.uploader.missingAlt')}</p>}
            <CustomButton type='button' disabled={missingAlt || pending.length === 0 || !folder || checking} loading={isUploading} onClick={uploadAll}>
              <i className='pi pi-upload' aria-hidden='true' />
              {t('media.uploader.submit', { count: pending.length })}
            </CustomButton>
          </div>
        </>
      )}
    </div>
  )
}

export default MediaUploader
