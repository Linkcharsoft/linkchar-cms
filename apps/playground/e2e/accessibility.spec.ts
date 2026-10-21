import { resolve } from 'node:path'
import { expect, test } from '@playwright/test'
import { admin, QA } from './support/db'
import { signIn } from './support/panel'
import type { Page } from '@playwright/test'

const AXE = resolve('node_modules/axe-core/axe.min.js')

type ViolationType = { id: string, impact: string | null, nodes: { target: string[] }[] }

// Critical and serious issues fail the suite; moderate ones are left to review.
const violations = async (page: Page) => {
  await page.addScriptTag({ path: AXE })
  const found = await page.evaluate(async () => (await (window as unknown as { axe: { run: () => Promise<{ violations: ViolationType[] }> } }).axe.run()).violations)
  return found
    .filter(violation => violation.impact === 'critical' || violation.impact === 'serious')
    .map(violation => `${violation.id}: ${violation.nodes.map(node => node.target.join(' ')).join(', ')}`)
}

test('the sign-in screen has no serious accessibility issues', async ({ page }) => {
  await page.goto('/dashboard/login')
  await page.waitForLoadState('networkidle')
  expect(await violations(page)).toEqual([])
})

test('the first Tab reaches a link that jumps to the content', async ({ page }) => {
  await signIn(page, QA.super.email)
  // A full load: after a client-side navigation the browser keeps its focus starting point where it was.
  await page.goto('/dashboard')
  await page.waitForLoadState('networkidle')
  await page.keyboard.press('Tab')
  await expect(page.getByRole('link', { name: 'Saltar al contenido' })).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/#main$/)
  await page.keyboard.press('Tab')
  expect(await page.evaluate(() => document.activeElement?.closest('#main') !== null)).toBe(true)
})

test('the panel screens have no serious accessibility issues', async ({ page }) => {
  const { data: post } = await admin.from('documents').insert({ type: 'posts', data: { title: { es: 'E2E Accesible', en: '' } } }).select('id').single()

  await signIn(page, QA.super.email)
  const screens = [
    '/dashboard', '/dashboard/paginas', '/dashboard/paginas/home', '/dashboard/colecciones/posts', `/dashboard/colecciones/posts/${post!.id}`,
    '/dashboard/sitio/settings', '/dashboard/paginas/home?locale=en', `/dashboard/colecciones/posts/${post!.id}?locale=en`,
    '/dashboard/sitio/settings?locale=en', '/dashboard/media', '/dashboard/publicar', '/dashboard/papelera', '/dashboard/usuarios', '/dashboard/cuenta'
  ]
  const found: Record<string, string[]> = {}
  for (const screen of screens) {
    await page.goto(screen)
    await page.waitForLoadState('networkidle')
    const issues = await violations(page)
    if (issues.length > 0) found[screen] = issues
  }

  await admin.from('documents').delete().eq('id', post!.id)
  expect(found).toEqual({})
})
