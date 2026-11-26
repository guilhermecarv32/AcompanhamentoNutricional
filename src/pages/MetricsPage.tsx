import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { ArrowDoodle, SparkDoodle } from '../components/Doodles'
import { useApp } from '../context/AppContext'
import { getApi } from '../lib/api'
import { localDateTimeValue, localDayString } from '../lib/nearestMeal'
import type {
  BodyMetrics,
  MetricsSummary,
  SleepLog,
  WeightLog,
  WorkoutLog,
} from '../vite-env'
import './MetricsPage.css'

type Tab = 'peso' | 'medidas' | 'treino' | 'sono'

function optionalNumber(value: string): number | null {
  if (value.trim() === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

function formatWhen(value: string) {
  if (value.includes('T')) {
    const [day, time] = value.split('T')
    return `${day.split('-').reverse().join('/')} ${time.slice(0, 5)}`
  }
  return value.split('-').reverse().join('/')
}

export function MetricsPage() {
  const api = useMemo(() => getApi(), [])
  const { activeProfile, refreshSetup } = useApp()
  const [tab, setTab] = useState<Tab>('peso')
  const [summary, setSummary] = useState<MetricsSummary | null>(null)
  const [weights, setWeights] = useState<WeightLog[]>([])
  const [bodies, setBodies] = useState<BodyMetrics[]>([])
  const [workouts, setWorkouts] = useState<WorkoutLog[]>([])
  const [sleepLogs, setSleepLogs] = useState<SleepLog[]>([])
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const [weightKg, setWeightKg] = useState('')
  const [weightAt, setWeightAt] = useState(localDateTimeValue())
  const [weightNotes, setWeightNotes] = useState('')
  const [editingWeightId, setEditingWeightId] = useState<number | null>(null)

  const [bodyAt, setBodyAt] = useState(localDateTimeValue())
  const [bodyFat, setBodyFat] = useState('')
  const [heightCm, setHeightCm] = useState('')
  const [waist, setWaist] = useState('')
  const [hip, setHip] = useState('')
  const [arm, setArm] = useState('')
  const [chest, setChest] = useState('')
  const [bodyNotes, setBodyNotes] = useState('')

  const [workoutDay, setWorkoutDay] = useState(localDayString())
  const [workoutDone, setWorkoutDone] = useState(true)
  const [workoutActivity, setWorkoutActivity] = useState('')
  const [workoutDuration, setWorkoutDuration] = useState('')
  const [workoutNotes, setWorkoutNotes] = useState('')

  const [sleepDay, setSleepDay] = useState(localDayString())
  const [sleepHours, setSleepHours] = useState('7.5')
  const [sleepQuality, setSleepQuality] = useState('3')
  const [sleepNotes, setSleepNotes] = useState('')

  async function refresh() {
    if (!activeProfile) return
    setError(null)
    const [sum, w, b, wo, s] = await Promise.all([
      api.getMetricsSummary(activeProfile.id),
      api.listWeights(activeProfile.id, 30),
      api.listBodyMetrics(activeProfile.id, 20),
      api.listWorkouts(activeProfile.id, 20),
      api.listSleep(activeProfile.id, 20),
    ])
    setSummary(sum)
    setWeights(w)
    setBodies(b)
    setWorkouts(wo)
    setSleepLogs(s)
    if (sum.latestHeightCm && !heightCm) {
      setHeightCm(String(sum.latestHeightCm))
    }
    await refreshSetup()
  }

  useEffect(() => {
    void refresh().catch((err) => {
      setError(err instanceof Error ? err.message : 'Erro ao carregar métricas.')
    })
  }, [activeProfile?.id])

  async function onSaveWeight(event: FormEvent) {
    event.preventDefault()
    if (!activeProfile) return
    setSaving(true)
    setError(null)
    try {
      const payload = {
        weight_kg: Number(weightKg),
        logged_at: weightAt,
        notes: weightNotes.trim() || null,
      }
      if (editingWeightId) {
        await api.updateWeight(editingWeightId, payload)
      } else {
        await api.createWeight(activeProfile.id, payload)
      }
      setWeightKg('')
      setWeightNotes('')
      setWeightAt(localDateTimeValue())
      setEditingWeightId(null)
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível salvar o peso.')
    } finally {
      setSaving(false)
    }
  }

  async function onSaveBody(event: FormEvent) {
    event.preventDefault()
    if (!activeProfile) return
    setSaving(true)
    setError(null)
    try {
      await api.createBodyMetrics(activeProfile.id, {
        logged_at: bodyAt,
        body_fat_pct: optionalNumber(bodyFat),
        height_cm: optionalNumber(heightCm),
        waist_cm: optionalNumber(waist),
        hip_cm: optionalNumber(hip),
        arm_cm: optionalNumber(arm),
        chest_cm: optionalNumber(chest),
        notes: bodyNotes.trim() || null,
      })
      setBodyFat('')
      setWaist('')
      setHip('')
      setArm('')
      setChest('')
      setBodyNotes('')
      setBodyAt(localDateTimeValue())
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível salvar as medidas.')
    } finally {
      setSaving(false)
    }
  }

  async function onSaveWorkout(event: FormEvent) {
    event.preventDefault()
    if (!activeProfile) return
    setSaving(true)
    setError(null)
    try {
      await api.createWorkout(activeProfile.id, {
        day: workoutDay,
        done: workoutDone,
        activity: workoutActivity.trim() || null,
        duration_min: optionalNumber(workoutDuration),
        notes: workoutNotes.trim() || null,
      })
      setWorkoutActivity('')
      setWorkoutDuration('')
      setWorkoutNotes('')
      setWorkoutDone(true)
      setWorkoutDay(localDayString())
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível salvar o treino.')
    } finally {
      setSaving(false)
    }
  }

  async function onSaveSleep(event: FormEvent) {
    event.preventDefault()
    if (!activeProfile) return
    setSaving(true)
    setError(null)
    try {
      await api.createSleep(activeProfile.id, {
        day: sleepDay,
        hours: Number(sleepHours),
        quality: optionalNumber(sleepQuality),
        notes: sleepNotes.trim() || null,
      })
      setSleepNotes('')
      setSleepDay(localDayString())
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível salvar o sono.')
    } finally {
      setSaving(false)
    }
  }

  function startEditWeight(row: WeightLog) {
    setEditingWeightId(row.id)
    setWeightKg(String(row.weight_kg))
    setWeightAt(row.logged_at.length >= 16 ? row.logged_at.slice(0, 16) : row.logged_at)
    setWeightNotes(row.notes ?? '')
    setTab('peso')
  }

  return (
    <div className="metrics-page">
      <header className="metrics-hero pop-in">
        <div>
          <p className="eyebrow">acompanhamento corporal</p>
          <h1 className="display-title">
            Métricas
            <br />e rotina
          </h1>
          <p className="muted">
            Peso é o núcleo. % gordura, medidas, treino e sono entram quando você
            quiser.
          </p>
        </div>
        <div className="metrics-summary">
          <article className="glass summary-card">
            <SparkDoodle className="summary-spark" />
            <strong>
              {summary?.latestWeight
                ? `${summary.latestWeight.weight_kg} kg`
                : '—'}
            </strong>
            <span>peso atual</span>
          </article>
          <article className="glass summary-card">
            <strong>{summary?.bmi != null ? summary.bmi : '—'}</strong>
            <span>IMC</span>
            <small>usa altura cadastrada</small>
          </article>
          <article className="glass summary-card">
            <strong>
              {summary?.latestBody?.body_fat_pct != null
                ? `${summary.latestBody.body_fat_pct}%`
                : '—'}
            </strong>
            <span>% gordura</span>
          </article>
        </div>
      </header>

      <div className="metrics-tabs">
        {(
          [
            ['peso', 'Peso'],
            ['medidas', 'Medidas'],
            ['treino', 'Treino'],
            ['sono', 'Sono'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={tab === id ? 'tab active' : 'tab'}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {error ? <p className="error-text">{error}</p> : null}

      {tab === 'peso' ? (
        <div className="metrics-layout pop-in">
          <form className="glass metrics-form" onSubmit={(e) => void onSaveWeight(e)}>
            <div className="stamp-label">
              {editingWeightId ? 'editar peso' : 'atualizar peso'}
            </div>
            <div className="form-grid">
              <div className="field">
                <label htmlFor="weight">Peso (kg)</label>
                <input
                  id="weight"
                  type="number"
                  min="1"
                  step="0.1"
                  value={weightKg}
                  onChange={(e) => setWeightKg(e.target.value)}
                  required
                  placeholder="Ex.: 78.4"
                />
              </div>
              <div className="field">
                <label htmlFor="weight-at">Quando</label>
                <input
                  id="weight-at"
                  type="datetime-local"
                  value={weightAt}
                  onChange={(e) => setWeightAt(e.target.value)}
                  required
                />
              </div>
              <div className="field field-span">
                <label htmlFor="weight-notes">Notas</label>
                <input
                  id="weight-notes"
                  value={weightNotes}
                  onChange={(e) => setWeightNotes(e.target.value)}
                  placeholder="Opcional"
                />
              </div>
            </div>
            <div className="form-actions">
              {editingWeightId ? (
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => {
                    setEditingWeightId(null)
                    setWeightKg('')
                    setWeightNotes('')
                    setWeightAt(localDateTimeValue())
                  }}
                >
                  Cancelar edição
                </button>
              ) : (
                <span />
              )}
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Salvando...' : editingWeightId ? 'Salvar alteração' : 'Salvar peso'}
              </button>
            </div>
          </form>

          <section className="glass history-panel">
            <h2>Histórico de peso</h2>
            {weights.length === 0 ? (
              <p className="muted">Ainda sem registros. Cadastre o primeiro peso.</p>
            ) : (
              <ul className="history-list">
                {weights.map((row) => (
                  <li key={row.id}>
                    <div>
                      <strong>{row.weight_kg} kg</strong>
                      <small>{formatWhen(row.logged_at)}</small>
                      {row.notes ? <span>{row.notes}</span> : null}
                    </div>
                    <div className="row-actions">
                      <button type="button" className="linkish" onClick={() => startEditWeight(row)}>
                        Editar
                      </button>
                      <button
                        type="button"
                        className="linkish danger"
                        onClick={() =>
                          void api.deleteWeight(row.id).then(() => refresh())
                        }
                      >
                        Excluir
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      ) : null}

      {tab === 'medidas' ? (
        <div className="metrics-layout pop-in">
          <form className="glass metrics-form" onSubmit={(e) => void onSaveBody(e)}>
            <div className="stamp-label">medidas opcionais</div>
            <p className="muted form-hint">
              Preencha só o que quiser. A altura ajuda a calcular o IMC.
            </p>
            <div className="form-grid three">
              <div className="field field-span">
                <label htmlFor="body-at">Quando</label>
                <input
                  id="body-at"
                  type="datetime-local"
                  value={bodyAt}
                  onChange={(e) => setBodyAt(e.target.value)}
                  required
                />
              </div>
              <div className="field">
                <label>Altura (cm)</label>
                <input type="number" min="50" step="0.1" value={heightCm} onChange={(e) => setHeightCm(e.target.value)} />
              </div>
              <div className="field">
                <label>% gordura</label>
                <input type="number" min="0" max="70" step="0.1" value={bodyFat} onChange={(e) => setBodyFat(e.target.value)} />
              </div>
              <div className="field">
                <label>Cintura (cm)</label>
                <input type="number" min="0" step="0.1" value={waist} onChange={(e) => setWaist(e.target.value)} />
              </div>
              <div className="field">
                <label>Quadril (cm)</label>
                <input type="number" min="0" step="0.1" value={hip} onChange={(e) => setHip(e.target.value)} />
              </div>
              <div className="field">
                <label>Braço (cm)</label>
                <input type="number" min="0" step="0.1" value={arm} onChange={(e) => setArm(e.target.value)} />
              </div>
              <div className="field">
                <label>Peito (cm)</label>
                <input type="number" min="0" step="0.1" value={chest} onChange={(e) => setChest(e.target.value)} />
              </div>
              <div className="field field-span">
                <label>Notas</label>
                <input value={bodyNotes} onChange={(e) => setBodyNotes(e.target.value)} />
              </div>
            </div>
            <div className="form-actions">
              <span />
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Salvando...' : 'Salvar medidas'}
              </button>
            </div>
          </form>

          <section className="glass history-panel">
            <h2>Últimas medidas</h2>
            {bodies.length === 0 ? (
              <p className="muted">Nenhuma medida ainda.</p>
            ) : (
              <ul className="history-list">
                {bodies.map((row) => (
                  <li key={row.id}>
                    <div>
                      <strong>{formatWhen(row.logged_at)}</strong>
                      <small>
                        {[
                          row.height_cm != null ? `Alt ${row.height_cm}cm` : null,
                          row.body_fat_pct != null ? `${row.body_fat_pct}% gord.` : null,
                          row.waist_cm != null ? `Cin ${row.waist_cm}` : null,
                          row.hip_cm != null ? `Quad ${row.hip_cm}` : null,
                          row.arm_cm != null ? `Braço ${row.arm_cm}` : null,
                          row.chest_cm != null ? `Peito ${row.chest_cm}` : null,
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </small>
                    </div>
                    <button
                      type="button"
                      className="linkish danger"
                      onClick={() =>
                        void api.deleteBodyMetrics(row.id).then(() => refresh())
                      }
                    >
                      Excluir
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      ) : null}

      {tab === 'treino' ? (
        <div className="metrics-layout pop-in">
          <form className="glass metrics-form" onSubmit={(e) => void onSaveWorkout(e)}>
            <div className="stamp-label">treino do dia</div>
            <div className="form-grid">
              <div className="field">
                <label>Dia</label>
                <input type="date" value={workoutDay} onChange={(e) => setWorkoutDay(e.target.value)} required />
              </div>
              <div className="field">
                <label>Treinei?</label>
                <select
                  value={workoutDone ? '1' : '0'}
                  onChange={(e) => setWorkoutDone(e.target.value === '1')}
                >
                  <option value="1">Sim</option>
                  <option value="0">Não</option>
                </select>
              </div>
              <div className="field field-span">
                <label>Atividade</label>
                <input
                  value={workoutActivity}
                  onChange={(e) => setWorkoutActivity(e.target.value)}
                  placeholder="Ex.: academia, corrida..."
                />
              </div>
              <div className="field">
                <label>Duração (min)</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={workoutDuration}
                  onChange={(e) => setWorkoutDuration(e.target.value)}
                />
              </div>
              <div className="field">
                <label>Notas</label>
                <input value={workoutNotes} onChange={(e) => setWorkoutNotes(e.target.value)} />
              </div>
            </div>
            <div className="form-actions">
              <span />
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Salvando...' : 'Salvar treino'}
              </button>
            </div>
          </form>

          <section className="glass history-panel">
            <h2>Histórico de treino</h2>
            {workouts.length === 0 ? (
              <p className="muted">Nenhum treino registrado.</p>
            ) : (
              <ul className="history-list">
                {workouts.map((row) => (
                  <li key={row.id}>
                    <div>
                      <strong>
                        {row.day.split('-').reverse().join('/')} ·{' '}
                        {row.done ? 'Treinei' : 'Folga'}
                      </strong>
                      <small>
                        {[
                          row.activity,
                          row.duration_min != null ? `${row.duration_min} min` : null,
                          row.notes,
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </small>
                    </div>
                    <button
                      type="button"
                      className="linkish danger"
                      onClick={() =>
                        void api.deleteWorkout(row.id).then(() => refresh())
                      }
                    >
                      Excluir
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      ) : null}

      {tab === 'sono' ? (
        <div className="metrics-layout pop-in">
          <form className="glass metrics-form" onSubmit={(e) => void onSaveSleep(e)}>
            <div className="stamp-label">sono</div>
            <div className="form-grid">
              <div className="field">
                <label>Dia</label>
                <input type="date" value={sleepDay} onChange={(e) => setSleepDay(e.target.value)} required />
              </div>
              <div className="field">
                <label>Horas</label>
                <input
                  type="number"
                  min="0"
                  max="24"
                  step="0.1"
                  value={sleepHours}
                  onChange={(e) => setSleepHours(e.target.value)}
                  required
                />
              </div>
              <div className="field">
                <label>Qualidade (1–5)</label>
                <select value={sleepQuality} onChange={(e) => setSleepQuality(e.target.value)}>
                  <option value="">—</option>
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                  <option value="4">4</option>
                  <option value="5">5</option>
                </select>
              </div>
              <div className="field">
                <label>Notas</label>
                <input value={sleepNotes} onChange={(e) => setSleepNotes(e.target.value)} />
              </div>
            </div>
            <div className="form-actions">
              <ArrowDoodle className="form-arrow" />
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Salvando...' : 'Salvar sono'}
              </button>
            </div>
          </form>

          <section className="glass history-panel">
            <h2>Histórico de sono</h2>
            {sleepLogs.length === 0 ? (
              <p className="muted">Nenhum registro de sono.</p>
            ) : (
              <ul className="history-list">
                {sleepLogs.map((row) => (
                  <li key={row.id}>
                    <div>
                      <strong>
                        {row.day.split('-').reverse().join('/')} · {row.hours}h
                      </strong>
                      <small>
                        {[
                          row.quality != null ? `qualidade ${row.quality}/5` : null,
                          row.notes,
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </small>
                    </div>
                    <button
                      type="button"
                      className="linkish danger"
                      onClick={() =>
                        void api.deleteSleep(row.id).then(() => refresh())
                      }
                    >
                      Excluir
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      ) : null}
    </div>
  )
}
