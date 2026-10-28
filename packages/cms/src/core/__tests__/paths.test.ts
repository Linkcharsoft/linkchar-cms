import cmsConfig from '@playground/cms.config'
import { describe, expect, it } from 'vitest'
import { actionsInGroup, ACTIVITY_ACTIONS, ACTIVITY_GROUPS, isActivityGroup } from '../activity'
import { defineCmsConfig } from '../config'
import { panelPaths, safePanelPath } from '../paths'

describe('panelPaths', () => {
  it('builds every panel URL under basePath', () => {
    const paths = panelPaths(defineCmsConfig({ schema: {}, basePath: '/admin' }))
    expect(paths.home).toBe('/admin')
    expect(paths.publish).toBe('/admin/publicar')
    expect(paths.page('home', 'hero')).toBe('/admin/paginas/home#hero')
    expect(paths.entry('collection', 'posts')).toBe('/admin/colecciones/posts')
    expect(paths.entry('collection', 'posts', 'p1')).toBe('/admin/colecciones/posts/p1')
    expect(paths.entry('singleton', 'settings')).toBe('/admin/sitio/settings')
    expect(paths.publishItem('p1')).toBe('/admin/publicar?doc=p1')
    expect(paths.field('page', 'home', undefined, { field: 'hero.title', locale: 'es' })).toBe('/admin/paginas/home#hero.title')
    expect(paths.field('collection', 'posts', 'p1', { field: 'title', locale: null })).toBe('/admin/colecciones/posts/p1#title')
    expect(paths.publicPaths).toContain('/admin/auth')
    expect(paths.siteHome).toBe('/')
  })

  it('points at the front page of a site that prefixes its default locale', () => {
    expect(panelPaths(defineCmsConfig({ schema: {}, locales: ['es', 'en'], prefixDefaultLocale: true })).siteHome).toBe('/es')
  })

  it('opens a field in another language with the locale in the query', () => {
    const paths = panelPaths(defineCmsConfig({ schema: {}, locales: ['es', 'en'] }))
    expect(paths.field('singleton', 'settings', undefined, { field: 'contact.note', locale: 'en' })).toBe('/dashboard/sitio/settings?locale=en#contact.note')
  })

  it('uses the configured segments', () => {
    const paths = panelPaths(defineCmsConfig({ schema: {}, paths: { pages: 'pages', publish: 'publish', login: 'sign-in' } }))
    expect(paths.page('home')).toBe('/dashboard/pages/home')
    expect(paths.publishItem()).toBe('/dashboard/publish')
    expect(paths.trash).toBe('/dashboard/papelera')
    expect(paths.guestOnlyPaths).toEqual(['/dashboard/sign-in', '/dashboard/recuperar-contrasena'])
    expect(paths.signout).toBe('/dashboard/auth/signout')
  })

  it('is built once per config', () => {
    expect(panelPaths(cmsConfig)).toBe(panelPaths(cmsConfig))
  })
})

describe('safePanelPath', () => {
  it('keeps panel screens with their query and hash', () => {
    expect(safePanelPath('/dashboard/paginas/home?locale=en#hero.title', cmsConfig)).toBe('/dashboard/paginas/home?locale=en#hero.title')
    expect(safePanelPath('/dashboard/publicar?doc=p1', cmsConfig)).toBe('/dashboard/publicar?doc=p1')
  })

  it('rejects other origins, the site, the guest screens and the home itself', () => {
    const rejected = [
      null, '', 'https://evil.test/dashboard', '//evil.test', '/', '/blog/casa', '/dashboardx', '/dashboard', '/dashboard/login?error=sesion',
      '/dashboard/auth/signout', '/dashboard/verificacion', '/dashboard/invitacion', '/dashboard/restablecer-contrasena', '/dashboard\\x'
    ]
    for (const value of rejected) expect(safePanelPath(value, cmsConfig)).toBeNull()
  })
})

describe('activity groups', () => {
  it('puts every action in a known group', () => {
    for (const group of Object.values(ACTIVITY_ACTIONS)) expect(ACTIVITY_GROUPS).toContain(group)
    expect(actionsInGroup('users')).toContain('user.invite')
    expect(actionsInGroup('account')).toEqual(expect.arrayContaining(['auth.login', 'profile.update']))
    expect(isActivityGroup('media')).toBe(true)
    expect(isActivityGroup('medios')).toBe(false)
  })
})
