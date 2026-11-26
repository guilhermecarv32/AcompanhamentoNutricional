import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { AppProvider, useApp } from './context/AppContext'
import { HomePage } from './pages/HomePage'
import { PlaceholderPage } from './pages/PlaceholderPage'
import { ProfilesPage } from './pages/ProfilesPage'

function ProtectedApp() {
  const { ready, activeProfile } = useApp()

  if (!ready) {
    return (
      <div className="app-shell boot-screen">
        <p className="display-title">NutriTrack</p>
        <p className="muted">abrindo seu espaço...</p>
      </div>
    )
  }

  if (!activeProfile) {
    return <ProfilesPage />
  }

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route
          path="dieta"
          element={
            <PlaceholderPage
              title="Dieta"
              description="Em breve: cadastro de refeições com horários, alimentos, quantidades e macros opcionais."
            />
          }
        />
        <Route
          path="registrar"
          element={
            <PlaceholderPage
              title="Registrar"
              description="Em breve: registrar o que você comeu com sugestão pela refeição mais próxima e associação editável."
            />
          }
        />
        <Route
          path="andamento"
          element={
            <PlaceholderPage
              title="Andamento"
              description="Em breve: comparação lado a lado do planejado x feito, com calendário e setas."
            />
          }
        />
        <Route
          path="metricas"
          element={
            <PlaceholderPage
              title="Métricas"
              description="Em breve: peso obrigatório e opcionais como % gordura, medidas, treino e sono."
            />
          }
        />
        <Route
          path="dashboard"
          element={
            <PlaceholderPage
              title="Dashboard"
              description="Em breve: gráficos interativos de aderência, calorias, peso, macros e mais."
            />
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
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
