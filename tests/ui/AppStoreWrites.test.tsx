import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  AppStoreProvider,
  useAppStore,
  type ImportPreview
} from '../../src/app/AppStore'
import type { AuthStatus, AuthUser } from '../../src/auth/AuthContext'
import { StoreIntegrityError } from '../../src/data/repository'
import type { Store } from '../../src/domain/types'

const authMock = vi.hoisted(() => ({
  current: {
    status: 'signed_out' as AuthStatus,
    user: null as AuthUser | null
  }
}))

const repositoryMock = vi.hoisted(() => ({
  read: vi.fn<() => Promise<Store | null>>(),
  commit: vi.fn<(previous: Store, candidate: Store) => Promise<Store>>(),
  replace: vi.fn<(candidate: Store) => Promise<Store>>()
}))

vi.mock('../../src/auth/AuthContext', () => ({
  useAuth: () => ({
    ...authMock.current,
    error: null,
    signUp: vi.fn(),
    signIn: vi.fn(),
    signOut: vi.fn()
  })
}))

vi.mock('../../src/data/supabaseRepository', () => ({
  SupabaseStoreRepository: class {
    read() {
      return repositoryMock.read()
    }

    commit(previous: Store, candidate: Store) {
      return repositoryMock.commit(previous, candidate)
    }

    replace(candidate: Store) {
      return repositoryMock.replace(candidate)
    }
  }
}))

const storeA: Store = {
  version: 1,
  habits: [
    {
      id: 'habit-a',
      name: '账号 A 的习惯',
      targetPerDay: 1,
      createdOn: '2026-08-01',
      archivedOn: null
    }
  ],
  completions: []
}

const candidateA: Store = {
  ...storeA,
  completions: [{ habitId: 'habit-a', date: '2026-08-01', count: 1 }]
}

const confirmedA: Store = {
  ...candidateA,
  habits: [{ ...candidateA.habits[0], name: '服务端确认的 A 习惯' }]
}

const storeB: Store = {
  version: 1,
  habits: [
    {
      id: 'habit-b',
      name: '账号 B 的习惯',
      targetPerDay: 2,
      createdOn: '2026-08-01',
      archivedOn: null
    }
  ],
  completions: []
}

const confirmedB: Store = {
  ...storeB,
  completions: [{ habitId: 'habit-b', date: '2026-08-01', count: 1 }]
}

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((next, fail) => {
    resolve = next
    reject = fail
  })
  return { promise, resolve, reject }
}

function wrapper({ children }: { children: ReactNode }) {
  return <AppStoreProvider>{children}</AppStoreProvider>
}

function authenticate(id: string) {
  authMock.current = {
    status: 'authenticated',
    user: { id, email: `${id}@example.com` }
  }
}

async function renderAuthenticated(initialStore: Store | null = storeA) {
  authenticate('user-a')
  repositoryMock.read.mockResolvedValueOnce(initialStore)
  const rendered = renderHook(() => useAppStore(), { wrapper })
  await waitFor(() => expect(rendered.result.current.status).toBe('ready'))
  expect(rendered.result.current.store).toEqual(initialStore)
  return rendered
}

