import { inlineRichText, isEmptyRichText, keepMarks, normalizeRichText, richTextReferences } from '../richText/nodes'
import { defineField, issue } from './registry'
import { isRecord, shorten } from './shared'
import type { BaseOptions } from '../fields'
import type { RichTextDocType, RichTextMarkNameType } from '../richText/nodes'

export interface RichTextField extends BaseOptions<RichTextDocType | null> {
  kind: 'richText'
  headings?: readonly (2 | 3 | 4)[]
  // One paragraph without headings, lists or media: a text that goes inside the site's own <p> or card.
  inline?: boolean
  // The marks the editor offers and the text keeps; all of them by default.
  marks?: readonly RichTextMarkNameType[]
}

declare module './registry' {
  interface FieldTypes<F> {
    richText: { field: RichTextField, value: RichTextDocType | null, localize: 'translate' }
  }
}

const isDoc = (value: unknown): value is RichTextDocType => isRecord(value) && value.type === 'doc'

const restrict = (doc: RichTextDocType, { inline, marks }: RichTextField) => {
  const shaped = inline ? inlineRichText(doc) : doc
  return marks ? keepMarks(shaped, marks) : shaped
}

export const plainText = (node: unknown): string => {
  if (!isRecord(node)) return ''
  if (typeof node.text === 'string') return node.text
  return Array.isArray(node.content) ? node.content.map(plainText).join(' ') : ''
}

export const richText = defineField({
  kind: 'richText',
  localize: 'translate',
  defaultValue: () => null,
  normalize: (value, field) => (isDoc(value) ? restrict(normalizeRichText(value), field) : null),
  isEmpty: value => !isDoc(value) || isEmptyRichText(value),
  validate: (value, _field, ctx) => {
    if (value !== null && value !== undefined && !isDoc(value)) return [issue('richText')]
    return ctx.required && isEmptyRichText(value as RichTextDocType | null) ? [issue('required')] : []
  },
  references: value => (isDoc(value) ? richTextReferences(value) : {}),
  summarize: value => shorten(plainText(value))
})
