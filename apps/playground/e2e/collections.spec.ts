import { expect, test } from '@playwright/test'
import { admin, QA } from './support/db'
import { autosaved, signIn, toast, watchConsole } from './support/panel'

const QUESTION = 'E2E ¿Cuánto tarda una obra?'

test.afterAll(async () => {
  await admin.from('documents').delete().eq('type', 'faq').like('data->question->>es', 'E2E%')
})

test('creates, edits, trashes and restores a collection item', async ({ page }) => {
  const console = watchConsole(page)
  await signIn(page, QA.super.email)
  await page.goto('/dashboard/colecciones/faq')
  await page.waitForLoadState('networkidle')

  await page.getByRole('button', { name: 'Nueva pregunta' }).click()
  await page.waitForURL(/\/dashboard\/colecciones\/faq\/[0-9a-f-]{36}$/)
  await page.waitForLoadState('networkidle')

  await page.locator('#cms-question').fill(QUESTION)
  await page.locator('.ProseMirror').first().click()
  await page.keyboard.type('Depende del proyecto: entre seis meses y un año.')
  await autosaved(page)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(QUESTION)

  await page.goto('/dashboard/colecciones/faq')
  await expect(page.getByRole('link', { name: QUESTION })).toBeVisible()

  await page.getByRole('link', { name: QUESTION }).click()
  await page.waitForLoadState('networkidle')
  await page.getByRole('button', { name: 'Papelera' }).click()
  await page.locator('.ConfirmAction').getByRole('button', { name: 'Mandar a la papelera' }).click()
  await toast(page, 'Enviado a la papelera')
  await expect(page).toHaveURL(/\/dashboard\/colecciones\/faq$/)

  await page.goto('/dashboard/papelera')
  const row = page.getByRole('row').filter({ hasText: QUESTION })
  await row.getByRole('button', { name: 'Restaurar' }).click()
  await toast(page, 'Restaurado')

  await page.goto('/dashboard/colecciones/faq')
  await expect(page.getByRole('link', { name: QUESTION })).toBeVisible()
  console.expectClean()
})

test('drops a draft nobody touched after a day, and keeps the fresh one', async ({ page }) => {
  await signIn(page, QA.super.email)
  await page.goto('/dashboard/colecciones/faq')
  await page.waitForLoadState('networkidle')
  await page.getByRole('button', { name: 'Nueva pregunta' }).click()
  await page.waitForURL(/\/dashboard\/colecciones\/faq\/[0-9a-f-]{36}$/)
  const fresh = page.url().split('/').pop()!

  const { data: row } = await admin.from('documents').select('data').eq('id', fresh).single()
  const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
  const { data: old } = await admin.from('documents').insert({ type: 'faq', data: row!.data, visible: false, created_at: twoDaysAgo, updated_at: twoDaysAgo }).select('id').single()

  await page.goto('/dashboard/colecciones/faq')
  await page.waitForLoadState('networkidle')
  const ids = (await admin.from('documents').select('id').in('id', [fresh, old!.id])).data!.map(item => item.id)
  expect(ids).toEqual([fresh])

  await admin.from('documents').delete().eq('id', fresh)
})

test('generates the slug from the title in each language', async ({ page }) => {
  await signIn(page, QA.super.email)
  await page.goto('/dashboard/colecciones/posts')
  await page.waitForLoadState('networkidle')
  await page.getByRole('button', { name: 'Nuevo artículo' }).click()
  await page.waitForURL(/\/dashboard\/colecciones\/posts\/[0-9a-f-]{36}$/)
  await page.waitForLoadState('networkidle')

  await page.locator('#cms-title').fill('E2E Casa en el bosque')
  await expect(page.locator('#cms-slug')).toHaveValue('e2e-casa-en-el-bosque')
  await autosaved(page)

  const id = page.url().split('/').pop()!
  await admin.from('documents').delete().eq('id', id)
})

test('a repeated title saves the post with a free URL, and a URL typed by hand keeps the rest', async ({ page }) => {
  const newPost = async () => {
    await page.goto('/dashboard/colecciones/posts')
    await page.waitForLoadState('networkidle')
    await page.getByRole('button', { name: 'Nuevo artículo' }).click()
    await page.waitForURL(/\/dashboard\/colecciones\/posts\/[0-9a-f-]{36}$/)
    await page.waitForLoadState('networkidle')
    return page.url().split('/').pop()!
  }
  const stored = async (id: string) => (await admin.from('documents').select('slug, data').eq('id', id).single()).data!

  await signIn(page, QA.super.email)
  const first = await newPost()
  await page.locator('#cms-title').fill('E2E Casa repetida')
  await autosaved(page)
  const other = await newPost()
  await page.locator('#cms-title').fill('E2E Otra casa')
  await page.locator('#cms-slug').fill('e2e-direccion-tomada')
  await autosaved(page)

  const second = await newPost()
  await page.locator('#cms-title').fill('E2E Casa repetida')
  await expect(page.locator('#cms-slug')).toHaveValue('e2e-casa-repetida-2', { timeout: 15_000 })
  await autosaved(page)
  expect(await stored(second)).toMatchObject({ slug: 'e2e-casa-repetida-2', data: { title: { es: 'E2E Casa repetida' } } })

  await page.locator('#cms-slug').fill('e2e-direccion-tomada')
  await page.locator('#cms-excerpt').fill('E2E Resumen que se guarda igual')
  await expect(page.locator('[data-tour=autosave]')).toHaveText('Guardado, salvo la URL: ya la usa otro contenido', { timeout: 15_000 })
  await expect(page.getByText('Ya hay otro contenido con esta URL')).toBeVisible()
  expect(await stored(second)).toMatchObject({ slug: 'e2e-casa-repetida-2', data: { excerpt: { es: 'E2E Resumen que se guarda igual' } } })

  await admin.from('documents').delete().in('id', [first, other, second])
})

test('the relation search ends with an option that creates what was typed', async ({ page }) => {
  await signIn(page, QA.super.email)
  await page.goto('/dashboard/colecciones/posts')
  await page.waitForLoadState('networkidle')
  await page.getByRole('button', { name: 'Nuevo artículo' }).click()
  await page.waitForURL(/\/dashboard\/colecciones\/posts\/[0-9a-f-]{36}$/)
  await page.waitForLoadState('networkidle')
  const id = page.url().split('/').pop()!

  await page.locator('#cms-category').pressSequentially('E2E Hormigón', { delay: 50 })
  await page.getByRole('option', { name: 'Crear "E2E Hormigón"' }).click()
  await expect(page.locator('#create-related-title')).toHaveValue('E2E Hormigón')

  await admin.from('documents').delete().eq('id', id)
})
