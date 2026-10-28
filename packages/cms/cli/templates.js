import { existsSync } from 'node:fs'
import { appendFile, mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { CliError } from './migrations.js'

/**
 * @typedef {(key: string, params?: Record<string, string | number>) => string} TranslateType
 * @typedef {'invite' | 'recovery'} EmailType
 * @typedef {{ file: string, status: 'added' | 'updated' | 'kept' | 'stale' | 'same' }} TemplateChangeType
 */

export const EMAILS = /** @type {const} */ (['invite', 'recovery'])

/**
 * The package catalogs, with the project's overrides when a config is given; jiti loads the TypeScript source.
 * @param {{ panelLocale?: string, messages?: unknown } | string} configOrLocale
 * @returns {Promise<TranslateType>}
 */
export const translatorOf = async configOrLocale => {
  const { createJiti } = await import('jiti')
  const jiti = createJiti(import.meta.url)
  const { createTranslator } = /** @type {typeof import('../src/core/i18n/translator')} */ (
    await jiti.import(fileURLToPath(new URL('../src/core/i18n/translator.ts', import.meta.url)))
  )
  const options = typeof configOrLocale === 'string'
    ? { locale: configOrLocale }
    : { locale: configOrLocale.panelLocale ?? 'es', overrides: /** @type {Record<string, never>} */ (configOrLocale.messages ?? {}) }
  return /** @type {TranslateType} */ (/** @type {unknown} */ (createTranslator(options).t))
}

const escape = (/** @type {string} */ text) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/** @param {string} basePath @param {EmailType} type */
export const confirmLink = (basePath, type) => `{{ .SiteURL }}${basePath}/auth/confirm?token_hash={{ .TokenHash }}&amp;type=${type}`

// What 0.10 wrote: a file still equal to it was never edited, so it takes the branded email.
/** @param {string} basePath @param {EmailType} type @param {TranslateType} t */
const unbrandedHtml = (basePath, type, t) => [
  `<h2>${escape(t(`emails.${type}.title`))}</h2>`,
  `<p>${escape(t(`emails.${type}.body`))}</p>`,
  `<p><a href="${confirmLink(basePath, type)}">${escape(t(`emails.${type}.action`))}</a></p>`,
  `<p>${escape(t(`emails.${type}.ignore`))}</p>`,
  ''
].join('\n')

// Tables and inline styles: email clients drop <style> blocks, flexbox and SVG.
/** @param {string} basePath @param {EmailType} type @param {TranslateType} t @param {string} product */
export const emailHtml = (basePath, type, t, product) => [
  '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#faf8ff;padding:32px 16px;font-family:Helvetica,Arial,sans-serif;">',
  '<tr><td align="center">',
  '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border:1px solid #e9e4f1;border-radius:16px;overflow:hidden;">',
  `<tr><td style="background:#0e0e13;padding:20px 32px;color:#ffffff;font-size:18px;font-weight:600;"><span style="color:#fe00fe;">&#10022;</span> Inferencia${product ? ` <span style="color:#b4adc4;font-size:14px;font-weight:400;">&middot; ${escape(product)}</span>` : ''}</td></tr>`,
  '<tr><td style="padding:32px;color:#16141c;">',
  `<h1 style="margin:0 0 12px;font-size:22px;line-height:1.3;">${escape(t(`emails.${type}.title`))}</h1>`,
  `<p style="margin:0 0 24px;font-size:15px;line-height:1.5;color:#3d3849;">${escape(t(`emails.${type}.body`))}</p>`,
  `<a href="${confirmLink(basePath, type)}" style="display:inline-block;padding:12px 20px;border-radius:8px;background:#6e14be;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;">${escape(t(`emails.${type}.action`))}</a>`,
  `<p style="margin:24px 0 0;font-size:13px;line-height:1.5;color:#565066;">${escape(t(`emails.${type}.ignore`))}</p>`,
  '</td></tr>',
  '</table>',
  '<p style="margin:16px 0 0;font-size:12px;color:#6c6680;">Inferencia AI Solutions</p>',
  '</td></tr>',
  '</table>',
  ''
].join('\n')

/** @param {EmailType} type @param {TranslateType} t */
const configBlock = (type, t) => [
  '',
  `[auth.email.template.${type}]`,
  `subject = ${JSON.stringify(t(`emails.${type}.subject`))}`,
  `content_path = "./supabase/templates/${type}.html"`,
  ''
].join('\n')

/**
 * The invitation and recovery emails must link to the panel's confirm route: Supabase's defaults don't.
 * HTML the project edited is its own and is only checked for the link.
 * @param {{ supabaseDir: string, basePath: string, t: TranslateType, product?: string, write?: boolean }} options
 * @returns {Promise<TemplateChangeType[]>}
 */
export const syncTemplates = async ({ supabaseDir, basePath, t, product = '', write = true }) => {
  const configToml = join(supabaseDir, 'config.toml')
  if (!existsSync(configToml)) throw new CliError(`There is no ${configToml}: run supabase init first, or pass --dir.`)

  /** @type {TemplateChangeType[]} */
  const changes = []
  for (const type of EMAILS) {
    const file = join(supabaseDir, 'templates', `${type}.html`)
    const shown = `templates/${type}.html`
    if (existsSync(file)) {
      const html = await readFile(file, 'utf8')
      if (html.replace(/\r\n/g, '\n') === unbrandedHtml(basePath, type, t)) {
        if (write) await writeFile(file, emailHtml(basePath, type, t, product))
        changes.push({ file: shown, status: 'updated' })
        continue
      }
      const linked = html.includes(confirmLink(basePath, type)) || html.includes(confirmLink(basePath, type).replace('&amp;', '&'))
      changes.push({ file: shown, status: linked ? 'kept' : 'stale' })
      continue
    }
    if (write) {
      await mkdir(join(supabaseDir, 'templates'), { recursive: true })
      await writeFile(file, emailHtml(basePath, type, t, product))
    }
    changes.push({ file: shown, status: 'added' })
  }

  const toml = await readFile(configToml, 'utf8')
  for (const type of EMAILS) {
    // supabase init writes these blocks commented out: only a live header counts.
    const has = toml.split(/\r?\n/).some(line => line.trim() === `[auth.email.template.${type}]`)
    if (!has && write) await appendFile(configToml, configBlock(type, t))
    changes.push({ file: `config.toml [auth.email.template.${type}]`, status: has ? 'same' : 'added' })
  }
  return changes
}