describe('AppStore server-confirmed writes', () => {
  beforeEach(() => {
    authMock.current = { status: 'signed_out', user: null }
    repositoryMock.read.mockReset()
    repositoryMock.commit.mockReset()
    repositoryMock.replace.mockReset()
  })

  it('publishes the Repository-confirmed commit and rejects every duplicate write while saving', async () => {
    const write = deferred<Store>()
    repositoryMock.commit.mockReturnValueOnce(write.promise)
    const { result } = await renderAuthenticated()

    let commitResult!: Promise<boolean>
    act(() => {
      commitResult = result.current.commit(() => candidateA, '今天已记录')
    })

    expect(commitResult).toBeInstanceOf(Promise)
    expect(result.current.status).toBe('saving')
    expect(result.current.store).toEqual(storeA)

    const preview: ImportPreview = {
      store: storeB,
      habitCount: 1,
      completionCount: 0
    }
    await expect(result.current.commit(() => candidateA)).resolves.toBe(false)
    await expect(result.current.beginEmpty()).resolves.toBe(false)
    await expect(result.current.beginDemo()).resolves.toBe(false)
    await expect(result.current.confirmImport(preview)).resolves.toBe(false)
    expect(repositoryMock.commit).toHaveBeenCalledTimes(1)
    expect(repositoryMock.commit).toHaveBeenCalledWith(storeA, candidateA)
    expect(repositoryMock.replace).not.toHaveBeenCalled()

    await act(async () => write.resolve(confirmedA))

    await expect(commitResult).resolves.toBe(true)
    expect(result.current.status).toBe('ready')
    expect(result.current.store).toEqual(confirmedA)
    expect(result.current.notice).toBe('今天已记录')
    expect(result.current.error).toBe('')
  })

  it('rejects reload while a write is pending and releases the gate after confirmation', async () => {
    const pendingWrite = deferred<Store>()
    const followupWrite = deferred<Store>()
    const followupCandidate: Store = {
      ...confirmedA,
      habits: [{ ...confirmedA.habits[0], archivedOn: '2026-08-01' }]
    }
    repositoryMock.commit
      .mockReturnValueOnce(pendingWrite.promise)
      .mockReturnValueOnce(followupWrite.promise)
    const { result } = await renderAuthenticated()

    let pendingResult!: Promise<boolean>
    act(() => {
      pendingResult = result.current.commit(() => candidateA)
    })
    expect(result.current.status).toBe('saving')
    expect(result.current.store).toEqual(storeA)

    repositoryMock.read.mockResolvedValueOnce(storeB)
    let reloadResult = true
    await act(async () => {
      reloadResult = await result.current.reload()
    })

    expect(reloadResult).toBe(false)
    expect(repositoryMock.read).toHaveBeenCalledTimes(1)
    expect(result.current.status).toBe('saving')
    expect(result.current.store).toEqual(storeA)
    expect(result.current.notice).toBe('')
    expect(result.current.error).toBe('')

    await act(async () => pendingWrite.resolve(confirmedA))
    await expect(pendingResult).resolves.toBe(true)
    expect(result.current.status).toBe('ready')
    expect(result.current.store).toEqual(confirmedA)

    let followupResult!: Promise<boolean>
    act(() => {
      followupResult = result.current.commit(() => followupCandidate)
    })
    expect(repositoryMock.commit).toHaveBeenCalledTimes(2)
    expect(repositoryMock.commit).toHaveBeenNthCalledWith(
      2,
      confirmedA,
      followupCandidate
    )
    expect(result.current.status).toBe('saving')

    await act(async () => followupWrite.resolve(followupCandidate))
    await expect(followupResult).resolves.toBe(true)
    expect(result.current.status).toBe('ready')
    expect(result.current.store).toEqual(followupCandidate)
  })

  it('keeps the last confirmed Store and a persistent error until clear or a later success', async () => {
    repositoryMock.commit.mockRejectedValueOnce(new Error('private database detail'))
    const { result } = await renderAuthenticated()

    let failed = true
    await act(async () => {
      failed = await result.current.commit(() => candidateA)
    })

    expect(failed).toBe(false)
    expect(result.current.status).toBe('ready')
    expect(result.current.store).toEqual(storeA)
    expect(result.current.notice).toBe('')
    expect(result.current.error).toBe('刚才的修改未保存，请重新操作。')
    expect(result.current.error).not.toContain('private')

    act(() => result.current.clearMessages())
    expect(result.current.error).toBe('')

    repositoryMock.commit.mockResolvedValueOnce(confirmedA)
    let succeeded = false
    await act(async () => {
      succeeded = await result.current.commit(() => candidateA)
    })

    expect(succeeded).toBe(true)
    expect(result.current.store).toEqual(confirmedA)
    expect(result.current.notice).toBe('已保存')
    expect(result.current.error).toBe('')
  })

  it('chains an immediate second commit from the first Repository confirmation', async () => {
    const secondConfirmation: Store = {
      ...confirmedA,
      habits: [{ ...confirmedA.habits[0], archivedOn: '2026-08-01' }]
    }
    repositoryMock.commit
      .mockResolvedValueOnce(confirmedA)
      .mockResolvedValueOnce(secondConfirmation)
    const { result } = await renderAuthenticated()

    let firstResult = false
    let secondResult = false
    await act(async () => {
      firstResult = await result.current.commit(() => candidateA)
      secondResult = await result.current.commit((current) => ({
        ...current,
        habits: current.habits.map((habit) => ({
          ...habit,
          archivedOn: '2026-08-01'
        }))
      }))
    })

    expect(firstResult).toBe(true)
    expect(secondResult).toBe(true)
    expect(repositoryMock.commit).toHaveBeenNthCalledWith(
      2,
      confirmedA,
      secondConfirmation
    )
    expect(result.current.store).toEqual(secondConfirmation)
  })

  it('initializes empty and demo data through confirmed replacements with distinct notices', async () => {
    const emptyReadback: Store = { version: 1, habits: [], completions: [] }
    repositoryMock.replace.mockImplementation(async (candidate) => candidate)
    const empty = await renderAuthenticated(null)

    let emptyResult = false
    await act(async () => {
      emptyResult = await empty.result.current.beginEmpty()
    })

    expect(emptyResult).toBe(true)
    expect(repositoryMock.replace).toHaveBeenNthCalledWith(1, emptyReadback)
    expect(empty.result.current.store).toEqual(emptyReadback)
    expect(empty.result.current.notice).toBe('已开始空白记录')

    let demoResult = false
    await act(async () => {
      demoResult = await empty.result.current.beginDemo()
    })

    expect(demoResult).toBe(true)
    const demoCandidate = repositoryMock.replace.mock.calls[1][0]
    expect(demoCandidate.habits.map((habit) => habit.id)).toEqual([
      'demo-reading',
      'demo-exercise',
      'demo-english'
    ])
    expect(demoCandidate.completions.length).toBeGreaterThan(0)
    expect(empty.result.current.store).toEqual(demoCandidate)
    expect(empty.result.current.notice).toBe('已载入示例数据')
  })

  it('confirms import through replace and publishes its readback instead of the preview Store', async () => {
    repositoryMock.replace.mockResolvedValueOnce(confirmedB)
    const { result } = await renderAuthenticated()
    const preview: ImportPreview = {
      store: storeB,
      habitCount: 1,
      completionCount: 0
    }

    let imported = false
    await act(async () => {
      imported = await result.current.confirmImport(preview)
    })

    expect(imported).toBe(true)
    expect(repositoryMock.replace).toHaveBeenCalledWith(storeB)
    expect(result.current.store).toEqual(confirmedB)
    expect(result.current.notice).toBe('数据已完整替换')
    expect(result.current.error).toBe('')
  })

  it('allows only confirmed import to recover an authenticated integrity-error account', async () => {
    authenticate('user-a')
    repositoryMock.read.mockRejectedValueOnce(
      new StoreIntegrityError('完成记录引用不存在的习惯')
    )
    repositoryMock.replace.mockResolvedValueOnce(confirmedB)
    const { result } = renderHook(() => useAppStore(), { wrapper })
    await waitFor(() => expect(result.current.status).toBe('integrity-error'))

    await expect(result.current.commit(() => candidateA)).resolves.toBe(false)
    await expect(result.current.beginEmpty()).resolves.toBe(false)
    await expect(result.current.beginDemo()).resolves.toBe(false)

    const preview: ImportPreview = {
      store: storeB,
      habitCount: 1,
      completionCount: 0
    }
    let recovered = false
    await act(async () => {
      recovered = await result.current.confirmImport(preview)
    })

    expect(recovered).toBe(true)
    expect(repositoryMock.replace).toHaveBeenCalledOnce()
    expect(repositoryMock.replace).toHaveBeenCalledWith(storeB)
    expect(result.current.status).toBe('ready')
    expect(result.current.store).toEqual(confirmedB)
  })

  it('publishes a distinct recovering state while integrity replacement is pending', async () => {
    const replacement = deferred<Store>()
    authenticate('user-a')
    repositoryMock.read.mockRejectedValueOnce(
      new StoreIntegrityError('完成记录引用不存在的习惯')
    )
    repositoryMock.replace.mockReturnValueOnce(replacement.promise)
    const { result } = renderHook(() => useAppStore(), { wrapper })
    await waitFor(() => expect(result.current.status).toBe('integrity-error'))
    const preview: ImportPreview = {
      store: storeB,
      habitCount: 1,
      completionCount: 0
    }

    let recovery!: Promise<boolean>
    act(() => {
      recovery = result.current.confirmImport(preview)
    })

    expect(result.current.status).toBe('recovering')
    expect(result.current.store).toBeNull()

    await act(async () => replacement.resolve(confirmedB))
    await expect(recovery).resolves.toBe(true)
  })

  it('keeps integrity recovery available after replacement failure and permits direct retry', async () => {
    authenticate('user-a')
    repositoryMock.read.mockRejectedValueOnce(
      new StoreIntegrityError('完成记录引用不存在的习惯')
    )
    repositoryMock.replace
      .mockRejectedValueOnce(new Error('private replace detail'))
      .mockResolvedValueOnce(confirmedB)
    const { result } = renderHook(() => useAppStore(), { wrapper })
    await waitFor(() => expect(result.current.status).toBe('integrity-error'))
    const preview: ImportPreview = {
      store: storeB,
      habitCount: 1,
      completionCount: 0
    }

    let recovered = true
    await act(async () => {
      recovered = await result.current.confirmImport(preview)
    })

    expect(recovered).toBe(false)
    expect(result.current.status).toBe('integrity-error')
    expect(result.current.store).toBeNull()
    expect(result.current.error).not.toContain('private')

    await act(async () => {
      recovered = await result.current.confirmImport(preview)
    })

    expect(recovered).toBe(true)
    expect(repositoryMock.replace).toHaveBeenCalledTimes(2)
    expect(result.current.status).toBe('ready')
    expect(result.current.store).toEqual(confirmedB)
  })

  it('discards a late integrity recovery after the authenticated account changes', async () => {
    const recoveryA = deferred<Store>()
    authenticate('user-a')
    repositoryMock.read
      .mockRejectedValueOnce(new StoreIntegrityError('账号 A 数据无效'))
      .mockResolvedValueOnce(storeB)
    repositoryMock.replace.mockReturnValueOnce(recoveryA.promise)
    const rendered = renderHook(() => useAppStore(), { wrapper })
    await waitFor(() => expect(rendered.result.current.status).toBe('integrity-error'))
    const preview: ImportPreview = {
      store: storeA,
      habitCount: 1,
      completionCount: 0
    }

    let resultA!: Promise<boolean>
    act(() => {
      resultA = rendered.result.current.confirmImport(preview)
    })
    expect(rendered.result.current.status).toBe('recovering')

    authenticate('user-b')
    rendered.rerender()
    await waitFor(() => expect(rendered.result.current.store).toEqual(storeB))

    await act(async () => recoveryA.resolve(confirmedA))

    await expect(resultA).resolves.toBe(false)
    expect(rendered.result.current.status).toBe('ready')
    expect(rendered.result.current.store).toEqual(storeB)
    expect(rendered.result.current.notice).toBe('')
    expect(rendered.result.current.error).toBe('')
  })

  it('reloads the complete Store while retaining the last confirmation on failure', async () => {
    const { result } = await renderAuthenticated()
    repositoryMock.read.mockResolvedValueOnce(storeB)

    let reloaded = false
    await act(async () => {
      reloaded = await result.current.reload()
    })

    expect(reloaded).toBe(true)
    expect(result.current.store).toEqual(storeB)
    expect(result.current.notice).toBe('已重新读取账号数据')
    expect(result.current.error).toBe('')

    repositoryMock.read.mockRejectedValueOnce(new Error('readback detail'))
    await act(async () => {
      reloaded = await result.current.reload()
    })

    expect(reloaded).toBe(false)
    expect(result.current.status).toBe('ready')
    expect(result.current.store).toEqual(storeB)
    expect(result.current.notice).toBe('')
    expect(result.current.error).toBe('暂时无法重新读取账号数据，请重试。')
    expect(result.current.error).not.toContain('readback')
  })

  it('isolates late account A writes without unlocking account B active writes', async () => {
    const writeA = deferred<Store>()
    const writeB = deferred<Store>()
    repositoryMock.commit
      .mockReturnValueOnce(writeA.promise)
      .mockReturnValueOnce(writeB.promise)
    const rendered = await renderAuthenticated()

    let resultA!: Promise<boolean>
    act(() => {
      resultA = rendered.result.current.commit(() => candidateA)
    })

    authenticate('user-b')
    repositoryMock.read.mockResolvedValueOnce(storeB)
    rendered.rerender()
    await waitFor(() => expect(rendered.result.current.store).toEqual(storeB))

    let resultB!: Promise<boolean>
    act(() => {
      resultB = rendered.result.current.commit(() => confirmedB)
    })
    expect(rendered.result.current.status).toBe('saving')

    await act(async () => writeA.resolve(confirmedA))
    await expect(resultA).resolves.toBe(false)
    expect(rendered.result.current.status).toBe('saving')
    expect(rendered.result.current.store).toEqual(storeB)

    await act(async () => writeB.resolve(confirmedB))
    await expect(resultB).resolves.toBe(true)
    expect(rendered.result.current.status).toBe('ready')
    expect(rendered.result.current.store).toEqual(confirmedB)
    expect(rendered.result.current.notice).toBe('已保存')
    expect(rendered.result.current.error).toBe('')
  })

  it('does not publish a late write failure after sign-out', async () => {
    const write = deferred<Store>()
    repositoryMock.commit.mockReturnValueOnce(write.promise)
    const rendered = await renderAuthenticated()

    let writeResult!: Promise<boolean>
    act(() => {
      writeResult = rendered.result.current.commit(() => candidateA)
    })

    authMock.current = { status: 'signed_out', user: null }
    rendered.rerender()
    expect(rendered.result.current.status).toBe('idle')
    expect(rendered.result.current.store).toBeNull()

    await act(async () => write.reject(new Error('late private failure')))

    await expect(writeResult).resolves.toBe(false)
    expect(rendered.result.current.status).toBe('idle')
    expect(rendered.result.current.store).toBeNull()
    expect(rendered.result.current.notice).toBe('')
    expect(rendered.result.current.error).toBe('')
  })

  it('exports only the current confirmed account Store and never fabricates empty data', async () => {
    const storageRead = vi.spyOn(Storage.prototype, 'getItem')
    localStorage.setItem('xunji.store.v1', JSON.stringify(storeB))
    const signedOut = renderHook(() => useAppStore(), { wrapper })

    expect(() => signedOut.result.current.exportJson()).toThrow(
      '当前账号没有可导出的数据'
    )
    expect(storageRead).not.toHaveBeenCalled()
    signedOut.unmount()

    const authenticated = await renderAuthenticated()
    const exported = authenticated.result.current.exportJson()

    expect(JSON.parse(exported)).toEqual(storeA)
    expect(storageRead).not.toHaveBeenCalled()
    storageRead.mockRestore()
  })
})
