import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { ArrowDoodle, SparkDoodle } from '../components/Doodles'
import { useApp } from '../context/AppContext'
import { getApi } from '../lib/api'
import { scaleFromPer100g, searchFoods, type FoodSearchHit } from '../lib/foodSearch'
import { formatKcal, formatMacro, sumFoods } from '../lib/nutrition'
import type { DietFood, DietMeal, DietMealInput, FoodUnit } from '../vite-env'
import './DietPage.css'

type FoodDraft = DietFood & { key: string }

type MealFormState = {
  name: string
  start_time: string
  end_time: string
  notes: string
  foods: FoodDraft[]
}

function newFoodDraft(partial?: Partial<DietFood>): FoodDraft {
  return {
    key: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    name: partial?.name ?? '',
    quantity: partial?.quantity ?? 100,
    unit: partial?.unit ?? 'g',
    calories: partial?.calories ?? null,
    protein: partial?.protein ?? null,
    carbs: partial?.carbs ?? null,
    fat: partial?.fat ?? null,
    id: partial?.id,
  }
}

function emptyForm(): MealFormState {
  return {
    name: '',
    start_time: '08:00',
    end_time: '09:00',
    notes: '',
    foods: [newFoodDraft()],
  }
}

function mealToForm(meal: DietMeal): MealFormState {
  return {
    name: meal.name,
    start_time: meal.start_time,
    end_time: meal.end_time,
    notes: meal.notes ?? '',
    foods: meal.foods.map((food) => newFoodDraft(food)),
  }
}

