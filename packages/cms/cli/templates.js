import { existsSync } from 'node:fs'
import { appendFile, mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { CliError } from './migrations.js'

/**
 * @typedef {(key: string, params?: Record<string, string | number>) => string} TranslateType
 * @typedef {'invite' | 'recovery'} EmailType
 * @typedef {{ file: string, status: 'added' | 'kept' | 'stale' | 'same' }} TemplateChangeType
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

/** @param {string} basePath @param {EmailType} type @param {TranslateType} t */
export const emailHtml = (basePath, type, t) => [
  `<h2>${escape(t(`emails.${type}.title`))}</h2>`,
  `<p>${escape(t(`emails.${type}.body`))}</p>`,
  `<p><a href="${confirmLink(basePath, type)}">${escape(t(`emails.${type}.action`))}</a></p>`,
  `<p>${escape(t(`emails.${type}.ignore`))}</p>`,
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
 * Existing HTML is the project's (its wording, its branding) and is only checked for the link.
 * @param {{ supabaseDir: string, basePath: string, t: TranslateType, write?: boolean }} options
 * @returns {Promise<TemplateChangeType[]>}
 */
export const syncTemplates = async ({ supabaseDir, basePath, t, write = true }) => {
  const configToml = join(supabaseDir, 'config.toml')
  if (!existsSync(configToml)) throw new CliError(`There is no ${configToml}: run supabase init first, or pass --dir.`)

  /** @type {TemplateChangeType[]} */
  const changes = []
  for (const type of EMAILS) {
    const file = join(supabaseDir, 'templates', `${type}.html`)
    const shown = `templates/${type}.html`
    if (existsSync(file)) {
      const linked = (await readFile(file, 'utf8')).includes(confirmLink(basePath, type))
      changes.push({ file: shown, status: linked ? 'kept' : 'stale' })
      continue
    }
    if (write) {
      await mkdir(join(supabaseDir, 'templates'), { recursive: true })
      await writeFile(file, emailHtml(basePath, type, t))
    }
    changes.push({ file: shown, status: 'added' })
  }

  const toml = await readFile(configToml, 'utf8')
  for (const type of EMAILS) {
    const has = toml.includes(`[auth.email.template.${type}]`)
    if (!has && write) await appendFile(configToml, configBlock(type, t))
    changes.push({ file: `config.toml [auth.email.template.${type}]`, status: has ? 'same' : 'added' })
  }
  return changes
}
