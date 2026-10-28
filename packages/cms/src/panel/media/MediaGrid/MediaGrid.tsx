'use client'
import './MediaGrid.sass'
import Image from 'next/image'
import { classNames } from 'primereact/utils'
import { languageName } from '../../../core/i18n/translator'
import { isImageMime, missingAltLocales } from '../../../core/media'
import { useCms, useT } from '../../client/context'
import { useMediaText } from '../mediaText'
import type { MediaItemType } from '../../../core/media'

interface Props {
  items: MediaItemType[]
  selectable?: boolean
  selectedIds?: string[]
  onActivate: (item: MediaItemType) => void
}

const MediaGrid = ({ items, selectable = false, selectedIds = [], onActivate }: Props) => {
  const { t } = useT()
  const { config } = useCms()
  const mediaText = useMediaText()

  return (
    <ul className='MediaGrid'>
      {items.map(item => {
        const selected = selectedIds.includes(item.id)
        const alt = mediaText(item.alt)
        const lacking = isImageMime(item.mime) ? missingAltLocales(config, item.alt) : []
        return (
          <li key={item.id}>
            <button
              type='button'
              aria-pressed={selectable ? selected : undefined}
              className={classNames('MediaGrid__Item', { 'MediaGrid__Item--Selected': selected })}
              onClick={() => onActivate(item)}
            >
              <span className='MediaGrid__Thumb'>
                {isImageMime(item.mime) ? (
                  <Image
                    src={item.url}
                    alt={alt}
                    fill
                    sizes='(min-width: 1024px) 180px, 45vw'
                    placeholder={item.blurDataUrl ? 'blur' : 'empty'}
                    blurDataURL={item.blurDataUrl ?? undefined}
                    className='MediaGrid__Image'
                  />
                ) : (
                  <i className='pi pi-file-pdf MediaGrid__Pdf' aria-hidden='true' />
                )}
                {selected && <i className='pi pi-check MediaGrid__Check' aria-hidden='true' />}
              </span>
              <span className='MediaGrid__Name'>{item.filename || alt || t('media.untitled')}</span>
              {lacking.length > 0 && (
                <span className='MediaGrid__Missing'>
                  <span aria-hidden='true'>{t('media.library.altMissingShort', { locales: lacking.map(code => code.toUpperCase()).join(' · ') })}</span>
                  <span className='sr-only'>
                    {t('media.library.altMissingIn', { languages: lacking.map(code => languageName(code, config.panelLocale)).join(', ') })}
                  </span>
                </span>
              )}
            </button>
          </li>
        )
      })}
    </ul>
  )
}

export default MediaGrid
