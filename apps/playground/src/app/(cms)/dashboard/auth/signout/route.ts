import { NextResponse } from 'next/server'
import { cms } from '@/cms/server'
import type { NextRequest } from 'next/server'

export const GET = async (request: NextRequest) => {
  await (await cms.context()).db.auth.signOut()
  return NextResponse.redirect(new URL('/dashboard/login', request.url))
}
