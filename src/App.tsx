import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppStoreProvider, useAppStore } from './app/AppStore'
import { AppShell } from './components/AppShell'
import { InsightsPage } from './pages/InsightsPage'
import { ManagePage } from './pages/ManagePage'
import { OnboardingPage } from './pages/OnboardingPage'
import { RecoveryPage } from './pages/RecoveryPage'
import { TodayPage } from './pages/TodayPage'
import { WeekPage } from './pages/WeekPage'
import './styles.css'

function AppRoutes() {
  const { store, error } = useAppStore()
  if (!store) {
    return (
      <Routes>
        <Route path="*" element={error ? <RecoveryPage /> : <OnboardingPage />} />
      </Routes>
    )
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
    <HashRouter>
      <AppStoreProvider>
        <AppRoutes />
      </AppStoreProvider>
    </HashRouter>
  )
}
