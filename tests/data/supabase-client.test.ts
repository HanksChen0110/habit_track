import { afterEach, describe, expect, it, vi } from 'vitest'
import viteConfig from '../../vite.config'

const clientModulePath = '../../src/data/supabaseClient'
const supabaseUrl = 'http://127.0.0.1:54321'
const publishableKey = 'sb_publishable_test_key'
const sentinelSupabaseUrl = 'http://not-a-real-supabase-url.invalid'
const sentinelPublishableKey = 'sb_publishable_sentinel_not-a-real-key'

afterEach(() => {
  vi.unstubAllEnvs()
  vi.resetModules()
})

describe('Supabase browser client', () => {
  it('uses the fixed local Vite server address required by Auth redirects', () => {
    expect(viteConfig.server).toMatchObject({
      host: '127.0.0.1',
      port: 3000,
      strictPort: true
    })
  })

  it('classifies a missing Supabase URL without exposing credentials', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', undefined)
    vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', sentinelPublishableKey)

    const { getSupabaseClient } = await import(clientModulePath)

    let actualError: unknown
    try {
      getSupabaseClient()
    } catch (error) {
      actualError = error
    }

    expect(actualError).toMatchObject({ code: 'SUPABASE_URL_MISSING' })
    expect(actualError).toBeInstanceOf(Error)
    expect((actualError as Error).message).not.toContain(sentinelPublishableKey)
    expect((actualError as Error & { cause?: unknown }).cause).toBeUndefined()
  })

  it('classifies a missing publishable key without exposing the configured URL', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', sentinelSupabaseUrl)
    vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', undefined)

    const { getSupabaseClient } = await import(clientModulePath)

    let actualError: unknown
    try {
      getSupabaseClient()
    } catch (error) {
      actualError = error
    }

    expect(actualError).toMatchObject({ code: 'SUPABASE_PUBLISHABLE_KEY_MISSING' })
    expect(actualError).toBeInstanceOf(Error)
    expect((actualError as Error).message).not.toContain(sentinelSupabaseUrl)
    expect((actualError as Error & { cause?: unknown }).cause).toBeUndefined()
  })

  it('does not treat a service-role value as a publishable key', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', supabaseUrl)
    vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', undefined)
    vi.stubEnv('VITE_SUPABASE_SERVICE_ROLE_KEY', 'service-role-test-key')

    const { getSupabaseClient } = await import(clientModulePath)

    expect(() => getSupabaseClient()).toThrowError(
      expect.objectContaining({ code: 'SUPABASE_PUBLISHABLE_KEY_MISSING' })
    )
  })

  it('creates one real client for the configured URL during a module lifetime', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', supabaseUrl)
    vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', publishableKey)

    const { getSupabaseClient } = await import(clientModulePath)

    const firstClient = getSupabaseClient()
    const secondClient = getSupabaseClient()

    expect(firstClient).toHaveProperty('supabaseUrl', supabaseUrl)
    expect(secondClient).toBe(firstClient)
  })
})
