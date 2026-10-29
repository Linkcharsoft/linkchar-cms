import { join } from 'node:path'
import { expect, test } from '@playwright/test'
import { admin, QA } from './support/db'
import { signIn, toast, watchConsole } from './support/panel'

const ALT = 'E2E Fachada del estudio al atardecer'

test.describe.configure({ mode: 'serial' })

// Videos first: the poster of a live video can't be deleted.
test.afterAll(async () => {
  const { data } = await admin.from('media').select('id, path, mime').or('alt->>es.like.E2E%,filename.like.clip%')
  if (!data?.length) return
  const rows = [...data].sort((a, b) => Number(b.mime.startsWith('video/')) - Number(a.mime.startsWith('video/')))
  for (const row of rows) await admin.from('media').delete().eq('id', row.id)
  await admin.storage.from('media').remove(rows.map(row => row.path))
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

test('offers the file already in the library when the same one is uploaded again', async ({ page }) => {
  await signIn(page, QA.super.email)
  await page.goto('/dashboard/media')
  await page.waitForLoadState('networkidle')

  await page.locator('[data-tour=media-upload]').click()
  await page.getByLabel('Elegir archivos para subir').setInputFiles(join(__dirname, 'fixtures', 'studio.png'))
  await expect(page.getByText(`Ya existe en la librería como "${ALT}".`)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Subir archivo' })).toBeDisabled()
  await page.getByRole('button', { name: 'Usar el archivo existente' }).click()
  await expect(page.locator('.MediaGrid').getByRole('button', { name: new RegExp(ALT) })).toHaveCount(1)
  const { count } = await admin.from('media').select('id', { count: 'exact', head: true }).like('alt->>es', 'E2E%')
  expect(count).toBe(1)
})

test('shows the selection and the pick button in the dialog footer while choosing an image', async ({ page }) => {
  await signIn(page, QA.super.email)
  await page.goto('/dashboard/paginas/home')
  await page.waitForLoadState('networkidle')

  await page.getByRole('button', { name: /imagen (para|de) Imagen de portada/ }).first().click()
  const dialog = page.locator('[data-pc-name=dialog]')
  const footer = dialog.locator('[data-pc-section=footer]')
  await expect(footer).toContainText('Elegí un archivo')
  await expect(footer.getByRole('button', { name: 'Usar archivo' })).toBeDisabled()

  await dialog.getByPlaceholder('Buscar por nombre o descripción').fill(ALT)
  await dialog.locator('.MediaGrid').getByRole('button', { name: new RegExp(ALT) }).click()
  await expect(footer).toContainText('1 seleccionado')
  await expect(footer.getByRole('button', { name: 'Usar archivo' })).toBeEnabled()
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
})

test('uploads a video that can stream, turns away one that cannot, and captures its poster', async ({ page }) => {
  await signIn(page, QA.super.email)
  await page.goto('/dashboard/media')
  await page.waitForLoadState('networkidle')

  await page.locator('[data-tour=media-upload]').click()
  const input = page.getByLabel('Elegir archivos para subir')
  await input.setInputFiles(join(__dirname, 'fixtures', 'slow.mp4'))
  await expect(page.getByText(/slow\.mp4: El video no está preparado para reproducirse mientras se descarga/)).toBeVisible()
  await expect(page.getByRole('button', { name: /Subir/ })).toHaveCount(0)

  await input.setInputFiles(join(__dirname, 'fixtures', 'clip.webm'))
  const upload = page.getByRole('button', { name: 'Subir archivo' })
  await expect(upload).toBeEnabled()
  await upload.click()

  const tile = page.locator('.MediaGrid').getByRole('button', { name: /clip\.webm/ }).first()
  await expect(tile).toBeVisible({ timeout: 20_000 })
  await expect(tile.locator('.MediaGrid__Duration')).toHaveText('0:01')
  const { data: stored } = await admin.from('media').select('mime, width, height, duration, poster_id').eq('filename', 'clip.webm')
  expect(stored?.[0]).toMatchObject({ mime: 'video/webm', width: 64, height: 64, poster_id: null })
  expect(stored?.[0]?.duration).toBeGreaterThan(0)

  await tile.click()
  const dialog = page.locator('[data-pc-name=dialog]')
  await expect(dialog.getByText('Falta la portada')).toBeVisible()
  await expect(dialog.getByText(/reproducciones completas/)).toBeVisible()
  await page.waitForFunction(() => ((document.querySelector('video.MediaDetails__Video') as HTMLVideoElement | null)?.readyState ?? 0) >= 2)
  await dialog.getByRole('button', { name: 'Capturar fotograma' }).click()
  await toast(page, 'Fotograma guardado como portada')
  await expect(dialog.getByText('Falta la portada')).toHaveCount(0)
  await dialog.getByRole('button', { name: 'Guardar' }).click()
  await toast(page, 'Cambios guardados')

  const { data: saved } = await admin.from('media').select('poster_id').eq('filename', 'clip.webm')
  expect(saved?.[0]?.poster_id).toBeTruthy()
  const { data: poster } = await admin.from('media').select('mime, alt, width').eq('id', saved![0].poster_id!)
  expect(poster?.[0]).toMatchObject({ mime: 'image/webp', alt: { es: 'Portada de clip.webm' }, width: 64 })
  await expect(page.locator('.MediaGrid').getByRole('button', { name: /clip\.webm/ }).first().locator('img')).toBeVisible()
})
