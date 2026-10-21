import { textContext } from '../core/config'
import { getEntry } from '../core/entries'
import { resolveText } from '../core/text'
import { absoluteUrl, alternates } from '../core/urls'
import { dataFields } from '../core/walk'
import type { SiteDocumentType, SiteImageType } from './types'
import type { CmsConfigType } from '../core/config'
import type { Metadata } from 'next'

interface SeoValuesType {
  title: string
  description: string
  image: SiteImageType | null
}

export type SiteDefaultValuesType = Omit<SeoValuesType, 'title'>

const text = (value: unknown) => (typeof value === 'string' ? value.trim() : '')

// The SEO section's own title and description, else the fields it falls back to, else the entry's name.
export const seoOf = (config: CmsConfigType, document: SiteDocumentType): SeoValuesType => {
  const entry = getEntry(config, document.entry)
  const content = document.content as Record<string, unknown>
  const found = entry ? dataFields(entry.fields).find(([, field]) => field.kind === 'group' && !!field.seo) : undefined
  const seo = found ? (content[found[0]] ?? {}) as Record<string, unknown> : {}
  const mark = found?.[1].kind === 'group' ? found[1].seo ?? {} : {}
  const name = !entry ? '' : entry.kind === 'collection' ? text(content[entry.titleField]) : resolveText(entry.label, textContext(config, document.locale))

  return {
    title: text(seo.title) || (mark.titleFrom ? text(content[mark.titleFrom]) : '') || name,
    description: text(seo.description) || (mark.descriptionFrom ? text(content[mark.descriptionFrom]) : ''),
    image: (seo.image as SiteImageType | null | undefined) ?? null
  }
}

// The site defaults (site.defaults in the config) read from their entry in the document's locale.
export const siteDefaultValues = (config: CmsConfigType, defaults: SiteDocumentType): SiteDefaultValuesType => {
  const ref = config.site.defaults
  const content = defaults.content as Record<string, unknown>
  return {
    description: ref?.description ? text(content[ref.description]) : '',
    image: ref?.image ? (content[ref.image] as SiteImageType | null | undefined) ?? null : null
  }
}

// generateMetadata for a page or document: title with the site template, canonical, hreflang, Open Graph and the site defaults.
export const documentMetadata = (config: CmsConfigType, document: SiteDocumentType, defaults?: SiteDefaultValuesType): Metadata => {
  const { title, ...own } = seoOf(config, document)
  const description = own.description || defaults?.description || ''
  const image = own.image ?? defaults?.image ?? null
  const links = alternates(config, document.urls, document.locale)
  const isArticle = getEntry(config, document.entry)?.kind === 'collection'
  return {
    title: { absolute: config.site.titleTemplate.replace('%s', title) },
    ...(description ? { description } : {}),
    alternates: { canonical: links.canonical, languages: links.languages },
    openGraph: {
      title,
      ...(description ? { description } : {}),
      ...(links.canonical ? { url: links.canonical } : {}),
      locale: document.locale,
      type: isArticle ? 'article' : 'website',
      ...(image ? { images: [{ url: image.src, alt: image.alt, ...(image.width ? { width: image.width } : {}), ...(image.height ? { height: image.height } : {}) }] } : {})
    }
  }
}

// schema.org data for a page (WebPage) or a collection document (Article), in the page's language.
export const documentJsonLd = (config: CmsConfigType, document: SiteDocumentType, type?: string) => {
  const { title, description, image } = seoOf(config, document)
  const isArticle = getEntry(config, document.entry)?.kind === 'collection'
  return {
    '@context': 'https://schema.org',
    '@type': type ?? (isArticle ? 'Article' : 'WebPage'),
    [isArticle ? 'headline' : 'name']: title,
    ...(description ? { description } : {}),
    ...(document.path ? { url: absoluteUrl(config, document.path) } : {}),
    inLanguage: document.locale,
    ...(image ? { image: image.src } : {}),
    ...(document.publishedAt ? { datePublished: document.publishedAt } : {})
  }
}
