import type { NextConfig } from 'next'

// withCms() replaces this once the package ships its Next helpers.
const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@linkcharsoft/cms']
}

export default nextConfig
