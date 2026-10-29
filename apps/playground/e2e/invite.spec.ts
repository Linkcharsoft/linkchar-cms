import { expect, test } from '@playwright/test'
import { QA } from './support/db'
import { confirmLink, emailTo } from './support/mail'
import { signIn, toast } from './support/panel'

// The global setup deletes every e2e-* user before the run.
const email = `e2e-invite-${Date.now()}@local.test`
const FIRST_PASSWORD = 'Invitado2026ok'
const NEW_PASSWORD = 'Recuperada2026ok'

test.describe.configure({ mode: 'serial' })

test('an invited user creates the account from the email link', async ({ page, browser, baseURL }) => {
  await signIn(page, QA.super.email)
  await page.goto('/dashboard/usuarios')
  await page.getByRole('button', { name: 'Invitar usuario' }).click()
  await page.locator('#user-email').fill(email)
  await page.locator('#user-name').fill('E2E Invitado')
  await page.getByRole('button', { name: 'Enviar invitación' }).click()
  await toast(page, `Invitación enviada a ${email}`)

  const message = await emailTo(email)
  expect(message.Subject).toBe('Te invitaron al panel de contenido')

  const context = await browser.newContext()
  const invited = await context.newPage()
  await invited.goto(await confirmLink(message, baseURL!))
  await expect(invited.getByRole('heading', { name: 'Tu invitación al panel' })).toBeVisible()
  await invited.getByRole('button', { name: 'Continuar' }).click()
  await expect(invited).toHaveURL(/\/dashboard\/invitacion$/)
  await invited.locator('#name').fill('E2E Invitada')
  await invited.locator('#password').fill(FIRST_PASSWORD)
  await invited.locator('#confirmPassword').fill(FIRST_PASSWORD)
  await invited.getByRole('button', { name: 'Crear mi usuario' }).click()
  await expect(invited).toHaveURL(/\/dashboard$/)
  await expect(invited.getByRole('heading', { name: 'Resumen' })).toBeVisible()
  await context.close()
})

test('a link that was already used is refused', async ({ browser, baseURL }) => {
  const message = await emailTo(email)
  const context = await browser.newContext()
  const page = await context.newPage()
  await page.goto(await confirmLink(message, baseURL!))
  await page.getByRole('button', { name: 'Continuar' }).click()
  await expect(page.locator('.Notice')).toHaveText('El link venció o ya fue usado. Pedí uno nuevo.')
  await expect(page).toHaveURL(/\/dashboard\/auth\/confirm\?/)
  await context.close()
})

test('a forgotten password is replaced from the email link', async ({ page, browser, baseURL }) => {
  await page.goto('/dashboard/recuperar-contrasena')
  await page.locator('#email').fill(email)
  await page.getByRole('button', { name: 'Enviar link' }).click()
  await expect(page.getByText(/te llega un link/)).toBeVisible()

  const message = await emailTo(email, 2)
  expect(message.Subject).toBe('Elegí una contraseña nueva')

  const context = await browser.newContext()
  const reset = await context.newPage()
  await reset.goto(await confirmLink(message, baseURL!))
  await reset.getByRole('button', { name: 'Continuar' }).click()
  await expect(reset).toHaveURL(/\/dashboard\/restablecer-contrasena$/)
  await reset.locator('#password').fill(NEW_PASSWORD)
  await reset.locator('#confirmPassword').fill(NEW_PASSWORD)
  await reset.getByRole('button', { name: 'Guardar contraseña' }).click()
  await expect(reset).toHaveURL(/\/dashboard$/)
  await context.close()

  await signIn(page, email, NEW_PASSWORD)
  await expect(page.getByRole('heading', { name: 'Resumen' })).toBeVisible()
})
