import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TodayPage } from '../../src/pages/TodayPage'
import type { Store } from '../../src/domain/types'

const mocks = vi.hoisted(() => ({
  appStore: {
    store: null as Store | null,
    today: '2026-08-01',
    commit: vi.fn<(
      buildNext: (current: Store) => Store,
      successMessage?: string
    ) => Promise<boolean>>()
  }
}))

vi.mock('../../src/app/AppStore', () => ({
  useAppStore: () => mocks.appStore
}))

const confirmedStore: Store = {
  version: 1,
  habits: [
    {
      id: 'habit-reading',
      name: '阅读',
      targetPerDay: 2,
      createdOn: '2026-07-20',
      archivedOn: null
    }
  ],
  completions: []
}

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (cause: unknown) => void
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })
  return { promise, resolve, reject }
}

function renderToday() {
  return render(
    <MemoryRouter>
      <TodayPage />
    </MemoryRouter>
  )
}

describe('TodayPage account writes', () => {
  beforeEach(() => {
    mocks.appStore.store = structuredClone(confirmedStore)
    mocks.appStore.commit.mockReset()
  })

  it('keeps the create form and entered values until a true account save blocks duplicates', async () => {
    const user = userEvent.setup()
    const firstSave = deferred<boolean>()
    mocks.appStore.commit
      .mockReturnValueOnce(firstSave.promise)
      .mockResolvedValueOnce(true)
    renderToday()

    await user.click(screen.getByRole('button', { name: '快速创建习惯' }))
    await user.type(screen.getByLabelText('习惯名称'), '散步')
    const submit = screen.getByRole('button', { name: '保存习惯' })
    await user.click(submit)

    const dialog = screen.getByRole('dialog', { name: '创建习惯' })
    expect(mocks.appStore.commit).toHaveBeenCalledTimes(1)
    expect(within(dialog).getByRole('button', { name: '保存中…' })).toBeDisabled()
    expect(within(dialog).getByRole('status')).toHaveTextContent('正在保存习惯…')
    expect(within(dialog).getByRole('button', { name: '关闭创建习惯' })).toBeDisabled()

    await user.click(within(dialog).getByRole('button', { name: '保存中…' }))
    expect(mocks.appStore.commit).toHaveBeenCalledTimes(1)

    await act(async () => firstSave.resolve(false))

    expect(screen.getByRole('dialog', { name: '创建习惯' })).toBeInTheDocument()
    expect(screen.getByLabelText('习惯名称')).toHaveValue('散步')
    expect(screen.getByRole('button', { name: '保存习惯' })).toBeEnabled()

    await user.click(screen.getByRole('button', { name: '保存习惯' }))
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: '创建习惯' })).not.toBeInTheDocument()
    })
    expect(mocks.appStore.commit).toHaveBeenCalledTimes(2)
  })

  it('keeps today count confirmed and announces saving until the account commit resolves true', async () => {
    const user = userEvent.setup()
    const save = deferred<boolean>()
    let candidate!: Store
    mocks.appStore.commit.mockImplementationOnce((buildNext) => {
      candidate = buildNext(structuredClone(confirmedStore))
      return save.promise
    })
    const rendered = renderToday()

    const row = screen.getByTestId('habit-row')
    const increase = within(row).getByRole('button', { name: '阅读，增加一次' })
    await user.click(increase)

    expect(mocks.appStore.commit).toHaveBeenCalledTimes(1)
    expect(within(row).getByText('保存中…')).toBeInTheDocument()
    expect(within(row).getByText('0 / 2')).toBeInTheDocument()
    expect(increase).toBeDisabled()
    expect(within(row).getByRole('button', { name: '阅读，减少一次' })).toBeDisabled()
    expect(candidate.completions).toEqual([
      { habitId: 'habit-reading', date: '2026-08-01', count: 1 }
    ])

    await user.click(increase)
    expect(mocks.appStore.commit).toHaveBeenCalledTimes(1)

    mocks.appStore.store = candidate
    await act(async () => save.resolve(true))
    rendered.rerender(
      <MemoryRouter>
        <TodayPage />
      </MemoryRouter>
    )

    expect(within(screen.getByTestId('habit-row')).getByText('1 / 2')).toBeInTheDocument()
    expect(within(screen.getByTestId('habit-row')).getByText('已保存')).toBeInTheDocument()
  })

  it('keeps a recent-day count confirmed and reusable when the account commit rejects', async () => {
    const user = userEvent.setup()
    const save = deferred<boolean>()
    let candidate!: Store
    mocks.appStore.commit.mockImplementationOnce((buildNext) => {
      candidate = buildNext(structuredClone(confirmedStore))
      return save.promise
    })
    renderToday()

    await user.click(
      screen.getByRole('button', { name: '2026-07-27，修正漏记' })
    )
    const row = screen.getByTestId('habit-row')
    const increase = within(row).getByRole('button', { name: '阅读，增加一次' })
    await user.click(increase)

    expect(within(row).getByText('保存中…')).toBeInTheDocument()
    expect(within(row).getByText('0 / 2')).toBeInTheDocument()
    expect(candidate.completions).toEqual([
      { habitId: 'habit-reading', date: '2026-07-27', count: 1 }
    ])

    await act(async () => save.reject(new Error('private database detail')))

    expect(within(row).getByText('未保存，请重试')).toBeInTheDocument()
    expect(within(row).getByText('0 / 2')).toBeInTheDocument()
    expect(increase).toBeEnabled()
    expect(mocks.appStore.commit).toHaveBeenCalledTimes(1)
  })
})
