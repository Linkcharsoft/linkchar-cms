import { cms } from '@/cms/server'
import type { NextRequest } from 'next/server'

export const proxy = async (request: NextRequest) => (await cms.updateSession(request)).response

export const config = { matcher: ['/dashboard/:path*'] }
