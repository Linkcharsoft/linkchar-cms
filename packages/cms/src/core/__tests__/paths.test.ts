import cmsConfig from '@playground/cms.config'
import { describe, expect, it } from 'vitest'
import { actionsInGroup, ACTIVITY_ACTIONS, ACTIVITY_GROUPS, isActivityGroup } from '../activity'
import { defineCmsConfig } from '../config'
import { panelPaths } from '../paths'
import { resolveEntryPath, slugPrefix } from '../preview'

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

describe('entry paths', () => {
  it('returns fixed pages as they are', () => {
    expect(resolveEntryPath('/')).toBe('/')
    expect(resolveEntryPath(undefined)).toBeNull()
  })

  it('fills the slug of collection documents', () => {
    expect(resolveEntryPath('/blog/:slug', 'mi-post')).toBe('/blog/mi-post')
    expect(resolveEntryPath('/blog/:slug', 'año nuevo')).toBe('/blog/a%C3%B1o%20nuevo')
    expect(resolveEntryPath('/blog/:slug', '  ')).toBeNull()
    expect(resolveEntryPath('/blog/:slug', null)).toBeNull()
  })

  it('derives the slug prefix of collection paths', () => {
    expect(slugPrefix('/blog/:slug')).toBe('/blog/')
    expect(slugPrefix('/')).toBeNull()
    expect(slugPrefix(undefined)).toBeNull()
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
