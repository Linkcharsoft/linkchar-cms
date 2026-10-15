import { defineField, issue, noReferences } from './registry'
import { isRecord, shorten } from './shared'
import { EMAIL, HTTP_URL, PHONE } from './strings'
import type { BaseOptions } from '../fields'
import type { IssueType } from './registry'

export type LinkKindType = 'internal' | 'external' | 'email' | 'tel' | 'anchor'

export interface LinkValueType {
  type: LinkKindType
  href: string
  newTab: boolean
}

export interface LinkField extends BaseOptions<LinkValueType> {
  kind: 'link'
  allow?: readonly LinkKindType[]
}

declare module './registry' {
  interface FieldTypes<F> {
    link: { field: LinkField, value: LinkValueType, localize: false }
  }
}

export const LINK_KINDS: readonly LinkKindType[] = ['internal', 'external', 'email', 'tel', 'anchor']

const LINK_RULES: Record<LinkKindType, [RegExp, string]> = {
  internal: [/^\/(?!\/)\S*$/, 'linkInternal'],
  external: [HTTP_URL, 'linkExternal'],
  email: [EMAIL, 'linkEmail'],
  tel: [PHONE, 'linkTel'],
  anchor: [/^#[\w-]+$/, 'linkAnchor']
}

export const emptyLink = (type: LinkKindType = 'internal'): LinkValueType => ({ type, href: '', newTab: false })

export const normalizeLink = (value: unknown, allow?: readonly LinkKindType[]): LinkValueType =>
  (isRecord(value) ? { ...emptyLink(allow?.[0]), ...value } as LinkValueType : emptyLink(allow?.[0]))

// Also used by the button, whose link always allows every kind.
export const linkIssues = (value: unknown, allow: readonly LinkKindType[], required: boolean): IssueType[] => {
  if (value === undefined) return required ? [issue('required', undefined, 'href')] : []
  if (!isRecord(value)) return [issue('invalid')]
  const type = value.type as LinkKindType
  if (!allow.includes(type)) return [issue('linkType', undefined, 'type')]
  const href = value.href ?? ''
  if (typeof href !== 'string') return [issue('invalid', undefined, 'href')]
  if (!href) return required ? [issue('required', undefined, 'href')] : []
  const [pattern, code] = LINK_RULES[type]
  if (!pattern.test(href)) return [issue(code, undefined, 'href')]
  return value.newTab === undefined || typeof value.newTab === 'boolean' ? [] : [issue('invalid', undefined, 'newTab')]
}

export const link = defineField({
  kind: 'link',
  localize: false,
  defaultValue: field => emptyLink(field.allow?.[0]),
  normalize: (value, field) => normalizeLink(value, field.allow),
  isEmpty: value => !isRecord(value) || !value.href,
  validate: (value, field, ctx) => linkIssues(value, field.allow ?? LINK_KINDS, ctx.required),
  references: noReferences,
  summarize: value => shorten(isRecord(value) ? String(value.href ?? '') : '')
})
