import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode
} from 'react'
import type { Session, SupabaseClient } from '@supabase/supabase-js'
import { getSupabaseClient } from '../data/supabaseClient'

export type AuthStatus = 'booting' | 'signed_out' | 'authenticated' | 'error'

export interface AuthUser {
  id: string
  email: string
}

export type AuthErrorCategory =
  | 'invalid_credentials'
  | 'account_exists'
  | 'weak_password'
  | 'backend_unavailable'
  | 'unknown'

export interface AuthFailure {
  category: AuthErrorCategory
  message: string
}

export type AuthResult = { ok: true } | { ok: false; error: AuthFailure }

interface AuthContextValue {
  status: AuthStatus
  user: AuthUser | null
  error: AuthFailure | null
  signUp: (email: string, password: string) => Promise<AuthResult>
  signIn: (email: string, password: string) => Promise<AuthResult>
  signOut: () => Promise<AuthResult>
}

interface AuthErrorLike {
  code?: unknown
  name?: unknown
  status?: unknown
}

interface CredentialResponse {
  data: { session: Session | null }
  error: unknown
}

const BACKEND_UNAVAILABLE: AuthFailure = {
  category: 'backend_unavailable',
  message: '本地后端暂时不可用，请确认本地服务已启动。'
}

const UNKNOWN_AUTH_FAILURE: AuthFailure = {
  category: 'unknown',
  message: '账号操作失败，请重试。'
}

const AuthContext = createContext<AuthContextValue | null>(null)

function mapAuthError(cause: unknown, recovery = false): AuthFailure {
  const error =
    typeof cause === 'object' && cause !== null ? (cause as AuthErrorLike) : undefined
  const code = typeof error?.code === 'string' ? error.code : ''
  const name = typeof error?.name === 'string' ? error.name : ''

  if (code === 'invalid_credentials') {
    return { category: 'invalid_credentials', message: '邮箱或密码不正确。' }
  }

  if (code === 'email_exists' || code === 'user_already_exists') {
    return { category: 'account_exists', message: '这个邮箱已经注册，请直接登录。' }
  }

  if (code === 'weak_password') {
    return { category: 'weak_password', message: '密码强度不足，请换一个更长的密码。' }
  }

  if (
    recovery ||
    error?.status === 0 ||
    name === 'AuthRetryableFetchError' ||
    code === 'SUPABASE_URL_MISSING' ||
    code === 'SUPABASE_PUBLISHABLE_KEY_MISSING'
  ) {
    return BACKEND_UNAVAILABLE
  }

  return UNKNOWN_AUTH_FAILURE
}

function publicUser(session: Session): AuthUser {
  return {
    id: session.user.id,
    email: session.user.email ?? ''
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('booting')
  const [user, setUser] = useState<AuthUser | null>(null)
  const [error, setError] = useState<AuthFailure | null>(null)
  const clientRef = useRef<SupabaseClient | null>(null)
  const sessionVersionRef = useRef(0)

  const applySession = useCallback((session: Session | null) => {
    sessionVersionRef.current += 1
    if (session) {
      setUser(publicUser(session))
      setStatus('authenticated')
    } else {
      setUser(null)
      setStatus('signed_out')
    }
    setError(null)
  }, [])

  const applyRecoveryFailure = useCallback((cause: unknown) => {
    sessionVersionRef.current += 1
    setUser(null)
    setError(mapAuthError(cause, true))
    setStatus('error')
  }, [])

  useEffect(() => {
    let active = true
    let unsubscribe: (() => void) | undefined
    let client: SupabaseClient

    try {
      client = getSupabaseClient()
      clientRef.current = client
      const subscription = client.auth.onAuthStateChange((_event, session) => {
        if (active) applySession(session)
      })
      unsubscribe = () => subscription.data.subscription.unsubscribe()
    } catch (cause) {
      applyRecoveryFailure(cause)
      return () => {
        active = false
        sessionVersionRef.current += 1
      }
    }

    const recoveryVersion = sessionVersionRef.current
    void client.auth
      .getSession()
      .then(({ data, error: recoveryError }) => {
        if (!active || recoveryVersion !== sessionVersionRef.current) return
        if (recoveryError) {
          applyRecoveryFailure(recoveryError)
          return
        }
        applySession(data.session)
      })
      .catch((cause: unknown) => {
        if (active && recoveryVersion === sessionVersionRef.current) {
          applyRecoveryFailure(cause)
        }
      })

    return () => {
      active = false
      sessionVersionRef.current += 1
      clientRef.current = null
      unsubscribe?.()
    }
  }, [applyRecoveryFailure, applySession])

  const runCredentialRequest = useCallback(
    async (
      request: (client: SupabaseClient) => PromiseLike<CredentialResponse>
    ): Promise<AuthResult> => {
      const client = clientRef.current
      if (!client) {
        setError(BACKEND_UNAVAILABLE)
        return { ok: false, error: BACKEND_UNAVAILABLE }
      }

      const requestVersion = ++sessionVersionRef.current
      const fail = (failure: AuthFailure): AuthResult => {
        if (requestVersion === sessionVersionRef.current) {
          setUser(null)
          setStatus('signed_out')
          setError(failure)
        }
        return { ok: false, error: failure }
      }

      try {
        const { data, error: requestError } = await request(client)
        if (requestError) return fail(mapAuthError(requestError))
        if (!data.session) return fail(UNKNOWN_AUTH_FAILURE)

        if (requestVersion === sessionVersionRef.current) applySession(data.session)
        return { ok: true }
      } catch (cause) {
        return fail(mapAuthError(cause))
      }
    },
    [applySession]
  )

  const signUp = useCallback(
    (email: string, password: string) =>
      runCredentialRequest((client) => client.auth.signUp({ email, password })),
    [runCredentialRequest]
  )

  const signIn = useCallback(
    (email: string, password: string) =>
      runCredentialRequest((client) => client.auth.signInWithPassword({ email, password })),
    [runCredentialRequest]
  )

  const signOut = useCallback(async (): Promise<AuthResult> => {
    const client = clientRef.current
    if (!client) {
      setError(BACKEND_UNAVAILABLE)
      return { ok: false, error: BACKEND_UNAVAILABLE }
    }

    const requestVersion = ++sessionVersionRef.current
    try {
      const { error: signOutError } = await client.auth.signOut()
      if (signOutError) {
        const failure = mapAuthError(signOutError)
        if (requestVersion === sessionVersionRef.current) setError(failure)
        return { ok: false, error: failure }
      }

      if (requestVersion === sessionVersionRef.current) applySession(null)
      return { ok: true }
    } catch (cause) {
      const failure = mapAuthError(cause)
      if (requestVersion === sessionVersionRef.current) setError(failure)
      return { ok: false, error: failure }
    }
  }, [applySession])

  const value = useMemo<AuthContextValue>(
    () => ({ status, user, error, signUp, signIn, signOut }),
    [error, signIn, signOut, signUp, status, user]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth 必须在 AuthProvider 内使用')
  return value
}
