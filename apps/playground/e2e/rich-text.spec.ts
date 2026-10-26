import { expect, test } from '@playwright/test'
import { admin, QA } from './support/db'
import { autosaved, signIn, toast } from './support/panel'

const POST = 'c0000000-0000-0000-0000-000000000004'

type Row = { data: Record<string, unknown> }

const read = async (table: 'documents' | 'published_documents') =>
  (await admin.from(table).select('data').eq('id', POST).single()).data as Row

test('an inline text offers only its marks, stays one paragraph and renders inside the site\'s own <p>', async ({ page }) => {
  const [draft, live] = await Promise.all([read('documents'), read('published_documents')])

  try {
    await signIn(page, QA.super.email)
    await page.goto(`/dashboard/colecciones/posts/${POST}`)
    await page.waitForLoadState('networkidle')

    const toolbar = page.getByRole('toolbar', { name: 'Formato de Bajada' })
    await expect(toolbar.getByRole('button', { name: 'Negrita' })).toBeVisible()
    await expect(toolbar.getByRole('button', { name: 'Link' })).toBeVisible()
    for (const name of ['Itálica', 'Lista con viñetas', /^H2/, 'Insertar imagen']) await expect(toolbar.getByRole('button', { name })).toHaveCount(0)

    const lead = page.getByRole('textbox', { name: 'Bajada' })
    await lead.click()
    await page.keyboard.type('Una ')
    await page.keyboard.press('Control+b')
    await page.keyboard.type('nota')
    await page.keyboard.press('Control+b')
    await page.keyboard.press('Enter')
    await page.keyboard.type(' breve')
    await expect(lead.locator('p')).toHaveCount(1)
    await expect(lead.locator('strong')).toHaveText('nota')
    await lead.blur()
    await autosaved(page)

    const { data } = await read('documents')
    await admin.from('documents').update({
      data: { ...data, lead: { ...(data.lead as Record<string, unknown>), en: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'A ' }, { type: 'text', text: 'note', marks: [{ type: 'bold' }] }] }] } } }
    }).eq('id', POST)

    await page.goto('/dashboard/publicar')
    await page.waitForLoadState('networkidle')
    await page.locator('[data-tour=publish-button]').click()
    await page.locator('.ConfirmAction').getByRole('button', { name: 'Publicar' }).click()
    await toast(page, 'Cambios publicados')

    await expect.poll(async () => {
      await page.goto('/blog/luz-natural')
      return page.getByTestId('post-lead').locator('strong').textContent().catch(() => null)
    }, { timeout: 20_000 }).toBe('nota')
    await expect(page.getByTestId('post-lead').locator('p, div')).toHaveCount(0)
    await expect(page.getByTestId('post-lead')).toHaveText('Una nota breve')
  } finally {
    await admin.from('documents').update({ data: draft.data }).eq('id', POST)
    await admin.from('published_documents').update({ data: live.data }).eq('id', POST)
  }
})
