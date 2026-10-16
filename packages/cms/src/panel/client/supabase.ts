'use client'
import { createBrowserClient } from '@supabase/ssr'
import { useCms } from './context'
import type { Database } from '../../server/database'

// createBrowserClient keeps one client per page, so calling this on every render is cheap.
export const useBrowserSupabase = () => {
  const { supabase } = useCms()
  return createBrowserClient<Database>(supabase.url, supabase.publishableKey)
}
