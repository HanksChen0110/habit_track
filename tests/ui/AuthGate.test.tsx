import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Outlet } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../../src/App'

const mocks = vi.hoisted(() => ({
  auth: {
    status: 'signed_out',
    user: null as { id: string; email: string } | null,
    error: null as { category: string; message: string } | null,
    signUp: vi.fn(),
    signIn: vi.fn(),
    signOut: vi.fn()
  },
  appStore: {
    status: 'idle',
    store: null as object | null,
    error: '',
    reload: vi.fn(),
    beginEmpty: vi.fn(),
    beginDemo: vi.fn()
  }
}))

vi.mock('../../src/auth/AuthContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="auth-provider">{children}</div>
  ),
  useAuth: () => mocks.auth
}))

vi.mock('../../src/app/AppStore', () => ({
  AppStoreProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="app-store-provider">{children}</div>
  ),
  useAppStore: () => mocks.appStore
}))

vi.mock('../../src/components/AppShell', () => ({
  AppShell: () => <Outlet />
}))

vi.mock('../../src/pages/TodayPage', () => ({
  TodayPage: () => <h1>今天数据页</h1>
}))

vi.mock('../../src/pages/WeekPage', () => ({ WeekPage: () => null }))
vi.mock('../../src/pages/InsightsPage', () => ({ InsightsPage: () => null }))
vi.mock('../../src/pages/ManagePage', () => ({ ManagePage: () => null }))

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise
  })
  return { promise, resolve }
}

async function verifyInitializationGate(mode: 'empty' | 'demo') {
  const user = userEvent.setup()
  const begin = mode === 'empty' ? mocks.appStore.beginEmpty : mocks.appStore.beginDemo
  const readyLabel = mode === 'empty' ? '开始记录' : '载入示例'
  const busyLabel = mode === 'empty' ? '开始中…' : '载入中…'
  mocks.auth.status = 'authenticated'
  mocks.auth.user = { id: 'user-1', email: 'me@example.com' }
  mocks.appStore.status = 'ready'

  const rejected = deferred<boolean>()
  begin.mockReturnValueOnce(rejected.promise)
  render(<App />)

  await user.click(screen.getByRole('button', { name: readyLabel }))
  expect(screen.getByRole('button', { name: busyLabel })).toBeDisabled()
  expect(window.location.hash).not.toContain('/today')

  rejected.resolve(false)
  await waitFor(() => expect(screen.getByRole('button', { name: readyLabel })).toBeEnabled())
  expect(window.location.hash).not.toContain('/today')
  expect(screen.getByRole('heading', { name: '让行动留下清晰的轨迹。' })).toBeInTheDocument()

  const confirmed = deferred<boolean>()
  begin.mockReturnValueOnce(confirmed.promise)
  await user.click(screen.getByRole('button', { name: readyLabel }))
  expect(window.location.hash).not.toContain('/today')

  confirmed.resolve(true)
  await waitFor(() => expect(window.location.hash).toBe('#/today'))
}

