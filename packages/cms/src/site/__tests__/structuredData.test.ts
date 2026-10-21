import { describe, expect, it } from 'vitest'
import { blogPosting, breadcrumbs, jsonLdGraph, openingHoursSpecification, organization, website } from '../structuredData'

const site = {
  name: 'Norte',
  url: 'https://norte.com/',
  locale: 'es-AR',
  description: 'Arquitectura que se habita',
  logo: 'https://cdn.test/logo.png',
  email: 'hola@norte.com',
  phone: '',
  sameAs: ['https://instagram.com/norte', null, '']
}

describe('JSON-LD helpers', () => {
  it('describes the organization and the website, leaving empty values out', () => {
    expect(organization(site)).toEqual({
      '@type': 'Organization', '@id': 'https://norte.com/#organization', name: 'Norte', url: 'https://norte.com/',
      logo: 'https://cdn.test/logo.png', email: 'hola@norte.com', sameAs: ['https://instagram.com/norte']
    })
    expect(website(site)).toEqual({
      '@type': 'WebSite', '@id': 'https://norte.com/#website', name: 'Norte', url: 'https://norte.com/',
      description: 'Arquitectura que se habita', inLanguage: 'es-AR', publisher: { '@id': 'https://norte.com/#organization' }
    })
  })

  it('groups the days that share their hours', () => {
    const hours = {
      note: '',
      days: [
        { day: 'mon', closed: false, from: '09:00', to: '18:00' },
        { day: 'tue', closed: false, from: '09:00', to: '18:00' },
        { day: 'sat', closed: false, from: '10:00', to: '13:00' },
        { day: 'sun', closed: true, from: '', to: '' }
      ]
    } as const
    expect(openingHoursSpecification({ ...hours, days: [...hours.days] })).toEqual([
      { '@type': 'OpeningHoursSpecification', dayOfWeek: ['Monday', 'Tuesday'], opens: '09:00', closes: '18:00' },
      { '@type': 'OpeningHoursSpecification', dayOfWeek: ['Saturday'], opens: '10:00', closes: '13:00' }
    ])
  })

  it('writes an article by its author or, without one, by the organization', () => {
    const article = { path: '/blog/casa', title: 'Casa', image: 'https://cdn.test/casa.webp', datePublished: '2026-10-01T00:00:00Z' }
    expect(blogPosting(site, { ...article, author: { kind: 'person', name: 'Ana', jobTitle: 'Arquitecta' } })).toEqual({
      '@type': 'BlogPosting', '@id': 'https://norte.com/blog/casa#article', headline: 'Casa', image: ['https://cdn.test/casa.webp'],
      author: { '@type': 'Person', name: 'Ana', jobTitle: 'Arquitecta' }, publisher: { '@id': 'https://norte.com/#organization' },
      datePublished: '2026-10-01T00:00:00Z', dateModified: '2026-10-01T00:00:00Z', mainEntityOfPage: 'https://norte.com/blog/casa', inLanguage: 'es-AR'
    })
    expect(blogPosting(site, { ...article, locale: 'en' })).toMatchObject({ author: { '@id': 'https://norte.com/#organization' }, inLanguage: 'en' })
  })

  it('numbers the breadcrumbs with absolute URLs', () => {
    expect(breadcrumbs(site, [{ name: 'Inicio', path: '/' }, { name: 'Blog', path: '/blog' }]).itemListElement).toEqual([
      { '@type': 'ListItem', position: 1, name: 'Inicio', item: 'https://norte.com/' },
      { '@type': 'ListItem', position: 2, name: 'Blog', item: 'https://norte.com/blog' }
    ])
  })

  it('joins nodes in one graph, dropping empty ones and the context of standalone nodes', () => {
    const page = { '@context': 'https://schema.org', '@type': 'WebPage', name: 'Inicio' }
    expect(jsonLdGraph(organization(site), [page], null)).toEqual({
      '@context': 'https://schema.org',
      '@graph': [organization(site), { '@type': 'WebPage', name: 'Inicio' }]
    })
  })
})
