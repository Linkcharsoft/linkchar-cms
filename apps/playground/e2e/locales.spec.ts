import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { expect, test } from '@playwright/test'
import { admin, QA } from './support/db'
import { autosaved, signIn, toast, watchConsole } from './support/panel'
import type { Page } from '@playwright/test'

const HOME = 'c0000000-0000-0000-0000-000000000001'

type Row = { id: string, data: Record<string, unknown>, slug: string | null, slugs: Record<string, string> }

const read = async (table: 'documents' | 'published_documents', id: string) =>
  (await admin.from(table).select('id, data, slug, slugs').eq('id', id).single()).data as Row

const restore = async (draft: Row, live: Row) => {
  await admin.from('documents').update({ data: draft.data, slug: draft.slug, slugs: draft.slugs }).eq('id', draft.id)
  await admin.from('published_documents').update({ data: live.data, slug: live.slug, slugs: live.slugs }).eq('id', live.id)
}

const updateHome = async (draft: Row, change: (data: Record<string, Record<string, unknown>>) => void) => {
  const data = structuredClone(draft.data) as Record<string, Record<string, unknown>>
  change(data)
  await admin.from('documents').update({ data }).eq('id', HOME)
}

const homeCover = async () => ((await read('documents', HOME)).data.hero as Record<string, unknown>).cover

const uploaded: { id: string, path: string }[] = []

const upload = async (name: string, alt: Record<string, string>) => {
  const file = readFileSync(join(__dirname, 'fixtures', 'studio.png'))
  const path = `sitio/${name}-${Date.now()}.png`
  await admin.storage.from('media').upload(path, file, { contentType: 'image/png' })
  const { data } = await admin.from('media')
    .insert({ path, filename: `${name}.png`, folder: 'sitio', mime: 'image/png', size: file.length, width: 160, height: 120, alt })
    .select('id').single()
  uploaded.push({ id: data!.id, path })
  return data!.id as string
}

test.afterAll(async () => {
  if (uploaded.length === 0) return
  await admin.from('media').delete().in('id', uploaded.map(item => item.id))
  await admin.storage.from('media').remove(uploaded.map(item => item.path))
})

const openEditor = async (page: Page, path: string) => {
  await page.goto(path)
  await page.waitForLoadState('networkidle')
}

const doc = (text: string) => ({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text }] }] })

const insertSpanishPost = async () => (await admin.from('documents').insert({
  type: 'posts', slug: 'e2e-solo-espanol', slugs: { es: 'e2e-solo-espanol' }, visible: true,
  data: { title: { es: 'E2E Solo en español', en: '' }, slug: { es: 'e2e-solo-espanol', en: '' }, body: { es: doc('Hola'), en: null } }
}).select('id').single()).data!.id as string

test('the language selector and the page outline count what is missing per language', async ({ page }) => {
  const post = await insertSpanishPost()
  const draft = await read('documents', HOME)
  await updateHome(draft, data => {
    data.hero.title = { es: 'Arquitectura que se habita', en: '' }
  })

  try {
    await signIn(page, QA.super.email)
    await openEditor(page, `/dashboard/colecciones/posts/${post}`)
    const selector = page.getByTestId('editor-locale')
    await expect(selector).toContainText('Español')
    await expect(selector).toContainText('completo')
    await selector.click()
    await expect(page.getByRole('option', { name: /Inglés/ })).toContainText('faltan 3')
    await page.keyboard.press('Escape')

    await openEditor(page, '/dashboard/paginas/home')
    const hero = page.locator('.PageOutline__Item').filter({ hasText: 'Portada' })
    await expect(hero).toContainText('EN 1')
    await expect(page.locator('.PageOutline__Item').filter({ hasText: 'Servicios' })).not.toContainText('EN')
  } finally {
    await admin.from('documents').delete().eq('id', post)
    await admin.from('documents').update({ data: draft.data }).eq('id', HOME)
  }
})

test('while translating, shared values say so and translations show the original', async ({ page }) => {
  await signIn(page, QA.super.email)
  await openEditor(page, '/dashboard/sitio/settings?locale=en')
  await expect(page.locator('.InputContainer').filter({ hasText: 'Nombre del sitio' })).toContainText('Igual en todos los idiomas')
  const tagline = page.locator('.InputContainer').filter({ hasText: 'Bajada' })
  await expect(tagline.locator('.LocaleOriginal')).toContainText('Español')
  await expect(tagline.locator('.LocaleOriginal')).toContainText('Arquitectura e interiores')

  await openEditor(page, '/dashboard/sitio/settings')
  await expect(page.locator('.SharedBadge')).toHaveCount(0)
  await expect(page.locator('.LocaleOriginal')).toHaveCount(0)
})

