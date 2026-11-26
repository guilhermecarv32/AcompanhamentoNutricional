/**
 * Registros de refeições feitas no dia.
 * @param {{
 *   queryAll: (sql: string, params?: unknown[]) => Record<string, unknown>[]
 *   queryOne: (sql: string, params?: unknown[]) => Record<string, unknown> | null
 *   persist: () => void
 *   getDb: () => import('sql.js').Database
 * }} deps
 */
export function createLogsService({ queryAll, queryOne, persist, getDb }) {
  function nullNumber(value) {
    if (value === null || value === undefined || value === '') return null
    const n = Number(value)
    if (Number.isNaN(n)) return null
    return n
  }

  function sanitizeFoods(foods) {
    if (!Array.isArray(foods) || foods.length === 0) {
      throw new Error('Descreva pelo menos um alimento que você comeu.')
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

  function insertFoods(logId, foods) {
    const database = getDb()
    for (const food of foods) {
      database.run(
        `INSERT INTO meal_log_foods
          (meal_log_id, name, quantity, unit, calories, protein, carbs, fat)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          logId,
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

  function attachFoods(logs) {
    if (!logs.length) return []

    const ids = logs.map((l) => l.id)
    const placeholders = ids.map(() => '?').join(',')
    const foods = queryAll(
      `SELECT id, meal_log_id, name, quantity, unit, calories, protein, carbs, fat
       FROM meal_log_foods
       WHERE meal_log_id IN (${placeholders})
       ORDER BY id ASC`,
      ids,
    )

    const dietIds = [
      ...new Set(
        logs
          .map((l) => l.diet_meal_id)
          .filter((id) => id !== null && id !== undefined),
      ),
    ]
    const dietNames = new Map()
    if (dietIds.length) {
      const dietPlaceholders = dietIds.map(() => '?').join(',')
      const diets = queryAll(
        `SELECT id, name, start_time, end_time
         FROM diet_meals
         WHERE id IN (${dietPlaceholders})`,
        dietIds,
      )
      for (const diet of diets) {
        dietNames.set(diet.id, diet)
      }
    }

    return logs.map((log) => {
      const logFoods = foods.filter((f) => f.meal_log_id === log.id)
      const totals = logFoods.reduce(
        (acc, food) => {
          acc.calories += Number(food.calories) || 0
          acc.protein += Number(food.protein) || 0
          acc.carbs += Number(food.carbs) || 0
          acc.fat += Number(food.fat) || 0
          return acc
        },
        { calories: 0, protein: 0, carbs: 0, fat: 0 },
      )
      const diet = log.diet_meal_id != null ? dietNames.get(log.diet_meal_id) : null

      return {
        ...log,
        foods: logFoods,
        totals,
        diet_meal_name: diet?.name ?? null,
        diet_meal_start: diet?.start_time ?? null,
        diet_meal_end: diet?.end_time ?? null,
      }
    })
  }

  function listByDay(profileId, day) {
    const logs = queryAll(
      `SELECT id, profile_id, diet_meal_id, logged_at, day, notes, created_at, updated_at
       FROM meal_logs
       WHERE profile_id = ? AND day = ?
       ORDER BY logged_at ASC, id ASC`,
      [profileId, day],
    )
    return attachFoods(logs)
  }

  function listByRange(profileId, fromDay, toDay) {
    const logs = queryAll(
      `SELECT id, profile_id, diet_meal_id, logged_at, day, notes, created_at, updated_at
       FROM meal_logs
       WHERE profile_id = ? AND day >= ? AND day <= ?
       ORDER BY day ASC, logged_at ASC, id ASC`,
      [profileId, fromDay, toDay],
    )
    return attachFoods(logs)
  }

  function getLog(id) {
    const log = queryOne(
      `SELECT id, profile_id, diet_meal_id, logged_at, day, notes, created_at, updated_at
       FROM meal_logs WHERE id = ?`,
      [id],
    )
    if (!log) return null
    return attachFoods([log])[0]
  }

  function createLog(profileId, payload) {
    const foods = sanitizeFoods(payload?.foods)
    const loggedAt = String(payload?.logged_at ?? '').trim()
    const day = String(payload?.day ?? '').trim()
    if (!loggedAt || !day) throw new Error('Data/hora do registro é obrigatória.')

    const dietMealId =
      payload?.diet_meal_id === null || payload?.diet_meal_id === undefined
        ? null
        : Number(payload.diet_meal_id)
    const notes = String(payload?.notes ?? '').trim() || null
    const database = getDb()

    database.run(
      `INSERT INTO meal_logs
        (profile_id, diet_meal_id, logged_at, day, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
      [profileId, dietMealId, loggedAt, day, notes],
    )

    const created = queryOne(`SELECT last_insert_rowid() AS id`)
    const logId = created?.id
    insertFoods(logId, foods)
    persist()
    return getLog(logId)
  }

  function updateLog(id, payload) {
    const current = getLog(id)
    if (!current) throw new Error('Registro não encontrado.')

    const foods = sanitizeFoods(payload?.foods)
    const loggedAt = String(payload?.logged_at ?? current.logged_at).trim()
    const day = String(payload?.day ?? current.day).trim()
    const dietMealId =
      payload?.diet_meal_id === null || payload?.diet_meal_id === undefined
        ? null
        : Number(payload.diet_meal_id)
    const notes = String(payload?.notes ?? '').trim() || null
    const database = getDb()

    database.run(
      `UPDATE meal_logs
       SET diet_meal_id = ?, logged_at = ?, day = ?, notes = ?, updated_at = datetime('now')
       WHERE id = ?`,
      [dietMealId, loggedAt, day, notes, id],
    )
    database.run(`DELETE FROM meal_log_foods WHERE meal_log_id = ?`, [id])
    insertFoods(id, foods)
    persist()
    return getLog(id)
  }

  function deleteLog(id) {
    getDb().run(`DELETE FROM meal_logs WHERE id = ?`, [id])
    persist()
    return { ok: true }
  }

  return {
    listByDay,
    listByRange,
    getLog,
    createLog,
    updateLog,
    deleteLog,
  }
}
