import { join } from 'node:path'
import { expect, test } from '@playwright/test'
import { admin, QA } from './support/db'
import { signIn, watchConsole } from './support/panel'

const ALT = 'E2E Fachada del estudio al atardecer'

test.afterAll(async () => {
  const { data } = await admin.from('media').select('id, path').like('alt->>es', 'E2E%')
  if (!data?.length) return
  await admin.storage.from('media').remove(data.map(row => row.path))
  await admin.from('media').delete().in('id', data.map(row => row.id))
})

test('uploads an image with its alt text and finds it in the library', async ({ page }) => {
  const console = watchConsole(page)
  await signIn(page, QA.super.email)
  await page.goto('/dashboard/media')
  await page.waitForLoadState('networkidle')

  await page.locator('[data-tour=media-upload]').click()
  await page.getByLabel('Elegir archivos para subir').setInputFiles(join(__dirname, 'fixtures', 'studio.png'))
  const upload = page.getByRole('button', { name: 'Subir archivo' })
  await expect(upload).toBeDisabled()
  await page.locator('input[id^=alt-]').fill(ALT)
  await upload.click()

  await expect(page.locator('.MediaGrid').getByRole('button', { name: new RegExp(ALT) }).first()).toBeVisible({ timeout: 20_000 })
  const { data } = await admin.from('media').select('alt, mime, width').like('alt->>es', 'E2E%')
  expect(data?.[0]).toMatchObject({ alt: { es: ALT }, mime: 'image/webp', width: 160 })
  console.expectClean()
})
