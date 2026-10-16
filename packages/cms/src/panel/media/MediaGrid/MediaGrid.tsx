'use client'
import './MediaGrid.sass'
import Image from 'next/image'
import { classNames } from 'primereact/utils'
import { isImageMime } from '../../../core/media'
import { useT } from '../../client/context'
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
  const mediaText = useMediaText()

  return (
    <ul className='MediaGrid'>
      {items.map(item => {
        const selected = selectedIds.includes(item.id)
        const alt = mediaText(item.alt)
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
                    style={{ objectPosition: `${(item.focalX ?? 0.5) * 100}% ${(item.focalY ?? 0.5) * 100}%` }}
                  />
                ) : (
                  <i className='pi pi-file-pdf MediaGrid__Pdf' aria-hidden='true' />
                )}
                {selected && <i className='pi pi-check MediaGrid__Check' aria-hidden='true' />}
              </span>
              <span className='MediaGrid__Name'>{item.filename || alt || t('media.untitled')}</span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}

export default MediaGrid
