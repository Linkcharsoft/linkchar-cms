import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { CliError } from './migrations.js'
import { tsconfigAliases } from './routes.js'

/**
 * @typedef {import('../src/server/mediaPull').MediaPullSummaryType} MediaPullSummaryType
 * @typedef {{ url: string, publishableKey: string }} PullSettingsType
 */

// Where media:pull leaves the files, relative to the project root; the site serves them at /cms-media/<path>.
export const LOCAL_MEDIA_DIR = 'public/cms-media'
export const AMPLIFY_PULL_LINE = 'pnpm exec linkchar-cms media:pull'
export const AMPLIFY_CACHE_PATH = `${LOCAL_MEDIA_DIR}/**/*`
export const GITIGNORE_LINE = `${LOCAL_MEDIA_DIR}/`

/**
 * The pull reads with the public values the site itself builds with.
 * @param {Record<string, string | undefined>} env @param {string} [envLabel]
 * @returns {PullSettingsType}
 */
export const pullSettings = (env, envLabel = 'the env file') => {
  const url = env.NEXT_PUBLIC_SUPABASE_URL
  const publishableKey = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  if (!url || !publishableKey) {
    const missing = [!url && 'NEXT_PUBLIC_SUPABASE_URL', !publishableKey && 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'].filter(Boolean).join(', ')
    throw new CliError(`Missing ${missing} in the environment or ${envLabel}.`)
  }
  return { url, publishableKey }
}

/** @param {number} bytes */
export const megabytes = bytes => `${(bytes / 1024 / 1024).toFixed(1)} MB`

/** @param {number} count @param {string} one @param {string} [many] */
const plural = (count, one, many = `${one}s`) => `${count} ${count === 1 ? one : many}`

/**
 * What the pull did, for the build log.
 * @param {MediaPullSummaryType} summary @param {string} url
 * @returns {string[]}
 */
export const pullLines = ({ downloaded, reused, removed, failed, downloadedBytes, totalBytes }, url) => {
  const lines = [`Media of the published content in ${LOCAL_MEDIA_DIR}: ${plural(downloaded, 'file')} downloaded (${megabytes(downloadedBytes)}), ${reused} reused, ${removed} removed; ${megabytes(totalBytes)} in all, from ${url}.`]
  if (failed.length > 0) lines.push(`! ${plural(failed.length, 'file')} could not be downloaded and the site serves ${failed.length === 1 ? 'it' : 'them'} from Storage: ${failed.join(', ')}`)
  return lines
}

/**
 * Loads the project's config and the package's pull with jiti (both are TypeScript) against the client of the given keys.
 * @param {{ configFile: string, root: string, settings: PullSettingsType, warn?: (message: string) => void }} options
 * @returns {Promise<MediaPullSummaryType>}
 */
export const runPull = async ({ configFile, root, settings, warn }) => {
  if (!existsSync(configFile)) throw new CliError(`There is no CMS config at ${configFile}: pass --config.`)
  const { createJiti } = await import('jiti')
  const { createClient } = await import('@supabase/supabase-js')
  const jiti = createJiti(import.meta.url, { alias: await tsconfigAliases(root) })
  const config = /** @type {import('../src/core/config').CmsConfigType} */ (await jiti.import(configFile, { default: true }))
  const { runMediaPull } = /** @type {typeof import('../src/server/mediaPull')} */ (await jiti.import(fileURLToPath(new URL('../src/server/mediaPull.ts', import.meta.url))))
  const db = createClient(settings.url, settings.publishableKey, { auth: { persistSession: false, autoRefreshToken: false } })
  return runMediaPull({ config, db: /** @type {import('../src/server/context').CmsClientType} */ (/** @type {unknown} */ (db)), supabaseUrl: settings.url, root, warn })
}

/**
 * The published files and their weight, for doctor; same read as the pull, nothing written.
 * @param {{ configFile: string, root: string, settings: PullSettingsType }} options
 * @returns {Promise<{ count: number, bytes: number }>}
 */
export const publishedMediaSize = async ({ configFile, root, settings }) => {
  const { createJiti } = await import('jiti')
  const { createClient } = await import('@supabase/supabase-js')
  const jiti = createJiti(import.meta.url, { alias: await tsconfigAliases(root) })
  const config = /** @type {import('../src/core/config').CmsConfigType} */ (await jiti.import(configFile, { default: true }))
  const { publishedMedia } = /** @type {typeof import('../src/server/mediaPull')} */ (await jiti.import(fileURLToPath(new URL('../src/server/mediaPull.ts', import.meta.url))))
  const db = createClient(settings.url, settings.publishableKey, { auth: { persistSession: false, autoRefreshToken: false } })
  const rows = await publishedMedia(config, /** @type {import('../src/server/context').CmsClientType} */ (/** @type {unknown} */ (db)))
  return { count: rows.length, bytes: rows.reduce((sum, row) => sum + row.size, 0) }
}
