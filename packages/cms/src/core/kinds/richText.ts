import { isEmptyRichText, normalizeRichText, richTextReferences } from '../richText/nodes'
import { defineField, issue } from './registry'
import { isRecord, shorten } from './shared'
import type { BaseOptions } from '../fields'
import type { RichTextDocType } from '../richText/nodes'

export interface RichTextField extends BaseOptions<RichTextDocType | null> {
  kind: 'richText'
  headings?: readonly (2 | 3 | 4)[]
}

declare module './registry' {
  interface FieldTypes<F> {
    richText: { field: RichTextField, value: RichTextDocType | null, localize: 'translate' }
  }
}

const isDoc = (value: unknown): value is RichTextDocType => isRecord(value) && value.type === 'doc'

export const plainText = (node: unknown): string => {
  if (!isRecord(node)) return ''
  if (typeof node.text === 'string') return node.text
  return Array.isArray(node.content) ? node.content.map(plainText).join(' ') : ''
}

export const richText = defineField({
  kind: 'richText',
  localize: 'translate',
  defaultValue: () => null,
  normalize: value => (isDoc(value) ? normalizeRichText(value) : null),
  isEmpty: value => !isDoc(value) || isEmptyRichText(value),
  validate: (value, _field, ctx) => {
    if (value !== null && value !== undefined && !isDoc(value)) return [issue('richText')]
    return ctx.required && isEmptyRichText(value as RichTextDocType | null) ? [issue('required')] : []
  },
  references: value => (isDoc(value) ? richTextReferences(value) : {}),
  summarize: value => shorten(plainText(value))
})
