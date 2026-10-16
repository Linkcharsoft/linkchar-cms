'use client'
import { use } from 'react'
import { useCms } from '../client/context'
import { EntryContext } from '../fields/entryContext'
import type { MediaItemType } from '../../core/media'
import type { LocalizedTextType } from '../../core/text'

// Alt and caption in the language being edited (the default locale outside the editor).
export const useMediaText = () => {
  const { config } = useCms()
  const { locale } = use(EntryContext)
  return (text: LocalizedTextType) => text[locale || config.defaultLocale] || text[config.defaultLocale] || ''
}

export const useMediaName = () => {
  const mediaText = useMediaText()
  return (item: MediaItemType) => mediaText(item.alt) || item.filename
}

// Default locale first: it is the one an image can't be saved without.
export const useMediaLocales = () => {
  const { config } = useCms()
  return [config.defaultLocale, ...config.locales.filter(locale => locale !== config.defaultLocale)]
}
