import { expect, test } from '@playwright/test'
import { QA, resetQaUsers } from './support/db'
import { signIn, toast } from './support/panel'

test.afterAll(resetQaUsers)

test('renames the user and shows it in the header', async ({ page }) => {
  await signIn(page, QA.editor.email)
  await page.goto('/dashboard/cuenta')
  await page.waitForLoadState('networkidle')

  await page.locator('#name').fill('E2E Editora')
  await page.getByRole('button', { name: 'Guardar nombre' }).click()
  await toast(page, 'Nombre guardado')
  await expect(page.locator('[data-tour=account]')).toContainText('E2E Editora')
})

test('states the password rules under the new password field', async ({ page }) => {
  await signIn(page, QA.super.email)
  await page.goto('/dashboard/cuenta')
  await expect(page.getByText('Al menos 10 caracteres, con letras y números.')).toBeVisible()
})

test('asks for the current password before changing it', async ({ page }) => {
  await signIn(page, QA.editor.email)
  await page.goto('/dashboard/cuenta')
  await page.waitForLoadState('networkidle')

  const form = page.locator('[data-tour=account-password]')
  await form.locator('#currentPassword').fill('wrong-password-1')
  await form.locator('#password').fill('OtraClave12345')
  await form.locator('#confirmPassword').fill('OtraClave12345')
  await form.getByRole('button').last().click()
  await expect(form.locator('#currentPassword-error')).toContainText('contraseña actual')
  await expect(form.locator('#currentPassword')).toBeFocused()
})
