import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { expect, test } from '@playwright/test'
import { admin, QA } from './support/db'
import { signIn, toast } from './support/panel'
import type { Page } from '@playwright/test'

const HOME = 'c0000000-0000-0000-0000-000000000001'
const ABOUT = 'c0000000-0000-0000-0000-000000000002'
const POST = 'c0000000-0000-0000-0000-000000000004'

type Row = { id: string, data: Record<string, unknown>, slug: string | null, slugs: Record<string, string> }

const read = async (table: 'documents' | 'published_documents', id: string) =>
  (await admin.from(table).select('id, data, slug, slugs').eq('id', id).single()).data as Row

const restore = async (draft: Row, live: Row & { paths?: unknown }) => {
  await admin.from('documents').update({ data: draft.data, slug: draft.slug, slugs: draft.slugs }).eq('id', draft.id)
  await admin.from('published_documents').update({ data: live.data, slug: live.slug, slugs: live.slugs, ...(live.paths ? { paths: live.paths } : {}) }).eq('id', live.id)
}

test('tells which build it serves, for the panel to confirm a deploy', async ({ request }) => {
  const response = await request.get('/api/cms/build-status')
  expect(response.ok()).toBe(true)
  expect((await response.json()).stamp).toMatch(/^[0-9a-z.]+$/)
  expect(response.headers()['cache-control']).toContain('no-store')
  expect((await request.post('/api/cms/build-status', { data: {} })).status()).toBe(404)
})

const publishAll = async (page: Page) => {
  await signIn(page, QA.super.email)
  await page.goto('/dashboard/publicar')
  await page.waitForLoadState('networkidle')
  await page.locator('[data-tour=publish-button]').click()
  await page.locator('.ConfirmAction').getByRole('button', { name: 'Publicar' }).click()
  await toast(page, 'Cambios publicados')
}

// Pages are static: after a publish the mock build revalidates them, and the next visit renders the new content.
const expectHeading = async (page: Page, path: string, text: string) => {
  await expect.poll(async () => {
    await page.goto(path)
    return page.getByTestId('hero-title').textContent()
  }, { timeout: 20_000 }).toBe(text)
}

test('publishes a different banner per language', async ({ page }) => {
  const [draft, live] = await Promise.all([read('documents', HOME), read('published_documents', HOME)])
  const file = readFileSync(join(__dirname, 'fixtures', 'studio.png'))
  const path = `sitio/e2e-banner-${Date.now()}.png`
  await admin.storage.from('media').upload(path, file, { contentType: 'image/png' })
  const { data: media } = await admin.from('media')
    .insert({ path, filename: 'studio.png', folder: 'sitio', mime: 'image/png', size: file.length, width: 160, height: 120, alt: { es: 'E2E Estudio', en: 'E2E Studio' } })
    .select('id').single()

  const hero = draft.data.hero as Record<string, unknown>
  await admin.from('documents').update({
    data: { ...draft.data, hero: { ...hero, title: { es: 'E2E Casas con luz', en: 'E2E Homes full of light' }, cover: { es: media!.id } } }
  }).eq('id', HOME)

  try {
    await publishAll(page)
    await expectHeading(page, '/', 'E2E Casas con luz')
    await expectHeading(page, '/en', 'E2E Homes full of light')
    await expect(page.locator('main img')).toHaveAttribute('alt', 'E2E Studio')
  } finally {
    await restore(draft, live)
    await admin.from('media').delete().eq('id', media!.id)
    await admin.storage.from('media').remove([path])
  }
})

test('a missing translation keeps a post out of the publication', async ({ page }) => {
  const doc = (text: string) => ({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text }] }] })
  const { data: post } = await admin.from('documents').insert({
    type: 'posts', slug: 'e2e-solo-castellano', slugs: { es: 'e2e-solo-castellano' }, visible: true,
    data: { title: { es: 'E2E Solo en castellano', en: '' }, slug: { es: 'e2e-solo-castellano', en: '' }, body: { es: doc('Hola'), en: null } }
  }).select('id').single()

  try {
    await signIn(page, QA.super.email)
    await page.goto('/dashboard/publicar')
    await page.waitForLoadState('networkidle')
    const item = page.locator('[data-tour=publish-pending] li').filter({ hasText: 'E2E Solo en castellano' })
    await expect(item).toContainText('No se publica hasta completar: Título (Inglés), Dirección (Inglés) y Texto (Inglés).')
  } finally {
    await admin.from('documents').delete().eq('id', post!.id)
  }
})

