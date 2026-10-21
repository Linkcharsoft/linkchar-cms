import { imageProps, JsonLd, jsonLdGraph, organization, website } from '@linkcharsoft/cms/site'
import Image from 'next/image'
import Link from 'next/link'
import { cms } from '@/cms/server'
import SiteFrame from '@/site/SiteFrame'
import cmsConfig from '../../cms.config'
import type { LocaleType } from '@linkcharsoft/cms/core'
import type { Metadata, Route } from 'next'

interface Props {
  locale: LocaleType
}

export const homeMetadata = async (locale: LocaleType): Promise<Metadata> =>
  cms.site.metadata(await cms.site.getEntryContent('home', { locale }))

const HomeScreen = async ({ locale }: Props) => {
  const home = await cms.site.getEntryContent('home', { locale })
  const { hero, services, projects } = home.content
  const featured = await cms.site.getDocuments('projects', projects.featured, { locale })
  const site = { name: cmsConfig.branding.name, url: cmsConfig.site.url ?? '', locale, description: hero.intro }

  return (
    <SiteFrame locale={locale} urls={home.urls}>
      <JsonLd data={jsonLdGraph(organization(site), website(site), cms.site.jsonLd(home))} />
      <section id='inicio'>
        {hero.eyebrow && <p>{hero.eyebrow}</p>}
        <h1 data-testid='hero-title'>{hero.title}</h1>
        {hero.intro && <p>{hero.intro}</p>}
        {hero.cover?.width && hero.cover.height && <Image {...imageProps(hero.cover, { sizes: '100vw' })} priority />}
        {hero.cta.link.href && <Link href={hero.cta.link.href as Route}>{hero.cta.label}</Link>}
      </section>
      <section id='servicios' aria-labelledby='services-title'>
        <h2 id='services-title'>{services.title}</h2>
        <ul>
          {services.items.map(item => <li key={item._key}>{item.name}</li>)}
        </ul>
      </section>
      {!projects._hidden && featured.length > 0 && (
        <section id='proyectos' aria-labelledby='projects-title'>
          <h2 id='projects-title'>{projects.title}</h2>
          <ul>
            {featured.map(project => <li key={project.id}>{project.path ? <Link href={project.path as Route}>{project.content.title}</Link> : project.content.title}</li>)}
          </ul>
        </section>
      )}
    </SiteFrame>
  )
}

export default HomeScreen
