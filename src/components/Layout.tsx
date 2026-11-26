import { NavLink, Outlet } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { HashDoodle, SparkDoodle } from './Doodles'
import './Layout.css'

const links = [
  { to: '/', label: 'Início', end: true, requiresSetup: false },
  { to: '/dieta', label: 'Dieta', requiresSetup: false },
  { to: '/metricas', label: 'Métricas', requiresSetup: false },
  { to: '/registrar', label: 'Registrar', requiresSetup: true },
  { to: '/andamento', label: 'Andamento', requiresSetup: true },
  { to: '/dashboard', label: 'Dashboard', requiresSetup: true },
]

export function Layout() {
  const { activeProfile, theme, toggleTheme, selectProfile, setup } = useApp()

  return (
    <div className="app-shell layout">
      <header className="topbar glass">
        <div className="brand">
          <span className="brand-mark">AN</span>
          <div>
            <strong>NutriTrack</strong>
            <p>
              {setup.complete
                ? 'acompanhamento jovial'
                : 'configure dieta + peso'}
            </p>
          </div>
          <HashDoodle className="brand-hash" />
        </div>

        <nav className="nav">
          {links.map((link) => {
            const locked = link.requiresSetup && !setup.complete
            return (
              <NavLink
                key={link.to}
                to={locked ? '/' : link.to}
                end={link.end}
                title={
                  locked
                    ? 'Cadastre dieta e peso para liberar'
                    : undefined
                }
                className={({ isActive }) =>
                  [
                    'nav-link',
                    isActive && !locked ? 'active' : '',
                    locked ? 'locked' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')
                }
              >
                {link.label}
              </NavLink>
            )
          })}
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