export function DietPage() {
  const api = useMemo(() => getApi(), [])
  const { activeProfile, refreshSetup } = useApp()
  const [meals, setMeals] = useState<DietMeal[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<MealFormState>(emptyForm)
  const [searchTerm, setSearchTerm] = useState('')
  const [searchTargetKey, setSearchTargetKey] = useState<string | null>(null)
  const [searchHits, setSearchHits] = useState<FoodSearchHit[]>([])
  const [searching, setSearching] = useState(false)

  const totalsPreview = useMemo(() => sumFoods(form.foods), [form.foods])
  const dayTotals = useMemo(
    () =>
      meals.reduce(
        (acc, meal) => {
          acc.calories += meal.totals.calories
          acc.protein += meal.totals.protein
          acc.carbs += meal.totals.carbs
          acc.fat += meal.totals.fat
          return acc
        },
        { calories: 0, protein: 0, carbs: 0, fat: 0 },
      ),
    [meals],
  )

  async function refresh() {
    if (!activeProfile) return
    setLoading(true)
    try {
      const list = await api.listDietMeals(activeProfile.id)
      setMeals(list)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar a dieta.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refresh()
  }, [activeProfile?.id])

  function openCreate() {
    setEditingId(null)
    setForm(emptyForm())
    setError(null)
    setShowForm(true)
    setSearchHits([])
    setSearchTerm('')
  }

  function openEdit(meal: DietMeal) {
    setEditingId(meal.id)
    setForm(mealToForm(meal))
    setError(null)
    setShowForm(true)
    setSearchHits([])
    setSearchTerm('')
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
    setForm((prev) => ({
      ...prev,
      foods: [...prev.foods, newFoodDraft()],
    }))
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

  async function onSearch(foodKey: string) {
    setSearchTargetKey(foodKey)
    setSearching(true)
    setError(null)
    try {
      const hits = await searchFoods(searchTerm || form.foods.find((f) => f.key === foodKey)?.name || '')
      setSearchHits(hits)
      if (!hits.length) setError('Nenhum alimento encontrado. Tente outro termo.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha na busca de alimentos.')
    } finally {
      setSearching(false)
    }
  }

  function applyHit(hit: FoodSearchHit) {
    if (!searchTargetKey) return
    const food = form.foods.find((f) => f.key === searchTargetKey)
    if (!food) return

    const unit: FoodUnit = food.unit
    const quantity = food.quantity || (unit === 'g' ? 100 : 1)
    const scaled = scaleFromPer100g(hit, quantity, unit)

    updateFood(searchTargetKey, {
      name: hit.brand ? `${hit.name} (${hit.brand})` : hit.name,
      quantity,
      unit,
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

    const payload: DietMealInput = {
      name: form.name.trim(),
      start_time: form.start_time,
      end_time: form.end_time,
      notes: form.notes?.trim() || null,
      foods: form.foods.map(({ key: _key, ...food }) => food),
    }

    try {
      if (editingId) {
        await api.updateDietMeal(editingId, payload)
      } else {
        await api.createDietMeal(activeProfile.id, payload)
      }
      setShowForm(false)
      setEditingId(null)
      await refresh()
      await refreshSetup()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível salvar.')
    } finally {
      setSaving(false)
    }
  }

  async function onDelete() {
    if (!editingId) return
    if (!window.confirm('Excluir esta refeição da dieta?')) return
    setSaving(true)
    try {
      await api.deleteDietMeal(editingId)
      setShowForm(false)
      setEditingId(null)
      await refresh()
      await refreshSetup()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível excluir.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="diet-page">
      <header className="diet-hero pop-in">
        <div>
          <p className="eyebrow">sua dieta planejada</p>
          <h1 className="display-title">
            Refeições
            <br />e horários
          </h1>
          <p className="muted">
            Monte quantas refeições quiser. As calorias somam sozinhas a partir
            dos alimentos — e dá para buscar valores aproximados online.
          </p>
        </div>
        <div className="diet-summary glass">
          <SparkDoodle className="diet-summary-spark" />
          <strong>{formatKcal(dayTotals.calories)}</strong>
          <span>total do dia</span>
          <small>
            P {formatMacro(dayTotals.protein)} · C {formatMacro(dayTotals.carbs)} · G{' '}
            {formatMacro(dayTotals.fat)}
          </small>
          <ArrowDoodle className="diet-summary-arrow" />
        </div>
      </header>

      <div className="diet-toolbar">
        <button type="button" className="btn btn-primary" onClick={openCreate}>
          Nova refeição
        </button>
        {!showForm ? (
          <p className="muted">
            {loading
              ? 'Carregando...'
              : meals.length
                ? `${meals.length} refeição(ões) cadastrada(s)`
                : 'Ainda sem refeições — comece pela primeira.'}
          </p>
        ) : null}
      </div>

      {error && !showForm ? <p className="error-text">{error}</p> : null}

      <div className={`diet-layout ${showForm ? 'with-form' : ''}`}>
        <section className="meal-list">
          {meals.map((meal, index) => (
            <article
              key={meal.id}
              className="glass meal-card pop-in"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <button type="button" className="meal-card-main" onClick={() => openEdit(meal)}>
                <div className="meal-time">
                  {meal.start_time} – {meal.end_time}
                </div>
                <h2>{meal.name}</h2>
                <p>
                  {meal.foods.length} alimento(s) · {formatKcal(meal.totals.calories)}
                </p>
                <ul className="meal-food-preview">
                  {meal.foods.slice(0, 3).map((food) => (
                    <li key={`${meal.id}-${food.id ?? food.name}`}>
                      {food.name} · {food.quantity}
                      {food.unit === 'g' ? 'g' : ' un'}
                    </li>
                  ))}
                  {meal.foods.length > 3 ? <li>+{meal.foods.length - 3} mais</li> : null}
                </ul>
              </button>
            </article>
          ))}

          {!loading && meals.length === 0 ? (
            <div className="glass empty-diet pop-in">
              <h2>Sua dieta ainda está em branco</h2>
              <p className="muted">
                Cadastre café, almoço, lanches… cada uma com o range de horário.
              </p>
            </div>
          ) : null}
        </section>

        {showForm ? (
          <form className="glass meal-form pop-in" onSubmit={(e) => void onSubmit(e)}>
            <div className="meal-form-head">
              <div className="stamp-label">
                {editingId ? 'editar refeição' : 'nova refeição'}
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

            <div className="form-grid">
              <div className="field">
                <label htmlFor="meal-name">Nome</label>
                <input
                  id="meal-name"
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Ex.: Café da manhã"
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="meal-start">Início</label>
                <input
                  id="meal-start"
                  type="time"
                  value={form.start_time}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, start_time: e.target.value }))
                  }
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="meal-end">Fim</label>
                <input
                  id="meal-end"
                  type="time"
                  value={form.end_time}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, end_time: e.target.value }))
                  }
                  required
                />
              </div>
              <div className="field field-span">
                <label htmlFor="meal-notes">Notas (opcional)</label>
                <input
                  id="meal-notes"
                  value={form.notes ?? ''}
                  onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                  placeholder="Observações rápidas"
                />
              </div>
            </div>

            <div className="foods-block">
              <div className="foods-head">
                <h3>Alimentos</h3>
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
                        placeholder="Ex.: Aveia"
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
                            calories: e.target.value === '' ? null : Number(e.target.value),
                          })
                        }
                        placeholder="opcional"
                      />
                    </div>
                    <div className="field">
                      <label>Prot.</label>
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        value={food.protein ?? ''}
                        onChange={(e) =>
                          updateFood(food.key, {
                            protein: e.target.value === '' ? null : Number(e.target.value),
                          })
                        }
                        placeholder="opcional"
                      />
                    </div>
                    <div className="field">
                      <label>Carbo</label>
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        value={food.carbs ?? ''}
                        onChange={(e) =>
                          updateFood(food.key, {
                            carbs: e.target.value === '' ? null : Number(e.target.value),
                          })
                        }
                        placeholder="opcional"
                      />
                    </div>
                    <div className="field">
                      <label>Gord.</label>
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        value={food.fat ?? ''}
                        onChange={(e) =>
                          updateFood(food.key, {
                            fat: e.target.value === '' ? null : Number(e.target.value),
                          })
                        }
                        placeholder="opcional"
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
                      placeholder="Buscar kcal aproximada (Open Food Facts)"
                    />
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => void onSearch(food.key)}
                      disabled={searching}
                    >
                      {searching && searchTargetKey === food.key ? 'Buscando...' : 'Buscar'}
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
                        {hit.brand ? `${hit.brand} · ` : ''}
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
                {saving ? 'Salvando...' : editingId ? 'Salvar alterações' : 'Salvar refeição'}
              </button>
            </div>
          </form>
        ) : null}
      </div>
    </div>
  )
}
