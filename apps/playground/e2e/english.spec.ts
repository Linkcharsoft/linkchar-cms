import { expect, test } from '@playwright/test'
import { QA } from './support/db'
import { signIn, watchConsole } from './support/panel'

// The same app built with NEXT_PUBLIC_CMS_PANEL_LOCALE=en: one option turns the whole panel into English.
test('the panel speaks English with panelLocale "en"', async ({ page }) => {
  const console = watchConsole(page)
  await page.goto('/dashboard/login')
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible()
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')

  await signIn(page, QA.super.email)
  await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible()
  const nav = page.locator('[data-tour=nav]')
  for (const label of ['Pages', 'Media', 'Users', 'Activity', 'Trash', 'Statistics']) await expect(nav).toContainText(label)

  await page.goto('/dashboard/paginas/home')
  await page.waitForLoadState('networkidle')
  await expect(page.locator('[data-tour=autosave]')).toHaveText('No changes')
  await expect(page.getByRole('button', { name: 'Preview' })).toBeVisible()
  await expect(page.locator('body')).not.toContainText('Guardado')
  console.expectClean()
})
