import { useEffect, useRef, useState } from 'react'
import { CalendarDays, ChartNoAxesCombined, ListChecks, LogOut, Settings2, X } from 'lucide-react'
import { NavLink, Outlet } from 'react-router-dom'
import { useAppStore } from '../app/AppStore'
import { useAuth } from '../auth/AuthContext'
import { Brand } from './Brand'

const navigation = [
  { to: '/today', label: '今天', icon: ListChecks },
  { to: '/week', label: '本周', icon: CalendarDays },
  { to: '/insights', label: '洞察', icon: ChartNoAxesCombined },
  { to: '/manage', label: '管理', icon: Settings2 }
]

export function AppShell() {
  const { status, notice, error, clearMessages } = useAppStore()
  const { user, signOut } = useAuth()
  const [signingOut, setSigningOut] = useState(false)
  const [signOutError, setSignOutError] = useState('')
  const [dismissedStoreError, setDismissedStoreError] = useState('')
  const signOutInFlight = useRef(false)
  const visibleStoreError = error && error !== dismissedStoreError ? error : ''
  const visibleError = signOutError || visibleStoreError

  useEffect(() => {
    if (!error) setDismissedStoreError('')
  }, [error])

  async function exitAccount() {
    if (signOutInFlight.current) return

    signOutInFlight.current = true
    setSigningOut(true)
    setSignOutError('')
    const result = await signOut()
    if (result.ok) {
      clearMessages()
    } else {
      setSignOutError(result.error.message)
    }
    signOutInFlight.current = false
    setSigningOut(false)
  }

  function dismissError() {
    setSignOutError('')
    if (error) {
      setDismissedStoreError(error)
      clearMessages()
    }
  }

  return (
    <div className="app-frame">
      <a className="skip-link" href="#main-content">跳至主要内容</a>
      <header className="topbar">
        <Brand />
        <nav className="desktop-nav" aria-label="主导航">
          {navigation.map(({ to, label }) => (
            <NavLink key={to} to={to}>{label}</NavLink>
          ))}
        </nav>
        <div className="desktop-account" role="group" aria-label="桌面账号">
          <span className="local-badge">本机账号数据</span>
          {user && (
            <span
              className="account-email"
              aria-label={`当前账号：${user.email}`}
              title={user.email}
            >
              {user.email}
            </span>
          )}
          <button
            className="account-sign-out"
            type="button"
            disabled={signingOut}
            aria-busy={signingOut}
            onClick={exitAccount}
          >
            {signingOut ? '退出中…' : '退出账号'}
          </button>
        </div>
        <div className="mobile-account" role="group" aria-label="移动账号">
          <span className="local-badge">本机数据</span>
          <button
            className="account-sign-out-icon"
            type="button"
            disabled={signingOut}
            aria-busy={signingOut}
            aria-label={signingOut ? '正在退出账号' : '退出账号'}
            onClick={exitAccount}
          >
            <LogOut size={19} aria-hidden="true" />
          </button>
        </div>
      </header>
      {status === 'saving' && (
        <div
          className="shell-saving-status"
          role="status"
          aria-label="保存状态"
          aria-live="polite"
        >
          保存中…
        </div>
      )}
      {notice && (
        <div
          className="toast"
          role="status"
          aria-label="保存结果"
          aria-live="polite"
          onAnimationEnd={clearMessages}
        >
          {notice}
        </div>
      )}
      {visibleError && (
        <div className="shell-error-bar" role="alert">
          <span>{visibleError}</span>
          <button
            type="button"
            aria-label={signOutError ? '关闭退出失败提示' : '关闭未保存提示'}
            onClick={dismissError}
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>
      )}
      <main className="app-content" id="main-content" tabIndex={-1}>
        <Outlet />
      </main>
      <nav className="mobile-nav" aria-label="主导航">
        {navigation.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to}>
            <Icon size={19} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
