import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowDoodle, SparkDoodle } from '../components/Doodles'
import { useApp } from '../context/AppContext'
import { getApi } from '../lib/api'
import {
  buildDayProgress,
  formatDayLabel,
  formatSignedKcal,
  shiftDay,
  type ProgressSlot,
} from '../lib/dayProgress'
import { localDayString } from '../lib/nearestMeal'
import { formatKcal } from '../lib/nutrition'
import type { DietMeal, MealLog } from '../vite-env'
import './ProgressPage.css'

function foodLine(
  foods: { name: string; quantity: number; unit: string }[],
  limit = 4,
) {
  const shown = foods.slice(0, limit)
  const extra = foods.length - shown.length
  return (
    <>
      {shown.map((food) => (
        <li key={`${food.name}-${food.quantity}`}>
          {food.name} · {food.quantity}
          {food.unit === 'g' ? 'g' : ' un'}
        </li>
      ))}
      {extra > 0 ? <li>+{extra} mais</li> : null}
    </>
  )
}

function statusLabel(slot: ProgressSlot) {
  if (slot.status === 'done') return 'registrada'
  if (slot.status === 'missed') return 'pendente'
  return 'extra'
}

function logTime(value: string) {
  if (value.includes('T')) return value.slice(11, 16)
  return value.slice(11, 16)
}

export function ProgressPage() {
  const api = useMemo(() => getApi(), [])
  const { activeProfile } = useApp()
  const [day, setDay] = useState(localDayString())
  const [dietMeals, setDietMeals] = useState<DietMeal[]>([])
  const [logs, setLogs] = useState<MealLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const progress = useMemo(
    () => buildDayProgress(dietMeals, logs),
    [dietMeals, logs],
  )

  useEffect(() => {
    let cancelled = false

    async function load() {
      if (!activeProfile) return
      setLoading(true)
      setError(null)
      try {
        const [meals, dayLogs] = await Promise.all([
          api.listDietMeals(activeProfile.id),
          api.listMealLogsByDay(activeProfile.id, day),
        ])
        if (cancelled) return
        setDietMeals(meals)
        setLogs(dayLogs)
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : 'Erro ao carregar o andamento.',
          )
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [activeProfile?.id, day, api])

  if (!loading && dietMeals.length === 0) {
    return (
      <div className="progress-page">
        <section className="glass progress-empty pop-in">
          <div className="stamp-label">sem dieta</div>
          <h1 className="display-title">Monte a dieta primeiro</h1>
          <p className="muted">
            O andamento compara cada refeição planejada com o que você registrou
            no dia.
          </p>
          <Link to="/dieta" className="btn btn-primary">
            Ir para Dieta
          </Link>
        </section>
      </div>
    )
  }

  return (
    <div className="progress-page">
      <header className="progress-hero pop-in">
        <div>
          <p className="eyebrow">andamento do dia</p>
          <h1 className="display-title">
            Planejado
            <br />x feito
          </h1>
          <p className="muted progress-day-label">{formatDayLabel(day)}</p>
        </div>

        <div className="progress-stats">
          <article className="glass stat-card">
            <SparkDoodle className="stat-spark" />
            <strong>{progress.adherencePct}%</strong>
            <span>aderência</span>
            <small>
              {progress.mealsDone}/{progress.mealsPlanned} refeições
            </small>
          </article>
          <article className="glass stat-card">
            <strong>{formatKcal(progress.actualCalories)}</strong>
            <span>feitas</span>
            <small>meta {formatKcal(progress.plannedCalories)}</small>
          </article>
          <article className="glass stat-card">
            <strong
              className={
                progress.deltaCalories > 0
                  ? 'delta-up'
                  : progress.deltaCalories < 0
                    ? 'delta-down'
                    : ''
              }
            >
              {formatSignedKcal(progress.deltaCalories)}
            </strong>
            <span>diferença</span>
            <small>real − planejado</small>
          </article>
        </div>
      </header>

      <div className="progress-toolbar">
        <div className="day-nav">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => setDay((prev) => shiftDay(prev, -1))}
          >
            ←
          </button>
          <input
            type="date"
            value={day}
            onChange={(e) => setDay(e.target.value)}
          />
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => setDay((prev) => shiftDay(prev, 1))}
          >
            →
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => setDay(localDayString())}
          >
            Hoje
          </button>
        </div>
        <Link to="/registrar" className="btn btn-primary">
          Registrar refeição
        </Link>
      </div>

      {error ? <p className="error-text">{error}</p> : null}

      <div className="compare-legend">
        <span>Dieta (posição/horário)</span>
        <ArrowDoodle className="legend-arrow" />
        <span>O que você fez</span>
      </div>

      <section className="compare-list">
        {progress.slots.map((slot, index) => (
          <article
            key={slot.key}
            className={`compare-row pop-in status-${slot.status}`}
            style={{ animationDelay: `${index * 45}ms` }}
          >
            <div className="glass compare-side planned">
              {slot.dietMeal ? (
                <>
                  <div className="side-top">
                    <span className="time-pill">
                      {slot.dietMeal.start_time} – {slot.dietMeal.end_time}
                    </span>
                    <span className={`status-pill ${slot.status}`}>
                      {statusLabel(slot)}
                    </span>
                  </div>
                  <h2>{slot.dietMeal.name}</h2>
                  <p className="kcal-line">{formatKcal(slot.plannedCalories)}</p>
                  <ul>{foodLine(slot.dietMeal.foods)}</ul>
                </>
              ) : (
                <>
                  <div className="side-top">
                    <span className="time-pill ghost">fora da dieta</span>
                    <span className={`status-pill ${slot.status}`}>extra</span>
                  </div>
                  <h2>Sem slot planejado</h2>
                  <p className="muted">Registros sem associação à dieta.</p>
                </>
              )}
            </div>

            <div className="compare-bridge" aria-hidden>
              <ArrowDoodle />
            </div>

            <div className="glass compare-side actual">
              {slot.logs.length === 0 ? (
                <div className="missed-block">
                  <h2>Ainda não registrada</h2>
                  <p className="muted">Nada associado a este horário neste dia.</p>
                  <Link
                    to="/registrar"
                    className="btn btn-ghost"
                  >
                    Registrar agora
                  </Link>
                </div>
              ) : (
                <div className="actual-stack">
                  {slot.logs.map((log) => (
                    <div key={log.id} className="actual-entry">
                      <div className="side-top">
                        <span className="time-pill soft">{logTime(log.logged_at)}</span>
                        <strong>{formatKcal(log.totals.calories)}</strong>
                      </div>
                      <ul>{foodLine(log.foods)}</ul>
                      {log.notes ? <p className="note">{log.notes}</p> : null}
                    </div>
                  ))}
                  {slot.logs.length > 1 ? (
                    <p className="stack-total">
                      Total do slot: {formatKcal(slot.actualCalories)}
                    </p>
                  ) : null}
                </div>
              )}
            </div>
          </article>
        ))}

        {!loading && progress.slots.length === 0 ? (
          <div className="glass progress-empty pop-in">
            <h2>Nada para comparar neste dia</h2>
            <p className="muted">Cadastre a dieta e registre as refeições.</p>
          </div>
        ) : null}
      </section>
    </div>
  )
}