describe('账号与数据 gate', () => {
  beforeEach(() => {
    window.location.hash = ''
    mocks.auth.status = 'signed_out'
    mocks.auth.user = null
    mocks.auth.error = null
    mocks.appStore.status = 'idle'
    mocks.appStore.store = null
    mocks.appStore.error = ''
    mocks.auth.signUp.mockReset().mockResolvedValue({ ok: true })
    mocks.auth.signIn.mockReset().mockResolvedValue({ ok: true })
    mocks.auth.signOut.mockReset().mockResolvedValue({ ok: true })
    mocks.appStore.reload.mockReset().mockResolvedValue(true)
    mocks.appStore.beginEmpty.mockReset().mockResolvedValue(true)
    mocks.appStore.beginDemo.mockReset().mockResolvedValue(true)
  })

  it('组合 AuthProvider > AppStoreProvider，并让未登录用户只看到默认登录入口', () => {
    render(<App />)

    const authProvider = screen.getByTestId('auth-provider')
    const storeProvider = within(authProvider).getByTestId('app-store-provider')
    expect(within(storeProvider).getByRole('heading', { name: '登录循迹' })).toBeInTheDocument()
    expect(screen.getByLabelText('邮箱')).toHaveAttribute('autocomplete', 'email')
    expect(screen.getByLabelText('密码')).toHaveAttribute('autocomplete', 'current-password')
    expect(screen.queryByRole('heading', { name: '今天数据页' })).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/确认密码/)).not.toBeInTheDocument()
    expect(screen.queryByText(/OAuth|找回密码/)).not.toBeInTheDocument()
  })

  it('在登录和注册之间切换，不跨模式保留密码，并提交对应认证动作', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.type(screen.getByLabelText('邮箱'), 'me@example.com')
    await user.type(screen.getByLabelText('密码'), 'secret-value')
    await user.click(screen.getByRole('button', { name: '创建账号' }))

    expect(screen.getByRole('heading', { name: '创建账号' })).toBeInTheDocument()
    expect(screen.getByLabelText('密码')).toHaveValue('')
    expect(screen.getByLabelText('密码')).toHaveAttribute('autocomplete', 'new-password')
    expect(screen.getByLabelText('邮箱')).toHaveFocus()
    await user.type(screen.getByLabelText('密码'), 'longer-secret')
    await user.click(screen.getByRole('button', { name: /^创建账号$/ }))

    expect(mocks.auth.signUp).toHaveBeenCalledWith('me@example.com', 'longer-secret')
    expect(mocks.auth.signIn).not.toHaveBeenCalled()
  })

  it('提交期间显示具体 busy 文案并阻止重复认证', async () => {
    const user = userEvent.setup()
    const request = deferred<{ ok: true }>()
    mocks.auth.signIn.mockReturnValue(request.promise)
    render(<App />)

    await user.type(screen.getByLabelText('邮箱'), 'me@example.com')
    await user.type(screen.getByLabelText('密码'), 'secret-value')
    await user.click(screen.getByRole('button', { name: '登录循迹' }))

    expect(screen.getByRole('button', { name: '登录中…' })).toBeDisabled()
    expect(mocks.auth.signIn).toHaveBeenCalledTimes(1)
    request.resolve({ ok: true })
  })

  it('用不同真实文字区分会话恢复和账号数据读取', () => {
    mocks.auth.status = 'booting'
    const { rerender } = render(<App />)
    expect(screen.getByRole('status')).toHaveTextContent('正在恢复账号')

    mocks.auth.status = 'authenticated'
    mocks.auth.user = { id: 'user-1', email: 'me@example.com' }
    mocks.appStore.status = 'loading'
    rerender(<App />)
    expect(screen.getByRole('status')).toHaveTextContent('正在读取账号数据')
    expect(screen.queryByText('正在恢复账号')).not.toBeInTheDocument()
  })

  it('账号数据读取期间即使存在迟到的旧 Store 也不泄露业务页', () => {
    mocks.auth.status = 'authenticated'
    mocks.auth.user = { id: 'user-2', email: 'next@example.com' }
    mocks.appStore.status = 'loading'
    mocks.appStore.store = { version: 1 }
    render(<App />)

    expect(screen.getByRole('status')).toHaveTextContent('正在读取账号数据')
    expect(screen.queryByRole('heading', { name: '今天数据页' })).not.toBeInTheDocument()
  })

  it('把认证失败留在账号入口，不与数据读取失败混淆', () => {
    mocks.auth.status = 'error'
    mocks.auth.error = {
      category: 'backend_unavailable',
      message: '本地后端暂时不可用，请确认本地服务已启动。'
    }
    render(<App />)

    expect(screen.getByRole('heading', { name: '登录循迹' })).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('本地后端暂时不可用')
    expect(screen.queryByRole('button', { name: '重新读取' })).not.toBeInTheDocument()
  })

  it('为初始账号读取失败提供重新读取和退出账号', async () => {
    const user = userEvent.setup()
    mocks.auth.status = 'authenticated'
    mocks.auth.user = { id: 'user-1', email: 'me@example.com' }
    mocks.appStore.status = 'error'
    mocks.appStore.error = '暂时无法读取账号数据，请重试。'
    render(<App />)

    expect(screen.getByRole('heading', { name: '暂时无法读取账号数据' })).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('暂时无法读取账号数据，请重试。')
    await user.click(screen.getByRole('button', { name: '重新读取' }))
    await user.click(screen.getByRole('button', { name: '退出账号' }))
    expect(mocks.appStore.reload).toHaveBeenCalledTimes(1)
    expect(mocks.auth.signOut).toHaveBeenCalledTimes(1)
  })

  it('退出账号失败时保留数据错误页并显示安全认证错误', async () => {
    const user = userEvent.setup()
    mocks.auth.status = 'authenticated'
    mocks.auth.user = { id: 'user-1', email: 'me@example.com' }
    mocks.appStore.status = 'error'
    mocks.appStore.error = '暂时无法读取账号数据，请重试。'
    mocks.auth.signOut.mockResolvedValue({
      ok: false,
      error: { category: 'backend_unavailable', message: '账号操作失败，请重试。' }
    })
    render(<App />)

    await user.click(screen.getByRole('button', { name: '退出账号' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('账号操作失败，请重试。')
    expect(screen.getByRole('heading', { name: '暂时无法读取账号数据' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: '登录循迹' })).not.toBeInTheDocument()
    expect(mocks.auth.status).toBe('authenticated')
  })

  it('开始空白记录只在服务端确认后导航', async () => {
    await verifyInitializationGate('empty')
  })

  it('载入示例只在服务端确认后导航', async () => {
    await verifyInitializationGate('demo')
  })

  it('账号 Store 可用后才进入业务路由', () => {
    mocks.auth.status = 'authenticated'
    mocks.auth.user = { id: 'user-1', email: 'me@example.com' }
    mocks.appStore.status = 'ready'
    mocks.appStore.store = { version: 1 }
    render(<App />)

    expect(screen.getByRole('heading', { name: '今天数据页' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: '登录循迹' })).not.toBeInTheDocument()
  })
})
