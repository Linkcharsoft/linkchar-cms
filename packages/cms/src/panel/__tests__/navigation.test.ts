import cmsConfig from '@playground/cms.config'
import { color } from '@playground/src/cms/fields/color'
import { describe, expect, it } from 'vitest'
import { defineCmsConfig } from '../../core/config'
import { openingHours } from '../../core/kinds/openingHours'
import { buildPanelNav, collectionTabs, entryNavLabel } from '../shell/navigation'

const withExtensions = defineCmsConfig({
  schema: cmsConfig.schema,
  mediaFolders: cmsConfig.mediaFolders,
  fields: [openingHours, color],
  extensions: [
    { id: 'stats', label: { es: 'Estadísticas', en: 'Stats' }, path: 'estadisticas', group: 'admin', icon: 'pi-chart-bar' },
    { id: 'guide', label: 'Guía', href: 'https://linkchar.com/guia' }
  ]
})

const labels = (config: typeof withExtensions, role: 'editor' | 'admin') =>
  buildPanelNav(config, role).map(group => [group.label, group.items.map(item => item.label)])

describe('buildPanelNav', () => {
  it('builds the menu from the schema', () => {
    const groups = buildPanelNav(cmsConfig, 'admin')
    expect(groups.map(group => group.label)).toEqual([null, 'Contenido', 'Sitio', 'Administración', null])
    expect(groups[1].items.map(item => item.label)).toContain('Páginas')
    expect(groups[3].items.map(item => item.href)).toEqual(['/dashboard/usuarios', '/dashboard/actividad', '/dashboard/estadisticas'])
  })

  it('hides the administration from editors', () => {
    expect(buildPanelNav(cmsConfig, 'editor').map(group => group.label)).not.toContain('Administración')
  })

  it('adds the project extensions to their group for the roles that may see them', () => {
    const admin = buildPanelNav(withExtensions, 'admin')
    expect(admin[3].items.at(-1)).toEqual({ label: 'Estadísticas', href: '/dashboard/estadisticas', icon: 'pi-chart-bar', external: false })
    expect(admin[1].items.at(-1)).toMatchObject({ label: 'Guía', href: 'https://linkchar.com/guia', external: true })
    expect(labels(withExtensions, 'editor').flatMap(([, items]) => items)).not.toContain('Estadísticas')
  })
})

describe('collection navigation', () => {
  it('names entries the way the menu reaches them', () => {
    expect(entryNavLabel(cmsConfig, 'home')).toBe('Páginas › Inicio')
    expect(entryNavLabel(cmsConfig, 'missing')).toBe('missing')
  })

  it('shows a collection and the ones under it as tabs', () => {
    expect(collectionTabs(cmsConfig, 'categories').map(tab => tab.id)).toEqual(['posts', 'categories'])
    expect(collectionTabs(cmsConfig, 'faq')).toEqual([])
  })
})
