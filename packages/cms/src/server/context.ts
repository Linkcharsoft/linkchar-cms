import type { Database } from './database'
import type { CmsConfigType, Register } from '../core/config'
import type { CmsLoggerType } from '../core/logger'
import type { PublishTargetType } from '../publish/types'
import type { SupabaseClient } from '@supabase/supabase-js'

export type CmsClientType = SupabaseClient<Database>

// The project's generated types (its own tables next to the CMS ones), registered as `database`; the package's otherwise.
export type ProjectDatabaseOf<R> = R extends { database: infer D } ? D : Database

export type ProjectClientType = SupabaseClient<ProjectDatabaseOf<Register>>

export type ProfileType = Database['public']['Tables']['profiles']['Row']

export interface CmsContextType {
  config: CmsConfigType
  supabaseUrl: string
  // The signed-in user's session: RLS applies with their role.
  db: CmsClientType
  // Service role, bypasses RLS: only after the action checked who is asking.
  admin: () => CmsClientType
  // A client with no session, e.g. to check a password without replacing the cookie session.
  anonymous: () => CmsClientType
  publishTarget: PublishTargetType | null
  revalidate: (path: string, type?: 'page' | 'layout') => void
  now: () => Date
  logger: CmsLoggerType
  // Reaches the site (its build stamp); the global fetch unless a test replaces it.
  fetch?: typeof fetch
  // The Amplify branch this site was built from (CMS_SITE_BRANCH, inlined by withCms); null outside Amplify.
  siteBranch?: string | null
}

// Thrown by the server layer to send the user elsewhere (sign-in, the new document); the Next binding redirects.
export class CmsRedirect extends Error {
  constructor (readonly to: string) {
    super(`Redirect to ${to}`)
    this.name = 'CmsRedirect'
  }
}

export type DataRecord = Record<string, unknown>

export const asRecord = (data: unknown): DataRecord =>
  (typeof data === 'object' && data !== null && !Array.isArray(data) ? data as DataRecord : {})

export const UNIQUE_VIOLATION = '23505'
