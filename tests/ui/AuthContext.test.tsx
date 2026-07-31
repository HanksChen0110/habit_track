import { act, renderHook, waitFor } from '@testing-library/react'
import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider, useAuth } from '../../src/auth/AuthContext'

type AuthListener = (event: AuthChangeEvent, session: Session | null) => void

const authMock = vi.hoisted(() => ({
  getSession: vi.fn(),
  signUp: vi.fn(),
  signInWithPassword: vi.fn(),
  signOut: vi.fn(),
  listener: undefined as AuthListener | undefined,
  unsubscribe: vi.fn()
}))

vi.mock('../../src/data/supabaseClient', () => ({
  getSupabaseClient: () => ({
    auth: {
      getSession: authMock.getSession,
      signUp: authMock.signUp,
      signInWithPassword: authMock.signInWithPassword,
      signOut: authMock.signOut,
      onAuthStateChange: (listener: AuthListener) => {
        authMock.listener = listener
        return { data: { subscription: { unsubscribe: authMock.unsubscribe } } }
      }
    }
  })
}))

function createUser(id: string, email: string): User {
  return {
    id,
    email,
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
    created_at: '2026-08-01T00:00:00.000Z'
  }
}

function createSession(id: string, email: string): Session {
  return {
    access_token: `access-${id}`,
    refresh_token: `refresh-${id}`,
    expires_in: 3600,
    token_type: 'bearer',
    user: createUser(id, email)
  }
}

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((next) => {
    resolve = next
  })
  return { promise, resolve }
}

