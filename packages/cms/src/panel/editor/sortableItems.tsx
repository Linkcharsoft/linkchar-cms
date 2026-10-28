'use client'
import Image from 'next/image'
import { use } from 'react'
import { isLocaleMap } from '../../core/locales'
import { dataFields } from '../../core/walk'
import { useCms } from '../client/context'
import { EntryContext } from '../fields/entryContext'
import { useMediaRegistry } from '../fields/referencesContext'
import type { FieldsRecord } from '../../core/fields'

// Up to this many items a list starts open; a longer one only opens items that show a thumbnail.
export const OPEN_BY_DEFAULT_MAX = 3

interface KeyedItemType {
  _key: string
}

export const thumbnailKey = (fields: FieldsRecord, declared?: string): string | undefined =>
  declared ?? dataFields(fields).find(([, field]) => field.kind === 'image')?.[0]

export const initialOpenKeys = <T extends KeyedItemType>(open: boolean | undefined, items: T[], fieldsOf: (item: T) => FieldsRecord | undefined): string[] => {
  if (open === false) return []
  if (open === true || items.length <= OPEN_BY_DEFAULT_MAX) return items.map(item => item._key)
  return items.filter(item => {
    const fields = fieldsOf(item)
    return fields && thumbnailKey(fields)
  }).map(item => item._key)
}

interface ThumbProps {
  value: unknown
}

// The image of a collapsed item, in the language being edited (other languages reuse the original).
const ItemThumb = ({ value }: ThumbProps) => {
  const { config } = useCms()
  const { locale } = use(EntryContext)
  const { media } = useMediaRegistry()
  const own = isLocaleMap(value, config.locales) ? value[locale || config.defaultLocale] ?? value[config.defaultLocale] : value
  const item = typeof own === 'string' ? media[own] : undefined

  return (
    <span className='SortableItem__Thumb' aria-hidden='true'>
      {item ? <Image src={item.url} alt='' fill sizes='48px' className='SortableItem__ThumbImage' /> : <i className='pi pi-image' />}
    </span>
  )
}

export default ItemThumb
