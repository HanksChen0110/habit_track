import { createClient, type SupabaseClient } from '@supabase/supabase-js'

type SupabaseClientConfigurationErrorCode =
  | 'SUPABASE_URL_MISSING'
  | 'SUPABASE_PUBLISHABLE_KEY_MISSING'

class SupabaseClientConfigurationError extends Error {
  readonly code: SupabaseClientConfigurationErrorCode

  constructor(code: SupabaseClientConfigurationErrorCode) {
    super(code)
    this.name = 'SupabaseClientConfigurationError'
    this.code = code
  }
}

let supabaseClient: SupabaseClient | undefined

export function getSupabaseClient(): SupabaseClient {
  const url = import.meta.env.VITE_SUPABASE_URL
  const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

  if (!url) {
    throw new SupabaseClientConfigurationError('SUPABASE_URL_MISSING')
  }

  if (!publishableKey) {
    throw new SupabaseClientConfigurationError('SUPABASE_PUBLISHABLE_KEY_MISSING')
  }

  supabaseClient ??= createClient(url, publishableKey)
  return supabaseClient
}
