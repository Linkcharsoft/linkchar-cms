import { isRecord } from './kinds/shared'
import type { CmsConfigType } from './config'

// One pattern for every locale, or one per locale ({ es: '/proyectos/:slug', en: '/projects/:slug' }).
export type EntryPathType = string | Readonly<Record<string, string>>

interface PathOwnerType {
  kind: string
  path?: EntryPathType
  slugField?: string
}

export type LocaleUrlsType = Partial<Record<string, string>>

// What publish_site needs per locale to build URLs and redirects; always computed on the server from the schema.
export type PublishUrlType = { prefix: string, primary: boolean } | { path: string }

const SLUG = ':slug'

// The default locale has no prefix unless prefixDefaultLocale: "/blog/casa", "/en/blog/house".
export const localePrefix = (config: CmsConfigType, locale: string) =>
  (locale === config.defaultLocale && !config.prefixDefaultLocale ? '' : `/${locale}`)

const withPrefix = (config: CmsConfigType, locale: string, path: string) => {
  const prefix = localePrefix(config, locale)
  return prefix && path === '/' ? prefix : `${prefix}${path}`
}

export const pathPattern = (entry: PathOwnerType, locale: string): string | null => {
  if (!entry.path) return null
  return typeof entry.path === 'string' ? entry.path : entry.path[locale] ?? null
}

// "/en/blog/house"; null without a path, or while a needed slug is still empty.
export const entryPath = (config: CmsConfigType, entry: PathOwnerType, { locale = config.defaultLocale, slug }: { locale?: string, slug?: unknown } = {}) => {
  const pattern = pathPattern(entry, locale)
  if (!pattern) return null
  if (!pattern.endsWith(SLUG)) return withPrefix(config, locale, pattern)
  if (typeof slug !== 'string' || !slug.trim()) return null
  return withPrefix(config, locale, `${pattern.slice(0, -SLUG.length)}${encodeURIComponent(slug.trim())}`)
}

// "/en/blog/": where a collection's documents live in a locale; null for entries without ":slug".
export const slugPrefixFor = (config: CmsConfigType, entry: PathOwnerType, locale: string) => {
  const pattern = pathPattern(entry, locale)
  return pattern?.endsWith(SLUG) ? withPrefix(config, locale, pattern.slice(0, -SLUG.length)) : null
}

// Each locale's slug of a document; a slug field that isn't translated gives the same slug in every locale.
export const slugsOf = (config: CmsConfigType, entry: PathOwnerType, data: unknown): Record<string, string> => {
  const stored = entry.slugField && isRecord(data) ? data[entry.slugField] : undefined
  if (typeof stored === 'string') return stored ? Object.fromEntries(config.locales.map(locale => [locale, stored])) : {}
  if (!isRecord(stored)) return {}
  return Object.fromEntries(config.locales.flatMap(locale => {
    const slug = stored[locale]
    return typeof slug === 'string' && slug ? [[locale, slug]] : []
  }))
}

// The URL of an entry or document in every locale it can be reached in.
export const entryUrls = (config: CmsConfigType, entry: PathOwnerType, slugs: LocaleUrlsType = {}): Record<string, string> =>
  Object.fromEntries(config.locales.flatMap(locale => {
    const path = entryPath(config, entry, { locale, slug: slugs[locale] })
    return path ? [[locale, path]] : []
  }))

export const publishUrls = (config: CmsConfigType, entry: PathOwnerType): Record<string, PublishUrlType> =>
  Object.fromEntries(config.locales.flatMap((locale): [string, PublishUrlType][] => {
    const prefix = slugPrefixFor(config, entry, locale)
    if (prefix) return [[locale, { prefix, primary: locale === config.defaultLocale }]]
    const path = pathPattern(entry, locale) ? entryPath(config, entry, { locale }) : null
    return path ? [[locale, { path }]] : []
  }))

// Without site.url the paths stay relative.
export const absoluteUrl = (config: CmsConfigType, path: string) => (config.site.url ? `${config.site.url}${path}` : path)

// Canonical and hreflang links of a page in one locale; x-default is the default locale's URL.
export const alternates = (config: CmsConfigType, urls: Record<string, string>, locale: string) => {
  const languages = Object.fromEntries(Object.entries(urls).map(([code, path]) => [code, absoluteUrl(config, path)]))
  const fallback = urls[config.defaultLocale]
  return {
    canonical: urls[locale] ? absoluteUrl(config, urls[locale]) : null,
    languages: fallback ? { ...languages, 'x-default': absoluteUrl(config, fallback) } : languages
  }
}

const PATTERN = /^\/((?:[a-z0-9]+(?:-[a-z0-9]+)*\/)*(?:[a-z0-9]+(?:-[a-z0-9]+)*|:slug))?$/

export interface LocaleRulesType {
  locales: readonly string[]
  defaultLocale: string
  prefixDefaultLocale: boolean
}

// Problems of one entry's path for defineCmsConfig, as messages; patterns are collected to catch two entries on one URL.
export const pathProblems = (id: string, entry: PathOwnerType, { locales, defaultLocale, prefixDefaultLocale }: LocaleRulesType, taken: Map<string, string>, option = 'path') => {
  if (!entry.path) return []
  const problems: string[] = []
  const name = `${id}.${option}`
  if (typeof entry.path !== 'string' && !locales.every(locale => Object.hasOwn(entry.path as object, locale))) {
    problems.push(`${name} needs one pattern per locale (${locales.join(', ')}).`)
  }
  for (const locale of locales) {
    const pattern = pathPattern(entry, locale)
    if (!pattern) continue
    if (!PATTERN.test(pattern)) {
      problems.push(`${name} "${pattern}" must start with / and use lowercase segments, with :slug only at the end.`)
      continue
    }
    const hasSlug = pattern.endsWith(SLUG)
    if (entry.kind === 'collection' && (!hasSlug || !entry.slugField)) problems.push(`${name} "${pattern}" needs :slug at the end and a slugField.`)
    if (entry.kind !== 'collection' && hasSlug) problems.push(`${name} "${pattern}" can't use :slug: only collections have one page per document.`)
    const first = pattern.split('/')[1]
    if (prefixDefaultLocale && locales.includes(first)) {
      problems.push(`${name} "${pattern}" starts with a locale: with prefixDefaultLocale it would be "/${locale}${pattern}".`)
    } else if (!prefixDefaultLocale && locale === defaultLocale && first !== locale && locales.includes(first)) {
      problems.push(`${name} "${pattern}" starts with another locale's prefix.`)
    }
    const key = `${locale} ${pattern}`
    const owner = taken.get(key)
    if (owner && owner !== id) problems.push(`${name} "${pattern}" is also the path of ${owner}.`)
    taken.set(key, id)
  }
  return [...new Set(problems)]
}
