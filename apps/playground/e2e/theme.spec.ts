import { expect, test } from '@playwright/test'
import { QA } from './support/db'
import { signIn } from './support/panel'
import type { Locator, Page } from '@playwright/test'

const color = (locator: Locator, property: 'backgroundColor' | 'color') =>
  locator.evaluate((element, name) => getComputedStyle(element)[name], property)

// Chromium resolves color-mix() in oklab and reports the result in its own syntax: compare against a probe element.
const resolved = (page: Page, css: string) => page.evaluate(value => {
  const probe = document.createElement('span')
  probe.style.color = value
  document.body.append(probe)
  const result = getComputedStyle(probe).color
  probe.remove()
  return result
}, css)

test('one variable re-themes the panel, PrimeReact included', async ({ page }) => {
  await signIn(page, QA.super.email)
  await page.goto('/dashboard/colecciones/posts')
  await page.waitForLoadState('networkidle')

  const primaryButton = page.getByRole('button', { name: 'Nuevo artículo' })
  const sidebar = page.locator('.DashboardSidebar')

  expect(await color(primaryButton, 'backgroundColor')).toBe('rgb(15, 122, 92)')
  const sidebarBefore = await color(sidebar, 'backgroundColor')

  await page.addStyleTag({ content: ':root { --cms-primary: #c2410c }' })
  // Buttons and links animate their colors: poll until the transition settles.
  await expect.poll(() => color(primaryButton, 'backgroundColor')).toBe('rgb(194, 65, 12)')
  const derived = await resolved(page, 'color-mix(in oklab, #c2410c 30%, #0b1524)')
  await expect.poll(() => color(sidebar, 'backgroundColor')).toBe(derived)
  expect(derived).not.toBe(sidebarBefore)

  await page.locator('[data-pc-name=dropdown]').first().click()
  const selected = page.locator('[data-pc-section=item][aria-selected=true]').first()
  await expect(selected).toBeVisible()
  await expect.poll(() => color(selected, 'color')).toBe('rgb(194, 65, 12)')
  await page.keyboard.press('Escape')

  await page.addStyleTag({ content: ':root { --cms-sidebar: #111111 }' })
  await expect.poll(() => color(sidebar, 'backgroundColor')).toBe('rgb(17, 17, 17)')
})
