import { expect } from '@playwright/test'
import { PASSWORD } from './db'
import type { Page } from '@playwright/test'

export const signIn = async (page: Page, email: string, password = PASSWORD) => {
  await page.goto('/dashboard/login')
  await page.waitForLoadState('networkidle')
  await page.locator('#email').fill(email)
  await page.locator('#password').fill(password)
  await page.locator('form button[type=submit]').click()
  await page.waitForURL(url => !url.pathname.endsWith('/login'))
  await page.waitForLoadState('networkidle')
}

// Console errors fail the test that caused them (hydration mismatches, failed requests…).
export const watchConsole = (page: Page) => {
  const errors: string[] = []
  page.on('console', message => {
    // A failed request is reported again below with its URL.
    if (message.type() === 'error' && !message.text().startsWith('Failed to load resource')) errors.push(message.text())
  })
  page.on('pageerror', error => errors.push(String(error)))
  page.on('response', response => {
    if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`)
  })
  return { expectClean: () => expect(errors).toEqual([]) }
}

// The visible text only: the status also holds a live region that keeps the last outcome.
export const autosaveText = (page: Page) => page.locator('[data-tour=autosave] .AutosaveStatus__Text')

export const autosaved = (page: Page) => expect(autosaveText(page)).toContainText(/Guardado|Saved/, { timeout: 15_000 })

export const toast = (page: Page, text: string | RegExp) =>
  expect(page.locator('[data-pc-name=toast][role=alert]').filter({ hasText: text }).first()).toBeVisible()
