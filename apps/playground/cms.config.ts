import { defineCmsConfig } from '@linkcharsoft/cms/core'
import { openingHours } from '@linkcharsoft/cms/core/opening-hours'
import { color } from './src/cms/fields/color'
import { schema } from './src/cms/schema'

const cmsConfig = defineCmsConfig({
  schema,
  basePath: '/dashboard',
  locales: ['es', 'en'],
  defaultLocale: 'es',
  panelLocale: process.env.NEXT_PUBLIC_CMS_PANEL_LOCALE ?? 'es',
  timeZone: 'America/Argentina/Buenos_Aires',
  branding: { name: 'Estudio Norte', footer: { es: 'Soporte: soporte@linkchar.com', en: 'Support: soporte@linkchar.com' } },
  mediaFolders: [
    { value: 'sitio', label: 'Sitio' },
    { value: 'proyectos', label: 'Proyectos' },
    { value: 'blog', label: 'Blog' },
    { value: 'equipo', label: 'Equipo' }
  ],
  fields: [openingHours, color],
  site: { titleTemplate: '%s | Estudio Norte' },
  extensions: [
    { id: 'stats', label: { es: 'Estadísticas', en: 'Statistics' }, icon: 'pi-chart-bar', group: 'admin', path: 'estadisticas' },
    { id: 'guide', label: { es: 'Guía de marca', en: 'Brand guide' }, icon: 'pi-book', href: 'https://linkchar.com' }
  ]
})

declare module '@linkcharsoft/cms/core' {
  interface Register {
    config: typeof cmsConfig
  }
}

export default cmsConfig
