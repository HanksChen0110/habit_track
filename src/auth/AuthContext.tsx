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

interface PendingCredentialRequest {
  email: string
  startUserId: string | null
}

interface SessionRestoration {
  userId: string
  promise: Promise<void>
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
  const currentSessionRef = useRef<Session | null>(null)
  const currentStatusRef = useRef<AuthStatus>('booting')
  const currentUserRef = useRef<AuthUser | null>(null)
  const pendingCredentialRef = useRef<PendingCredentialRequest | null>(null)
  const restorationRef = useRef<SessionRestoration | null>(null)
  const signedOutRestorationRef = useRef<Promise<AuthFailure | null> | null>(null)
  const credentialQueueRef = useRef<Promise<void> | null>(null)
  const authGenerationRef = useRef(0)
  const authoritativeSignedOutRef = useRef(false)
  const sessionVersionRef = useRef(0)

  const applySession = useCallback((session: Session | null) => {
    sessionVersionRef.current += 1
    currentSessionRef.current = session
    if (session) {
      const nextUser = publicUser(session)
      currentUserRef.current = nextUser
      currentStatusRef.current = 'authenticated'
      setUser(nextUser)
      setStatus('authenticated')
    } else {
      currentUserRef.current = null
      currentStatusRef.current = 'signed_out'
      setUser(null)
      setStatus('signed_out')
    }
    setError(null)
  }, [])