test('each missing item in Publish opens its field in its language', async ({ page }) => {
  const console = watchConsole(page)
  const post = await insertSpanishPost()
  const draft = await read('documents', HOME)
  await updateHome(draft, data => {
    const items = data.services.items as Record<string, unknown>[]
    items[1] = { ...items[1], name: { es: 'Interiores', en: '' } }
  })

  try {
    await signIn(page, QA.super.email)
    await openEditor(page, '/dashboard/publicar')
    await page.locator('[data-tour=publish-pending] li').filter({ hasText: 'E2E Solo en español' }).getByRole('link', { name: 'Título (Inglés)' }).click()
    await expect(page).toHaveURL(new RegExp(`/posts/${post}\\?locale=en#title$`))
    await expect(page.getByTestId('editor-locale')).toContainText('Inglés')
    await expect(page.locator('#cms-title')).toBeFocused()

    await openEditor(page, '/dashboard/publicar')
    await page.locator('[data-tour=publish-pending] li').filter({ hasText: 'Inicio' }).getByRole('link', { name: /Nombre \(Inglés\)/ }).click()
    await expect(page.locator('#cms-services-items-1-name')).toBeFocused()
    console.expectClean()
  } finally {
    await admin.from('documents').delete().eq('id', post)
    await admin.from('documents').update({ data: draft.data }).eq('id', HOME)
  }
})

test('another language can use its own image and go back to the original', async ({ page }) => {
  const original = await upload('e2e-original', { es: 'E2E Fachada', en: 'E2E Front' })
  const english = await upload('e2e-english', { es: 'E2E Patio', en: 'E2E Courtyard' })
  const [draft, live] = await Promise.all([read('documents', HOME), read('published_documents', HOME)])
  await updateHome(draft, data => {
    data.hero.cover = { es: original }
  })

  try {
    await signIn(page, QA.super.email)
    await openEditor(page, '/dashboard/paginas/home?locale=en')
    const cover = page.locator('.InputContainer').filter({ hasText: 'Imagen de portada' })
    await expect(cover).toContainText('Igual que en Español')
    await cover.getByRole('button', { name: /Usar otra imagen para Inglés/ }).click()
    await page.locator('.MediaGrid').getByRole('button', { name: /e2e-english/ }).click()
    await page.getByRole('button', { name: 'Usar archivo' }).click()
    await expect(cover).toContainText('Solo para Inglés')
    await autosaved(page)
    expect(await homeCover()).toEqual({ es: original, en: english })

    await openEditor(page, '/dashboard/publicar')
    await page.locator('[data-tour=publish-button]').click()
    await page.locator('.ConfirmAction').getByRole('button', { name: 'Publicar' }).click()
    await toast(page, 'Cambios publicados')
    await expect.poll(async () => {
      await page.goto('/en')
      return page.locator('main img').getAttribute('alt')
    }, { timeout: 20_000 }).toBe('E2E Courtyard')
    await page.goto('/')
    await expect(page.locator('main img')).toHaveAttribute('alt', 'E2E Fachada')

    await openEditor(page, '/dashboard/paginas/home?locale=en')
    await page.getByRole('button', { name: 'Volver a la original' }).click()
    await expect(cover).toContainText('Igual que en Español')
    await autosaved(page)
    expect(await homeCover()).toEqual({ es: original })
  } finally {
    await restore(draft, live)
  }
})

test('Media and image fields point at the alt text missing in a language', async ({ page }) => {
  const lacking = await upload('e2e-sin-alt', { es: 'E2E Escalera' })
  await upload('e2e-con-alt', { es: 'E2E Ventana', en: 'E2E Window' })
  const draft = await read('documents', HOME)

  try {
    await signIn(page, QA.super.email)
    await openEditor(page, '/dashboard/media')
    await expect(page.locator('.MediaGrid li').filter({ hasText: 'e2e-sin-alt' })).toContainText('Sin alt: EN')
    await expect(page.locator('.MediaGrid li').filter({ hasText: 'e2e-con-alt' })).not.toContainText('Sin alt')
    await page.locator('[data-pc-name=dropdown]').filter({ has: page.locator('#manage-media-alt') }).click()
    await page.getByRole('option', { name: 'Sin texto alternativo en Inglés' }).click()
    await expect(page.locator('.MediaGrid li').filter({ hasText: 'e2e-con-alt' })).toHaveCount(0)
    await expect(page.locator('.MediaGrid li').filter({ hasText: 'e2e-sin-alt' })).toHaveCount(1)

    await updateHome(draft, data => {
      data.hero.cover = { es: lacking }
    })
    await openEditor(page, '/dashboard/paginas/home?locale=en')
    await page.getByTestId('editor-locale').click()
    await expect(page.getByRole('option', { name: /Inglés/ })).toContainText('falta 1')
    await page.keyboard.press('Escape')
    const cover = page.locator('.InputContainer').filter({ hasText: 'Imagen de portada' })
    await expect(cover).toContainText('Falta el texto alternativo en Inglés.')
    await cover.getByRole('button', { name: 'Completar el texto alternativo en Inglés' }).click()
    await expect(page.locator('#media-alt-en')).toBeFocused()
  } finally {
    await admin.from('documents').update({ data: draft.data }).eq('id', HOME)
  }
})

test('the preview follows the language being edited', async ({ page }) => {
  await signIn(page, QA.super.email)
  await openEditor(page, '/dashboard/paginas/about?locale=en')
  await page.getByRole('button', { name: 'Vista previa' }).click()
  const frame = page.getByTitle('Vista previa del sitio en Inglés con los cambios sin publicar')
  await expect(frame).toHaveAttribute('src', /path=%2Fen%2Fstudio/)
  await expect(page.frameLocator('iframe[title*="Inglés"]').getByRole('heading', { level: 1 })).toHaveText('A studio in the north')
})
