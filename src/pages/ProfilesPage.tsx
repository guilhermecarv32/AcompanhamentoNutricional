import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowDoodle, HashDoodle, StampDoodle } from '../components/Doodles'
import { useApp } from '../context/AppContext'
import './ProfilesPage.css'

export function ProfilesPage() {
  const navigate = useNavigate()
  const { profiles, createProfile, selectProfile, deleteProfile, theme, toggleTheme } =
    useApp()
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function onCreate(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setBusy(true)
    try {
      await createProfile(name)
      setName('')
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível criar o perfil.')
    } finally {
      setBusy(false)
    }
  }

  async function onSelect(id: number) {
    const profile = profiles.find((p) => p.id === id)
    if (!profile) return
    await selectProfile(profile)
    navigate('/')
  }

  return (
    <div className="app-shell profiles-page">
      <div className="profiles-decor" aria-hidden>
        <HashDoodle className="doodle doodle-hash floaty" />
        <ArrowDoodle className="doodle doodle-arrow" />
        <StampDoodle className="doodle doodle-stamp" />
      </div>

      <header className="profiles-top">
        <div className="logo-bubble">NutriTrack</div>
        <button type="button" className="btn btn-ghost" onClick={() => void toggleTheme()}>
          {theme === 'light' ? 'Modo dark' : 'Modo claro'}
        </button>
      </header>

      <section className="profiles-hero pop-in">
        <p className="eyebrow">escolha quem está no prato hoje</p>
        <h1 className="display-title">
          Seus
          <br />
          perfis
        </h1>
        <p className="muted hero-copy">
          Sem senha por enquanto. Cada perfil guarda dieta, peso e o dia a dia
          separado.
        </p>
      </section>

      <section className="profiles-grid">
        <form className="glass create-card pop-in" onSubmit={(e) => void onCreate(e)}>
          <div className="stamp-label">novo perfil</div>
          <div className="field">
            <label htmlFor="profile-name">Nome</label>
            <input
              id="profile-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex.: Ana, Casa, Cutting..."
              autoFocus
              maxLength={40}
            />
          </div>
          {error ? <p className="error-text">{error}</p> : null}
          <button className="btn btn-primary" type="submit" disabled={busy || !name.trim()}>
            {busy ? 'Criando...' : 'Criar perfil'}
          </button>
        </form>

        <div className="profile-list">
          {profiles.length === 0 ? (
            <div className="glass empty-card pop-in">
              <h2>Ninguém por aqui ainda</h2>
              <p className="muted">Crie o primeiro perfil para começar a dieta.</p>
            </div>
          ) : (
            profiles.map((profile, index) => (
              <article
                key={profile.id}
                className="glass profile-card pop-in"
                style={{ animationDelay: `${index * 60}ms` }}
              >
                <button
                  type="button"
                  className="profile-main"
                  onClick={() => void onSelect(profile.id)}
                >
                  <span className="avatar">{profile.name.slice(0, 1).toUpperCase()}</span>
                  <span>
                    <strong>{profile.name}</strong>
                    <small>Entrar sem senha</small>
                  </span>
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={() => void deleteProfile(profile.id)}
                >
                  Excluir
                </button>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  )
}
