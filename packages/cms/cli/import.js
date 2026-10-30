import { existsSync } from 'node:fs'
import { createInterface } from 'node:readline/promises'
import { fileURLToPath } from 'node:url'
import { isLocalSupabaseUrl } from './local.js'
import { CliError } from './migrations.js'
import { tsconfigAliases } from './routes.js'

/**
 * @typedef {{ email?: string, password?: string, otp?: string }} ImportFlagsType
 * @typedef {import('../src/server/import').ImportSummaryType} ImportSummaryType
 * @typedef {{
 *   email: string, password: string, otp?: string,
 *   supabase: { url: string, publishableKey: string, secretKey: string },
 *   build: { kind: 'amplify', hookUrl: string, webhookSecret?: string } | { kind: 'mock' } | { kind: 'none' }
 * }} ImportSettingsType
 */

/**
 * Who imports and where, from the flags and the environment; the build follows the project's server.ts.
 * @param {Record<string, string | undefined>} env
 * @param {ImportFlagsType} flags
 * @param {string} [envLabel] the env file(s) read, for the messages
 * @returns {ImportSettingsType}
 */
export const importSettings = (env, { email, password, otp }, envLabel = 'the env file') => {
  const user = email ?? env.CMS_IMPORT_EMAIL
  const secret = password ?? env.CMS_IMPORT_PASSWORD
  if (!user || !secret) throw new CliError('The import signs in as a panel user: pass --email and set CMS_IMPORT_PASSWORD (or --password, or --password-stdin).')

  const url = env.NEXT_PUBLIC_SUPABASE_URL
  const publishableKey = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  const secretKey = env.SUPABASE_SECRET_KEY
  const missing = Object.entries({ NEXT_PUBLIC_SUPABASE_URL: url, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: publishableKey, SUPABASE_SECRET_KEY: secretKey })
    .filter(([, value]) => !value).map(([name]) => name)
  if (!url || !publishableKey || !secretKey) throw new CliError(`Missing ${missing.join(', ')} in the environment or ${envLabel}.`)

  // A hosted project without a hook gets no build: the publish log says so instead of a mock success.
  const build = env.CMS_BUILD_HOOK_URL
    ? /** @type {const} */ ({ kind: 'amplify', hookUrl: env.CMS_BUILD_HOOK_URL, webhookSecret: env.CMS_BUILD_WEBHOOK_SECRET })
    : isLocalSupabaseUrl(url) ? /** @type {const} */ ({ kind: 'mock' }) : /** @type {const} */ ({ kind: 'none' })

  return { email: user, password: secret, otp, supabase: { url, publishableKey, secretKey }, build }
}

/**
 * The first line of stdin, for --password-stdin: `printf '%s' "$PASSWORD" | linkchar-cms import …`.
 * @param {AsyncIterable<string | Buffer>} stream
 * @returns {Promise<string>}
 */
export const readPasswordFromStdin = async stream => {
  let text = ''
  for await (const chunk of stream) text += chunk
  const password = text.split(/\r?\n/)[0]
  if (!password) throw new CliError('--password-stdin got nothing: pipe the password into the command.')
  return password
}

/** @param {number} count @param {string} one @param {string} [many] */
const plural = (count, one, many = `${one}s`) => `${count} ${count === 1 ? one : many}`

/**
 * What the run would write, from a dry run: each document that changes with its fields, what it creates and uploads.
 * @param {ImportSummaryType} summary
 * @param {string} url
 * @returns {string[]}
 */
export const planLines = ({ changed, created, unchanged, media }, url) => {
  if (changed.length + created.length + media === 0) return [`Nothing to write to ${url}: every document matches the script${unchanged > 0 ? ` (${plural(unchanged, 'document')} unchanged)` : ''}.`]
  const lines = [`Plan for ${url}: ${plural(changed.length, 'document')} change, ${created.length} created, ${unchanged} unchanged, ${plural(media, 'file')} uploaded.`]
  for (const change of changed) lines.push(`  ~ ${change.entry} "${change.title || change.id}": ${change.fields.join(', ')}`)
  for (const item of created) lines.push(`  + ${item.entry} (${item.lookup})`)
  return lines
}

/**
 * Asks on the terminal; anything but y/yes is no.
 * @param {string} question
 * @param {{ input?: NodeJS.ReadableStream, output?: NodeJS.WritableStream }} [streams]
 */
