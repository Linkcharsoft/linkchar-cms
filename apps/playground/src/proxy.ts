import { cms } from '@/cms/server'

export const proxy = cms.proxy

export const config = { matcher: ['/dashboard/:path*'] }
