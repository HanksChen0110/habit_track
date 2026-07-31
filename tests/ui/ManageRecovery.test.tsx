import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ManagePage } from '../../src/pages/ManagePage'
import { RecoveryPage } from '../../src/pages/RecoveryPage'
import type { Store } from '../../src/domain/types'

const mocks = vi.hoisted(() => ({
  appStore: {
    store: null as Store | null,
    today: '2026-08-01',
    commit: vi.fn(),
    exportJson: vi.fn(() => '{}'),
    previewImport: vi.fn(),
    confirmImport: vi.fn()
  }
}))

vi.mock('../../src/app/AppStore', () => ({
  useAppStore: () => mocks.appStore
}))

const store: Store = {
  version: 1,
  habits: [
    {
      id: 'habit-1',
      name: '阅读',
      targetPerDay: 1,
      createdOn: '2026-08-01',
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

function renderManage() {
  return render(
    <MemoryRouter>
      <ManagePage />
    </MemoryRouter>
  )
}

function renderRecovery() {
  return render(<RecoveryPage />)
}

describe('ManagePage account writes', () => {
  beforeEach(() => {
    mocks.appStore.store = store
    mocks.appStore.commit.mockReset()
    mocks.appStore.exportJson.mockReset().mockReturnValue('{}')
    mocks.appStore.previewImport.mockReset()
    mocks.appStore.confirmImport.mockReset()
  })

  it('keeps a create form while the account save is pending or rejected and blocks duplicate submission', async () => {
    const user = userEvent.setup()
    const save = deferred<boolean>()
    mocks.appStore.commit.mockReturnValueOnce(save.promise)
    renderManage()

    await user.click(screen.getByRole('button', { name: '创建习惯' }))
    await user.type(screen.getByLabelText('习惯名称'), '散步')
    const submit = screen.getByRole('button', { name: '保存习惯' })
    await user.click(submit)

    expect(mocks.appStore.commit).toHaveBeenCalledTimes(1)
    expect(submit).toBeDisabled()
    expect(screen.getByRole('dialog', { name: '创建习惯' })).toBeInTheDocument()

    await user.click(submit)
    expect(mocks.appStore.commit).toHaveBeenCalledTimes(1)

    await act(async () => save.resolve(false))

    expect(screen.getByRole('dialog', { name: '创建习惯' })).toBeInTheDocument()
    expect(screen.getByLabelText('习惯名称')).toHaveValue('散步')
    expect(submit).toBeEnabled()
  })

  it('closes create and edit forms only after a true account save result', async () => {
    const user = userEvent.setup()
    mocks.appStore.commit
      .mockResolvedValueOnce(true)
      .mockRejectedValueOnce(new Error('database detail'))
      .mockResolvedValueOnce(true)
    renderManage()

    await user.click(screen.getByRole('button', { name: '创建习惯' }))
    await user.type(screen.getByLabelText('习惯名称'), '散步')
    await user.click(screen.getByRole('button', { name: '保存习惯' }))
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: '创建习惯' })).not.toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: '编辑阅读' }))
    const name = screen.getByLabelText('习惯名称')
    await user.clear(name)
    await user.type(name, '深度阅读')
    await user.click(screen.getByRole('button', { name: '保存习惯' }))

    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: '编辑习惯' })).toBeInTheDocument()
      expect(name).toHaveValue('深度阅读')
    })

    await user.click(screen.getByRole('button', { name: '保存习惯' }))
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: '编辑习惯' })).not.toBeInTheDocument()
    })
  })

  it('keeps an archive candidate while its account write is pending or false and closes only after success', async () => {
    const user = userEvent.setup()
    const firstSave = deferred<boolean>()
    mocks.appStore.commit
      .mockReturnValueOnce(firstSave.promise)
      .mockResolvedValueOnce(true)
    renderManage()

    await user.click(screen.getByRole('button', { name: '归档阅读' }))
    const confirm = screen.getByRole('button', { name: '确认归档' })
    await user.click(confirm)

    expect(mocks.appStore.commit).toHaveBeenCalledTimes(1)
    expect(confirm).toBeDisabled()
    expect(screen.getByRole('dialog', { name: '归档习惯' })).toBeInTheDocument()

    await user.click(confirm)
    expect(mocks.appStore.commit).toHaveBeenCalledTimes(1)

    await act(async () => firstSave.resolve(false))
    expect(screen.getByRole('dialog', { name: '归档习惯' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '确认归档' }))
    expect(mocks.appStore.commit).toHaveBeenCalledTimes(2)
    expect(screen.queryByRole('dialog', { name: '归档习惯' })).not.toBeInTheDocument()
  })

  it('preserves an import preview until the confirmed account replacement succeeds after rejection', async () => {
    const user = userEvent.setup()
    const preview = { store, habitCount: 1, completionCount: 0 }
    const replacement = deferred<boolean>()
    mocks.appStore.previewImport.mockReturnValueOnce(preview)
    mocks.appStore.confirmImport
      .mockReturnValueOnce(replacement.promise)
      .mockResolvedValueOnce(true)
    renderManage()

    const file = new File([JSON.stringify(store)], 'backup.json', { type: 'application/json' })
    await user.upload(screen.getByLabelText('选择 JSON 备份'), file)
    const dialog = screen.getByRole('dialog', { name: '确认替换数据' })
    expect(within(dialog).getByText('1 项')).toBeInTheDocument()

    const confirm = screen.getByRole('button', { name: '完整替换' })
    await user.click(confirm)

    expect(mocks.appStore.confirmImport).toHaveBeenCalledTimes(1)
    expect(confirm).toBeDisabled()
    expect(screen.getByRole('dialog', { name: '确认替换数据' })).toBeInTheDocument()

    await user.click(confirm)
    expect(mocks.appStore.confirmImport).toHaveBeenCalledTimes(1)

    await act(async () => replacement.reject(new Error('database detail')))
    expect(within(screen.getByRole('dialog', { name: '确认替换数据' })).getByText('1 项')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '完整替换' }))
    expect(mocks.appStore.confirmImport).toHaveBeenCalledTimes(2)
    expect(screen.queryByRole('dialog', { name: '确认替换数据' })).not.toBeInTheDocument()
  })

  it('does not replace account data for an invalid or cancelled import', async () => {
    const user = userEvent.setup()
    const preview = { store, habitCount: 1, completionCount: 0 }
    mocks.appStore.previewImport
      .mockImplementationOnce(() => {
        throw new Error('仅支持 Store 版本 1')
      })
      .mockReturnValueOnce(preview)
    renderManage()

    await user.upload(
      screen.getByLabelText('选择 JSON 备份'),
      new File(['{"version":2}'], 'invalid.json', { type: 'application/json' })
    )
    expect(screen.getByRole('alert')).toHaveTextContent('仅支持 Store 版本 1')
    expect(mocks.appStore.confirmImport).not.toHaveBeenCalled()

    await user.upload(
      screen.getByLabelText('选择 JSON 备份'),
      new File([JSON.stringify(store)], 'valid.json', { type: 'application/json' })
    )
    const dialog = screen.getByRole('dialog', { name: '确认替换数据' })
    expect(within(dialog).getByText(/完整 JSON 备份.*当前账号本机数据库.*原数据不会被覆盖/)).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: '取消' }))

    expect(mocks.appStore.confirmImport).not.toHaveBeenCalled()
    expect(screen.queryByRole('dialog', { name: '确认替换数据' })).not.toBeInTheDocument()
  })
})

