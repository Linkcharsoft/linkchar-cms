import cmsConfig from '@playground/cms.config'
import { describe, expect, it } from 'vitest'
import { actionsInGroup, ACTIVITY_ACTIONS, ACTIVITY_GROUPS, isActivityGroup } from '../activity'
import { defineCmsConfig } from '../config'
import { panelPaths } from '../paths'

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
    expect(paths.publicPaths).toContain('/admin/auth')
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

describe('activity groups', () => {
  it('puts every action in a known group', () => {
    for (const group of Object.values(ACTIVITY_ACTIONS)) expect(ACTIVITY_GROUPS).toContain(group)
    expect(actionsInGroup('users')).toContain('user.invite')
    expect(actionsInGroup('account')).toEqual(expect.arrayContaining(['auth.login', 'profile.update']))
    expect(isActivityGroup('media')).toBe(true)
    expect(isActivityGroup('medios')).toBe(false)
  })
})
