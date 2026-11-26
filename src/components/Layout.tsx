import { NavLink, Outlet } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { HashDoodle, SparkDoodle } from './Doodles'
import './Layout.css'

const links = [
  { to: '/', label: 'Início', end: true },
  { to: '/dieta', label: 'Dieta' },
  { to: '/registrar', label: 'Registrar' },
  { to: '/andamento', label: 'Andamento' },
  { to: '/metricas', label: 'Métricas' },
  { to: '/dashboard', label: 'Dashboard' },
]

export function Layout() {
  const { activeProfile, theme, toggleTheme, selectProfile } = useApp()

  return (
    <div className="app-shell layout">
      <header className="topbar glass">
        <div className="brand">
          <span className="brand-mark">AN</span>
          <div>
            <strong>NutriTrack</strong>
            <p>acompanhamento jovial</p>
          </div>
          <HashDoodle className="brand-hash" />
        </div>

        <nav className="nav">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) =>
                isActive ? 'nav-link active' : 'nav-link'
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="topbar-actions">
          <button type="button" className="btn btn-ghost" onClick={() => void toggleTheme()}>
            {theme === 'light' ? 'Dark' : 'Light'}
          </button>
          <button
            type="button"
            className="profile-chip"
            onClick={() => void selectProfile(null)}
            title="Trocar perfil"
          >
            <SparkDoodle className="profile-chip-icon" />
            <span>{activeProfile?.name ?? 'Perfil'}</span>
          </button>
        </div>
      </header>

      <main className="page">
        <Outlet />
      </main>
    </div>
  )
}
