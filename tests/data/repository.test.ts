import { afterEach, describe, expect, it, vi } from 'vitest'
import { previewImport, serialize } from '../../src/data/repository'
import type { Store } from '../../src/domain/types'

const today = '2026-07-24'
const legacyKey = 'xunji.store.v1'
const legacySnapshot = '{"version":1,"habits":[]}'

const validStore: Store = {
  version: 1,
  habits: [
    { id: 'read', name: '阅读', targetPerDay: 1, createdOn: '2026-07-20', archivedOn: null },
    { id: 'run', name: '跑步', targetPerDay: 2, createdOn: '2026-07-21', archivedOn: '2026-07-23' }
  ],
  completions: [
    { habitId: 'read', date: '2026-07-24', count: 1 },
    { habitId: 'run', date: '2026-07-22', count: 2 }
  ]
}

function json(value: unknown): string {
  return JSON.stringify(value)
}

describe('Store 编解码边界', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    localStorage.clear()
  })

  it('previews a complete valid Store v1 without touching the legacy localStorage key', () => {
    localStorage.setItem(legacyKey, legacySnapshot)
    const getItem = vi.spyOn(Storage.prototype, 'getItem')
    const setItem = vi.spyOn(Storage.prototype, 'setItem')
    const removeItem = vi.spyOn(Storage.prototype, 'removeItem')

    expect(previewImport(json(validStore), today)).toEqual({
      store: validStore,
      habitCount: 2,
      completionCount: 2
    })
    expect(getItem).not.toHaveBeenCalled()
    expect(setItem).not.toHaveBeenCalled()
    expect(removeItem).not.toHaveBeenCalled()
    expect(localStorage.getItem(legacyKey)).toBe(legacySnapshot)
  })

  it('serializes a complete valid Store v1 without touching the legacy localStorage key', () => {
    localStorage.setItem(legacyKey, legacySnapshot)
    const getItem = vi.spyOn(Storage.prototype, 'getItem')
    const setItem = vi.spyOn(Storage.prototype, 'setItem')
    const removeItem = vi.spyOn(Storage.prototype, 'removeItem')

    expect(serialize(validStore, today)).toBe(JSON.stringify(validStore, null, 2))
    expect(getItem).not.toHaveBeenCalled()
    expect(setItem).not.toHaveBeenCalled()
    expect(removeItem).not.toHaveBeenCalled()
    expect(localStorage.getItem(legacyKey)).toBe(legacySnapshot)
  })

  it.each([
    ['non-object Store', null, '数据必须是对象'],
    ['unknown Store field', { ...validStore, unexpected: true }, 'Store 包含未知字段'],
    ['unsupported Store version', { ...validStore, version: 2 }, '仅支持 Store 版本 1'],
    ['non-array habits', { ...validStore, habits: {} }, 'habits 必须是数组'],
    ['non-array completions', { ...validStore, completions: {} }, 'completions 必须是数组'],
    ['empty habit id', { ...validStore, habits: [{ ...validStore.habits[0], id: '' }] }, '习惯 id 必须是非空字符串'],
    ['unknown habit field', { ...validStore, habits: [{ ...validStore.habits[0], unexpected: true }] }, '包含未知字段'],
    ['duplicate habit id', { ...validStore, habits: [validStore.habits[0], { ...validStore.habits[1], id: 'read' }] }, '习惯 id 重复'],
    ['blank habit name', { ...validStore, habits: [{ ...validStore.habits[0], name: ' ' }] }, '习惯名称不能为空'],
    ['invalid habit target', { ...validStore, habits: [{ ...validStore.habits[0], targetPerDay: 0 }] }, '每日目标无效'],
    ['future habit creation date', { ...validStore, habits: [{ ...validStore.habits[0], createdOn: '2026-07-25' }] }, '创建日期无效'],
    ['invalid habit archive date', { ...validStore, habits: [{ ...validStore.habits[0], archivedOn: '2026-07-19' }] }, '归档日期无效'],
    ['invalid completion shape', { ...validStore, completions: [null] }, '完成记录格式无效'],
    ['unknown completion field', { ...validStore, completions: [{ ...validStore.completions[0], unexpected: true }] }, '完成记录包含未知字段'],
    ['missing completion habit', { ...validStore, completions: [{ ...validStore.completions[0], habitId: 'missing' }] }, '完成记录引用不存在的习惯'],
    ['duplicate completion', { ...validStore, completions: [validStore.completions[0], { ...validStore.completions[0] }] }, '完成记录重复'],
    ['invalid completion date', { ...validStore, completions: [{ ...validStore.completions[0], date: '2026-07-25' }] }, '完成记录日期无效'],
    ['completion before habit creation', { ...validStore, completions: [{ ...validStore.completions[0], date: '2026-07-19' }] }, '完成记录日期无效'],
    ['completion after habit archive', { ...validStore, completions: [{ ...validStore.completions[1], date: '2026-07-24' }] }, '完成记录日期无效'],
    ['invalid completion count', { ...validStore, completions: [{ ...validStore.completions[0], count: 0 }] }, '完成记录次数无效']
  ])('rejects %s without touching the legacy localStorage key', (_label, store, error) => {
    localStorage.setItem(legacyKey, legacySnapshot)
    const getItem = vi.spyOn(Storage.prototype, 'getItem')
    const setItem = vi.spyOn(Storage.prototype, 'setItem')
    const removeItem = vi.spyOn(Storage.prototype, 'removeItem')

    expect(() => previewImport(json(store), today)).toThrow(error)
    expect(getItem).not.toHaveBeenCalled()
    expect(setItem).not.toHaveBeenCalled()
    expect(removeItem).not.toHaveBeenCalled()
    expect(localStorage.getItem(legacyKey)).toBe(legacySnapshot)
  })

  it('rejects malformed JSON without touching the legacy localStorage key', () => {
    localStorage.setItem(legacyKey, legacySnapshot)
    const getItem = vi.spyOn(Storage.prototype, 'getItem')
    const setItem = vi.spyOn(Storage.prototype, 'setItem')
    const removeItem = vi.spyOn(Storage.prototype, 'removeItem')

    expect(() => previewImport('{broken', today)).toThrow('无法解析 JSON 文件')
    expect(getItem).not.toHaveBeenCalled()
    expect(setItem).not.toHaveBeenCalled()
    expect(removeItem).not.toHaveBeenCalled()
    expect(localStorage.getItem(legacyKey)).toBe(legacySnapshot)
  })
})
