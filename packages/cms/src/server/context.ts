import type { Database } from './database'
import type { CmsConfigType } from '../core/config'
import type { PublishTargetType } from '../publish/types'
import type { SupabaseClient } from '@supabase/supabase-js'

export type CmsClientType = SupabaseClient<Database>

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
  revalidate: (path: string) => void
  now: () => Date
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
