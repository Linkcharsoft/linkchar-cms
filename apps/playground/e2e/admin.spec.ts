import { expect, test } from '@playwright/test'
import { QA } from './support/db'
import { signIn, watchConsole } from './support/panel'

test.describe('administration', () => {
  test('admins manage users, read the activity and open the project screen', async ({ page }) => {
    const console = watchConsole(page)
    await signIn(page, QA.super.email)

    await page.goto('/dashboard/usuarios')
    await expect(page.getByRole('row').filter({ hasText: QA.editor.email })).toContainText('Editor')

    await page.goto('/dashboard/actividad')
    await expect(page.getByRole('table')).toContainText('Ingresó al panel')

    const nav = page.locator('[data-tour=nav]')
    await nav.getByRole('link', { name: 'Estadísticas' }).click()
    await expect(page.getByRole('heading', { name: 'Estadísticas' })).toBeVisible()
    await expect(page.getByTestId('stats')).toContainText('Preguntas frecuentes')
    await expect(nav.getByRole('link', { name: 'Guía de marca' })).toHaveAttribute('href', 'https://linkchar.com')
    console.expectClean()
  })

  test('editors see no administration and are sent back from it', async ({ page }) => {
    await signIn(page, QA.editor.email)
    const nav = page.locator('[data-tour=nav]')
    await expect(nav).not.toContainText('Usuarios')
    await expect(nav).not.toContainText('Estadísticas')

    await page.goto('/dashboard/usuarios')
    await expect(page).toHaveURL(/\/dashboard\?error=sin-permiso$/)
    await expect(page.getByText('No tenés acceso a esa pantalla. Si la necesitás, pedíselo a un administrador.')).toBeVisible()
    await page.goto('/dashboard/estadisticas')
    await expect(page).toHaveURL(/\/dashboard\?error=sin-permiso$/)
  })
})
