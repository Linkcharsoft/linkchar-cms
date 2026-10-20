'use client'
import { getIn, useFormikContext } from 'formik'
import { use } from 'react'
import { fieldLocalize, inheritsOriginal, isLocaleMap } from '../../core/locales'
import { resolveText } from '../../core/text'
import { useCms, useTextContext } from '../client/context'
import { EntryContext } from './entryContext'
import type { DataField } from '../../core/fields'
import type { LeafField } from '../../core/kinds/registry'
import type { TextType } from '../../core/text'

export const fieldId = (name: string) => `cms-${name.replace(/\./g, '-')}`

export const describedBy = (name: string, field: { help?: TextType }, ...extra: (string | undefined)[]) =>
  [field.help ? `${fieldId(name)}-help` : undefined, ...extra].filter(Boolean).join(' ') || undefined

// Schema texts (labels, help, placeholders) in the panel language.
export const useText = () => {
  const ctx = useTextContext()
  return (text: TextType | undefined) => (text === undefined ? '' : resolveText(text, ctx))
}

export const useFieldLabel = () => {
  const text = useText()
  return (field: { label: TextType, required?: boolean }) => (field.required ? `${text(field.label)} *` : text(field.label))
}

// Errors show once the field was touched (blur) or the server rejected it, never while typing for the first time.
export const useFieldError = (name: string): string | undefined => {
  const { errors, touched } = useFormikContext<Record<string, unknown>>()
  const error = getIn(errors, name)
  return getIn(touched, name) && typeof error === 'string' ? error : undefined
}

// Where a leaf's value lives for the language being edited: translated text under `name.<locale>`,
// media under the default locale (other locales inherit it), shared values at `name`.
export const useValuePath = (name: string, field: LeafField | DataField) => {
  const { config } = useCms()
  const { locale } = use(EntryContext)
  if (field.kind === 'group' || field.kind === 'list' || field.kind === 'blocks') return name
  const mode = fieldLocalize(config, field as LeafField)
  if (mode === 'translate') return `${name}.${locale || config.defaultLocale}`
  if (mode === 'inherit') return `${name}.${config.defaultLocale}`
  return name
}

export interface MediaVariantType {
  // Where the shown value lives: this language's own one, or the original it reuses.
  path: string
  // Another language than the default one is on screen.
  translating: boolean
  // This language has its own value instead of reusing the original.
  overridden: boolean
  override: (value: unknown) => void
  restore: () => void
}

// An image, file or gallery per language: other languages reuse the original until they get their own.
export const useMediaVariant = (name: string): MediaVariantType => {
  const { config } = useCms()
  const { locale } = use(EntryContext)
  const { values, setFieldValue, setFieldTouched } = useFormikContext<Record<string, unknown>>()
  const current = locale || config.defaultLocale
  const translating = current !== config.defaultLocale
  const stored: unknown = getIn(values, name)
  const own = isLocaleMap(stored, config.locales) ? stored[current] : undefined
  const overridden = translating && !inheritsOriginal(own)
  const set = (value: unknown) => {
    void setFieldValue(`${name}.${current}`, value)
    void setFieldTouched(`${name}.${current}`, true, false)
  }

  return {
    path: translating && !overridden ? `${name}.${config.defaultLocale}` : `${name}.${current}`,
    translating,
    overridden,
    override: set,
    // Formik drops a key set to undefined: the language goes back to reusing the original.
    restore: () => set(undefined)
  }
}

// A stored text in the language being edited (a list item's title, a block summary), plain or per locale.
export const useStoredText = () => {
  const { config } = useCms()
  const { locale } = use(EntryContext)
  return (value: unknown): string => {
    const own = isLocaleMap(value, config.locales) ? value[locale || config.defaultLocale] ?? value[config.defaultLocale] : value
    return typeof own === 'string' ? own : ''
  }
}

// The same for one localized part of a composite value (a button's label, the note of opening hours).
export const usePartPath = (name: string, field: LeafField) => {
  const { config } = useCms()
  const { locale } = use(EntryContext)
  const mode = fieldLocalize(config, field)
  return (part: string) => (typeof mode === 'object' && mode[part] ? `${name}.${part}.${locale || config.defaultLocale}` : `${name}.${part}`)
}
