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
  await expect(page.getByText('Incompleto', { exact: true })).toBeVisible()
  await expect(page.getByTestId('publish-count')).toHaveCount(0)

  await page.getByTestId('editor-locale').click()
  await page.getByRole('option', { name: 'Inglés' }).click()
  await page.locator('#cms-question').fill('E2E Do you do renovations?')
  await page.locator('.ProseMirror').first().click()
  await page.keyboard.type('Yes, renovations and extensions too.')
  await autosaved(page)
  await expect(page.getByText('Listo para publicar', { exact: true })).toBeVisible()
  await expect(page.getByTestId('publish-count')).toBeVisible()

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

test('publishes only the ticked changes', async ({ page }) => {
  const doc = (text: string) => ({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text }] }] })
  const faq = (question: string) => ({ type: 'faq', visible: true, data: { question: { es: question, en: `${question} (en)` }, answer: { es: doc('Sí'), en: doc('Yes') } } })
  const { data: rows } = await admin.from('documents').insert([faq('E2E ¿Se publica?'), faq('E2E ¿Se queda?')]).select('id, data')
  const [goes, stays] = rows!.map(row => ({ id: row.id, question: (row.data as { question: { es: string } }).question.es }))

  await signIn(page, QA.super.email)
  await page.goto('/dashboard/publicar')
  await page.waitForLoadState('networkidle')
  await page.getByLabel(`Incluir "${stays.question}" en esta publicación`).click()
  await page.locator('[data-tour=publish-button]').click()
  const dialog = page.locator('.ConfirmAction')
  await expect(dialog).toContainText(goes.question)
  await expect(dialog).not.toContainText(stays.question)
  await dialog.getByRole('button', { name: 'Publicar' }).click()
  await toast(page, 'Cambios publicados')
  await expect(page.locator('[data-tour=publish-pending]')).toContainText(stays.question)
  await expect(page.locator('[data-tour=publish-pending]')).not.toContainText(goes.question)
  await expect(page.getByTestId('build-status')).toBeHidden({ timeout: 30_000 })

  await admin.from('published_documents').delete().in('id', [goes.id, stays.id])
  await admin.from('documents').delete().in('id', [goes.id, stays.id])
})

test('an editor without permission sees the changes but cannot publish', async ({ page }) => {
  await signIn(page, QA.editor.email)
  await page.goto('/dashboard/publicar')
  await expect(page.locator('[data-tour=publish-button]')).toBeDisabled()
})

test('retries a failed build from the publish screen', async ({ page }) => {
  const { data: failed } = await admin.from('publish_log')
    .insert({ requested_by: QA.super.id, build_status: 'failed', error_code: 'build_failed', finished_at: new Date().toISOString() })
    .select('id').single()

  await signIn(page, QA.super.email)
  await page.goto('/dashboard/publicar')
  await page.waitForLoadState('networkidle')
  await page.locator('[data-tour=publish-history]').getByRole('button', { name: 'Reintentar' }).click()
  await toast(page, 'Reintentando la actualización del sitio')

  const latest = page.locator('[data-tour=publish-history] li').first()
  await expect(latest).toContainText('Reintento')
  await expect(latest).toContainText('Listo', { timeout: 30_000 })
  await expect(page.locator('[data-tour=publish-history]').getByRole('button', { name: 'Reintentar' })).toHaveCount(0)

  await admin.from('publish_log').delete().or(`id.eq.${failed!.id},retry_of.eq.${failed!.id}`)
})

test('warns where an item is used before it leaves the site', async ({ page }) => {
  const doc = (text: string) => ({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text }] }] })
  const { data: member } = await admin.from('documents').insert({ type: 'team', data: { name: 'E2E Autora' }, visible: true }).select('id, data').single()
  const post = {
    title: { es: 'E2E Post con autora', en: 'E2E Post with author' },
    slug: { es: 'e2e-post-con-autora', en: 'e2e-post-with-author' },
    body: { es: doc('Hola'), en: doc('Hi') },
    author: member!.id
  }
  const { data: live } = await admin.from('documents').insert({ type: 'posts', slug: 'e2e-post-con-autora', data: post, visible: true }).select('id').single()
  await admin.from('published_documents').insert([
    { id: member!.id, type: 'team', data: member!.data },
    { id: live!.id, type: 'posts', slug: 'e2e-post-con-autora', data: post }
  ])

  await signIn(page, QA.super.email)
  await page.goto(`/dashboard/colecciones/team/${member!.id}`)
  await page.waitForLoadState('networkidle')
  await page.getByRole('button', { name: 'Papelera' }).click()
  const dialog = page.locator('.ConfirmAction')
  await expect(dialog).toContainText('Lo usan estos contenidos, que al publicar van a quedar sin él:')
  await expect(dialog).toContainText('Blog › E2E Post con autora')
  await dialog.getByRole('button', { name: 'Mandar a la papelera' }).click()
  await toast(page, 'Enviado a la papelera')

  await page.goto('/dashboard/publicar')
  await page.waitForLoadState('networkidle')
  await expect(page.locator('[data-tour=publish-pending]'))
    .toContainText('Blog › E2E Post con autora lo usa y sigue en el sitio: va a quedar sin este contenido.')

  const ids = [member!.id, live!.id]
  await admin.from('published_documents').delete().in('id', ids)
  await admin.from('documents').delete().in('id', ids)
})
