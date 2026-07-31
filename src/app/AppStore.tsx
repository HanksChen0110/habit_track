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
import { useAuth } from '../auth/AuthContext'
import {
  previewImport as previewStoreImport,
  serialize,
  type ImportPreview
} from '../data/repository'
import { SupabaseStoreRepository } from '../data/supabaseRepository'
import { formatLocalDate } from '../domain/dates'
import { emptyStore } from '../domain/store'
import type { Store } from '../domain/types'

export type { ImportPreview } from '../data/repository'

export type AppStoreStatus = 'idle' | 'loading' | 'ready' | 'saving' | 'error'

interface AppStoreValue {
  status: AppStoreStatus
  store: Store | null
  today: string
  notice: string
  error: string
  beginEmpty: () => boolean
  beginDemo: () => boolean
  commit: (
    buildNext: (current: Store) => Store,
    successMessage?: string
  ) => boolean
  previewImport: (raw: string) => ImportPreview
  confirmImport: (preview: ImportPreview) => boolean
  exportJson: () => string
  reload: () => Promise<boolean>
  clearMessages: () => void
}

interface AccountStoreState {
  sessionGeneration: number
  userId: string | null
  status: AppStoreStatus
  store: Store | null
  notice: string
  error: string
}

const READ_FAILURE = '暂时无法读取账号数据，请重试。'

const AppStoreContext = createContext<AppStoreValue | null>(null)

function idleState(sessionGeneration: number): AccountStoreState {
  return {
    sessionGeneration,
    userId: null,
    status: 'idle',
    store: null,
    notice: '',
    error: ''
  }
}

function loadingState(sessionGeneration: number, userId: string): AccountStoreState {
  return {
    sessionGeneration,
    userId,
    status: 'loading',
    store: null,
    notice: '',
    error: ''
  }
}

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const auth = useAuth()
  const today = useMemo(() => formatLocalDate(new Date()), [])
  const repository = useMemo(() => new SupabaseStoreRepository(), [])
  const loadGenerationRef = useRef(0)
  const authUserIdRef = useRef<string | null>(null)
  const authKeyRef = useRef('initial')
  const sessionGenerationRef = useRef(0)

  const authUserId = auth.status === 'authenticated' ? auth.user?.id ?? null : null
  const authKey = `${auth.status}:${authUserId ?? ''}`
  if (authKeyRef.current !== authKey) {
    authKeyRef.current = authKey
    sessionGenerationRef.current += 1
    loadGenerationRef.current += 1
  }
  authUserIdRef.current = authUserId
  const sessionGeneration = sessionGenerationRef.current

  const [accountState, setAccountState] = useState<AccountStoreState>(() =>
    authUserId
      ? loadingState(sessionGeneration, authUserId)
      : idleState(sessionGeneration)
  )

  const loadForUser = useCallback(
    async (userId: string, requestedSessionGeneration: number): Promise<boolean> => {
      if (
        authUserIdRef.current !== userId ||
        sessionGenerationRef.current !== requestedSessionGeneration
      ) {
        return false
      }

      const loadGeneration = ++loadGenerationRef.current
      setAccountState(loadingState(requestedSessionGeneration, userId))

      try {
        const incoming = await repository.read()
        if (
          authUserIdRef.current !== userId ||
          sessionGenerationRef.current !== requestedSessionGeneration ||
          loadGenerationRef.current !== loadGeneration
        ) {
          return false
        }

        setAccountState({
          sessionGeneration: requestedSessionGeneration,
          userId,
          status: 'ready',
          store: incoming,
          notice: '',
          error: ''
        })
        return true
      } catch {
        if (
          authUserIdRef.current !== userId ||
          sessionGenerationRef.current !== requestedSessionGeneration ||
          loadGenerationRef.current !== loadGeneration
        ) {
          return false
        }

        setAccountState({
          sessionGeneration: requestedSessionGeneration,
          userId,
          status: 'error',
          store: null,
          notice: '',
          error: READ_FAILURE
        })
        return false
      }
    },
    [repository]
  )

  useEffect(() => {
    if (authUserId) {
      void loadForUser(authUserId, sessionGeneration)
    } else {
      setAccountState(idleState(sessionGeneration))
    }

    return () => {
      loadGenerationRef.current += 1
    }
  }, [authUserId, loadForUser, sessionGeneration])

  const stateMatchesSession =
    accountState.sessionGeneration === sessionGeneration &&
    accountState.userId === authUserId
  const visibleState: AccountStoreState = authUserId
    ? stateMatchesSession
      ? accountState
      : loadingState(sessionGeneration, authUserId)
    : idleState(sessionGeneration)

  const reload = useCallback(() => {
    const userId = authUserIdRef.current
    if (!userId) return Promise.resolve(false)
    return loadForUser(userId, sessionGenerationRef.current)
  }, [loadForUser])

  const pendingWrite = useCallback(() => false, [])
  const previewImport = useCallback(
    (raw: string) => previewStoreImport(raw, today),
    [today]
  )
  const exportJson = useCallback(
    () => serialize(visibleState.store ?? emptyStore(), today),
    [today, visibleState.store]
  )
  const clearMessages = useCallback(() => {
    setAccountState((current) =>
      current.sessionGeneration === sessionGenerationRef.current &&
      current.userId === authUserIdRef.current
        ? { ...current, notice: '', error: '' }
        : current
    )
  }, [])

  const value = useMemo<AppStoreValue>(
    () => ({
      status: visibleState.status,
      store: visibleState.store,
      today,
      notice: visibleState.notice,
      error: visibleState.error,
      beginEmpty: pendingWrite,
      beginDemo: pendingWrite,
      commit: pendingWrite,
      previewImport,
      confirmImport: pendingWrite,
      exportJson,
      reload,
      clearMessages
    }),
    [clearMessages, exportJson, pendingWrite, previewImport, reload, today, visibleState]
  )

  return <AppStoreContext.Provider value={value}>{children}</AppStoreContext.Provider>
}

export function useAppStore(): AppStoreValue {
  const value = useContext(AppStoreContext)
  if (!value) throw new Error('useAppStore 必须在 AppStoreProvider 内使用')
  return value
}
