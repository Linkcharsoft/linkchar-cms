// Plain JS: next.config loads before anything is transpiled, and Node won't strip types in node_modules.
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { request as httpRequest } from 'node:http'
import { request as httpsRequest } from 'node:https'
import { join } from 'node:path'

/** @param {string} path */
const literal = path => path.replace(/[:()*+?{}\\]/g, char => `\\${char}`)

/** @typedef {import('./index').RedirectsFetcherType} RedirectsFetcherType */

// Without keep-alive: next typegen and build exit right after, and on Windows Node can crash closing an idle socket.
/** @type {RedirectsFetcherType} */
const getJson = (url, { headers }) => new Promise((resolve, reject) => {
  const target = new URL(url)
  const send = target.protocol === 'https:' ? httpsRequest : httpRequest
  const pending = send(target, { headers, agent: false }, response => {
    let body = ''
    response.setEncoding('utf8')
    response.on('data', chunk => { body += chunk })
    response.on('end', () => {
      const status = response.statusCode ?? 0
      resolve({ ok: status >= 200 && status < 300, status, json: async () => JSON.parse(body) })
    })
  })
  pending.on('error', reject)
  pending.end()
})

/**
 * The 301s publishing leaves when a URL changes, read once per build with the public key.
 * @param {string} supabaseUrl
 * @param {string} publishableKey
 * @param {RedirectsFetcherType} fetcher
 */
export const readRedirects = async (supabaseUrl, publishableKey, fetcher = getJson) => {
  const response = await fetcher(`${supabaseUrl.replace(/\/$/, '')}/rest/v1/redirects?select=from_path,to_path,status&order=from_path`, {
    headers: { apikey: publishableKey, Authorization: `Bearer ${publishableKey}` }
  })
  if (!response.ok) throw new Error(`[@linkcharsoft/cms] Could not read the redirects from Supabase (HTTP ${response.status}).`)
  const rows = /** @type {{ from_path: string, to_path: string, status: number }[]} */ (await response.json())
  return rows.map(row => ({ source: literal(row.from_path), destination: row.to_path, permanent: row.status === 301 }))
}

// `next typegen` loads the config with the build phase but only writes route types: nothing to read from the database for.
const isTypegen = (argv = process.argv) => argv.includes('typegen')

const APP_ICONS = ['icon.svg', 'icon.png', 'apple-icon.png']
const PUBLIC_PNG = /^(icon|favicon|apple-touch-icon|android-chrome)[\w-]*\.png$/i

/** @param {string} file */
const pngWidth = file => {
  const head = readFileSync(file).subarray(0, 24)
  return head.toString('latin1', 12, 16) === 'IHDR' ? head.readUInt32BE(16) : 0
}

/**
 * The product icon the panel shows next to its name: Next's app icon, else the largest favicon in public/.
 * @param {string} [root]
 * @returns {{ url: string, file: string } | null}
 */
export const findBrandIcon = (root = process.cwd()) => {
  const appDirs = ['src/app', 'app'].filter(dir => existsSync(join(root, dir)))
  for (const dir of appDirs) {
    const name = APP_ICONS.find(icon => existsSync(join(root, dir, icon)))
    if (name) return { url: `/${name}`, file: `${dir}/${name}` }
  }
  const publicDir = join(root, 'public')
  const files = existsSync(publicDir) ? readdirSync(publicDir) : []
  if (files.includes('icon.svg')) return { url: '/icon.svg', file: 'public/icon.svg' }
  if (files.includes('favicon.svg')) return { url: '/favicon.svg', file: 'public/favicon.svg' }
  const [largest] = files.filter(name => PUBLIC_PNG.test(name))
    .map(name => ({ name, width: pngWidth(join(publicDir, name)) }))
    .sort((a, b) => b.width - a.width)
  if (largest) return { url: `/${largest.name}`, file: `public/${largest.name}` }
  const favicon = appDirs.find(dir => existsSync(join(root, dir, 'favicon.ico')))
  if (favicon) return { url: '/favicon.ico', file: `${favicon}/favicon.ico` }
  return files.includes('favicon.ico') ? { url: '/favicon.ico', file: 'public/favicon.ico' } : null
}

/**
 * @param {import('next').NextConfig} [nextConfig]
 * @param {import('./index').WithCmsOptionsType} [options]
 * @returns {import('next').NextConfig}
 */
export const withCms = (nextConfig = {}, options = {}) => {
  const supabaseUrl = options.supabaseUrl ?? process.env.NEXT_PUBLIC_SUPABASE_URL
  const publishableKey = options.publishableKey ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  const bucket = supabaseUrl ? new URL(supabaseUrl) : null
  const images = nextConfig.images ?? {}
  const icon = findBrandIcon()
  // Next keeps the site's reads in .next/cache/fetch-cache across builds; one stamp per build, inherited by its workers, keeps them fresh.
  process.env.CMS_BUILD_STAMP ??= Date.now().toString(36)

  return {
    ...nextConfig,
    env: { ...(icon ? { CMS_BRAND_ICON: `${nextConfig.basePath ?? ''}${icon.url}` } : {}), ...nextConfig.env },
    transpilePackages: [...new Set([...(nextConfig.transpilePackages ?? []), '@linkcharsoft/cms'])],
    images: {
      ...images,
      remotePatterns: [
        ...(images.remotePatterns ?? []),
        ...(bucket
          ? [{ protocol: /** @type {'http' | 'https'} */ (bucket.protocol === 'https:' ? 'https' : 'http'), hostname: bucket.hostname, port: bucket.port, pathname: '/storage/v1/object/public/media/**' }]
          : [])
      ],
      // A local Supabase runs on 127.0.0.1, which Next refuses to optimize unless allowed.
      ...(bucket && ['127.0.0.1', 'localhost'].includes(bucket.hostname) ? { dangerouslyAllowLocalIP: true } : {})
    },
    redirects: async () => {
      const own = nextConfig.redirects ? await nextConfig.redirects() : []
      if (options.redirects === false || isTypegen() || !supabaseUrl || !publishableKey) return own
      try {
        return [...own, ...(await readRedirects(supabaseUrl, publishableKey))]
      } catch (error) {
        // A build never ships without the published 301s; `next dev` keeps running while the database is off.
        if (process.env.NODE_ENV === 'production') throw error
        console.warn(`${error instanceof Error ? error.message : String(error)} Running without the published redirects.`)
        return own
      }
    }
  }
}

export default withCms
