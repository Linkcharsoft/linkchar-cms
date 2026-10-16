import { expect, test } from '@playwright/test'
import { admin, QA, resetQaUsers } from './support/db'
import { signIn } from './support/panel'

test.afterAll(resetQaUsers)

test('the welcome tour starts once and remembers it was seen', async ({ page }) => {
  await admin.from('profiles').update({ seen_tours: [] }).eq('id', QA.editor.id)
  await signIn(page, QA.editor.email)

  const popover = page.locator('.driver-popover')
  await expect(popover).toBeVisible({ timeout: 10_000 })
  await page.keyboard.press('Escape')
  await expect(popover).toBeHidden()

  await expect.poll(async () => {
    const { data } = await admin.from('profiles').select('seen_tours').eq('id', QA.editor.id).single()
    return data?.seen_tours
  }).toContain('welcome')

  await page.reload()
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(1200)
  await expect(popover).toBeHidden()
})

test('the help menu replays the guide of the screen', async ({ page }) => {
  await signIn(page, QA.super.email)
  await page.goto('/dashboard/media')
  await page.waitForLoadState('networkidle')
  await page.locator('[data-tour=help]').click()
  await page.getByRole('menuitem', { name: 'Ver la guía de esta pantalla' }).click()
  await expect(page.locator('.driver-popover')).toBeVisible()
  await expect(page.locator('.driver-popover-progress-text')).toContainText('de')
})
