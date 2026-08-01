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
  read: vi.fn<() => Promise<Store | null>>()
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

describe('AppStore account session reads', () => {
  beforeEach(() => {
    authMock.current = { status: 'signed_out', user: null }
    repositoryMock.read.mockReset()
  })

  it('keeps signed-out and booting sessions idle without reading account data', () => {
    const rendered = renderHook(() => useAppStore(), { wrapper })

    expect(rendered.result.current.status).toBe('idle')
    expect(rendered.result.current.store).toBeNull()
    expect(repositoryMock.read).not.toHaveBeenCalled()

    authMock.current = { status: 'booting', user: null }
    rendered.rerender()

    expect(rendered.result.current.status).toBe('idle')
    expect(rendered.result.current.store).toBeNull()
    expect(repositoryMock.read).not.toHaveBeenCalled()
  })

  it('restores the authenticated account through loading to ready', async () => {
    const read = deferred<Store | null>()
    authenticate('user-a')
    repositoryMock.read.mockReturnValueOnce(read.promise)

    const { result } = renderHook(() => useAppStore(), { wrapper })

    expect(result.current.status).toBe('loading')
    expect(result.current.store).toBeNull()

    await act(async () => read.resolve(storeA))

    expect(result.current.status).toBe('ready')
    expect(result.current.store).toEqual(storeA)
  })

  it('replays an authenticated initial read to ready under StrictMode', async () => {
    const firstRead = deferred<Store | null>()
    const replayedRead = deferred<Store | null>()
    authenticate('user-a')
    repositoryMock.read
      .mockReturnValueOnce(firstRead.promise)
      .mockReturnValueOnce(replayedRead.promise)

    const { result } = renderHook(() => useAppStore(), {
      wrapper,
      reactStrictMode: true
    })

    await waitFor(() => expect(repositoryMock.read).toHaveBeenCalledTimes(2))
    await act(async () => replayedRead.resolve(storeA))
    await waitFor(() => expect(result.current.status).toBe('ready'))
    expect(result.current.store).toEqual(storeA)

    await act(async () => firstRead.resolve(storeB))
    expect(result.current.store).toEqual(storeA)
  })

  it('treats a null read as a completed result for Onboarding', async () => {
    authenticate('new-user')
    repositoryMock.read.mockResolvedValueOnce(null)

    const { result } = renderHook(() => useAppStore(), { wrapper })

    await waitFor(() => expect(result.current.status).toBe('ready'))
    expect(result.current.store).toBeNull()
    expect(result.current.error).toBe('')
  })

  it('publishes a safe read failure without retaining account data', async () => {
    authenticate('user-a')
    repositoryMock.read.mockRejectedValueOnce(
      new Error('relation habits failed with token=private')
    )

    const { result } = renderHook(() => useAppStore(), { wrapper })

    await waitFor(() => expect(result.current.status).toBe('error'))
    expect(result.current.store).toBeNull()
    expect(result.current.error).toBe('暂时无法读取账号数据，请重试。')
    expect(result.current.error).not.toContain('habits')
    expect(result.current.error).not.toContain('private')
  })

  it('leaves loading for the safe read-failure gate when an account read never settles', async () => {
    vi.useFakeTimers()
    try {
      authenticate('user-a')
      repositoryMock.read.mockReturnValueOnce(new Promise<Store | null>(() => undefined))

      const { result } = renderHook(() => useAppStore(), { wrapper })
      expect(result.current.status).toBe('loading')

      await act(async () => {
        await vi.advanceTimersByTimeAsync(4_000)
      })

      expect(result.current.status).toBe('error')
      expect(result.current.store).toBeNull()
      expect(result.current.error).toBe('暂时无法读取账号数据，请重试。')
    } finally {
      vi.useRealTimers()
    }
  })

  it('classifies invalid account Store data separately from a backend read failure', async () => {
    authenticate('user-a')
    repositoryMock.read.mockRejectedValueOnce(
      new StoreIntegrityError('完成记录引用不存在的习惯：private-habit')
    )

    const { result } = renderHook(() => useAppStore(), { wrapper })

    await waitFor(() => expect(result.current.status).toBe('integrity-error'))
    expect(result.current.store).toBeNull()
    expect(result.current.error).toContain('完整性')
    expect(result.current.error).not.toContain('private-habit')
  })

  it('changes a generic initial read failure to integrity recovery when retry finds invalid Store data', async () => {
    authenticate('user-a')
    repositoryMock.read
      .mockRejectedValueOnce(new Error('backend unavailable'))
      .mockRejectedValueOnce(new StoreIntegrityError('习惯数据无效'))
    const { result } = renderHook(() => useAppStore(), { wrapper })
    await waitFor(() => expect(result.current.status).toBe('error'))

    let reloaded = true
    await act(async () => {
      reloaded = await result.current.reload()
    })

    expect(reloaded).toBe(false)
    expect(result.current.status).toBe('integrity-error')
    expect(result.current.store).toBeNull()
    expect(result.current.error).toContain('完整性')
  })

  it('hides the previous Store synchronously when the session signs out', async () => {
    authenticate('user-a')
    repositoryMock.read.mockResolvedValueOnce(storeA)
    const rendered = renderHook(() => useAppStore(), { wrapper })
    await waitFor(() => expect(rendered.result.current.store).toEqual(storeA))

    authMock.current = { status: 'signed_out', user: null }
    rendered.rerender()

    expect(rendered.result.current.status).toBe('idle')
    expect(rendered.result.current.store).toBeNull()
    expect(rendered.result.current.notice).toBe('')
    expect(rendered.result.current.error).toBe('')
  })

  it('discards account A when its read resolves after account B', async () => {
    const readA = deferred<Store | null>()
    const readB = deferred<Store | null>()
    authenticate('user-a')
    repositoryMock.read
      .mockReturnValueOnce(readA.promise)
      .mockReturnValueOnce(readB.promise)
    const rendered = renderHook(() => useAppStore(), { wrapper })

    authenticate('user-b')
    rendered.rerender()
    expect(rendered.result.current.status).toBe('loading')
    expect(rendered.result.current.store).toBeNull()

    await act(async () => readB.resolve(storeB))
    expect(rendered.result.current.store).toEqual(storeB)

    await act(async () => readA.resolve(storeA))
    expect(rendered.result.current.status).toBe('ready')
    expect(rendered.result.current.store).toEqual(storeB)
  })

  it('discards account A error when its read rejects after account B', async () => {
    const readA = deferred<Store | null>()
    const readB = deferred<Store | null>()
    authenticate('user-a')
    repositoryMock.read
      .mockReturnValueOnce(readA.promise)
      .mockReturnValueOnce(readB.promise)
    const rendered = renderHook(() => useAppStore(), { wrapper })

    authenticate('user-b')
    rendered.rerender()

    await act(async () => readB.resolve(storeB))
    await act(async () => readA.reject(new Error('account A failed late')))

    expect(rendered.result.current.status).toBe('ready')
    expect(rendered.result.current.store).toEqual(storeB)
    expect(rendered.result.current.error).toBe('')
  })

  it('discards an older reload for the same user by generation', async () => {
    const olderReload = deferred<Store | null>()
    const latestReload = deferred<Store | null>()
    authenticate('user-a')
    repositoryMock.read
      .mockResolvedValueOnce(storeA)
      .mockReturnValueOnce(olderReload.promise)
      .mockReturnValueOnce(latestReload.promise)
    const { result } = renderHook(() => useAppStore(), { wrapper })
    await waitFor(() => expect(result.current.store).toEqual(storeA))

    let olderResult!: Promise<boolean>
    let latestResult!: Promise<boolean>
    act(() => {
      olderResult = result.current.reload()
      latestResult = result.current.reload()
    })

    await act(async () => latestReload.resolve(storeB))
    expect(await latestResult).toBe(true)
    expect(result.current.store).toEqual(storeB)

    await act(async () => olderReload.resolve(storeA))
    expect(await olderResult).toBe(false)
    expect(result.current.store).toEqual(storeB)
  })

  it('discards an older reload error after the latest reload succeeds', async () => {
    const olderReload = deferred<Store | null>()
    const latestReload = deferred<Store | null>()
    authenticate('user-a')
    repositoryMock.read
      .mockResolvedValueOnce(storeA)
      .mockReturnValueOnce(olderReload.promise)
      .mockReturnValueOnce(latestReload.promise)
    const { result } = renderHook(() => useAppStore(), { wrapper })
    await waitFor(() => expect(result.current.store).toEqual(storeA))

    let olderResult!: Promise<boolean>
    let latestResult!: Promise<boolean>
    act(() => {
      olderResult = result.current.reload()
      latestResult = result.current.reload()
    })

    await act(async () => latestReload.resolve(storeB))
    expect(await latestResult).toBe(true)

    await act(async () => olderReload.reject(new Error('older reload failed late')))
    expect(await olderResult).toBe(false)
    expect(result.current.status).toBe('ready')
    expect(result.current.store).toEqual(storeB)
    expect(result.current.error).toBe('')
  })

  it('keeps JSON import preview behind the app contract', () => {
    const { result } = renderHook(() => useAppStore(), { wrapper })
    const preview: ImportPreview = result.current.previewImport(JSON.stringify(storeA))

    expect(preview.store).toEqual(storeA)
    expect(preview.habitCount).toBe(1)
    expect(preview.completionCount).toBe(0)
  })
})
