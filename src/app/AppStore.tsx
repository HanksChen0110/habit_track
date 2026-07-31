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
import { createDemoStore } from '../data/demo'
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
  beginEmpty: () => Promise<boolean>
  beginDemo: () => Promise<boolean>
  commit: (
    buildNext: (current: Store) => Store,
    successMessage?: string
  ) => Promise<boolean>
  previewImport: (raw: string) => ImportPreview
  confirmImport: (preview: ImportPreview) => Promise<boolean>
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
const RELOAD_FAILURE = '暂时无法重新读取账号数据，请重试。'
const WRITE_FAILURE = '刚才的修改未保存，请重新操作。'

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
  const operationGenerationRef = useRef(0)
  const activeWriteRef = useRef<number | null>(null)
  const authUserIdRef = useRef<string | null>(null)
  const authKeyRef = useRef('initial')
  const sessionGenerationRef = useRef(0)

  const authUserId = auth.status === 'authenticated' ? auth.user?.id ?? null : null
  const authKey = `${auth.status}:${authUserId ?? ''}`
  if (authKeyRef.current !== authKey) {
    authKeyRef.current = authKey
    sessionGenerationRef.current += 1
    loadGenerationRef.current += 1
    operationGenerationRef.current += 1
    activeWriteRef.current = null
  }
  authUserIdRef.current = authUserId
  const sessionGeneration = sessionGenerationRef.current

  const [accountState, setAccountState] = useState<AccountStoreState>(() =>
    authUserId
      ? loadingState(sessionGeneration, authUserId)
      : idleState(sessionGeneration)
  )
  const accountStateRef = useRef(accountState)
  accountStateRef.current = accountState
  const publishAccountState = useCallback((next: AccountStoreState) => {
    accountStateRef.current = next
    setAccountState(next)
  }, [])

  const loadForUser = useCallback(
    async (userId: string, requestedSessionGeneration: number): Promise<boolean> => {
      if (
        authUserIdRef.current !== userId ||
        sessionGenerationRef.current !== requestedSessionGeneration
      ) {
        return false
      }

      const loadGeneration = ++loadGenerationRef.current
      publishAccountState(loadingState(requestedSessionGeneration, userId))

      try {
        const incoming = await repository.read()
        if (
          authUserIdRef.current !== userId ||
          sessionGenerationRef.current !== requestedSessionGeneration ||
          loadGenerationRef.current !== loadGeneration
        ) {
          return false
        }

        publishAccountState({
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

        publishAccountState({
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
    [publishAccountState, repository]
  )

  useEffect(() => {
    if (authUserId) {
      void loadForUser(authUserId, sessionGeneration)
    } else {
      publishAccountState(idleState(sessionGeneration))
    }

    return () => {
      loadGenerationRef.current += 1
    }
  }, [authUserId, loadForUser, publishAccountState, sessionGeneration])

  const stateMatchesSession =
    accountState.sessionGeneration === sessionGeneration &&
    accountState.userId === authUserId
  const visibleState: AccountStoreState = authUserId
    ? stateMatchesSession
      ? accountState
      : loadingState(sessionGeneration, authUserId)
    : idleState(sessionGeneration)

  const reload = useCallback(async (): Promise<boolean> => {
    const userId = authUserIdRef.current
    const requestedSessionGeneration = sessionGenerationRef.current
    const confirmed = accountStateRef.current
    if (
      !userId ||
      confirmed.userId !== userId ||
      confirmed.sessionGeneration !== requestedSessionGeneration
    ) {
      return false
    }

    const operationGeneration = ++operationGenerationRef.current
    const loadGeneration = ++loadGenerationRef.current
    publishAccountState({
      ...confirmed,
      status: confirmed.store === null ? 'loading' : 'saving',
      notice: ''
    })

    try {
      const incoming = await repository.read()
      if (
        authUserIdRef.current !== userId ||
        sessionGenerationRef.current !== requestedSessionGeneration ||
        operationGenerationRef.current !== operationGeneration ||
        loadGenerationRef.current !== loadGeneration
      ) {
        return false
      }

      publishAccountState({
        sessionGeneration: requestedSessionGeneration,
        userId,
        status: 'ready',
        store: incoming,
        notice: '已重新读取账号数据',
        error: ''
      })
      return true
    } catch {
      if (
        authUserIdRef.current !== userId ||
        sessionGenerationRef.current !== requestedSessionGeneration ||
        operationGenerationRef.current !== operationGeneration ||
        loadGenerationRef.current !== loadGeneration
      ) {
        return false
      }

      publishAccountState({
        sessionGeneration: requestedSessionGeneration,
        userId,
        status: confirmed.store === null ? 'error' : 'ready',
        store: confirmed.store,
        notice: '',
        error: confirmed.store === null ? READ_FAILURE : RELOAD_FAILURE
      })
      return false
    }
  }, [publishAccountState, repository])

  const runWrite = useCallback(
    (
      write: (confirmedStore: Store | null) => Promise<Store>,
      successMessage: string
    ): Promise<boolean> => {
      const userId = authUserIdRef.current
      const requestedSessionGeneration = sessionGenerationRef.current
      const confirmed = accountStateRef.current
      if (
        !userId ||
        activeWriteRef.current !== null ||
        confirmed.userId !== userId ||
        confirmed.sessionGeneration !== requestedSessionGeneration ||
        confirmed.status !== 'ready'
      ) {
        return Promise.resolve(false)
      }

      const operationGeneration = ++operationGenerationRef.current
      activeWriteRef.current = operationGeneration
      loadGenerationRef.current += 1
      publishAccountState({ ...confirmed, status: 'saving', notice: '' })

      return (async () => {
        try {
          const saved = await write(confirmed.store)
          if (
            authUserIdRef.current !== userId ||
            sessionGenerationRef.current !== requestedSessionGeneration ||
            operationGenerationRef.current !== operationGeneration ||
            activeWriteRef.current !== operationGeneration
          ) {
            return false
          }

          publishAccountState({
            sessionGeneration: requestedSessionGeneration,
            userId,
            status: 'ready',
            store: saved,
            notice: successMessage,
            error: ''
          })
          return true
        } catch {
          if (
            authUserIdRef.current !== userId ||
            sessionGenerationRef.current !== requestedSessionGeneration ||
            operationGenerationRef.current !== operationGeneration ||
            activeWriteRef.current !== operationGeneration
          ) {
            return false
          }

          publishAccountState({
            ...confirmed,
            status: 'ready',
            notice: '',
            error: WRITE_FAILURE
          })
          return false
        } finally {
          if (activeWriteRef.current === operationGeneration) {
            activeWriteRef.current = null
          }
        }
      })()
    },
    [publishAccountState]
  )

  const commit = useCallback(
    (
      buildNext: (current: Store) => Store,
      successMessage = '已保存'
    ): Promise<boolean> => {
      const userId = authUserIdRef.current
      const requestedSessionGeneration = sessionGenerationRef.current
      const confirmed = accountStateRef.current
      if (
        !userId ||
        activeWriteRef.current !== null ||
        confirmed.userId !== userId ||
        confirmed.sessionGeneration !== requestedSessionGeneration ||
        confirmed.status !== 'ready' ||
        confirmed.store === null
      ) {
        return Promise.resolve(false)
      }

      let candidate: Store
      try {
        candidate = buildNext(structuredClone(confirmed.store))
      } catch (error) {
        publishAccountState({
          ...confirmed,
          notice: '',
          error: error instanceof Error ? error.message : WRITE_FAILURE
        })
        return Promise.resolve(false)
      }

      return runWrite(
        (previous) =>
          previous === null
            ? Promise.reject(new Error('missing confirmed Store'))
            : repository.commit(previous, candidate),
        successMessage
      )
    },
    [publishAccountState, repository, runWrite]
  )

  const beginEmpty = useCallback(
    () => runWrite(() => repository.replace(emptyStore()), '已开始空白记录'),
    [repository, runWrite]
  )
  const beginDemo = useCallback(
    () => runWrite(() => repository.replace(createDemoStore(today)), '已载入示例数据'),
    [repository, runWrite, today]
  )
  const confirmImport = useCallback(
    (preview: ImportPreview) =>
      runWrite(() => repository.replace(preview.store), '数据已完整替换'),
    [repository, runWrite]
  )

  const previewImport = useCallback(
    (raw: string) => previewStoreImport(raw, today),
    [today]
  )
  const exportJson = useCallback(() => {
    if (visibleState.store === null) {
      throw new Error('当前账号没有可导出的数据')
    }
    return serialize(visibleState.store, today)
  }, [today, visibleState.store])
  const clearMessages = useCallback(() => {
    const current = accountStateRef.current
    if (
      current.sessionGeneration === sessionGenerationRef.current &&
      current.userId === authUserIdRef.current
    ) {
      publishAccountState({ ...current, notice: '', error: '' })
    }
  }, [publishAccountState])

  const value = useMemo<AppStoreValue>(
    () => ({
      status: visibleState.status,
      store: visibleState.store,
      today,
      notice: visibleState.notice,
      error: visibleState.error,
      beginEmpty,
      beginDemo,
      commit,
      previewImport,
      confirmImport,
      exportJson,
      reload,
      clearMessages
    }),
    [
      beginDemo,
      beginEmpty,
      clearMessages,
      commit,
      confirmImport,
      exportJson,
      previewImport,
      reload,
      today,
      visibleState
    ]
  )

  return <AppStoreContext.Provider value={value}>{children}</AppStoreContext.Provider>
}

export function useAppStore(): AppStoreValue {
  const value = useContext(AppStoreContext)
  if (!value) throw new Error('useAppStore 必须在 AppStoreProvider 内使用')
  return value
}
