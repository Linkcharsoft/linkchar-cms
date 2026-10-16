import { expect, test } from '@playwright/test'
import { admin, QA } from './support/db'
import { autosaved, signIn, toast, watchConsole } from './support/panel'

const QUESTION = 'E2E ¿Hacen reformas?'

test.afterAll(async () => {
  await admin.from('documents').delete().eq('type', 'faq').like('data->question->>es', 'E2E%')
})

test('publishes the pending changes and follows the build', async ({ page }) => {
  const console = watchConsole(page)
  await signIn(page, QA.super.email)
  await page.goto('/dashboard/colecciones/faq')
  await page.waitForLoadState('networkidle')
  await page.getByRole('button', { name: 'Nueva pregunta' }).click()
  await page.waitForURL(/\/faq\/[0-9a-f-]{36}$/)
  await page.waitForLoadState('networkidle')
  await page.locator('#cms-question').fill(QUESTION)
  await page.locator('.ProseMirror').first().click()
  await page.keyboard.type('Sí, también reformas y ampliaciones.')
  await autosaved(page)
  await page.getByText('Mostrar en el sitio').click()
  await toast(page, 'Se va a mostrar en el sitio')

  await page.getByTestId('editor-locale').click()
  await page.getByRole('option', { name: 'Inglés' }).click()
  await page.locator('#cms-question').fill('E2E Do you do renovations?')
  await page.locator('.ProseMirror').first().click()
  await page.keyboard.type('Yes, renovations and extensions too.')
  await autosaved(page)

  await page.goto('/dashboard/publicar')
  await page.waitForLoadState('networkidle')
  await expect(page.locator('[data-tour=publish-pending]')).toContainText(QUESTION)
  await page.locator('[data-tour=publish-button]').click()
  await page.locator('.ConfirmAction').getByRole('button', { name: 'Publicar' }).click()
  await toast(page, 'Cambios publicados')

  const status = page.getByTestId('build-status')
  await expect(status).toContainText('Publicando')
  await expect(status).toBeHidden({ timeout: 30_000 })
  await expect(page.locator('[data-tour=publish-history]')).toContainText('Listo')
  console.expectClean()
})

test('an editor without permission sees the changes but cannot publish', async ({ page }) => {
  await signIn(page, QA.editor.email)
  await page.goto('/dashboard/publicar')
  await expect(page.locator('[data-tour=publish-button]')).toBeDisabled()
})
