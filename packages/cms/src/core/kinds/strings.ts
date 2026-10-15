import parseVideoUrl from '../video'
import { defineField, issue, noReferences } from './registry'
import { shorten } from './shared'
import type { BaseOptions } from '../fields'
import type { FieldDefinitionType, IssueType } from './registry'
import type { TextType } from '../text'

interface StringOptions extends BaseOptions<string> {
  maxLength?: number
  pattern?: RegExp
  patternMessage?: TextType
  placeholder?: string
}

export interface TextField extends StringOptions { kind: 'text' }
export interface TextareaField extends StringOptions { kind: 'textarea', rows?: number }
export interface EmailField extends StringOptions { kind: 'email' }
export interface PhoneField extends StringOptions { kind: 'phone' }
export interface UrlField extends StringOptions { kind: 'url' }
export interface VideoField extends StringOptions { kind: 'video' }
export interface SlugField extends StringOptions { kind: 'slug', from: string }

declare module './registry' {
  interface FieldTypes<F> {
    text: { field: TextField, value: string, localize: 'translate' }
    textarea: { field: TextareaField, value: string, localize: 'translate' }
    email: { field: EmailField, value: string, localize: false }
    phone: { field: PhoneField, value: string, localize: false }
    url: { field: UrlField, value: string, localize: false }
    video: { field: VideoField, value: string, localize: false }
    slug: { field: SlugField, value: string, localize: 'translate' }
  }
}

export const PHONE = /^\+?[\d\s()-]{6,20}$/
export const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
export const HTTP_URL = /^https?:\/\/[^\s/]+\.[^\s]+$/i
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

type StringKindType = 'text' | 'textarea' | 'email' | 'phone' | 'url' | 'video' | 'slug'

// Shared by every plain-text kind; `format` adds the kind's own rule.
const stringKind = <K extends StringKindType>(
  kind: K,
  localize: FieldDefinitionType<K>['localize'],
  format?: (value: string) => IssueType | null
) => defineField<K>({
  kind,
  localize,
  defaultValue: () => '',
  normalize: value => (typeof value === 'string' ? value : ''),
  isEmpty: value => typeof value !== 'string' || !value.trim(),
  validate: (value, field: StringOptions, ctx) => {
    if (value === null || value === undefined) value = ''
    if (typeof value !== 'string') return [issue('invalid')]
    if (!value) return ctx.required ? [issue('required')] : []
    if (field.maxLength && value.length > field.maxLength) return [issue('maxLength', { max: field.maxLength })]
    if (field.pattern && !field.pattern.test(value)) {
      return [field.patternMessage ? { ...issue('pattern'), message: field.patternMessage } : issue('pattern')]
    }
    const found = format?.(value)
    return found ? [found] : []
  },
  references: noReferences,
  summarize: value => shorten(String(value))
})

export const text = stringKind('text', 'translate')
export const textarea = stringKind('textarea', 'translate')
export const email = stringKind('email', false, value => (EMAIL.test(value) ? null : issue('email')))
export const phone = stringKind('phone', false, value => (PHONE.test(value) ? null : issue('phone')))
export const url = stringKind('url', false, value => (HTTP_URL.test(value) ? null : issue('url')))
export const video = stringKind('video', false, value => (parseVideoUrl(value) ? null : issue('video')))
export const slug = stringKind('slug', 'translate', value => (SLUG.test(value) ? null : issue('slug')))
