import { expect, test } from '@playwright/test'
import { admin, QA } from './support/db'
import { autosaved, signIn, watchConsole } from './support/panel'

const homeTitle = async () => {
  const { data } = await admin.from('documents').select('data').eq('type', 'home').eq('key', 'home').maybeSingle()
  return (data?.data as { hero?: { title?: Record<string, string> } } | undefined)?.hero?.title
}

test.describe('page editor', () => {
  let original: Record<string, string> | undefined

  test.beforeAll(async () => {
    original = await homeTitle()
  })

  test.afterAll(async () => {
    const { data } = await admin.from('documents').select('id, data').eq('type', 'home').eq('key', 'home').maybeSingle()
    if (!data) return
    const content = data.data as Record<string, Record<string, unknown>>
    await admin.from('documents').update({ data: { ...content, hero: { ...content.hero, title: original ?? { es: 'Arquitectura que se habita', en: 'Architecture to live in' } } } }).eq('id', data.id)
  })

  test('saves each language of a text on its own', async ({ page }) => {
    const console = watchConsole(page)
    await signIn(page, QA.super.email)
    await page.goto('/dashboard/paginas/home')
    await page.waitForLoadState('networkidle')

    const title = page.locator('#cms-hero-title')
    await title.fill('E2E Arquitectura que se habita')
    await title.blur()
    await autosaved(page)

    await page.getByTestId('editor-locale').click()
    await page.getByRole('option', { name: 'Inglés' }).click()
    await expect(page).toHaveURL(/locale=en/)
    await expect(title).toHaveValue('Architecture to live in')
    await title.fill('E2E Architecture to live in')
    await title.blur()
    await autosaved(page)

    expect(await homeTitle()).toEqual({ es: 'E2E Arquitectura que se habita', en: 'E2E Architecture to live in' })

    await page.reload()
    await page.waitForLoadState('networkidle')
    await expect(title).toHaveValue('E2E Architecture to live in')
    console.expectClean()
  })

  test('lists what blocks publishing and opens the field', async ({ page }) => {
    await signIn(page, QA.super.email)
    await page.goto('/dashboard/paginas/home')
    await page.waitForLoadState('networkidle')

    const missing = page.locator('[data-tour=missing]')
    await expect(missing).toContainText('Imagen de portada')
    await missing.getByRole('button', { name: /Imagen de portada/ }).click()
    await expect(page.locator('#section-hero')).toHaveClass(/PageSection--Open/)
  })

  test('opens a section from its link and marks the outline', async ({ page }) => {
    await signIn(page, QA.super.email)
    await page.goto('/dashboard/paginas/home#services')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('.PageOutline__Item--Active')).toContainText('Servicios')
    await expect(page.locator('#section-services')).toHaveClass(/PageSection--Open/)
  })
})