describe('RecoveryPage account replacement', () => {
  beforeEach(() => {
    mocks.appStore.previewImport.mockReset()
    mocks.appStore.confirmImport.mockReset()
  })

  it('awaits recovery replacement and disables duplicate file submission while pending', async () => {
    const user = userEvent.setup()
    const preview = { store, habitCount: 1, completionCount: 0 }
    const replacement = deferred<boolean>()
    mocks.appStore.previewImport.mockReturnValueOnce(preview)
    mocks.appStore.confirmImport.mockReturnValueOnce(replacement.promise)
    renderRecovery()

    const input = screen.getByLabelText('选择 JSON 备份')
    const file = new File([JSON.stringify(store)], 'recovery.json', { type: 'application/json' })
    await user.upload(input, file)

    expect(mocks.appStore.confirmImport).toHaveBeenCalledTimes(1)
    expect(input).toBeDisabled()
    expect(screen.getByRole('button', { name: '恢复中…' })).toBeDisabled()

    await act(async () => replacement.resolve(false))

    expect(input).toBeEnabled()
    expect(screen.getByRole('button', { name: '选择备份恢复' })).toBeEnabled()
  })

  it('describes account-local recovery and keeps the page after a rejected replacement without leaking details', async () => {
    const user = userEvent.setup()
    mocks.appStore.previewImport.mockReturnValueOnce({ store, habitCount: 1, completionCount: 0 })
    mocks.appStore.confirmImport.mockRejectedValueOnce(
      new Error('relation habits failed with token=private')
    )
    renderRecovery()

    expect(screen.getByRole('heading', { name: '账号数据需要恢复' })).toBeInTheDocument()
    expect(screen.getByText(/当前账号的本机数据库.*原数据没有被覆盖.*完整 JSON/)).toBeInTheDocument()

    const input = screen.getByLabelText('选择 JSON 备份')
    await user.upload(
      input,
      new File([JSON.stringify(store)], 'rejected.json', { type: 'application/json' })
    )

    expect(await screen.findByRole('alert')).toHaveTextContent('恢复未完成，请重试。')
    expect(screen.getByRole('heading', { name: '账号数据需要恢复' })).toBeInTheDocument()
    expect(screen.queryByText(/relation habits|token=private/)).not.toBeInTheDocument()
    expect(input).toBeEnabled()
  })

  it('does not start account replacement for an invalid recovery backup', async () => {
    const user = userEvent.setup()
    mocks.appStore.previewImport.mockImplementationOnce(() => {
      throw new Error('完成记录引用不存在的习惯')
    })
    renderRecovery()

    await user.upload(
      screen.getByLabelText('选择 JSON 备份'),
      new File(['{}'], 'invalid-recovery.json', { type: 'application/json' })
    )

    expect(screen.getByRole('alert')).toHaveTextContent('完成记录引用不存在的习惯')
    expect(mocks.appStore.confirmImport).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: '选择备份恢复' })).toBeEnabled()
  })
})
