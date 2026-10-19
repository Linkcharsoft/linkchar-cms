import { isUuid } from '../kinds/shared'

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

const cleanNodes = (nodes: RichTextNodeType[]): RichTextNodeType[] => nodes.flatMap(node => {
  if (node.type === 'image') {
    const { mediaId, caption } = node.attrs ?? {}
    if (!isUuid(mediaId)) return []
    return [{ type: 'image', attrs: typeof caption === 'string' && caption ? { mediaId, caption } : { mediaId } }]
  }
  return [node.content ? { ...node, content: cleanNodes(node.content) } : node]
})

// Images keep only their media id and caption: URL, size and alt text come from Media, in each language.
export const normalizeRichText = (doc: RichTextDocType): RichTextDocType =>
  (doc.content ? { ...doc, content: cleanNodes(doc.content) } : doc)

// The files and documents a text points to: its images and the links to documents of the site.
export const richTextReferences = (doc: RichTextDocType) => {
  const media = new Set<string>()
  const relations = new Set<string>()
  const visit = (node: RichTextNodeType) => {
    const mediaId = node.type === 'image' ? node.attrs?.mediaId : undefined
    if (isUuid(mediaId)) media.add(mediaId)
    for (const mark of node.marks ?? []) {
      const id = mark.type === 'link' ? mark.attrs?.id : undefined
      if (isUuid(id)) relations.add(id)
    }
    node.content?.forEach(visit)
  }
  doc.content?.forEach(visit)
  return { media: [...media], relations: [...relations] }
}
