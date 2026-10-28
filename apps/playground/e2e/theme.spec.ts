import { expect, test } from '@playwright/test'
import { QA } from './support/db'
import { signIn } from './support/panel'
import type { Locator } from '@playwright/test'

const color = (locator: Locator, property: 'backgroundColor' | 'color') =>
  locator.evaluate((element, name) => getComputedStyle(element)[name], property)

const VIOLET = 'rgb(110, 20, 190)'
const INK = 'rgb(14, 14, 19)'

test('the panel wears the Inferencia brand, whatever the project :root sets', async ({ page }) => {
  await signIn(page, QA.super.email)
  await page.goto('/dashboard/colecciones/posts')
  await page.waitForLoadState('networkidle')

  const primaryButton = page.getByRole('button', { name: 'Nuevo artículo' })
  const sidebar = page.locator('.DashboardSidebar')
  expect(await color(primaryButton, 'backgroundColor')).toBe(VIOLET)
  expect(await color(sidebar, 'backgroundColor')).toBe(INK)
  expect(await page.locator('body').evaluate(body => getComputedStyle(body).fontFamily)).toContain('Hanken Grotesk Variable')

  await page.addStyleTag({ content: ':root { --cms-primary: #c2410c; --cms-sidebar: #111111 }' })
  await page.locator('[data-pc-name=dropdown]').first().click()
  const selected = page.locator('[data-pc-section=item][aria-selected=true]').first()
  await expect(selected).toBeVisible()
  expect(await color(selected, 'color')).toBe(VIOLET)
  expect(await color(primaryButton, 'backgroundColor')).toBe(VIOLET)
  expect(await color(sidebar, 'backgroundColor')).toBe(INK)
})

test('the sidebar names the product with its favicon and signs as Inferencia', async ({ page }) => {
  await signIn(page, QA.super.email)
  await page.goto('/dashboard')

  const product = page.locator('.DashboardSidebar__Product')
  await expect(product).toHaveText('Estudio Norte')
  await expect(product.locator('img')).toHaveAttribute('src', '/icon.svg')
  await expect(page.locator('.DashboardSidebar__Footer .BrandMark')).toHaveText('InferenciaCMS')
})
