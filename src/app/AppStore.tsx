import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from 'react'
import { createDemoStore } from '../data/demo'
import { LocalStoreRepository, type ImportPreview } from '../data/repository'
import { formatLocalDate } from '../domain/dates'
import { emptyStore } from '../domain/store'
import type { Store } from '../domain/types'

interface AppStoreValue {
  store: Store | null
  today: string
  notice: string
  error: string
  beginEmpty: () => void
  beginDemo: () => void
  commit: (buildNext: (current: Store) => Store, successMessage?: string) => boolean
  previewImport: (raw: string) => ImportPreview
  confirmImport: (preview: ImportPreview) => boolean
  exportJson: () => string
  clearMessages: () => void
}

const AppStoreContext = createContext<AppStoreValue | null>(null)

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const today = useMemo(() => formatLocalDate(new Date()), [])
  const repository = useMemo(() => new LocalStoreRepository(() => today), [today])
  const [store, setStore] = useState<Store | null>(() => {
    try {
      return repository.read()
    } catch {
      return null
    }
  })
  const [notice, setNotice] = useState('')
  const [error, setError] = useState(() => {
    try {
      repository.read()
      return ''
    } catch (readError) {
      return readError instanceof Error ? readError.message : '本地数据无法读取'
    }
  })

  const writeInitial = useCallback(
    (candidate: Store) => {
      try {
        const saved = repository.write(candidate)
        setStore(saved)
        setError('')
      } catch (writeError) {
        setError(writeError instanceof Error ? writeError.message : '保存失败')
      }
    },
    [repository]
  )

  useEffect(
    () =>
      repository.subscribe((incoming) => {
        setStore(incoming)
        setNotice('数据已在另一页面更新')
        setError('')
      }),
    [repository]
  )

  const commit = useCallback(
    (buildNext: (current: Store) => Store, successMessage = '已保存') => {
      if (!store) return false
      try {
        const candidate = buildNext(structuredClone(store))
        const saved = repository.write(candidate)
        setStore(saved)
        setNotice(successMessage)
        setError('')
        return true
      } catch (writeError) {
        setError(writeError instanceof Error ? writeError.message : '未保存，请重试')
        return false
      }
    },
    [repository, store]
  )

  const value: AppStoreValue = {
    store,
    today,
    notice,
    error,
    beginEmpty: () => writeInitial(emptyStore()),
    beginDemo: () => writeInitial(createDemoStore(today)),
    commit,
    previewImport: (raw) => repository.previewImport(raw),
    confirmImport: (preview) => {
      try {
        const saved = repository.write(preview.store)
        setStore(saved)
        setNotice('数据已完整替换')
        setError('')
        return true
      } catch (writeError) {
        setError(writeError instanceof Error ? writeError.message : '导入失败')
        return false
      }
    },
    exportJson: () => repository.serialize(store ?? emptyStore()),
    clearMessages: () => {
      setNotice('')
      setError('')
    }
  }

  return <AppStoreContext.Provider value={value}>{children}</AppStoreContext.Provider>
}

export function useAppStore() {
  const value = useContext(AppStoreContext)
  if (!value) throw new Error('useAppStore 必须在 AppStoreProvider 内使用')
  return value
}
