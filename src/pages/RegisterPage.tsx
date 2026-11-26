import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { ArrowDoodle, SparkDoodle } from '../components/Doodles'
import { useApp } from '../context/AppContext'
import { getApi } from '../lib/api'
import { scaleFromPer100g, searchFoods, type FoodSearchHit } from '../lib/foodSearch'
import {
  dayFromDateTimeLocal,
  findNearestMeal,
  formatDistanceLabel,
  localDateTimeValue,
  localDayString,
} from '../lib/nearestMeal'
import { formatKcal, sumFoods } from '../lib/nutrition'
import type {
  DietFood,
  DietMeal,
  FoodUnit,
  MealLog,
  MealLogFood,
  MealLogInput,
} from '../vite-env'
import './RegisterPage.css'

type FoodDraft = MealLogFood & { key: string }

type LogFormState = {
  diet_meal_id: number | null
  logged_at: string
  notes: string
  foods: FoodDraft[]
}

function newFoodDraft(partial?: Partial<DietFood | MealLogFood>): FoodDraft {
  return {
    key: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    name: partial?.name ?? '',
    quantity: partial?.quantity ?? 100,
    unit: partial?.unit ?? 'g',
    calories: partial?.calories ?? null,
    protein: partial?.protein ?? null,
    carbs: partial?.carbs ?? null,
    fat: partial?.fat ?? null,
    id: 'id' in (partial ?? {}) ? (partial as MealLogFood).id : undefined,
  }
}

function foodsFromDiet(meal: DietMeal | null | undefined): FoodDraft[] {
  if (!meal?.foods.length) return [newFoodDraft()]
  return meal.foods.map((food) => newFoodDraft(food))
}

function emptyForm(suggestedId: number | null, meal?: DietMeal | null): LogFormState {
  return {
    diet_meal_id: suggestedId,
    logged_at: localDateTimeValue(),
    notes: '',
    foods: foodsFromDiet(meal),
  }
}

function logToForm(log: MealLog): LogFormState {
  return {
    diet_meal_id: log.diet_meal_id ?? null,
    logged_at: log.logged_at.length >= 16 ? log.logged_at.slice(0, 16) : log.logged_at,
    notes: log.notes ?? '',
    foods: log.foods.map((food) => newFoodDraft(food)),
  }
}

function timeLabel(value: string) {
  if (value.includes('T')) return value.slice(11, 16)
  return value.slice(11, 16)
}

