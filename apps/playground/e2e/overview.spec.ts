import { expect, test } from '@playwright/test'
import { admin, QA } from './support/db'
import { signIn } from './support/panel'

test('the overview points at drafts hidden for weeks', async ({ page }) => {
  const twentyDaysAgo = new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString()
  const { data: draft } = await admin.from('documents')
    .insert({ type: 'posts', visible: false, data: { title: { es: 'E2E Borrador olvidado', en: '' } }, created_at: twentyDaysAgo, updated_at: twentyDaysAgo })
    .select('id').single()

  try {
    await signIn(page, QA.super.email)
    const alert = page.locator('[data-tour=overview-alerts]').getByText(/"E2E Borrador olvidado" lleva 20 días como borrador sin publicar/)
    await expect(alert).toBeVisible()
    await page.locator('[data-tour=overview-alerts] li').filter({ hasText: 'E2E Borrador olvidado' }).getByRole('link', { name: 'Ver' }).click()
    await expect(page).toHaveURL(new RegExp(`/dashboard/colecciones/posts/${draft!.id}$`))
  } finally {
    await admin.from('documents').delete().eq('id', draft!.id)
  }
})
