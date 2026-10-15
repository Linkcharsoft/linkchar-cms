import { buildDefaults, entryIds, getEntry, languageName, resolveContent, resolveText, textContext } from '@linkcharsoft/cms/core'
import cmsConfig from '../../cms.config'
import type { LocaleType } from '@linkcharsoft/cms/core'

interface Props {
  locale: LocaleType
}

// Until the database arrives (stage 2) the site shows the schema defaults, read like real content.
const HomeScreen = ({ locale }: Props) => {
  const { fields } = cmsConfig.schema.home
  const home = resolveContent(cmsConfig, fields, buildDefaults(cmsConfig, fields), locale)
  const texts = textContext(cmsConfig, locale)
  const other = cmsConfig.locales.find(item => item !== locale) ?? cmsConfig.defaultLocale

  return (
    <main id='main'>
      <p>{home.hero.eyebrow || cmsConfig.branding.name}</p>
      <h1>{home.hero.title}</h1>
      <section aria-labelledby='services'>
        <h2 id='services'>{home.services.title}</h2>
        <ul>
          {home.services.items.map(item => <li key={item._key}>{item.name}</li>)}
        </ul>
      </section>
      <section aria-labelledby='model'>
        <h2 id='model'>Content model</h2>
        <ul>
          {entryIds(cmsConfig).map(id => <li key={id}>{resolveText(getEntry(cmsConfig, id)?.label, texts)}</li>)}
        </ul>
      </section>
      <a href={other === cmsConfig.defaultLocale ? '/' : `/${other}`} hrefLang={other}>
        {languageName(other, other)}
      </a>
    </main>
  )
}

export default HomeScreen