export function RegisterPage() {
  const api = useMemo(() => getApi(), [])
  const { activeProfile } = useApp()
  const [dietMeals, setDietMeals] = useState<DietMeal[]>([])
  const [logs, setLogs] = useState<MealLog[]>([])
  const [day, setDay] = useState(localDayString())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState<LogFormState>(() => emptyForm(null))
  const [suggestionNote, setSuggestionNote] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [searchTargetKey, setSearchTargetKey] = useState<string | null>(null)
  const [searchHits, setSearchHits] = useState<FoodSearchHit[]>([])
  const [searching, setSearching] = useState(false)
  const [nowTick, setNowTick] = useState(() => new Date())

  const totalsPreview = useMemo(() => sumFoods(form.foods), [form.foods])
  const dayTotals = useMemo(
    () =>
      logs.reduce(
        (acc, log) => {
          acc.calories += log.totals.calories
          return acc
        },
        { calories: 0 },
      ),
    [logs],
  )

  const nearest = useMemo(
    () => findNearestMeal(dietMeals, nowTick),
    [dietMeals, nowTick],
  )

  const selectedDiet = useMemo(
    () => dietMeals.find((m) => m.id === form.diet_meal_id) ?? null,
    [dietMeals, form.diet_meal_id],
  )

  async function refresh(selectedDay = day) {
    if (!activeProfile) return
    setLoading(true)
    setError(null)
    try {
      const [meals, dayLogs] = await Promise.all([
        api.listDietMeals(activeProfile.id),
        api.listMealLogsByDay(activeProfile.id, selectedDay),
      ])
      setDietMeals(meals)
      setLogs(dayLogs)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar registros.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refresh(day)
  }, [activeProfile?.id, day])

  useEffect(() => {
    const timer = window.setInterval(() => setNowTick(new Date()), 30_000)
    return () => window.clearInterval(timer)
  }, [])

  function openCreate() {
    const suggestion = findNearestMeal(dietMeals, new Date())
    const meal = suggestion?.meal ?? null
    setEditingId(null)
    setForm(emptyForm(meal?.id ?? null, meal))
    setSuggestionNote(
      suggestion
        ? `Sugestão: ${suggestion.meal.name} (${formatDistanceLabel(suggestion)})`
        : 'Sem dieta cadastrada — associe depois ou cadastre em Dieta.',
    )
    setShowForm(true)
    setError(null)
    setSearchHits([])
  }

  function openEdit(log: MealLog) {
    setEditingId(log.id)
    setForm(logToForm(log))
    setSuggestionNote('Editando registro — você pode corrigir a associação.')
    setShowForm(true)
    setError(null)
    setSearchHits([])
  }

  function updateFood(key: string, patch: Partial<FoodDraft>) {
    setForm((prev) => ({
      ...prev,
      foods: prev.foods.map((food) =>
        food.key === key ? { ...food, ...patch } : food,
      ),
    }))
  }

  function addFood() {
    setForm((prev) => ({ ...prev, foods: [...prev.foods, newFoodDraft()] }))
  }

  function removeFood(key: string) {
    setForm((prev) => ({
      ...prev,
      foods:
        prev.foods.length <= 1
          ? prev.foods
          : prev.foods.filter((food) => food.key !== key),
    }))
  }

  function onChangeAssociation(value: string) {
    const id = value === '' ? null : Number(value)
    const meal = dietMeals.find((m) => m.id === id) ?? null
    setForm((prev) => ({
      ...prev,
      diet_meal_id: id,
      // Só troca os alimentos se ainda estiver criando e o usuário não editou o id
      foods: editingId ? prev.foods : foodsFromDiet(meal),
    }))
    if (meal) {
      setSuggestionNote(
        `Associado a: ${meal.name} (${meal.start_time}–${meal.end_time})`,
      )
    }
  }

  function loadDietFoods() {
    if (!selectedDiet) return
    setForm((prev) => ({ ...prev, foods: foodsFromDiet(selectedDiet) }))
  }

  async function onSearch(foodKey: string) {
    setSearchTargetKey(foodKey)
    setSearching(true)
    setError(null)
    try {
      const seed =
        searchTerm ||
        form.foods.find((f) => f.key === foodKey)?.name ||
        ''
      const hits = await searchFoods(seed)
      setSearchHits(hits)
      if (!hits.length) setError('Nenhum alimento encontrado.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha na busca.')
    } finally {
      setSearching(false)
    }
  }

  function applyHit(hit: FoodSearchHit) {
    if (!searchTargetKey) return
    const food = form.foods.find((f) => f.key === searchTargetKey)
    if (!food) return
    const quantity = food.quantity || (food.unit === 'g' ? 100 : 1)
    const scaled = scaleFromPer100g(hit, quantity, food.unit)
    updateFood(searchTargetKey, {
      name: hit.brand ? `${hit.name} (${hit.brand})` : hit.name,
      quantity,
      ...scaled,
    })
    setSearchHits([])
    setSearchTerm('')
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (!activeProfile) return
    setSaving(true)
    setError(null)

    const payload: MealLogInput = {
      diet_meal_id: form.diet_meal_id,
      logged_at: form.logged_at,
      day: dayFromDateTimeLocal(form.logged_at),
      notes: form.notes.trim() || null,
      foods: form.foods.map(({ key: _key, ...food }) => food),
    }

    try {
      if (editingId) {
        await api.updateMealLog(editingId, payload)
      } else {
        await api.createMealLog(activeProfile.id, payload)
      }
      setDay(payload.day)
      setShowForm(false)
      setEditingId(null)
      await refresh(payload.day)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível salvar.')
    } finally {
      setSaving(false)
    }
  }

  async function onDelete() {
    if (!editingId) return
    if (!window.confirm('Excluir este registro?')) return
    setSaving(true)
    try {
      await api.deleteMealLog(editingId)
      setShowForm(false)
      setEditingId(null)
      await refresh(day)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível excluir.')
    } finally {
      setSaving(false)
    }
  }

  if (!dietMeals.length && !loading) {
    return (
      <div className="register-page">
        <section className="glass empty-register pop-in">
          <div className="stamp-label">falta a dieta</div>
          <h1 className="display-title">Cadastre a dieta antes</h1>
          <p className="muted">
            Para sugerir a refeição mais próxima e comparar, primeiro monte sua
            dieta.
          </p>
          <Link to="/dieta" className="btn btn-primary">
            Ir para Dieta
          </Link>
        </section>
      </div>
    )
  }

  return (
    <div className="register-page">
      <header className="register-hero pop-in">
        <div>
          <p className="eyebrow">registro do dia</p>
          <h1 className="display-title">
            O que você
            <br />
            comeu?
          </h1>
          <p className="muted">
            O sistema sugere a refeição da dieta mais próxima do horário atual.
            Se errar a associação, é só corrigir.
          </p>
          {nearest ? (
            <p className="suggestion-live">
              <SparkDoodle className="suggestion-spark" />
              Agora: <strong>{nearest.meal.name}</strong> ·{' '}
              {formatDistanceLabel(nearest)}
            </p>
          ) : null}
        </div>
        <div className="register-summary glass">
          <strong>{formatKcal(dayTotals.calories)}</strong>
          <span>registradas no dia</span>
          <ArrowDoodle className="register-arrow" />
        </div>
      </header>

      <div className="register-toolbar">
        <div className="day-nav">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => {
              const d = new Date(`${day}T12:00:00`)
              d.setDate(d.getDate() - 1)
              setDay(localDayString(d))
            }}
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
            onClick={() => {
              const d = new Date(`${day}T12:00:00`)
              d.setDate(d.getDate() + 1)
              setDay(localDayString(d))
            }}
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
        <button type="button" className="btn btn-primary" onClick={openCreate}>
          Registrar refeição
        </button>
      </div>

      {error && !showForm ? <p className="error-text">{error}</p> : null}

      <div className={`register-layout ${showForm ? 'with-form' : ''}`}>
        <section className="log-list">
          {logs.map((log, index) => (
            <article
              key={log.id}
              className="glass log-card pop-in"
              style={{ animationDelay: `${index * 45}ms` }}
            >
              <button type="button" className="log-card-main" onClick={() => openEdit(log)}>
                <div className="log-meta">
                  <span className="log-time">{timeLabel(log.logged_at)}</span>
                  <span className="log-assoc">
                    {log.diet_meal_name
                      ? `${log.diet_meal_name}${
                          log.diet_meal_start
                            ? ` · ${log.diet_meal_start}–${log.diet_meal_end}`
                            : ''
                        }`
                      : 'Sem associação'}
                  </span>
                </div>
                <h2>{formatKcal(log.totals.calories)}</h2>
                <ul>
                  {log.foods.slice(0, 3).map((food) => (
                    <li key={`${log.id}-${food.id ?? food.name}`}>
                      {food.name} · {food.quantity}
                      {food.unit === 'g' ? 'g' : ' un'}
                    </li>
                  ))}
                  {log.foods.length > 3 ? <li>+{log.foods.length - 3} mais</li> : null}
                </ul>
              </button>
            </article>
          ))}

          {!loading && logs.length === 0 ? (
            <div className="glass empty-register pop-in">
              <h2>Nada registrado neste dia</h2>
              <p className="muted">Toque em “Registrar refeição” para começar.</p>
            </div>
          ) : null}
        </section>

        {showForm ? (
          <form className="glass log-form pop-in" onSubmit={(e) => void onSubmit(e)}>
            <div className="log-form-head">
              <div className="stamp-label">
                {editingId ? 'editar registro' : 'novo registro'}
              </div>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  setShowForm(false)
                  setEditingId(null)
                  setError(null)
                }}
              >
                Fechar
              </button>
            </div>

            {suggestionNote ? <p className="suggestion-banner">{suggestionNote}</p> : null}

            <div className="form-grid">
              <div className="field field-span">
                <label htmlFor="assoc">Associação com a dieta</label>
                <select
                  id="assoc"
                  value={form.diet_meal_id ?? ''}
                  onChange={(e) => onChangeAssociation(e.target.value)}
                >
                  <option value="">Sem associação</option>
                  {dietMeals.map((meal) => (
                    <option key={meal.id} value={meal.id}>
                      {meal.name} ({meal.start_time}–{meal.end_time})
                      {nearest?.meal.id === meal.id ? ' · sugerida' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label htmlFor="logged-at">Quando</label>
                <input
                  id="logged-at"
                  type="datetime-local"
                  value={form.logged_at}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, logged_at: e.target.value }))
                  }
                  required
                />
              </div>

              <div className="field">
                <label>&nbsp;</label>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={loadDietFoods}
                  disabled={!selectedDiet}
                >
                  Carregar alimentos da dieta
                </button>
              </div>

              <div className="field field-span">
                <label htmlFor="notes">Notas</label>
                <input
                  id="notes"
                  value={form.notes}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, notes: e.target.value }))
                  }
                  placeholder="Opcional"
                />
              </div>
            </div>

            {selectedDiet ? (
              <div className="compare-strip">
                <div>
                  <small>Planejado</small>
                  <strong>{formatKcal(selectedDiet.totals.calories)}</strong>
                </div>
                <ArrowDoodle className="compare-arrow" />
                <div>
                  <small>Neste registro</small>
                  <strong>{formatKcal(totalsPreview.calories)}</strong>
                </div>
              </div>
            ) : null}

            <div className="foods-block">
              <div className="foods-head">
                <h3>O que você comeu</h3>
                <strong>{formatKcal(totalsPreview.calories)}</strong>
              </div>

              {form.foods.map((food, index) => (
                <div key={food.key} className="food-row">
                  <div className="food-row-title">
                    <span>#{index + 1}</span>
                    <button
                      type="button"
                      className="linkish"
                      onClick={() => removeFood(food.key)}
                      disabled={form.foods.length <= 1}
                    >
                      Remover
                    </button>
                  </div>
                  <div className="food-grid">
                    <div className="field field-span">
                      <label>Nome</label>
                      <input
                        value={food.name}
                        onChange={(e) => updateFood(food.key, { name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="field">
                      <label>Qtd</label>
                      <input
                        type="number"
                        min="0.1"
                        step="0.1"
                        value={food.quantity}
                        onChange={(e) =>
                          updateFood(food.key, { quantity: Number(e.target.value) })
                        }
                        required
                      />
                    </div>
                    <div className="field">
                      <label>Unidade</label>
                      <select
                        value={food.unit}
                        onChange={(e) =>
                          updateFood(food.key, {
                            unit: e.target.value as FoodUnit,
                          })
                        }
                      >
                        <option value="g">gramas</option>
                        <option value="unidade">unidade</option>
                      </select>
                    </div>
                    <div className="field">
                      <label>Kcal</label>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={food.calories ?? ''}
                        onChange={(e) =>
                          updateFood(food.key, {
                            calories:
                              e.target.value === '' ? null : Number(e.target.value),
                          })
                        }
                      />
                    </div>
                  </div>
                  <div className="food-search">
                    <input
                      value={searchTargetKey === food.key ? searchTerm : ''}
                      onFocus={() => {
                        setSearchTargetKey(food.key)
                        setSearchTerm(food.name)
                      }}
                      onChange={(e) => {
                        setSearchTargetKey(food.key)
                        setSearchTerm(e.target.value)
                      }}
                      placeholder="Buscar kcal aproximada"
                    />
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => void onSearch(food.key)}
                      disabled={searching}
                    >
                      Buscar
                    </button>
                  </div>
                </div>
              ))}

              {searchHits.length > 0 ? (
                <div className="search-hits">
                  {searchHits.map((hit) => (
                    <button
                      key={hit.id}
                      type="button"
                      className="search-hit"
                      onClick={() => applyHit(hit)}
                    >
                      <strong>{hit.name}</strong>
                      <span>
                        {hit.caloriesPer100g != null
                          ? `${Math.round(hit.caloriesPer100g)} kcal/100g`
                          : 'sem kcal'}
                      </span>
                    </button>
                  ))}
                </div>
              ) : null}

              <button type="button" className="btn btn-ghost" onClick={addFood}>
                + Alimento
              </button>
            </div>

            {error ? <p className="error-text">{error}</p> : null}

            <div className="form-actions">
              {editingId ? (
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={() => void onDelete()}
                  disabled={saving}
                >
                  Excluir
                </button>
              ) : (
                <span />
              )}
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Salvando...' : editingId ? 'Salvar alterações' : 'Salvar registro'}
              </button>
            </div>
          </form>
        ) : null}
      </div>
    </div>
  )
}
