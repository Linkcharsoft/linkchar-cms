import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import { mergeAttributes, Node } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { RICH_TEXT_HEADING_LEVELS, sanitizeHref } from '../../../core/richText/nodes'
import parseVideoUrl from '../../../core/video'
import type { RichTextHeadingLevelType } from '../../../core/richText/nodes'

export interface EditorImageType {
  url: string
  alt: string
  width?: number | null
  height?: number | null
}

// What the editor shows for an image node: only its media id is stored.
export type MediaLookupType = (mediaId: string) => EditorImageType | undefined

// Stored as the pasted YouTube or Vimeo URL; the site renders the embed. No iframe inside the editor.
export const Video = Node.create({
  name: 'video',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes () {
    return { src: { default: null }, title: { default: null }, caption: { default: null } }
  },

  parseHTML () {
    return [{
      tag: 'div[data-video]',
      getAttrs: element => ({
        src: element.getAttribute('data-src'),
        title: element.getAttribute('data-title'),
        caption: element.getAttribute('data-caption')
      })
    }]
  },

  renderHTML ({ HTMLAttributes }) {
    const src = typeof HTMLAttributes.src === 'string' ? HTMLAttributes.src : ''
    const caption = typeof HTMLAttributes.caption === 'string' ? HTMLAttributes.caption : ''
    const provider = parseVideoUrl(src)?.provider === 'vimeo' ? 'Vimeo' : 'YouTube'
    const attrs = mergeAttributes({
      'data-video': '',
      'data-src': src,
      ...(HTMLAttributes.title ? { 'data-title': HTMLAttributes.title } : {}),
      ...(caption ? { 'data-caption': caption } : {}),
      class: 'RichTextEditor__Video'
    })
    return ['div', attrs, `${provider} · ${src}${caption ? ` — ${caption}` : ''}`]
  }
})

// Only images from Media: pasted images from other sites are dropped instead of hotlinked.
export const mediaImage = (lookup: MediaLookupType) => Image.extend({
  addAttributes () {
    return {
      mediaId: { default: null, parseHTML: element => element.getAttribute('data-media-id'), renderHTML: () => ({}) },
      caption: { default: null, renderHTML: () => ({}) }
    }
  },

  parseHTML () {
    return [{ tag: 'img[data-media-id]' }]
  },

  renderHTML ({ node }) {
    const mediaId = typeof node.attrs.mediaId === 'string' ? node.attrs.mediaId : ''
    const image = lookup(mediaId)
    return ['img', {
      src: image?.url ?? '',
      alt: image?.alt ?? '',
      'data-media-id': mediaId,
      ...(image?.width ? { width: image.width } : {}),
      ...(image?.height ? { height: image.height } : {})
    }]
  }
}).configure({ inline: false, allowBase64: false })

const dataAttribute = (name: string) => ({
  default: null,
  parseHTML: (element: HTMLElement) => element.getAttribute(`data-${name}`),
  renderHTML: (attributes: Record<string, unknown>) => (attributes[name] ? { [`data-${name}`]: attributes[name] } : {})
})

// A link to a page or document keeps which one, so the site writes its URL in each language; href is a fallback.
export const SiteLink = Link.extend({
  addAttributes () {
    return { ...this.parent?.(), entry: dataAttribute('entry'), id: dataAttribute('id'), anchor: dataAttribute('anchor') }
  }
}).configure({
  openOnClick: false,
  autolink: true,
  defaultProtocol: 'https',
  isAllowedUri: url => !!sanitizeHref(url),
  HTMLAttributes: { rel: 'noopener noreferrer', target: null }
})

// Same allowlist as core/richText/nodes.ts: pasted colors, fonts, H1, code or raw HTML never enter the document.
export const richTextExtensions = (lookup: MediaLookupType, headings: readonly RichTextHeadingLevelType[] = RICH_TEXT_HEADING_LEVELS) => [
  StarterKit.configure({
    heading: { levels: [...headings] },
    code: false,
    codeBlock: false,
    link: false
  }),
  SiteLink,
  Video,
  mediaImage(lookup)
]
