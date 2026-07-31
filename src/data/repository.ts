import { formatLocalDate } from '../domain/dates'
import { validateStore } from '../domain/store'
import type { Store } from '../domain/types'

export interface ImportPreview {
  store: Store
  habitCount: number
  completionCount: number
}

export interface StoreRepository {
  read(): Promise<Store | null>
  commit(previous: Store, candidate: Store): Promise<Store>
  replace(candidate: Store): Promise<Store>
  previewImport(raw: string): ImportPreview
  serialize(store: Store): string
}

function requireValidStore(candidate: unknown, today: string): Store {
  const result = validateStore(candidate, today)
  if (!result.ok) throw new Error(result.errors.join('；'))
  return structuredClone(candidate as Store)
}

export function previewImport(raw: string, today = formatLocalDate(new Date())): ImportPreview {
  let candidate: unknown
  try {
    candidate = JSON.parse(raw)
  } catch {
    throw new Error('无法解析 JSON 文件')
  }

  const store = requireValidStore(candidate, today)
  return {
    store,
    habitCount: store.habits.length,
    completionCount: store.completions.length
  }
}

export function serialize(store: Store, today = formatLocalDate(new Date())): string {
  return JSON.stringify(requireValidStore(store, today), null, 2)
}
