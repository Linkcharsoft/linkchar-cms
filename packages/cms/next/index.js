// Plain JS: next.config loads before anything is transpiled, and Node won't strip types in node_modules.
import { request as httpRequest } from 'node:http'
import { request as httpsRequest } from 'node:https'

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

  return {
    ...nextConfig,
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
      if (options.redirects === false || !supabaseUrl || !publishableKey) return own
      return [...own, ...(await readRedirects(supabaseUrl, publishableKey))]
    }
  }
}

export default withCms
