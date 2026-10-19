import { emptyLink, LINK_KINDS, linkIssues, linkReferences, normalizeLink, summarizeLink } from './link'
import { defineField, issue } from './registry'
import { isRecord, shorten } from './shared'
import type { BaseOptions, OptionType } from '../fields'
import type { LinkValueType } from './link'
import type { IssueType } from './registry'

export interface ButtonValueType<V extends string = string> {
  label: string
  link: LinkValueType
  variant: V
}

export interface ButtonField<V extends string = string> extends BaseOptions<ButtonValueType<V>> {
  kind: 'button'
  variants: readonly OptionType<V>[]
}

type VariantType<F> = F extends { variants: readonly { value: infer V extends string }[] } ? V : string

declare module './registry' {
  interface FieldTypes<F> {
    button: { field: ButtonField, value: ButtonValueType<VariantType<F>>, localize: { label: 'translate' } }
  }
}

const MAX_LABEL = 40

export const button = defineField({
  kind: 'button',
  localize: { label: 'translate' },
  defaultValue: field => ({ label: '', link: emptyLink(), variant: field.variants[0]?.value ?? '' }),
  normalize: (value, field) => {
    const fallback = { label: '', link: emptyLink(), variant: field.variants[0]?.value ?? '' }
    if (!isRecord(value)) return fallback
    return { ...fallback, ...value, link: normalizeLink(value.link) } as ButtonValueType
  },
  isEmpty: value => !isRecord(value) || typeof value.label !== 'string' || !value.label.trim(),
  validate: (value, field, ctx) => {
    if (value === undefined) value = {}
    if (!isRecord(value)) return [issue('invalid')]
    const label = value.label ?? ''
    const issues: IssueType[] = []
    if (typeof label !== 'string') issues.push(issue('invalid', undefined, 'label'))
    else if (label.length > MAX_LABEL) issues.push(issue('maxLength', { max: MAX_LABEL }, 'label'))
    else if (ctx.required && !label.trim()) issues.push(issue('required', undefined, 'label'))
    issues.push(...linkIssues(ctx.config, value.link, LINK_KINDS, ctx.required).map(found => ({ ...found, path: found.path ? `link.${found.path}` : 'link' })))
    if (value.variant !== undefined && !field.variants.some(variant => variant.value === value.variant)) {
      issues.push(issue('variant', undefined, 'variant'))
    }
    return issues
  },
  references: value => (isRecord(value) ? linkReferences(value.link) : {}),
  summarize: (value, _field, ctx) => (isRecord(value) ? shorten(`${value.label ?? ''} → ${summarizeLink(value.link, ctx)}`) : '')
})
