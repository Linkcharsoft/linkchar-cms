import { imageProps, JsonLd, RichText, Video } from '@linkcharsoft/cms/site'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { cms } from '@/cms/server'
import SiteFrame from '@/site/SiteFrame'
import type { SlugParamsType } from './PostScreen'
import type { LocaleType } from '@linkcharsoft/cms/core'
import type { Metadata } from 'next'

interface Props extends SlugParamsType {
  locale: LocaleType
}

const readProject = async (locale: LocaleType, params: SlugParamsType['params']) =>
  cms.site.getDocumentBySlug('projects', decodeURIComponent((await params).slug), { locale })

export const projectParams = (locale: LocaleType) => cms.site.staticParams('projects', { locale })

export const projectMetadata = async (locale: LocaleType, params: SlugParamsType['params']): Promise<Metadata> => {
  const project = await readProject(locale, params)
  return project ? cms.site.metadata(project) : {}
}

const ProjectScreen = async ({ locale, params }: Props) => {
  const project = await readProject(locale, params)
  if (!project) notFound()
  const { title, summary, cover, photos, body, video } = project.content

  return (
    <SiteFrame locale={locale} urls={project.urls}>
      <JsonLd data={cms.site.jsonLd(project)} />
      <article>
        <h1>{title}</h1>
        {summary && <p>{summary}</p>}
        {cover?.width && cover.height && <Image {...imageProps(cover, { sizes: '100vw' })} priority />}
        <RichText value={body} />
        {video && <Video video={video} className='Project__Video' />}
        <ul>
          {photos.filter(photo => photo.width && photo.height).map(photo => (
            <li key={photo.id}><Image {...imageProps(photo, { sizes: '(min-width: 768px) 33vw, 100vw' })} /></li>
          ))}
        </ul>
      </article>
    </SiteFrame>
  )
}

export default ProjectScreen
