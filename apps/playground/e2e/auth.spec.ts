import { expect, test } from '@playwright/test'
import { QA } from './support/db'
import { signIn, watchConsole } from './support/panel'

test.describe('sign in', () => {
  test('sends signed-out visitors to the sign-in screen', async ({ page }) => {
    await page.goto('/dashboard/paginas')
    await expect(page).toHaveURL(/\/dashboard\/login$/)
    await expect(page.getByRole('heading', { name: 'Iniciar sesión' })).toBeVisible()
  })

  test('validates the form and explains a wrong password', async ({ page }) => {
    const console = watchConsole(page)
    await page.goto('/dashboard/login')
    await page.waitForLoadState('networkidle')
    await page.getByRole('button', { name: 'Ingresar' }).click()
    await expect(page.locator('form').getByText('Ingresá el email')).toBeVisible()
    await expect(page.locator('form').getByText('Ingresá tu contraseña')).toBeVisible()

    await page.locator('#email').fill(QA.super.email)
    await page.locator('#password').fill('nope-nope-1')
    await page.getByRole('button', { name: 'Ingresar' }).click()
    await expect(page.locator('.Notice')).toHaveText('Email o contraseña incorrectos.')
    console.expectClean()
  })

  test('signs in, keeps the guest screens away and signs out', async ({ page }) => {
    await signIn(page, QA.super.email)
    await expect(page.getByRole('heading', { name: 'Resumen' })).toBeVisible()

    await page.goto('/dashboard/login')
    await expect(page).toHaveURL(/\/dashboard$/)

    await page.locator('[data-tour=account]').click()
    await page.getByRole('menuitem', { name: 'Cerrar sesión' }).click()
    await expect(page).toHaveURL(/\/dashboard\/login$/)
  })

  test('explains why the session ended', async ({ page }) => {
    await page.goto('/dashboard/login?error=sesion')
    await expect(page.locator('.Notice')).toHaveText('Tu sesión se cerró. Volvé a ingresar.')
  })

  test('answers a recovery request the same way for any email', async ({ page }) => {
    await page.goto('/dashboard/recuperar-contrasena')
    await page.waitForLoadState('networkidle')
    await page.locator('#email').fill('nobody@local.test')
    await page.getByRole('button', { name: 'Enviar link' }).click()
    await expect(page.getByRole('status').filter({ hasText: 'te llega un link' })).toBeVisible()
  })

  test('rejects broken email links', async ({ page }) => {
    await page.goto('/dashboard/auth/confirm?token_hash=x&type=signup')
    await expect(page.locator('.Notice')).toHaveText('El link no es válido. Pedí uno nuevo.')
  })
})
