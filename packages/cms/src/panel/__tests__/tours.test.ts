import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import cmsConfig from '@playground/cms.config'
import { describe, expect, it } from 'vitest'
import { defineCmsConfig } from '../../core/config'
import { collection } from '../../core/define'
import { text } from '../../core/kinds/strings'
import { buildPanelNav } from '../shell/navigation'
import { isEditing } from '../tours/focus'
import { buildTours, TOUR_IDS, tourAnchor, tourForPath } from '../tours/tours'

const tours = buildTours(cmsConfig)
const tour = (id: string) => tours.find(item => item.id === id)!
const descriptions = (id: string) => tour(id).steps.map(step => step.description).join(' ')

describe('guided tours', () => {
  it('have unique, known ids and at least one step each', () => {
    expect(tours.map(item => item.id)).toEqual([...TOUR_IDS])
    for (const item of tours) expect(item.steps.length).toBeGreaterThan(0)
  })

  it('start on the screen they describe', () => {
    for (const item of tours) if (item.path) expect(tourForPath(tours, item.path)?.id).toBe(item.id)
  })

  it('pick the tour for each panel screen', () => {
    expect(tourForPath(tours, '/dashboard')?.id).toBe('welcome')
    expect(tourForPath(tours, '/dashboard/paginas')?.id).toBe('pages')
    expect(tourForPath(tours, '/dashboard/paginas/about')?.id).toBe('page-editor')
    expect(tourForPath(tours, '/dashboard/sitio/settings')?.id).toBe('site')
    expect(tourForPath(tours, '/dashboard/colecciones/faq')?.id).toBe('collection')
    expect(tourForPath(tours, '/dashboard/colecciones/posts/123')?.id).toBe('document')
    expect(tourForPath(tours, '/dashboard/media')?.id).toBe('media')
    expect(tourForPath(tours, '/dashboard/papelera')).toBeNull()
    expect(tourForPath(tours, '/dashboard/usuarios')).toBeNull()
  })

  it('replay on the first entry of each kind in the schema', () => {
    expect(tour('page-editor').path).toBe('/dashboard/paginas/home')
    expect(tour('site').path).toBe('/dashboard/sitio/settings')
    expect(tour('collection').path).toBe('/dashboard/colecciones/projects')
    expect(tour('document').path).toBeNull()
  })

  it('name menu places and routes through the navigation, never by hand', () => {
    const source = readFileSync(join(process.cwd(), 'src/panel/tours/tours.ts'), 'utf8')
    expect(source).not.toContain('›')
    expect(source).not.toMatch(/['`]\/dashboard/)

    const welcome = descriptions('welcome')
    for (const group of buildPanelNav(cmsConfig, 'editor').filter(item => item.label)) {
      expect(welcome).toContain(group.label)
      for (const item of group.items) expect(welcome).toContain(item.label)
    }
    expect(descriptions('collection')).toContain('Blog › Categorías')
    expect(descriptions('pages')).toContain('Proyectos')
  })

  it('skip the tours and steps the schema has no place for', () => {
    const notes = defineCmsConfig({
      schema: { notes: collection('Notas', { title: text({ label: 'Título' }) }, { singularLabel: 'Nota', titleField: 'title' }) }
    })
    const ids = buildTours(notes).map(item => item.id)
    expect(ids).not.toContain('pages')
    expect(ids).not.toContain('page-editor')
    expect(ids).not.toContain('site')
    expect(ids).toContain('collection')

    const welcome = buildTours(notes).find(item => item.id === 'welcome')!
    expect(welcome.steps.map(step => step.anchor)).not.toContain('overview-pages')
    expect(welcome.steps.find(step => step.anchor === 'nav')?.description).not.toContain('Sitio')
    expect(buildTours(defineCmsConfig({ schema: {} })).map(item => item.id)).toEqual(['welcome', 'media', 'publish', 'account'])
  })

  it('speak the panel language', () => {
    const english = buildTours({ ...cmsConfig, panelLocale: 'en' })
    expect(english[0].title).toBe('First tour of the panel')
    expect(english[0].steps.find(step => step.anchor === 'nav')?.description).toContain('Pages')
  })

  it('build attribute selectors', () => {
    expect(tourAnchor('nav')).toBe('[data-tour="nav"]')
  })

  it('place each card beside a small anchor, never over a tall wrapper', () => {
    const anchored = tours.flatMap(item => item.steps).filter(step => step.anchor)
    for (const step of anchored) expect(step.side, step.anchor).toBeDefined()
    expect(anchored.map(step => step.anchor)).not.toEqual(expect.arrayContaining(['form', 'pages-list', 'collection-list']))
    expect(tour('welcome').steps.find(step => step.anchor === 'nav')).toMatchObject({ side: 'right', align: 'start' })
    expect(tour('page-editor').steps.find(step => step.anchor === 'preview')).toMatchObject({ side: 'bottom', align: 'end' })
    expect(tour('page-editor').steps.map(step => step.anchor)).toContain('section')
    expect(tour('document').steps.map(step => step.anchor)).toContain('field')
  })
})

describe('isEditing', () => {
  const element = (tag: string, inForm = false) => ({
    matches: (selector: string) => selector.split(', ').some(part => part.startsWith(tag)),
    closest: (selector: string) => (inForm && selector === '[data-tour="form"]' ? {} : null)
  })

  it('is true inside fields and the editor form, false elsewhere', () => {
    expect(isEditing(null)).toBe(false)
    expect(isEditing(element('a'))).toBe(false)
    expect(isEditing(element('input'))).toBe(true)
    expect(isEditing(element('textarea'))).toBe(true)
    expect(isEditing(element('[contenteditable]'))).toBe(true)
    expect(isEditing(element('button', true))).toBe(true)
  })
})
