import { imageProps, JsonLd, RichText } from '@linkcharsoft/cms/site'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { cms } from '@/cms/server'
import SiteFrame from '@/site/SiteFrame'
import type { LocaleType } from '@linkcharsoft/cms/core'
import type { Metadata } from 'next'

export interface SlugParamsType {
  params: Promise<{ slug: string }>
}

interface Props extends SlugParamsType {
  locale: LocaleType
}

const readPost = async (locale: LocaleType, params: SlugParamsType['params']) =>
  cms.site.getDocumentBySlug('posts', decodeURIComponent((await params).slug), { locale })

export const postParams = (locale: LocaleType) => cms.site.staticParams('posts', { locale })

export const postMetadata = async (locale: LocaleType, params: SlugParamsType['params']): Promise<Metadata> => {
  const post = await readPost(locale, params)
  return post ? cms.site.metadata(post) : {}
}

const PostScreen = async ({ locale, params }: Props) => {
  const post = await readPost(locale, params)
  if (!post) notFound()
  const { title, lead, cover, body, author } = post.content
  const [writer] = author ? await cms.site.getDocuments('team', [author], { locale }) : []

  return (
    <SiteFrame locale={locale} urls={post.urls}>
      <JsonLd data={cms.site.jsonLd(post)} />
      <article>
        <h1 data-testid='post-title'>{title}</h1>
        {lead && <p data-testid='post-lead'><RichText value={lead} inline /></p>}
        {writer && <p>{writer.content.name}</p>}
        {cover?.width && cover.height && <Image {...imageProps(cover, { sizes: '(min-width: 1024px) 60vw, 100vw' })} />}
        <RichText value={body} />
      </article>
    </SiteFrame>
  )
}

export default PostScreen
