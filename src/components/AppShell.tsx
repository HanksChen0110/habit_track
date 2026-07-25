import { CalendarDays, ChartNoAxesCombined, ListChecks, Settings2 } from 'lucide-react'
import { NavLink, Outlet } from 'react-router-dom'
import { useAppStore } from '../app/AppStore'
import { Brand } from './Brand'

const navigation = [
  { to: '/today', label: '今天', icon: ListChecks },
  { to: '/week', label: '本周', icon: CalendarDays },
  { to: '/insights', label: '洞察', icon: ChartNoAxesCombined },
  { to: '/manage', label: '管理', icon: Settings2 }
]

export function AppShell() {
  const { notice, error, clearMessages } = useAppStore()
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
        <span className="local-badge">仅存于此设备</span>
      </header>
      {(notice || error) && (
        <div
          className={`toast ${error ? 'is-error' : ''}`}
          role="status"
          aria-live="polite"
          onAnimationEnd={clearMessages}
        >
          {error || notice}
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
