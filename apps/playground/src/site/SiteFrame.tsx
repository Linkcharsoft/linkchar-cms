import { entryPath, languageName, localePrefix } from '@linkcharsoft/cms/core'
import Link from 'next/link'
import cmsConfig from '../../cms.config'
import type { LocaleType } from '@linkcharsoft/cms/core'
import type { Route } from 'next'
import type { ReactNode } from 'react'

interface Props {
  locale: LocaleType
  // The page in every locale it exists in; the switch falls back to the other locale's home.
  urls: Record<string, string>
  children: ReactNode
}

const NAV = {
  es: { home: 'Inicio', about: 'Estudio', blog: 'Blog' },
  en: { home: 'Home', about: 'Studio', blog: 'Blog' }
} satisfies Record<LocaleType, Record<string, string>>

const SiteFrame = ({ locale, urls, children }: Props) => {
  const { schema } = cmsConfig
  const links = [
    { href: entryPath(cmsConfig, schema.home, { locale }), label: NAV[locale].home },
    { href: entryPath(cmsConfig, schema.about, { locale }), label: NAV[locale].about },
    { href: `${localePrefix(cmsConfig, locale)}/blog`, label: NAV[locale].blog }
  ]
  const others = cmsConfig.locales.filter(other => other !== locale)

  return (
    <>
      <header>
        <nav aria-label={cmsConfig.branding.name}>
          <ul>
            {links.map(link => link.href && <li key={link.href}><Link href={link.href as Route}>{link.label}</Link></li>)}
          </ul>
        </nav>
        {others.map(other => (
          <Link key={other} href={(urls[other] ?? entryPath(cmsConfig, schema.home, { locale: other }) ?? '/') as Route} hrefLang={other} data-testid='language-switch'>
            {languageName(other, other)}
          </Link>
        ))}
      </header>
      <main id='main'>{children}</main>
    </>
  )
}

export default SiteFrame