  const applyRecoveryFailure = useCallback((cause: unknown) => {
    sessionVersionRef.current += 1
    currentSessionRef.current = null
    currentUserRef.current = null
    currentStatusRef.current = 'error'
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
      const subscription = client.auth.onAuthStateChange((event, session) => {
        if (!active) return
        if (!session) {
          applySession(null)
          return
        }

        if (authoritativeSignedOutRef.current) {
          if (!signedOutRestorationRef.current) {
            const restoreSignedOut = client.auth
              .signOut()
              .then(({ error: restoreError }) => {
                if (!restoreError) return null
                if (active) applyRecoveryFailure(restoreError)
                return mapAuthError(restoreError, true)
              })
              .catch((cause: unknown) => {
                if (active) applyRecoveryFailure(cause)
                return mapAuthError(cause, true)
              })
            signedOutRestorationRef.current = restoreSignedOut
          }
          return
        }

        const restoration = restorationRef.current
        const incomingUserId = session?.user.id
        if (restoration && incomingUserId && incomingUserId !== restoration.userId) {
          return
        }

        const pending = pendingCredentialRef.current
        const currentUserId = currentUserRef.current?.id
        const isRequestedAccount =
          event === 'SIGNED_IN' &&
          session?.user.email?.trim().toLowerCase() === pending?.email

        if (
          isRequestedAccount &&
          currentUserId &&
          incomingUserId &&
          currentUserId !== incomingUserId &&
          currentUserId !== pending?.startUserId
        ) {
          const authoritativeSession = currentSessionRef.current
          if (authoritativeSession && !restorationRef.current) {
            const restorationState: SessionRestoration = {
              userId: authoritativeSession.user.id,
              promise: Promise.resolve()
            }
            restorationRef.current = restorationState
            restorationState.promise = (async () => {
              try {
                const { error: restoreError } = await client.auth.setSession({
                  access_token: authoritativeSession.access_token,
                  refresh_token: authoritativeSession.refresh_token
                })
                if (
                  active &&
                  restoreError &&
                  currentUserRef.current?.id === authoritativeSession.user.id
                ) {
                  applyRecoveryFailure(restoreError)
                }
              } catch (cause) {
                if (
                  active &&
                  currentUserRef.current?.id === authoritativeSession.user.id
                ) {
                  applyRecoveryFailure(cause)
                }
              } finally {
                if (restorationRef.current === restorationState) {
                  restorationRef.current = null
                }
              }
            })()
          }
          return
        }

        applySession(session)
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
      currentSessionRef.current = null
      pendingCredentialRef.current = null
      restorationRef.current = null
      signedOutRestorationRef.current = null
      unsubscribe?.()
    }
  }, [applyRecoveryFailure, applySession])

  const runCredentialRequest = useCallback(
    async (
      email: string,
      request: (client: SupabaseClient) => PromiseLike<CredentialResponse>
    ): Promise<AuthResult> => {
      const client = clientRef.current
      if (!client) {
        setError(BACKEND_UNAVAILABLE)
        return { ok: false, error: BACKEND_UNAVAILABLE }
      }

      authoritativeSignedOutRef.current = false
      const requestVersion = ++sessionVersionRef.current
      const startUser =
        currentStatusRef.current === 'authenticated' ? currentUserRef.current : null
      const startStatus: AuthStatus = startUser ? 'authenticated' : 'signed_out'
      const pendingRequest: PendingCredentialRequest = {
        email: email.trim().toLowerCase(),
        startUserId: currentUserRef.current?.id ?? null
      }
      pendingCredentialRef.current = pendingRequest
      const fail = (failure: AuthFailure): AuthResult => {
        if (requestVersion === sessionVersionRef.current) {
          currentUserRef.current = startUser
          currentStatusRef.current = startStatus
          setUser(startUser)
          setStatus(startStatus)
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
      } finally {
        const restoration = restorationRef.current
        if (restoration) await restoration.promise
        if (pendingCredentialRef.current === pendingRequest) {
          pendingCredentialRef.current = null
        }
      }
    },
    [applySession]
  )

  const queueCredentialRequest = useCallback(
    (
      email: string,
      request: (client: SupabaseClient) => PromiseLike<CredentialResponse>
    ) => {
      const requestGeneration = authGenerationRef.current
      const execute = () =>
        requestGeneration === authGenerationRef.current
          ? runCredentialRequest(email, request)
          : Promise.resolve<AuthResult>({ ok: false, error: UNKNOWN_AUTH_FAILURE })
      const result = credentialQueueRef.current
        ? credentialQueueRef.current.then(execute)
        : execute()
      const queueTail = result.then(
        () => undefined,
        () => undefined
      )
      credentialQueueRef.current = queueTail
      void queueTail.then(() => {
        if (credentialQueueRef.current === queueTail) credentialQueueRef.current = null
      })
      return result
    },
    [runCredentialRequest]
  )

  const signUp = useCallback(
    (email: string, password: string) =>
      queueCredentialRequest(email, (client) => client.auth.signUp({ email, password })),
    [queueCredentialRequest]
  )

  const signIn = useCallback(
    (email: string, password: string) =>
      queueCredentialRequest(email, (client) =>
        client.auth.signInWithPassword({ email, password })
      ),
    [queueCredentialRequest]
  )

  const signOut = useCallback(async (): Promise<AuthResult> => {
    const client = clientRef.current
    if (!client) {
      setError(BACKEND_UNAVAILABLE)
      return { ok: false, error: BACKEND_UNAVAILABLE }
    }

    authGenerationRef.current += 1
    authoritativeSignedOutRef.current = true
    const priorCredentials = credentialQueueRef.current
    const requestVersion = ++sessionVersionRef.current
    try {
      const { error: signOutError } = await client.auth.signOut()
      if (signOutError) {
        const failure = mapAuthError(signOutError)
        if (currentStatusRef.current !== 'signed_out') {
          authoritativeSignedOutRef.current = false
        }
        if (requestVersion === sessionVersionRef.current) setError(failure)
        return { ok: false, error: failure }
      }

      if (requestVersion === sessionVersionRef.current) applySession(null)
      if (priorCredentials) await priorCredentials
      const restoration = signedOutRestorationRef.current
      if (restoration) {
        const restorationFailure = await restoration
        if (signedOutRestorationRef.current === restoration) {
          signedOutRestorationRef.current = null
        }
        if (restorationFailure) {
          authoritativeSignedOutRef.current = false
          return { ok: false, error: restorationFailure }
        }
      }
      authoritativeSignedOutRef.current = false
      return { ok: true }
    } catch (cause) {
      const failure = mapAuthError(cause)
      if (currentStatusRef.current !== 'signed_out') {
        authoritativeSignedOutRef.current = false
      }
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
