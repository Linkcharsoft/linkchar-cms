import type { NextConfig } from 'next'

export interface WithCmsOptionsType {
  // Default to NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.
  supabaseUrl?: string
  publishableKey?: string
  // false skips the redirects publishing left (they are read at build time).
  redirects?: boolean
}

export interface CmsRedirectType {
  source: string
  destination: string
  permanent: boolean
}

export type RedirectsFetcherType = (url: string, init: { headers: Record<string, string> }) => Promise<{ ok: boolean, status: number, json: () => Promise<unknown> }>

export declare const readRedirects: (supabaseUrl: string, publishableKey: string, fetcher?: RedirectsFetcherType) => Promise<CmsRedirectType[]>

// The package compiled with the project, Supabase images allowed, and the redirects of past publishes.
export declare const withCms: (nextConfig?: NextConfig, options?: WithCmsOptionsType) => NextConfig

export default withCms
