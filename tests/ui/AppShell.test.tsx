import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppShell } from '../../src/components/AppShell'

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((done) => {
    resolve = done
  })
  return { promise, resolve }
}

const mocks = vi.hoisted(() => ({
  appStore: {
    status: 'ready',
    notice: '',
    error: '',
    clearMessages: vi.fn()
  },
  auth: {
    user: { id: 'user-a', email: 'person@example.com' },
    signOut: vi.fn()
  }
}))

vi.mock('../../src/app/AppStore', () => ({
  useAppStore: () => mocks.appStore
}))

vi.mock('../../src/auth/AuthContext', () => ({
  useAuth: () => mocks.auth
}))

function renderShell(path = '/today') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="*" element={<p>页面内容</p>} />
        </Route>
      </Routes>
    </MemoryRouter>
  )
}

describe('AppShell', () => {
  beforeEach(() => {
    mocks.appStore.status = 'ready'
    mocks.appStore.notice = ''
    mocks.appStore.error = ''
    mocks.appStore.clearMessages.mockReset()
    mocks.auth.user = { id: 'user-a', email: 'person@example.com' }
    mocks.auth.signOut.mockReset()
    mocks.auth.signOut.mockResolvedValue({ ok: true })
  })

  it('keeps the four primary destinations in their established order on desktop and mobile', () => {
    renderShell('/week')

    const expected = [
      { name: '今天', href: '/today' },
      { name: '本周', href: '/week' },
      { name: '洞察', href: '/insights' },
      { name: '管理', href: '/manage' }
    ]
    const navigations = screen.getAllByRole('navigation', { name: '主导航' })

    expect(navigations).toHaveLength(2)
    for (const navigation of navigations) {
      expect(within(navigation).getAllByRole('link').map((link) => ({
        name: link.textContent,
        href: new URL(link.getAttribute('href') ?? '', window.location.href).pathname
      }))).toEqual(expected)
    }
  })

  it('shows the account boundary, full email and neutral sign-out action on desktop and mobile', () => {
    renderShell()

    const desktop = screen.getByRole('group', { name: '桌面账号' })
    expect(within(desktop).getByText('本机账号数据')).toBeInTheDocument()
    expect(within(desktop).getByLabelText('当前账号：person@example.com')).toHaveTextContent(
      'person@example.com'
    )
    expect(within(desktop).getByRole('button', { name: '退出账号' })).toBeEnabled()

    const mobile = screen.getByRole('group', { name: '移动账号' })
    expect(within(mobile).getByText('本机数据')).toBeInTheDocument()
    expect(within(mobile).getByRole('button', { name: '退出账号' })).toBeEnabled()
  })

  it('disables both sign-out actions while awaiting the asynchronous result', async () => {
    const user = userEvent.setup()
    const result = deferred<{ ok: true }>()
    mocks.auth.signOut.mockReturnValueOnce(result.promise)
    renderShell()

    const desktop = screen.getByRole('group', { name: '桌面账号' })
    const mobile = screen.getByRole('group', { name: '移动账号' })
    const desktopButton = within(desktop).getByRole('button', { name: '退出账号' })
    await user.click(desktopButton)

    expect(within(desktop).getByRole('button', { name: '退出中…' })).toBeDisabled()
    expect(within(mobile).getByRole('button', { name: '正在退出账号' })).toBeDisabled()
    await user.click(within(mobile).getByRole('button', { name: '正在退出账号' }))
    expect(mocks.auth.signOut).toHaveBeenCalledTimes(1)

    result.resolve({ ok: true })
    expect(await within(desktop).findByRole('button', { name: '退出账号' })).toBeEnabled()
    expect(mocks.appStore.clearMessages).toHaveBeenCalledTimes(1)
  })

  it('shows the safe failure returned by sign-out without losing retry access', async () => {
    const user = userEvent.setup()
    mocks.auth.signOut.mockResolvedValueOnce({
      ok: false,
      error: {
        category: 'backend_unavailable',
        message: '本地后端暂时不可用，请确认本地服务已启动。'
      }
    })
    renderShell()

    await user.click(
      within(screen.getByRole('group', { name: '桌面账号' })).getByRole('button', {
        name: '退出账号'
      })
    )

    expect(await screen.findByRole('alert')).toHaveTextContent(
      '本地后端暂时不可用，请确认本地服务已启动。'
    )
    expect(
      within(screen.getByRole('group', { name: '桌面账号' })).getByRole('button', {
        name: '退出账号'
      })
    ).toBeEnabled()
  })

  it('announces saving and keeps successful notices in the polite Toast path', () => {
    mocks.appStore.status = 'saving'
    mocks.appStore.notice = '已保存今天的记录'
    renderShell()

    expect(screen.getByRole('status', { name: '保存状态' })).toHaveTextContent('保存中…')
    const toast = screen.getByRole('status', { name: '保存结果' })
    expect(toast).toHaveAttribute('aria-live', 'polite')
    expect(toast).toHaveTextContent('已保存今天的记录')

    expect(toast).toHaveClass('toast')
  })

  it('keeps write failures visible until close and reveals a changed error', async () => {
    const user = userEvent.setup()
    mocks.appStore.error = '刚才的修改未保存，请重新操作。'
    const rendered = renderShell()

    const errorBar = screen.getByRole('alert')
    expect(errorBar).toHaveTextContent('刚才的修改未保存，请重新操作。')
    expect(errorBar).not.toHaveClass('toast')
    expect(mocks.appStore.clearMessages).not.toHaveBeenCalled()

    await user.click(within(errorBar).getByRole('button', { name: '关闭未保存提示' }))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(mocks.appStore.clearMessages).toHaveBeenCalledTimes(1)

    mocks.appStore.error = '暂时无法重新读取账号数据，请重试。'
    rendered.rerender(
      <MemoryRouter initialEntries={['/today']}>
        <Routes>
          <Route element={<AppShell />}>
            <Route path="*" element={<p>页面内容</p>} />
          </Route>
        </Routes>
      </MemoryRouter>
    )

    expect(screen.getByRole('alert')).toHaveTextContent('暂时无法重新读取账号数据，请重试。')
  })

  it('reveals an underlying write error after dismissing a covering sign-out failure', async () => {
    const user = userEvent.setup()
    mocks.appStore.error = '刚才的修改未保存，请重新操作。'
    mocks.auth.signOut.mockResolvedValueOnce({
      ok: false,
      error: {
        category: 'backend_unavailable',
        message: '本地后端暂时不可用，请确认本地服务已启动。'
      }
    })
    renderShell()

    await user.click(
      within(screen.getByRole('group', { name: '桌面账号' })).getByRole('button', {
        name: '退出账号'
      })
    )
    const signOutAlert = await screen.findByRole('alert')
    expect(signOutAlert).toHaveTextContent('本地后端暂时不可用，请确认本地服务已启动。')

    await user.click(within(signOutAlert).getByRole('button', { name: '关闭退出失败提示' }))
    expect(screen.getByRole('alert')).toHaveTextContent('刚才的修改未保存，请重新操作。')
    expect(mocks.appStore.clearMessages).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: '关闭未保存提示' }))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(mocks.appStore.clearMessages).toHaveBeenCalledTimes(1)
  })

  it('replaces a cleared write alert with the AppStore success notice', () => {
    mocks.appStore.error = '刚才的修改未保存，请重新操作。'
    const rendered = renderShell()

    expect(screen.getByRole('alert')).toHaveTextContent('刚才的修改未保存，请重新操作。')

    mocks.appStore.error = ''
    mocks.appStore.notice = '已保存今天的记录'
    rendered.rerender(
      <MemoryRouter initialEntries={['/today']}>
        <Routes>
          <Route element={<AppShell />}>
            <Route path="*" element={<p>页面内容</p>} />
          </Route>
        </Routes>
      </MemoryRouter>
    )

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    const toast = screen.getByRole('status', { name: '保存结果' })
    expect(toast).toHaveAttribute('aria-live', 'polite')
    expect(toast).toHaveTextContent('已保存今天的记录')
  })
})