// The site's Sass applies the project's own screens and colors, which the panel's Tailwind config doesn't have.
test('the site styles compile with the project theme, not the panel one', async ({ page }) => {
  const header = page.getByTestId('site-header')
  await page.goto('/')
  await expect(header).toHaveCSS('background-color', 'rgba(18, 14, 28, 0.92)')
  await expect(header).toHaveCSS('padding-left', '48px')
  await page.setViewportSize({ width: 600, height: 800 })
  await expect(header).toHaveCSS('flex-direction', 'column')
})

test('the sitemap lists every page in both languages', async ({ request }) => {
  const sitemap = await (await request.get('/sitemap.xml')).text()
  expect(sitemap).toContain('<loc>http://localhost:3100/blog/luz-natural</loc>')
  expect(sitemap).toContain('<loc>http://localhost:3100/en/blog/natural-light</loc>')
  expect(sitemap).toContain('<xhtml:link rel="alternate" hreflang="en" href="http://localhost:3100/en/studio" />')
})

test('the home describes the studio, the site and the page in one JSON-LD graph', async ({ page }) => {
  await page.goto('/en')
  const data = JSON.parse(await page.locator('script[type="application/ld+json"]').textContent() ?? '{}')
  expect(data['@context']).toBe('https://schema.org')
  expect(data['@graph'].map((node: { '@type': string }) => node['@type'])).toEqual(['Organization', 'WebSite', 'WebPage'])
  expect(data['@graph'][1]).toMatchObject({ name: 'Estudio Norte', url: 'http://localhost:3100/', inLanguage: 'en' })
  expect(data['@graph'][2]['@context']).toBeUndefined()
})

test('a page without its own description takes the site tagline in its language', async ({ page }) => {
  await page.goto('/en/studio')
  await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', 'Architecture and interiors')
  await expect(page.locator('meta[property="og:description"]')).toHaveAttribute('content', 'Architecture and interiors')
})

test('a new slug in each language leaves a 301 per language', async ({ page }) => {
  const [draft, live] = await Promise.all([read('documents', POST), read('published_documents', POST)])
  const livePaths = (await admin.from('published_documents').select('paths').eq('id', POST).single()).data!.paths
  await admin.from('documents').update({
    slug: 'e2e-mas-luz',
    slugs: { es: 'e2e-mas-luz', en: 'e2e-more-light' },
    data: { ...draft.data, slug: { es: 'e2e-mas-luz', en: 'e2e-more-light' } }
  }).eq('id', POST)

  try {
    await publishAll(page)
    const { data } = await admin.from('redirects').select('from_path, to_path, status').in('from_path', ['/blog/luz-natural', '/en/blog/natural-light']).order('from_path')
    expect(data).toEqual([
      { from_path: '/blog/luz-natural', to_path: '/blog/e2e-mas-luz', status: 301 },
      { from_path: '/en/blog/natural-light', to_path: '/en/blog/e2e-more-light', status: 301 }
    ])
  } finally {
    await admin.from('redirects').delete().in('from_path', ['/blog/luz-natural', '/en/blog/natural-light'])
    await restore(draft, { ...live, paths: livePaths })
  }
})

test('the preview shows the draft only to someone signed in to the panel', async ({ page, browser }) => {
  const draft = await read('documents', ABOUT)
  const story = draft.data.story as Record<string, unknown>
  await admin.from('documents').update({ data: { ...draft.data, story: { ...story, title: { es: 'E2E Borrador', en: 'E2E Draft' } } } }).eq('id', ABOUT)

  try {
    await signIn(page, QA.super.email)
    await page.goto('/api/cms/draft?path=%2Fen%2Fstudio')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('E2E Draft')

    const visitor = await browser.newPage()
    await visitor.goto('/en/studio')
    await expect(visitor.getByRole('heading', { level: 1 })).toHaveText('A studio in the north')
    await visitor.close()
  } finally {
    await admin.from('documents').update({ data: draft.data }).eq('id', ABOUT)
  }
})