function wrapper({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>
}

async function renderSignedOut() {
  authMock.getSession.mockResolvedValueOnce({ data: { session: null }, error: null })
  const rendered = renderHook(() => useAuth(), { wrapper })
  await waitFor(() => expect(rendered.result.current.status).toBe('signed_out'))
  return rendered
}

describe('AuthContext', () => {
  beforeEach(() => {
    authMock.getSession.mockReset()
    authMock.signUp.mockReset()
    authMock.signInWithPassword.mockReset()
    authMock.signOut.mockReset()
    authMock.unsubscribe.mockReset()
    authMock.listener = undefined
  })

  it('keeps booting until session recovery confirms the user is signed out', async () => {
    const recovery = deferred<{
      data: { session: null }
      error: null
    }>()
    authMock.getSession.mockReturnValueOnce(recovery.promise)

    const { result } = renderHook(() => useAuth(), { wrapper })

    expect(result.current.status).toBe('booting')
    expect(result.current.user).toBeNull()

    await act(async () => recovery.resolve({ data: { session: null }, error: null }))

    expect(result.current.status).toBe('signed_out')
    expect(result.current.user).toBeNull()
  })

  it('restores an authenticated session without exposing session credentials', async () => {
    authMock.getSession.mockResolvedValueOnce({
      data: { session: createSession('user-a', 'a@example.com') },
      error: null
    })

    const { result } = renderHook(() => useAuth(), { wrapper })

    await waitFor(() => expect(result.current.status).toBe('authenticated'))
    expect(result.current.user).toEqual({ id: 'user-a', email: 'a@example.com' })
    expect(result.current.user).not.toHaveProperty('access_token')
  })

  it('registers a new account and enters the authenticated account gate', async () => {
    const { result } = await renderSignedOut()
    authMock.signUp.mockResolvedValueOnce({
      data: {
        user: createUser('user-new', 'new@example.com'),
        session: createSession('user-new', 'new@example.com')
      },
      error: null
    })

    let outcome: Awaited<ReturnType<typeof result.current.signUp>> | undefined
    await act(async () => {
      outcome = await result.current.signUp('new@example.com', 'correct horse battery staple')
    })

    expect(outcome).toEqual({ ok: true })
    expect(result.current.status).toBe('authenticated')
    expect(result.current.user).toEqual({ id: 'user-new', email: 'new@example.com' })
  })

  it('maps invalid credentials to a readable category and remains signed out', async () => {
    const { result } = await renderSignedOut()
    authMock.signInWithPassword.mockResolvedValueOnce({
      data: { user: null, session: null },
      error: {
        name: 'AuthApiError',
        status: 400,
        code: 'invalid_credentials',
        message: 'password=secret; auth.users rejected the credential'
      }
    })

    let outcome: Awaited<ReturnType<typeof result.current.signIn>> | undefined
    await act(async () => {
      outcome = await result.current.signIn('person@example.com', 'secret')
    })

    expect(outcome).toEqual({
      ok: false,
      error: {
        category: 'invalid_credentials',
        message: '邮箱或密码不正确。'
      }
    })
    expect(result.current.status).toBe('signed_out')
    expect(result.current.user).toBeNull()
    expect(JSON.stringify(result.current.error)).not.toContain('secret')
    expect(JSON.stringify(result.current.error)).not.toContain('auth.users')
  })

  it.each([
    [
      'email_exists',
      { category: 'account_exists', message: '这个邮箱已经注册，请直接登录。' }
    ],
    [
      'weak_password',
      { category: 'weak_password', message: '密码强度不足，请换一个更长的密码。' }
    ]
  ])('maps the %s registration error without exposing its raw message', async (code, expected) => {
    const { result } = await renderSignedOut()
    authMock.signUp.mockResolvedValueOnce({
      data: { user: null, session: null },
      error: {
        name: 'AuthApiError',
        status: 400,
        code,
        message: 'password=secret; internal auth relation failed'
      }
    })

    let outcome: Awaited<ReturnType<typeof result.current.signUp>> | undefined
    await act(async () => {
      outcome = await result.current.signUp('person@example.com', 'secret')
    })

    expect(outcome).toEqual({ ok: false, error: expected })
    expect(result.current.status).toBe('signed_out')
    expect(JSON.stringify(result.current.error)).not.toContain('secret')
    expect(JSON.stringify(result.current.error)).not.toContain('relation')
  })

  it('classifies a failed initial recovery without returning internal details', async () => {
    authMock.getSession.mockResolvedValueOnce({
      data: { session: null },
      error: {
        name: 'AuthRetryableFetchError',
        status: 0,
        message: 'connect ECONNREFUSED with token=private'
      }
    })

    const { result } = renderHook(() => useAuth(), { wrapper })

    await waitFor(() => expect(result.current.status).toBe('error'))
    expect(result.current.error).toEqual({
      category: 'backend_unavailable',
      message: '本地后端暂时不可用，请确认本地服务已启动。'
    })
    expect(JSON.stringify(result.current.error)).not.toContain('ECONNREFUSED')
    expect(JSON.stringify(result.current.error)).not.toContain('private')
  })

  it('clears the authenticated user after sign-out succeeds', async () => {
    authMock.getSession.mockResolvedValueOnce({
      data: { session: createSession('user-a', 'a@example.com') },
      error: null
    })
    authMock.signOut.mockResolvedValueOnce({ error: null })
    const { result } = renderHook(() => useAuth(), { wrapper })
    await waitFor(() => expect(result.current.status).toBe('authenticated'))

    let outcome: Awaited<ReturnType<typeof result.current.signOut>> | undefined
    await act(async () => {
      outcome = await result.current.signOut()
    })

    expect(outcome).toEqual({ ok: true })
    expect(result.current.status).toBe('signed_out')
    expect(result.current.user).toBeNull()
  })

  it('keeps the newest account when initial recovery returns an older session late', async () => {
    const recovery = deferred<{
      data: { session: Session }
      error: null
    }>()
    authMock.getSession.mockReturnValueOnce(recovery.promise)
    const { result } = renderHook(() => useAuth(), { wrapper })

    act(() => {
      authMock.listener?.('SIGNED_IN', createSession('user-b', 'b@example.com'))
    })
    expect(result.current.user).toEqual({ id: 'user-b', email: 'b@example.com' })

    await act(async () => {
      recovery.resolve({
        data: { session: createSession('user-a', 'a@example.com') },
        error: null
      })
    })

    expect(result.current.status).toBe('authenticated')
    expect(result.current.user).toEqual({ id: 'user-b', email: 'b@example.com' })
  })

  it('does not let a late sign-in response restore an account after a session switch', async () => {
    const { result } = await renderSignedOut()
    const signIn = deferred<{
      data: { user: User; session: Session }
      error: null
    }>()
    authMock.signInWithPassword.mockReturnValueOnce(signIn.promise)

    let signInPromise: ReturnType<typeof result.current.signIn>
    act(() => {
      signInPromise = result.current.signIn('a@example.com', 'not-logged')
    })
    act(() => {
      authMock.listener?.('SIGNED_IN', createSession('user-b', 'b@example.com'))
    })

    await act(async () => {
      signIn.resolve({
        data: {
          user: createUser('user-a', 'a@example.com'),
          session: createSession('user-a', 'a@example.com')
        },
        error: null
      })
      await signInPromise
    })

    expect(result.current.status).toBe('authenticated')
    expect(result.current.user).toEqual({ id: 'user-b', email: 'b@example.com' })
  })
})
