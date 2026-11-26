/**
 * Camada de dieta (refeições + alimentos) sobre sql.js.
 * @param {{
 *   queryAll: (sql: string, params?: unknown[]) => Record<string, unknown>[]
 *   queryOne: (sql: string, params?: unknown[]) => Record<string, unknown> | null
 *   persist: () => void
 *   getDb: () => import('sql.js').Database
 * }} deps
 */
export function createDietService({ queryAll, queryOne, persist, getDb }) {
  function normalizeTime(value) {
    const raw = String(value ?? '').trim()
    const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(raw)
    if (!match) throw new Error('Horário inválido. Use o formato HH:MM.')
    return `${match[1]}:${match[2]}`
  }

  function nullNumber(value) {
    if (value === null || value === undefined || value === '') return null
    const n = Number(value)
    if (Number.isNaN(n)) return null
    return n
  }

  function sanitizeFoods(foods) {
    if (!Array.isArray(foods) || foods.length === 0) {
      throw new Error('Adicione pelo menos um alimento na refeição.')
    }

    return foods.map((food, index) => {
      const name = String(food?.name ?? '').trim()
      if (!name) throw new Error(`Informe o nome do alimento #${index + 1}.`)

      const quantity = Number(food?.quantity)
      if (!Number.isFinite(quantity) || quantity <= 0) {
        throw new Error(`Quantidade inválida no alimento "${name}".`)
      }

      const unit = food?.unit === 'unidade' ? 'unidade' : 'g'
      return {
        name,
        quantity,
        unit,
        calories: nullNumber(food?.calories),
        protein: nullNumber(food?.protein),
        carbs: nullNumber(food?.carbs),
        fat: nullNumber(food?.fat),
      }
    })
  }

  function insertFoods(mealId, foods) {
    const database = getDb()
    for (const food of foods) {
      database.run(
        `INSERT INTO diet_meal_foods
          (diet_meal_id, name, quantity, unit, calories, protein, carbs, fat)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          mealId,
          food.name,
          food.quantity,
          food.unit,
          food.calories,
          food.protein,
          food.carbs,
          food.fat,
        ],
      )
    }
  }

  function attachFoods(meals) {
    if (!meals.length) return []

    const ids = meals.map((m) => m.id)
    const placeholders = ids.map(() => '?').join(',')
    const foods = queryAll(
      `SELECT id, diet_meal_id, name, quantity, unit, calories, protein, carbs, fat
       FROM diet_meal_foods
       WHERE diet_meal_id IN (${placeholders})
       ORDER BY id ASC`,
      ids,
    )

    return meals.map((meal) => {
      const mealFoods = foods.filter((f) => f.diet_meal_id === meal.id)
      const totals = mealFoods.reduce(
        (acc, food) => {
          acc.calories += Number(food.calories) || 0
          acc.protein += Number(food.protein) || 0
          acc.carbs += Number(food.carbs) || 0
          acc.fat += Number(food.fat) || 0
          return acc
        },
        { calories: 0, protein: 0, carbs: 0, fat: 0 },
      )

      return {
        ...meal,
        foods: mealFoods,
        totals,
      }
    })
  }

  function listMeals(profileId) {
    const meals = queryAll(
      `SELECT id, profile_id, name, start_time, end_time, sort_order, notes,
              created_at, updated_at
       FROM diet_meals
       WHERE profile_id = ?
       ORDER BY start_time ASC, id ASC`,
      [profileId],
    )
    return attachFoods(meals)
  }

  function getMeal(id) {
    const meal = queryOne(
      `SELECT id, profile_id, name, start_time, end_time, sort_order, notes,
              created_at, updated_at
       FROM diet_meals WHERE id = ?`,
      [id],
    )
    if (!meal) return null
    return attachFoods([meal])[0]
  }

  function createMeal(profileId, payload) {
    const name = String(payload?.name ?? '').trim()
    if (!name) throw new Error('Nome da refeição é obrigatório.')

    const start_time = normalizeTime(payload?.start_time)
    const end_time = normalizeTime(payload?.end_time)
    const notes = String(payload?.notes ?? '').trim() || null
    const foods = sanitizeFoods(payload?.foods)
    const database = getDb()

    const existing = queryOne(
      `SELECT COALESCE(MAX(sort_order), -1) AS max_order
       FROM diet_meals WHERE profile_id = ?`,
      [profileId],
    )
    const sort_order = Number(existing?.max_order ?? -1) + 1

    database.run(
      `INSERT INTO diet_meals
        (profile_id, name, start_time, end_time, sort_order, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
      [profileId, name, start_time, end_time, sort_order, notes],
    )

    const created = queryOne(`SELECT last_insert_rowid() AS id`)
    const mealId = created?.id
    insertFoods(mealId, foods)
    persist()
    return getMeal(mealId)
  }

  function updateMeal(id, payload) {
    const current = getMeal(id)
    if (!current) throw new Error('Refeição não encontrada.')

    const name = String(payload?.name ?? '').trim()
    if (!name) throw new Error('Nome da refeição é obrigatório.')

    const start_time = normalizeTime(payload?.start_time)
    const end_time = normalizeTime(payload?.end_time)
    const notes = String(payload?.notes ?? '').trim() || null
    const foods = sanitizeFoods(payload?.foods)
    const database = getDb()

    database.run(
      `UPDATE diet_meals
       SET name = ?, start_time = ?, end_time = ?, notes = ?, updated_at = datetime('now')
       WHERE id = ?`,
      [name, start_time, end_time, notes, id],
    )
    database.run(`DELETE FROM diet_meal_foods WHERE diet_meal_id = ?`, [id])
    insertFoods(id, foods)
    persist()
    return getMeal(id)
  }

  function deleteMeal(id) {
    getDb().run(`DELETE FROM diet_meals WHERE id = ?`, [id])
    persist()
    return { ok: true }
  }

  return {
    listMeals,
    getMeal,
    createMeal,
    updateMeal,
    deleteMeal,
  }
}
