import { useEffect, useState } from 'react'
import { getApi } from '../lib/api'
import './WindowControls.css'

export function WindowControls() {
  const api = getApi()
  const [maximized, setMaximized] = useState(false)
  const hasWindowApi = typeof window !== 'undefined' && Boolean(window.api)

  useEffect(() => {
    if (!hasWindowApi) return
    void api.isWindowMaximized?.().then(setMaximized)
  }, [api, hasWindowApi])

  if (!hasWindowApi) return null

  return (
    <div className="window-chrome">
      <div className="window-drag" />
      <div className="window-controls">
        <button
          type="button"
          className="win-btn"
          aria-label="Minimizar"
          onClick={() => void api.minimizeWindow?.()}
        >
          <span className="win-icon win-min" />
        </button>
        <button
          type="button"
          className="win-btn"
          aria-label={maximized ? 'Restaurar' : 'Maximizar'}
          onClick={() => {
            void api.maximizeToggle?.().then((next) => {
              if (typeof next === 'boolean') setMaximized(next)
            })
          }}
        >
          <span className={`win-icon ${maximized ? 'win-restore' : 'win-max'}`} />
        </button>
        <button
          type="button"
          className="win-btn win-close"
          aria-label="Fechar"
          onClick={() => void api.closeWindow?.()}
        >
          <span className="win-icon win-x" />
        </button>
      </div>
    </div>
  )
}
