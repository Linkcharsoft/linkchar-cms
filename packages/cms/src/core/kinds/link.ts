import { defineField, issue } from './registry'
import { isRecord, isUuid, shorten } from './shared'
import { EMAIL, HTTP_URL, PHONE } from './strings'
import type { CmsConfigType } from '../config'
import type { BaseOptions } from '../fields'
import type { IssueType, ReferencesType, SummaryContextType } from './registry'

// 'entry' points to a page or document of the site and follows its URL in every locale;
// 'internal' is a path typed by hand ("Otra dirección"), the same in every locale.
export type LinkKindType = 'entry' | 'internal' | 'external' | 'email' | 'tel' | 'anchor'

export interface LinkValueType {
  type: LinkKindType
  href: string
  newTab: boolean
  // type 'entry': the schema entry, the document id for collections and an optional section anchor.
  entry?: string
  id?: string
  anchor?: string
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

export const LINK_KINDS: readonly LinkKindType[] = ['entry', 'internal', 'external', 'email', 'tel', 'anchor']

const LINK_RULES: Record<Exclude<LinkKindType, 'entry'>, [RegExp, string]> = {
  internal: [/^\/(?!\/)\S*$/, 'linkInternal'],
  external: [HTTP_URL, 'linkExternal'],
  email: [EMAIL, 'linkEmail'],
  tel: [PHONE, 'linkTel'],
  anchor: [/^#[\w-]+$/, 'linkAnchor']
}

export const emptyLink = (type: LinkKindType = 'entry'): LinkValueType => ({ type, href: '', newTab: false })

export const normalizeLink = (value: unknown, allow?: readonly LinkKindType[]): LinkValueType =>
  (isRecord(value) ? { ...emptyLink(allow?.[0]), ...value } as LinkValueType : emptyLink(allow?.[0]))

const isEmptyLink = (value: unknown) => !isRecord(value) || (value.type === 'entry' ? !value.entry : !value.href)

const entryIssues = (config: CmsConfigType, value: Record<string, unknown>, required: boolean): IssueType[] => {
  if (!value.entry) return required ? [issue('required', undefined, 'entry')] : []
  const entry = typeof value.entry === 'string' && Object.hasOwn(config.schema, value.entry) ? config.schema[value.entry] : undefined
  if (!entry?.path) return [issue('linkEntry', undefined, 'entry')]
  if (entry.kind === 'collection' ? !isUuid(value.id) : value.id !== undefined) return [issue('linkEntry', undefined, 'id')]
  if (value.anchor !== undefined && value.anchor !== '' && (typeof value.anchor !== 'string' || !/^[\w-]+$/.test(value.anchor))) {
    return [issue('invalid', undefined, 'anchor')]
  }
  return []
}

// Also used by the button, whose link always allows every kind.
export const linkIssues = (config: CmsConfigType, value: unknown, allow: readonly LinkKindType[], required: boolean): IssueType[] => {
  if (value === undefined) return required ? [issue('required', undefined, 'href')] : []
  if (!isRecord(value)) return [issue('invalid')]
  const type = value.type as LinkKindType
  if (!allow.includes(type)) return [issue('linkType', undefined, 'type')]
  if (value.newTab !== undefined && typeof value.newTab !== 'boolean') return [issue('invalid', undefined, 'newTab')]
  if (type === 'entry') return entryIssues(config, value, required)
  const href = value.href ?? ''
  if (typeof href !== 'string') return [issue('invalid', undefined, 'href')]
  if (!href) return required ? [issue('required', undefined, 'href')] : []
  const [pattern, code] = LINK_RULES[type]
  return pattern.test(href) ? [] : [issue(code, undefined, 'href')]
}

// A link to a collection document references it, so removing the document warns about the link.
export const linkReferences = (value: unknown): Partial<ReferencesType> =>
  (isRecord(value) && value.type === 'entry' && isUuid(value.id) ? { relations: [value.id] } : {})

export const summarizeLink = (value: unknown, ctx: SummaryContextType) => {
  if (!isRecord(value)) return ''
  if (value.type !== 'entry') return String(value.href ?? '')
  const entry = typeof value.entry === 'string' && Object.hasOwn(ctx.config.schema, value.entry) ? ctx.config.schema[value.entry] : undefined
  const target = isUuid(value.id) ? ctx.names.relations?.[value.id] ?? ctx.t('diff.deleted') : entry ? ctx.text(entry.label) : ''
  return value.anchor ? `${target} #${value.anchor}` : target
}

export const link = defineField({
  kind: 'link',
  localize: false,
  defaultValue: field => emptyLink(field.allow?.[0]),
  normalize: (value, field) => normalizeLink(value, field.allow),
  isEmpty: isEmptyLink,
  validate: (value, field, ctx) => linkIssues(ctx.config, value, field.allow ?? LINK_KINDS, ctx.required),
  references: linkReferences,
  summarize: (value, _field, ctx) => shorten(summarizeLink(value, ctx))
})
