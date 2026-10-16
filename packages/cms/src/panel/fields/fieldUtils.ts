'use client'
import { getIn, useFormikContext } from 'formik'
import { use } from 'react'
import { fieldLocalize, isLocaleMap } from '../../core/locales'
import { resolveText } from '../../core/text'
import { useCms, useTextContext } from '../client/context'
import { EntryContext } from './entryContext'
import type { DataField } from '../../core/fields'
import type { LeafField } from '../../core/kinds/registry'
import type { TextType } from '../../core/text'

export const fieldId = (name: string) => `cms-${name.replace(/\./g, '-')}`

export const describedBy = (name: string, field: { help?: TextType }) => (field.help ? `${fieldId(name)}-help` : undefined)

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
