import { afterEach, describe, expect, it } from 'vitest'
import { defineCmsConfig } from '../../../core/config'
import { page } from '../../../core/define'
import { section, text } from '../../../core/fields'
import { rootLayout } from '../root'
import type { CmsServerType } from '../../../server/next'

const schema = { home: page('Inicio', { hero: section('Portada', { title: text({ label: 'Título' }) }) }, { path: '/' }) }
const previous = process.env.CMS_BRAND_ICON

const metadataOf = (icon?: string) => {
  const config = defineCmsConfig({ schema, branding: { name: 'Norte', ...(icon ? { icon } : {}) } })
  return rootLayout({ config } as unknown as CmsServerType, () => null).metadata
}

describe('rootLayout metadata', () => {
  afterEach(() => {
    if (previous === undefined) delete process.env.CMS_BRAND_ICON
    else process.env.CMS_BRAND_ICON = previous
  })

  it('takes the icon withCms found as the favicon, and a PNG as the apple-touch-icon', () => {
    process.env.CMS_BRAND_ICON = '/seo/favicon512.png'
    expect(metadataOf()).toEqual({
      title: { template: '%s · Norte', default: expect.any(String) },
      robots: { index: false, follow: false },
      icons: { icon: [{ url: '/seo/favicon512.png', type: 'image/png' }], apple: '/seo/favicon512.png' }
    })
  })

  it('takes branding.icon over the one withCms found, as an https URL', () => {
    process.env.CMS_BRAND_ICON = '/icon.svg'
    expect(metadataOf('https://cdn.test/norte.svg?v=2').icons).toEqual({ icon: [{ url: 'https://cdn.test/norte.svg?v=2', type: 'image/svg+xml' }] })
    expect(metadataOf('https://cdn.test/norte').icons).toEqual({ icon: [{ url: 'https://cdn.test/norte' }] })
  })

  it('leaves the tab without a favicon when there is no icon, keeping title and robots', () => {
    delete process.env.CMS_BRAND_ICON
    const metadata = metadataOf()
    expect(metadata).not.toHaveProperty('icons')
    expect(metadata).toMatchObject({ title: { template: '%s · Norte' }, robots: { index: false, follow: false } })
  })
})
