import type { NextConfig } from 'next'

const supabaseUrl = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:54421')

// withCms() replaces this once the package ships its Next helpers.
const nextConfig: NextConfig = {
  reactStrictMode: true,
  reactCompiler: true,
  transpilePackages: ['@linkcharsoft/cms'],
  // Same prelude as the template: proves it doesn't break the package's own .sass files.
  sassOptions: {
    additionalData: `
      @use "@/styles/mixins.sass" as mixins;
    `
  },
  images: {
    remotePatterns: [{
      protocol: supabaseUrl.protocol === 'https:' ? 'https' : 'http',
      hostname: supabaseUrl.hostname,
      port: supabaseUrl.port,
      pathname: '/storage/v1/object/public/**'
    }]
  }
}

export default nextConfig
