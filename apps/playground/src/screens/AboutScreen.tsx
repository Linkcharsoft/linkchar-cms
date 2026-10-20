import { JsonLd, RichText } from '@linkcharsoft/cms/site'
import { cms } from '@/cms/server'
import SiteFrame from '@/site/SiteFrame'
import type { LocaleType } from '@linkcharsoft/cms/core'
import type { Metadata } from 'next'

interface Props {
  locale: LocaleType
}

export const aboutMetadata = async (locale: LocaleType): Promise<Metadata> =>
  cms.site.metadata(await cms.site.getEntryContent('about', { locale }))

const AboutScreen = async ({ locale }: Props) => {
  const about = await cms.site.getEntryContent('about', { locale })
  const { story, team } = about.content
  const members = team._hidden ? [] : await cms.site.listDocuments('team', { locale })

  return (
    <SiteFrame locale={locale} urls={about.urls}>
      <JsonLd data={cms.site.jsonLd(about)} />
      <section id='historia'>
        <h1>{story.title}</h1>
        <RichText value={story.body} />
      </section>
      {!team._hidden && (
        <section id='equipo' aria-labelledby='team-title'>
          <h2 id='team-title'>{team.title}</h2>
          {team.intro && <p>{team.intro}</p>}
          <ul>
            {members.map(member => <li key={member.id}>{member.content.name}{member.content.role && ` · ${member.content.role}`}</li>)}
          </ul>
        </section>
      )}
    </SiteFrame>
  )
}

export default AboutScreen
