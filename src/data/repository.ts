import { formatLocalDate } from '../domain/dates'
import { validateStore } from '../domain/store'
import type { Store } from '../domain/types'

export interface ImportPreview {
  store: Store
  habitCount: number
  completionCount: number
}

export class LocalStoreRepository {
  readonly key = 'xunji.store.v1'

  constructor(private readonly getToday = () => formatLocalDate(new Date())) {}

  read(): Store | null {
    const raw = localStorage.getItem(this.key)
    if (raw === null) return null

    try {
      const candidate: unknown = JSON.parse(raw)
      const result = validateStore(candidate, this.getToday())
      if (!result.ok) throw new Error(result.errors.join('；'))
      return structuredClone(candidate as Store)
    } catch (error) {
      const message = error instanceof Error ? error.message : '未知错误'
      throw new Error(`本地数据无法读取：${message}`)
    }
  }

  write(candidate: Store): Store {
    const result = validateStore(candidate, this.getToday())
    if (!result.ok) throw new Error(result.errors.join('；'))
    const snapshot = structuredClone(candidate)
    localStorage.setItem(this.key, JSON.stringify(snapshot))
    return snapshot
  }

  previewImport(raw: string): ImportPreview {
    let candidate: unknown
    try {
      candidate = JSON.parse(raw)
    } catch {
      throw new Error('无法解析 JSON 文件')
    }

    const result = validateStore(candidate, this.getToday())
    if (!result.ok) throw new Error(result.errors.join('；'))
    const store = structuredClone(candidate as Store)
    return {
      store,
      habitCount: store.habits.length,
      completionCount: store.completions.length
    }
  }

  serialize(store: Store): string {
    return JSON.stringify(store, null, 2)
  }

  subscribe(listener: (store: Store) => void): () => void {
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== this.key || event.newValue === null) return
      try {
        listener(this.previewImport(event.newValue).store)
      } catch {
        // The current valid snapshot remains visible when another tab writes corrupt data.
      }
    }
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }
}
