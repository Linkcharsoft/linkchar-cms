// Tiptap/ProseMirror JSON. The editor and the renderer share this allowlist: anything else is dropped.

export interface RichTextMarkType {
  type: string
  attrs?: Record<string, unknown>
}

export interface RichTextNodeType {
  type: string
  attrs?: Record<string, unknown>
  content?: RichTextNodeType[]
  marks?: RichTextMarkType[]
  text?: string
}

export interface RichTextDocType {
  type: 'doc'
  content?: RichTextNodeType[]
}

export const RICH_TEXT_NODES = [
  'doc',
  'paragraph',
  'text',
  'heading',
  'bulletList',
  'orderedList',
  'listItem',
  'blockquote',
  'horizontalRule',
  'hardBreak',
  'image',
  'video'
] as const

export const RICH_TEXT_MARKS = ['bold', 'italic', 'underline', 'strike', 'link'] as const

export const RICH_TEXT_HEADING_LEVELS = [2, 3, 4] as const

export type RichTextHeadingLevelType = typeof RICH_TEXT_HEADING_LEVELS[number]

const SAFE_HREF = /^(https?:\/\/|mailto:|tel:|#|\/(?!\/))/i

// Blocks javascript:, data: and protocol-relative URLs; everything rendered goes through here.
export const sanitizeHref = (href: unknown): string | null => {
  if (typeof href !== 'string') return null
  const trimmed = href.trim()
  return SAFE_HREF.test(trimmed) ? trimmed : null
}

const hasContent = (node: RichTextNodeType): boolean =>
  (node.type === 'text' && !!node.text?.trim())
  || ['image', 'video', 'horizontalRule'].includes(node.type)
  || !!node.content?.some(hasContent)

export const isEmptyRichText = (doc: RichTextDocType | null | undefined): boolean =>
  !doc?.content?.some(hasContent)
