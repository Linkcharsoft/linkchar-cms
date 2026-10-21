import type { OpeningHoursValueType, WeekDayType } from '../core/kinds/openingHours'

export type JsonLdNodeType = Record<string, unknown>

export interface JsonLdSiteType {
  name: string
  // Origin of the site ("https://acme.com"); paths are made absolute against it.
  url: string
  // BCP 47 tag for inLanguage ("es", "es-AR").
  locale: string
  description?: string
  logo?: string | null
  email?: string
  phone?: string
  sameAs?: (string | null | undefined)[]
}

export interface JsonLdArticleType {
  path: string
  title: string
  description?: string
  image?: string | null
  author?: { kind: 'person' | 'organization', name: string, jobTitle?: string, image?: string | null } | null
  datePublished?: string | null
  dateModified?: string | null
  // Defaults to the site's.
  locale?: string
}

const SCHEMA_DAYS: Record<WeekDayType, string> = {
  mon: 'Monday',
  tue: 'Tuesday',
  wed: 'Wednesday',
  thu: 'Thursday',
  fri: 'Friday',
  sat: 'Saturday',
  sun: 'Sunday'
}

// Empty values are left out: schema.org validators flag empty strings and arrays.
const compact = (node: JsonLdNodeType): JsonLdNodeType =>
  Object.fromEntries(Object.entries(node).filter(([, value]) => value !== undefined && value !== null && value !== '' && !(Array.isArray(value) && value.length === 0)))

const absolute = (site: JsonLdSiteType, path: string) => (/^https?:\/\//.test(path) ? path : `${site.url.replace(/\/$/, '')}${path}`)

const organizationId = (site: JsonLdSiteType) => `${absolute(site, '/')}#organization`

export const organization = (site: JsonLdSiteType): JsonLdNodeType => compact({
  '@type': 'Organization',
  '@id': organizationId(site),
  name: site.name,
  url: absolute(site, '/'),
  logo: site.logo,
  email: site.email,
  telephone: site.phone,
  sameAs: site.sameAs?.filter(Boolean)
})

export const website = (site: JsonLdSiteType): JsonLdNodeType => compact({
  '@type': 'WebSite',
  '@id': `${absolute(site, '/')}#website`,
  name: site.name,
  url: absolute(site, '/'),
  description: site.description,
  inLanguage: site.locale,
  publisher: { '@id': organizationId(site) }
})

// Days sharing the same hours become one specification, as Google shows them.
export const openingHoursSpecification = (hours: OpeningHoursValueType): JsonLdNodeType[] => {
  const groups = new Map<string, string[]>()
  for (const day of hours.days) {
    if (day.closed || !day.from || !day.to) continue
    const key = `${day.from}-${day.to}`
    groups.set(key, [...(groups.get(key) ?? []), SCHEMA_DAYS[day.day]])
  }
  return [...groups].map(([key, days]) => {
    const [opens, closes] = key.split('-')
    return { '@type': 'OpeningHoursSpecification', dayOfWeek: days, opens, closes }
  })
}

const articleAuthor = ({ kind, name, jobTitle, image }: NonNullable<JsonLdArticleType['author']>): JsonLdNodeType =>
  kind === 'organization'
    ? compact({ '@type': 'Organization', name, description: jobTitle, logo: image })
    : compact({ '@type': 'Person', name, jobTitle, image })

// Without an author the article is the organization's.
export const blogPosting = (site: JsonLdSiteType, article: JsonLdArticleType): JsonLdNodeType => compact({
  '@type': 'BlogPosting',
  '@id': `${absolute(site, article.path)}#article`,
  headline: article.title,
  description: article.description,
  image: article.image ? [article.image] : undefined,
  author: article.author ? articleAuthor(article.author) : { '@id': organizationId(site) },
  publisher: { '@id': organizationId(site) },
  datePublished: article.datePublished,
  dateModified: article.dateModified ?? article.datePublished,
  mainEntityOfPage: absolute(site, article.path),
  inLanguage: article.locale ?? site.locale
})

export const breadcrumbs = (site: JsonLdSiteType, items: { name: string, path: string }[]): JsonLdNodeType => ({
  '@type': 'BreadcrumbList',
  itemListElement: items.map((item, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    name: item.name,
    item: absolute(site, item.path)
  }))
})

// One script for several nodes; also takes what cms.site.jsonLd() returns, without its own @context.
export const jsonLdGraph = (...nodes: (JsonLdNodeType | JsonLdNodeType[] | null | undefined)[]) => ({
  '@context': 'https://schema.org',
  '@graph': nodes.flat().filter((node): node is JsonLdNodeType => !!node).map(node => Object.fromEntries(Object.entries(node).filter(([key]) => key !== '@context')))
})
