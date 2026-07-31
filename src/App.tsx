import { useEffect, useRef, useState, type FormEvent } from 'react'
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppStoreProvider, useAppStore } from './app/AppStore'
import { AuthProvider, useAuth } from './auth/AuthContext'
import { AppShell } from './components/AppShell'
import { Brand } from './components/Brand'
import { InsightsPage } from './pages/InsightsPage'
import { ManagePage } from './pages/ManagePage'
import { OnboardingPage } from './pages/OnboardingPage'
import { TodayPage } from './pages/TodayPage'
import { WeekPage } from './pages/WeekPage'
import './styles.css'

function AccountEntry() {
  const auth = useAuth()
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [hideAuthError, setHideAuthError] = useState(false)
  const emailRef = useRef<HTMLInputElement>(null)
  const isSignIn = mode === 'sign-in'
  const title = isSignIn ? '登录循迹' : '创建账号'
  const visibleError = submitError || (!hideAuthError ? auth.error?.message ?? '' : '')

  useEffect(() => {
    setHideAuthError(false)
  }, [auth.error])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return

    setBusy(true)
    setSubmitError('')
    setHideAuthError(true)
    const result = isSignIn
      ? await auth.signIn(email.trim(), password)
      : await auth.signUp(email.trim(), password)
    if (!result.ok) setSubmitError(result.error.message)
    setBusy(false)
  }

  function switchMode() {
    setMode(isSignIn ? 'sign-up' : 'sign-in')
    setPassword('')
    setSubmitError('')
    setHideAuthError(true)
    emailRef.current?.focus()
  }

  return (
    <main className="account-page">
      <div className="onboarding-pattern" aria-hidden="true" />
      <section className="account-panel" aria-labelledby="account-title">
        <Brand />
        <div className="account-copy">
          <p className="eyebrow">账号数据</p>
          <h1 id="account-title">{title}</h1>
          <p>在这台电脑的不同浏览器中继续记录。</p>
        </div>
        <form className="account-form" onSubmit={(event) => void submit(event)}>
          <label htmlFor="account-email">邮箱</label>
          <input
            ref={emailRef}
            id="account-email"
            name="email"
            type="email"
            value={email}
            autoComplete="email"
            required
            disabled={busy}
            aria-describedby={visibleError ? 'account-error' : undefined}
            onChange={(event) => setEmail(event.target.value)}
          />
          <label htmlFor="account-password">密码</label>
          <input
            id="account-password"
            name="password"
            type="password"
            value={password}
            autoComplete={isSignIn ? 'current-password' : 'new-password'}
            required
            disabled={busy}
            aria-describedby={visibleError ? 'account-error' : undefined}
            onChange={(event) => setPassword(event.target.value)}
          />
          <button className="account-primary-button" type="submit" disabled={busy}>
            {busy ? (isSignIn ? '登录中…' : '创建中…') : title}
          </button>
        </form>
        <p className="account-switch">
          {isSignIn ? '没有账号？' : '已有账号？'}
          <button type="button" disabled={busy} onClick={switchMode}>
            {isSignIn ? '创建账号' : '登录'}
          </button>
        </p>
        {visibleError ? (
          <p id="account-error" className="account-error" role="alert">
            {visibleError}
          </p>
        ) : null}
        <p className="account-boundary">记录保存在当前账号的本机数据库</p>
      </section>
    </main>
  )
}

function BlockingStatus({ title, detail }: { title: string; detail: string }) {
  return (
    <main className="account-page">
      <div className="onboarding-pattern" aria-hidden="true" />
      <section className="account-panel account-status" role="status" aria-live="polite">
        <Brand />
        <div className="account-copy">
          <p className="eyebrow">账号数据</p>
          <h1>{title}</h1>
          <p>{detail}</p>
        </div>
      </section>
    </main>
  )
}

function InitialReadError() {
  const { error, reload } = useAppStore()
  const { signOut } = useAuth()
  const [action, setAction] = useState<'reload' | 'sign-out' | null>(null)

  async function retry() {
    setAction('reload')
    await reload()
    setAction(null)
  }

  async function exitAccount() {
    setAction('sign-out')
    await signOut()
    setAction(null)
  }

  return (
    <main className="account-page">
      <div className="onboarding-pattern" aria-hidden="true" />
      <section className="account-panel" aria-labelledby="read-error-title">
        <Brand />
        <div className="account-copy">
          <p className="eyebrow">账号数据</p>
          <h1 id="read-error-title">暂时无法读取账号数据</h1>
          <p>账号仍然保持登录，原数据没有被覆盖。</p>
        </div>
        <p className="account-error" role="alert">{error}</p>
        <div className="account-error-actions">
          <button
            className="account-primary-button"
            type="button"
            disabled={action !== null}
            onClick={() => void retry()}
          >
            {action === 'reload' ? '读取中…' : '重新读取'}
          </button>
          <button
            className="account-secondary-button"
            type="button"
            disabled={action !== null}
            onClick={() => void exitAccount()}
          >
            {action === 'sign-out' ? '退出中…' : '退出账号'}
          </button>
        </div>
      </section>
    </main>
  )
}

function AppRoutes() {
  const auth = useAuth()
  const { status, store } = useAppStore()

  if (auth.status === 'booting') {
    return <BlockingStatus title="正在恢复账号……" detail="恢复完成后会继续读取账号数据" />
  }

  if (auth.status === 'signed_out' || auth.status === 'error') {
    return <AccountEntry />
  }

  if (status === 'idle' || status === 'loading') {
    return <BlockingStatus title="正在读取账号数据……" detail="读取完成后会进入今天页面" />
  }

  if (!store && status === 'error') {
    return <InitialReadError />
  }

  if (!store) {
    return <OnboardingPage />
  }

  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/today" element={<TodayPage />} />
        <Route path="/week" element={<WeekPage />} />
        <Route path="/insights" element={<InsightsPage />} />
        <Route path="/manage" element={<ManagePage />} />
        <Route path="*" element={<Navigate to="/today" replace />} />
      </Route>
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppStoreProvider>
        <HashRouter>
          <AppRoutes />
        </HashRouter>
      </AppStoreProvider>
    </AuthProvider>
  )
}
