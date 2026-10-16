import Image from '@tiptap/extension-image'
import { mergeAttributes, Node } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { mediaPublicPrefix } from '../../../core/media'
import { RICH_TEXT_HEADING_LEVELS, sanitizeHref } from '../../../core/richText/nodes'
import parseVideoUrl from '../../../core/video'
import type { RichTextHeadingLevelType } from '../../../core/richText/nodes'

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

// Only images from the project's media bucket: pasted images from other sites are dropped instead of hotlinked.
export const mediaImage = (supabaseUrl: string) => Image.extend({
  addAttributes () {
    return {
      ...this.parent?.(),
      mediaId: {
        default: null,
        parseHTML: element => element.getAttribute('data-media-id'),
        renderHTML: attributes => (attributes.mediaId ? { 'data-media-id': attributes.mediaId } : {})
      }
    }
  },

  parseHTML () {
    return [{ tag: 'img[src]', getAttrs: element => (element.getAttribute('src')?.startsWith(mediaPublicPrefix(supabaseUrl)) ? null : false) }]
  }
}).configure({ inline: false, allowBase64: false })

// Same allowlist as core/richText/nodes.ts: pasted colors, fonts, H1, code or raw HTML never enter the document.
export const richTextExtensions = (supabaseUrl: string, headings: readonly RichTextHeadingLevelType[] = RICH_TEXT_HEADING_LEVELS) => [
  StarterKit.configure({
    heading: { levels: [...headings] },
    code: false,
    codeBlock: false,
    link: {
      openOnClick: false,
      autolink: true,
      defaultProtocol: 'https',
      isAllowedUri: url => !!sanitizeHref(url),
      HTMLAttributes: { rel: 'noopener noreferrer', target: null }
    }
  }),
  Video,
  mediaImage(supabaseUrl)
]
