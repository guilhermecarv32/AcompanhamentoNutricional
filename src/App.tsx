import type { ReactNode } from 'react'
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { WindowControls } from './components/WindowControls'
import { AppProvider, useApp } from './context/AppContext'
import { DashboardPage } from './pages/DashboardPage'
import { DietPage } from './pages/DietPage'
import { HomePage } from './pages/HomePage'
import { MetricsPage } from './pages/MetricsPage'
import { ProfilesPage } from './pages/ProfilesPage'
import { ProgressPage } from './pages/ProgressPage'
import { RegisterPage } from './pages/RegisterPage'
import { SetupPage } from './pages/SetupPage'

function RequireSetup({ children }: { children: ReactNode }) {
  const { setup } = useApp()

  if (setup.loading) {
    return (
      <div className="app-shell boot-screen">
        <p className="muted">checando dieta e peso...</p>
      </div>
    )
  }

  if (!setup.complete) {
    return <Navigate to="/" replace />
  }

  return children
}

function HomeEntry() {
  const { setup } = useApp()

  if (setup.loading) {
    return (
      <div className="app-shell boot-screen">
        <p className="muted">checando dieta e peso...</p>
      </div>
    )
  }

  if (!setup.complete) return <SetupPage />
  return <HomePage />
}

function ProtectedApp() {
  const { ready, activeProfile } = useApp()

  if (!ready) {
    return (
      <div className="app-frame">
        <WindowControls />
        <div className="app-shell boot-screen">
          <p className="display-title">NutriTrack</p>
          <p className="muted">abrindo seu espaço...</p>
        </div>
      </div>
    )
  }

  if (!activeProfile) {
    return (
      <div className="app-frame">
        <WindowControls />
        <ProfilesPage />
      </div>
    )
  }

  return (
    <div className="app-frame">
      <WindowControls />
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<HomeEntry />} />
          <Route path="dieta" element={<DietPage />} />
          <Route path="metricas" element={<MetricsPage />} />
          <Route
            path="registrar"
            element={
              <RequireSetup>
                <RegisterPage />
              </RequireSetup>
            }
          />
          <Route
            path="andamento"
            element={
              <RequireSetup>
                <ProgressPage />
              </RequireSetup>
            }
          />
          <Route
            path="dashboard"
            element={
              <RequireSetup>
                <DashboardPage />
              </RequireSetup>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </div>
  )
}

export default function App() {
  return (
    <AppProvider>
      <HashRouter>
        <ProtectedApp />
      </HashRouter>
    </AppProvider>
  )
}
