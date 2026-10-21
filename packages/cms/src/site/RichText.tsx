import { createElement, Fragment } from 'react'
import { sanitizeHref } from '../core/richText/nodes'
import parseVideoUrl from '../core/video'
import type { SiteRichTextType } from './types'
import type { RichTextMarkType, RichTextNodeType } from '../core/richText/nodes'
import type { ReactNode } from 'react'

export interface RichTextImageProps {
  src: string
  alt: string
  width: number | null
  height: number | null
  caption: string
}

export interface RichTextComponentsType {
  // Replaces the default <img>, e.g. with next/image.
  image?: (props: RichTextImageProps) => ReactNode
}

interface Props {
  value: SiteRichTextType | null | undefined
  className?: string
  components?: RichTextComponentsType
}

const HEADINGS = { 2: 'h2', 3: 'h3', 4: 'h4' } as const

const MARK_TAGS: Record<string, string> = { bold: 'strong', italic: 'em', underline: 'u', strike: 's' }

const text = (value: unknown) => (typeof value === 'string' ? value : '')

const withMark = (mark: RichTextMarkType, children: ReactNode, key: number): ReactNode => {
  if (mark.type === 'link') {
    const href = sanitizeHref(mark.attrs?.href)
    if (!href) return children
    const newTab = mark.attrs?.target === '_blank'
    return <a key={key} href={href} {...(newTab ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>{children}</a>
  }
  const tag = MARK_TAGS[mark.type]
  return tag ? createElement(tag, { key }, children) : children
}

const Video = ({ src, title, caption }: { src: string, title: string, caption: string }) => {
  const video = parseVideoUrl(src)
  if (!video) return null
  const embed = video.provider === 'youtube' ? `https://www.youtube-nocookie.com/embed/${video.id}` : `https://player.vimeo.com/video/${video.id}`
  return (
    <figure className='RichText__Video'>
      <iframe
        src={embed}
        title={title || caption || video.provider}
        loading='lazy'
        allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture'
        allowFullScreen
      />
      {caption && <figcaption>{caption}</figcaption>}
    </figure>
  )
}

const renderNode = (node: RichTextNodeType, key: number, components: RichTextComponentsType): ReactNode => {
  const children = node.content?.map((child, index) => renderNode(child, index, components))
  switch (node.type) {
    case 'text':
      return <Fragment key={key}>{(node.marks ?? []).reduce<ReactNode>((inner, mark, index) => withMark(mark, inner, index), node.text ?? '')}</Fragment>
    case 'paragraph':
      return <p key={key}>{children}</p>
    case 'heading': {
      const level = Number(node.attrs?.level)
      return createElement(HEADINGS[level as keyof typeof HEADINGS] ?? 'p', { key }, children)
    }
    case 'bulletList':
      return <ul key={key}>{children}</ul>
    case 'orderedList':
      return <ol key={key}>{children}</ol>
    case 'listItem':
      return <li key={key}>{children}</li>
    case 'blockquote':
      return <blockquote key={key}>{children}</blockquote>
    case 'horizontalRule':
      return <hr key={key} />
    case 'hardBreak':
      return <br key={key} />
    case 'image': {
      const src = text(node.attrs?.src)
      if (!src) return null
      const props: RichTextImageProps = {
        src,
        alt: text(node.attrs?.alt),
        width: typeof node.attrs?.width === 'number' ? node.attrs.width : null,
        height: typeof node.attrs?.height === 'number' ? node.attrs.height : null,
        caption: text(node.attrs?.caption)
      }
      return (
        <figure key={key} className='RichText__Image'>
          {components.image
            ? components.image(props)
            : <img src={props.src} alt={props.alt} width={props.width ?? undefined} height={props.height ?? undefined} loading='lazy' />}
          {props.caption && <figcaption>{props.caption}</figcaption>}
        </figure>
      )
    }
    case 'video':
      return <Video key={key} src={text(node.attrs?.src)} title={text(node.attrs?.title)} caption={text(node.attrs?.caption)} />
    default:
      return null
  }
}

// Renders a rich text field as the site reads it; only the nodes and marks the editor allows get through.
const RichText = ({ value, className, components = {} }: Props) => {
  if (!value?.content?.length) return null
  return (
    <div className={className}>
      {value.content.map((node, index) => <Fragment key={index}>{renderNode(node, index, components)}</Fragment>)}
    </div>
  )
}

export default RichText
