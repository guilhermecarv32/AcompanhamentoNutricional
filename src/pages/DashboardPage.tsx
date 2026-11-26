import { useEffect, useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { ArrowDoodle, SparkDoodle } from '../components/Doodles'
import { useApp } from '../context/AppContext'
import { getApi } from '../lib/api'
import {
  buildDashboard,
  rangeFromToday,
  type DashboardRange,
} from '../lib/dashboardAnalytics'
import { localDayString } from '../lib/nearestMeal'
import { formatKcal, formatMacro } from '../lib/nutrition'
import './DashboardPage.css'

const tooltipStyle = {
  background: 'rgba(20, 8, 5, 0.92)',
  border: '1px solid rgba(253,253,255,0.2)',
  borderRadius: 12,
  color: '#fdfdff',
}

export function DashboardPage() {
  const api = useMemo(() => getApi(), [])
  const { activeProfile } = useApp()
  const [range, setRange] = useState<DashboardRange>(7)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [model, setModel] = useState<ReturnType<typeof buildDashboard> | null>(
    null,
  )

  useEffect(() => {
    let cancelled = false

    async function load() {
      if (!activeProfile) return
      setLoading(true)
      setError(null)
      try {
        const today = localDayString()
        const { fromDay, toDay } = rangeFromToday(today, range)
        const [dietMeals, logs, weights, bodies, workouts, sleep] =
          await Promise.all([
            api.listDietMeals(activeProfile.id),
            api.listMealLogsByRange(activeProfile.id, fromDay, toDay),
            api.listWeights(activeProfile.id, 90),
            api.listBodyMetrics(activeProfile.id, 90),
            api.listWorkouts(activeProfile.id, 90),
            api.listSleep(activeProfile.id, 90),
          ])

        if (cancelled) return
        setModel(
          buildDashboard({
            today,
            rangeDays: range,
            dietMeals,
            logs,
            weights,
            bodies,
            workouts,
            sleep,
          }),
        )
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : 'Erro ao montar o dashboard.',
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
  }, [activeProfile?.id, range, api])

  const macroChart = useMemo(() => {
    if (!model) return []
    return [
      {
        name: 'Proteína',
        planejado: Math.round(model.macrosPlanned.protein),
        real: Math.round(model.macrosActual.protein),
      },
      {
        name: 'Carbo',
        planejado: Math.round(model.macrosPlanned.carbs),
        real: Math.round(model.macrosActual.carbs),
      },
      {
        name: 'Gordura',
        planejado: Math.round(model.macrosPlanned.fat),
        real: Math.round(model.macrosActual.fat),
      },
    ]
  }, [model])

  return (
    <div className="dashboard-page">
      <header className="dashboard-hero pop-in">
        <div>
          <p className="eyebrow">visão analítica</p>
          <h1 className="display-title">
            Dashboard
            <br />
            Nutricional
          </h1>
          <p className="muted">
            Gráficos dinâmicos do que importa: aderência, calorias, peso e
            rotina.
          </p>
        </div>
        <div className="range-switch glass">
          <span>Período</span>
          <div>
            <button
              type="button"
              className={range === 7 ? 'active' : ''}
              onClick={() => setRange(7)}
            >
              7 dias
            </button>
            <button
              type="button"
              className={range === 30 ? 'active' : ''}
              onClick={() => setRange(30)}
            >
              30 dias
            </button>
          </div>
          <ArrowDoodle className="range-arrow" />
        </div>
      </header>

      {error ? <p className="error-text">{error}</p> : null}
      {loading || !model ? (
        <div className="glass dashboard-loading pop-in">
          <p className="muted">{loading ? 'Calculando análises...' : 'Sem dados.'}</p>
        </div>
      ) : (
        <>
          <section className="summary-banner glass pop-in">
            <SparkDoodle className="banner-spark" />
            <p>{model.weeklySummary}</p>
          </section>

          <section className="kpi-grid">
            <article className="glass kpi pop-in">
              <span>Aderência hoje</span>
              <strong>{model.todayAdherencePct}%</strong>
            </article>
            <article className="glass kpi pop-in">
              <span>Aderência 7 dias</span>
              <strong>{model.weekAdherencePct}%</strong>
            </article>
            <article className="glass kpi pop-in">
              <span>Kcal hoje</span>
              <strong>{formatKcal(model.todayActualKcal)}</strong>
              <small>meta {formatKcal(model.todayPlannedKcal)}</small>
            </article>
            <article className="glass kpi pop-in">
              <span>Diferença acumulada</span>
              <strong>
                {model.accumulatedDelta > 0 ? '+' : ''}
                {model.accumulatedDelta} kcal
              </strong>
            </article>
            <article className="glass kpi pop-in">
              <span>Pontualidade</span>
              <strong>{model.punctualityPct}%</strong>
            </article>
            <article className="glass kpi pop-in">
              <span>Atraso médio</span>
              <strong>
                {model.avgDelayMinutes > 0 ? '+' : ''}
                {model.avgDelayMinutes} min
              </strong>
            </article>
            <article className="glass kpi pop-in">
              <span>Peso (7d)</span>
              <strong>
                {model.weightDeltaWeek == null
                  ? '—'
                  : `${model.weightDeltaWeek > 0 ? '+' : ''}${model.weightDeltaWeek} kg`}
              </strong>
            </article>
            <article className="glass kpi pop-in">
              <span>Peso (30d)</span>
              <strong>
                {model.weightDeltaMonth == null
                  ? '—'
                  : `${model.weightDeltaMonth > 0 ? '+' : ''}${model.weightDeltaMonth} kg`}
              </strong>
            </article>
          </section>

          <section className="charts-grid">
            <article className="glass chart-card pop-in">
              <h2>Calorias por dia</h2>
              <p className="muted">Planejado vs real no período</p>
              <div className="chart-box">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={model.calorieSeries}>
                    <CartesianGrid stroke="rgba(253,253,255,0.12)" vertical={false} />
                    <XAxis dataKey="label" stroke="#fdfdff" tick={{ fill: '#fdfdff', fontSize: 12 }} />
                    <YAxis stroke="#fdfdff" tick={{ fill: '#fdfdff', fontSize: 12 }} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend />
                    <Bar dataKey="planned" name="Planejado" fill="#fdfdff" radius={[8, 8, 0, 0]} />
                    <Bar dataKey="actual" name="Real" fill="#83fd80" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </article>

            <article className="glass chart-card pop-in">
              <h2>Evolução do peso</h2>
              <p className="muted">Registros ao longo do tempo</p>
              <div className="chart-box">
                {model.weightSeries.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={model.weightSeries}>
                      <CartesianGrid stroke="rgba(253,253,255,0.12)" vertical={false} />
                      <XAxis dataKey="label" stroke="#fdfdff" tick={{ fill: '#fdfdff', fontSize: 12 }} />
                      <YAxis stroke="#fdfdff" tick={{ fill: '#fdfdff', fontSize: 12 }} domain={['auto', 'auto']} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Line
                        type="monotone"
                        dataKey="weight"
                        name="Peso (kg)"
                        stroke="#83fd80"
                        strokeWidth={3}
                        dot={{ r: 4, fill: '#fdfdff' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="muted empty-chart">Cadastre pesos em Métricas.</p>
                )}
              </div>
            </article>

            <article className="glass chart-card pop-in">
              <h2>Macros de hoje</h2>
              <p className="muted">
                Planejado {formatMacro(model.macrosPlanned.protein)} P ·{' '}
                {formatMacro(model.macrosPlanned.carbs)} C ·{' '}
                {formatMacro(model.macrosPlanned.fat)} G
              </p>
              <div className="chart-box">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={macroChart}>
                    <CartesianGrid stroke="rgba(253,253,255,0.12)" vertical={false} />
                    <XAxis dataKey="name" stroke="#fdfdff" tick={{ fill: '#fdfdff', fontSize: 12 }} />
                    <YAxis stroke="#fdfdff" tick={{ fill: '#fdfdff', fontSize: 12 }} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend />
                    <Bar dataKey="planejado" fill="#fdfdff" radius={[8, 8, 0, 0]} />
                    <Bar dataKey="real" fill="#83fd80" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </article>

            <article className="glass chart-card pop-in">
              <h2>Peso × calorias</h2>
              <p className="muted">Média calórica e variação de peso por semana</p>
              <div className="chart-box">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={model.weightCalorieCorr}>
                    <CartesianGrid stroke="rgba(253,253,255,0.12)" vertical={false} />
                    <XAxis dataKey="weekLabel" stroke="#fdfdff" tick={{ fill: '#fdfdff', fontSize: 11 }} />
                    <YAxis yAxisId="left" stroke="#fdfdff" tick={{ fill: '#fdfdff', fontSize: 12 }} />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      stroke="#83fd80"
                      tick={{ fill: '#83fd80', fontSize: 12 }}
                    />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend />
                    <Bar yAxisId="left" dataKey="avgKcal" name="Kcal média" fill="#fdfdff" radius={[8, 8, 0, 0]} />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="weightChange"
                      name="Δ peso (kg)"
                      stroke="#83fd80"
                      strokeWidth={3}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </article>

            <article className="glass chart-card pop-in">
              <h2>Refeições mais puladas</h2>
              <div className="list-card">
                {model.mostSkipped.length === 0 ? (
                  <p className="muted">Cadastre a dieta para ver esse ranking.</p>
                ) : (
                  model.mostSkipped.map((row) => (
                    <div key={row.name} className="list-row">
                      <strong>{row.name}</strong>
                      <span>
                        pulada {row.skipped}x / {row.plannedDays} dias
                      </span>
                    </div>
                  ))
                )}
              </div>
            </article>

            <article className="glass chart-card pop-in">
              <h2>Melhor e pior dia</h2>
              <div className="list-card">
                <div className="list-row">
                  <strong>Melhor</strong>
                  <span>{model.bestWeekday ?? '—'}</span>
                </div>
                <div className="list-row">
                  <strong>Pior</strong>
                  <span>{model.worstWeekday ?? '—'}</span>
                </div>
                {model.weekdayStats.map((row) => (
                  <div key={row.weekday} className="list-row subtle">
                    <strong>{row.weekday}</strong>
                    <span>
                      {row.avgDelta > 0 ? '+' : ''}
                      {row.avgDelta} kcal média
                    </span>
                  </div>
                ))}
              </div>
            </article>

            <article className="glass chart-card pop-in">
              <h2>Consistência de treino</h2>
              <p className="big-stat">
                {model.workoutDays}
                <small> / {model.workoutTotalDays} dias</small>
              </p>
              <p className="muted">Dias com treino registrado no período.</p>
            </article>

            <article className="glass chart-card pop-in">
              <h2>Sono</h2>
              <p className="muted">
                Média {model.avgSleepHours != null ? `${model.avgSleepHours}h` : '—'}
              </p>
              <div className="chart-box">
                {model.sleepSeries.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={model.sleepSeries}>
                      <CartesianGrid stroke="rgba(253,253,255,0.12)" vertical={false} />
                      <XAxis dataKey="label" stroke="#fdfdff" tick={{ fill: '#fdfdff', fontSize: 12 }} />
                      <YAxis stroke="#fdfdff" tick={{ fill: '#fdfdff', fontSize: 12 }} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Line type="monotone" dataKey="hours" name="Horas" stroke="#83fd80" strokeWidth={3} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="muted empty-chart">Registre o sono em Métricas.</p>
                )}
              </div>
            </article>

            <article className="glass chart-card pop-in">
              <h2>Medidas corporais</h2>
              <div className="chart-box">
                {model.bodyMeasureSeries.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={model.bodyMeasureSeries}>
                      <CartesianGrid stroke="rgba(253,253,255,0.12)" vertical={false} />
                      <XAxis dataKey="label" stroke="#fdfdff" tick={{ fill: '#fdfdff', fontSize: 12 }} />
                      <YAxis stroke="#fdfdff" tick={{ fill: '#fdfdff', fontSize: 12 }} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Legend />
                      <Line type="monotone" dataKey="waist" name="Cintura" stroke="#83fd80" strokeWidth={2} connectNulls />
                      <Line type="monotone" dataKey="hip" name="Quadril" stroke="#fdfdff" strokeWidth={2} connectNulls />
                      <Line type="monotone" dataKey="arm" name="Braço" stroke="#ffb4a2" strokeWidth={2} connectNulls />
                      <Line type="monotone" dataKey="chest" name="Peito" stroke="#ffd27a" strokeWidth={2} connectNulls />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="muted empty-chart">Sem medidas ainda.</p>
                )}
              </div>
            </article>

            <article className="glass chart-card pop-in">
              <h2>% de gordura</h2>
              <div className="chart-box">
                {model.bodyFatSeries.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={model.bodyFatSeries}>
                      <CartesianGrid stroke="rgba(253,253,255,0.12)" vertical={false} />
                      <XAxis dataKey="label" stroke="#fdfdff" tick={{ fill: '#fdfdff', fontSize: 12 }} />
                      <YAxis stroke="#fdfdff" tick={{ fill: '#fdfdff', fontSize: 12 }} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Line type="monotone" dataKey="fat" name="% gordura" stroke="#83fd80" strokeWidth={3} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="muted empty-chart">Registre % gordura em Métricas.</p>
                )}
              </div>
            </article>
          </section>
        </>
      )}
    </div>
  )
}