export const askYesNo = async (question, { input = process.stdin, output = process.stdout } = {}) => {
  const rl = createInterface({ input, output })
  try {
    const answer = await rl.question(question)
    return ['y', 'yes'].includes(answer.trim().toLowerCase())
  } finally {
    rl.close()
  }
}

/**
 * The lines printed after a run: how it found what it updated and what it changed, what it created where documents already existed, and the hidden drafts it left alone.
 * @param {ImportSummaryType} summary
 * @returns {string[]}
 */
export const summaryLines = ({ created, updated, matched = { id: 0, key: 0, slug: 0 }, adopted = 0, untouched = [], changed = [], unchanged = 0, media = 0 }) => {
  const by = Object.entries(matched).filter(([, count]) => count > 0).map(([how, count]) => `${count} by ${how}`)
  const how = [...by, ...(adopted > 0 ? [`${adopted} key${adopted === 1 ? '' : 's'} adopted`] : [])]
  const what = updated > 0 ? ` (${changed.length} changed, ${unchanged} unchanged${how.length > 0 ? `; ${how.join(', ')}` : ''})` : ''
  const lines = [`${updated} updated${what}, ${created.length} created${media > 0 ? `, ${plural(media, 'file')} uploaded` : ''}.`]
  const entries = [...new Set(created.filter(item => item.existing > 0).map(item => item.entry))]
  for (const entry of entries) {
    const items = created.filter(item => item.entry === entry)
    const names = items.map(item => {
      const [by, ...value] = item.lookup.split(' ')
      return `${value.join(' ')} (${by} not found)`
    })
    lines.push(`! ${entry} already had ${items[0].existing} documents; created ${names.join(', ')}. Pass match: { key } so the import finds a document after its slug changes, or --no-create to refuse.`)
  }
  for (const entry of [...new Set(untouched.map(item => item.entry))]) {
    const titles = untouched.filter(item => item.entry === entry).map(item => item.title || item.id)
    const one = titles.length === 1
    lines.push(`! ${entry} has ${titles.length} hidden ${one ? 'document' : 'documents'} the script did not touch and nobody published: ${titles.join(', ')}. Open the collection in the panel to keep or trash ${one ? 'it' : 'them'}.`)
  }
  return lines
}

/**
 * Loads the project's config and script with jiti (they import the package's TypeScript) and runs the script with a session;
 * with dryRun the session writes nothing and the summary says what it would.
 * @param {{ script: string, configFile: string, root: string, settings: ImportSettingsType, publish: boolean, create?: boolean, dryRun?: boolean }} options
 * @returns {Promise<{ build: ImportSettingsType['build']['kind'], summary: ImportSummaryType }>}
 */
export const runImport = async ({ script, configFile, root, settings, publish, create = true, dryRun = false }) => {
  if (!existsSync(script)) throw new CliError(`There is no import script at ${script}.`)
  if (!existsSync(configFile)) throw new CliError(`There is no CMS config at ${configFile}: pass --config.`)

  const { createJiti } = await import('jiti')
  const jiti = createJiti(import.meta.url, { alias: await tsconfigAliases(root) })
  const source = (/** @type {string} */ file) => fileURLToPath(new URL(`../src/${file}`, import.meta.url))

  const config = await jiti.import(configFile, { default: true })
  const run = await jiti.import(script, { default: true })
  if (typeof run !== 'function') throw new CliError(`${script} must export default async (cms) => { … }.`)

  const { createImportSession } = /** @type {typeof import('../src/server/import')} */ (await jiti.import(source('server/import.ts')))
  const { build } = settings
  const publishTarget = build.kind === 'amplify'
    ? (/** @type {typeof import('../src/publish/amplify')} */ (await jiti.import(source('publish/amplify.ts')))).amplify({ hookUrl: build.hookUrl, webhookSecret: build.webhookSecret })
    : build.kind === 'mock' ? (/** @type {typeof import('../src/publish/mock')} */ (await jiti.import(source('publish/mock.ts')))).mockBuild({ seconds: 1 }) : null

  const session = await createImportSession({
    config: /** @type {import('../src/core/config').CmsConfigType} */ (config),
    supabase: settings.supabase,
    email: settings.email,
    password: settings.password,
    otp: settings.otp,
    publishTarget,
    publish,
    create,
    dryRun,
    root
  })
  try {
    await run(session)
  } finally {
    await session.signOut()
  }
  return { build: build.kind, summary: await session.summary() }
}
