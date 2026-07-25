import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LocalStoreRepository } from '../../src/data/repository'
import type { Store } from '../../src/domain/types'

const validStore: Store = {
  version: 1,
  habits: [
    { id: 'read', name: '阅读', targetPerDay: 1, createdOn: '2026-07-20', archivedOn: null }
  ],
  completions: [{ habitId: 'read', date: '2026-07-24', count: 1 }]
}

describe('LocalStoreRepository', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('returns null before onboarding and restores a written store', () => {
    const repository = new LocalStoreRepository(() => '2026-07-24')
    expect(repository.read()).toBeNull()

    repository.write(validStore)
    expect(repository.read()).toEqual(validStore)
  })

  it('does not replace persisted data when the candidate is invalid', () => {
    const repository = new LocalStoreRepository(() => '2026-07-24')
    repository.write(validStore)

    expect(() =>
      repository.write({
        ...validStore,
        completions: [{ habitId: 'missing', date: '2026-07-24', count: 1 }]
      })
    ).toThrow()
    expect(repository.read()).toEqual(validStore)
  })

  it('previews valid imports and rejects malformed JSON', () => {
    const repository = new LocalStoreRepository(() => '2026-07-24')

    expect(repository.previewImport(JSON.stringify(validStore))).toMatchObject({
      store: validStore,
      habitCount: 1,
      completionCount: 1
    })
    expect(() => repository.previewImport('{broken')).toThrow('无法解析')
  })

  it('rejects unknown fields and future archive dates during import', () => {
    const repository = new LocalStoreRepository(() => '2026-07-24')

    expect(() =>
      repository.previewImport(JSON.stringify({ ...validStore, unexpected: true }))
    ).toThrow('Store 包含未知字段')

    expect(() =>
      repository.previewImport(
        JSON.stringify({
          ...validStore,
          habits: [{ ...validStore.habits[0], archivedOn: '2026-07-25' }]
        })
      )
    ).toThrow('归档日期无效')
  })

  it('notifies subscribers when another tab writes valid data', () => {
    const repository = new LocalStoreRepository(() => '2026-07-24')
    const listener = vi.fn()
    const unsubscribe = repository.subscribe(listener)

    window.dispatchEvent(
      new StorageEvent('storage', {
        key: repository.key,
        newValue: JSON.stringify(validStore)
      })
    )

    expect(listener).toHaveBeenCalledWith(validStore)
    unsubscribe()
  })
})
