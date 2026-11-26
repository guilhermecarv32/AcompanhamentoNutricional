/**
 * Peso, medidas corporais, treino e sono.
 * @param {{
 *   queryAll: (sql: string, params?: unknown[]) => Record<string, unknown>[]
 *   queryOne: (sql: string, params?: unknown[]) => Record<string, unknown> | null
 *   persist: () => void
 *   getDb: () => import('sql.js').Database
 * }} deps
 */
export function createMetricsService({ queryAll, queryOne, persist, getDb }) {
  function nullNumber(value) {
    if (value === null || value === undefined || value === '') return null
    const n = Number(value)
    if (Number.isNaN(n)) return null
    return n
  }

  function requireNumber(value, label) {
    const n = Number(value)
    if (!Number.isFinite(n)) throw new Error(`${label} inválido.`)
    return n
  }

  // --- Peso ---
  function listWeights(profileId, limit = 60) {
    return queryAll(
      `SELECT id, profile_id, weight_kg, logged_at, notes
       FROM weight_logs
       WHERE profile_id = ?
       ORDER BY logged_at DESC, id DESC
       LIMIT ?`,
      [profileId, limit],
    )
  }

  function createWeight(profileId, payload) {
    const weight_kg = requireNumber(payload?.weight_kg, 'Peso')
    if (weight_kg <= 0 || weight_kg > 400) {
      throw new Error('Peso deve ser um valor realista em kg.')
    }
    const logged_at = String(payload?.logged_at ?? '').trim()
    if (!logged_at) throw new Error('Data do peso é obrigatória.')
    const notes = String(payload?.notes ?? '').trim() || null

    getDb().run(
      `INSERT INTO weight_logs (profile_id, weight_kg, logged_at, notes)
       VALUES (?, ?, ?, ?)`,
      [profileId, weight_kg, logged_at, notes],
    )
    persist()
    return queryOne(
      `SELECT id, profile_id, weight_kg, logged_at, notes
       FROM weight_logs WHERE id = last_insert_rowid()`,
    )
  }

  function updateWeight(id, payload) {
    const current = queryOne(`SELECT id FROM weight_logs WHERE id = ?`, [id])
    if (!current) throw new Error('Registro de peso não encontrado.')

    const weight_kg = requireNumber(payload?.weight_kg, 'Peso')
    if (weight_kg <= 0 || weight_kg > 400) {
      throw new Error('Peso deve ser um valor realista em kg.')
    }
    const logged_at = String(payload?.logged_at ?? '').trim()
    if (!logged_at) throw new Error('Data do peso é obrigatória.')
    const notes = String(payload?.notes ?? '').trim() || null

    getDb().run(
      `UPDATE weight_logs
       SET weight_kg = ?, logged_at = ?, notes = ?
       WHERE id = ?`,
      [weight_kg, logged_at, notes, id],
    )
    persist()
    return queryOne(
      `SELECT id, profile_id, weight_kg, logged_at, notes
       FROM weight_logs WHERE id = ?`,
      [id],
    )
  }

  function deleteWeight(id) {
    getDb().run(`DELETE FROM weight_logs WHERE id = ?`, [id])
    persist()
    return { ok: true }
  }

  // --- Medidas / % gordura ---
  function listBodyMetrics(profileId, limit = 40) {
    return queryAll(
      `SELECT id, profile_id, logged_at, body_fat_pct, height_cm,
              waist_cm, hip_cm, arm_cm, chest_cm, notes
       FROM body_metrics
       WHERE profile_id = ?
       ORDER BY logged_at DESC, id DESC
       LIMIT ?`,
      [profileId, limit],
    )
  }

  function createBodyMetrics(profileId, payload) {
    const logged_at = String(payload?.logged_at ?? '').trim()
    if (!logged_at) throw new Error('Data das medidas é obrigatória.')

    const body_fat_pct = nullNumber(payload?.body_fat_pct)
    const height_cm = nullNumber(payload?.height_cm)
    const waist_cm = nullNumber(payload?.waist_cm)
    const hip_cm = nullNumber(payload?.hip_cm)
    const arm_cm = nullNumber(payload?.arm_cm)
    const chest_cm = nullNumber(payload?.chest_cm)
    const notes = String(payload?.notes ?? '').trim() || null

    const hasAny = [
      body_fat_pct,
      height_cm,
      waist_cm,
      hip_cm,
      arm_cm,
      chest_cm,
    ].some((v) => v !== null)

    if (!hasAny) {
      throw new Error('Informe pelo menos uma medida ou % de gordura.')
    }

    getDb().run(
      `INSERT INTO body_metrics
        (profile_id, logged_at, body_fat_pct, height_cm, waist_cm, hip_cm, arm_cm, chest_cm, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        profileId,
        logged_at,
        body_fat_pct,
        height_cm,
        waist_cm,
        hip_cm,
        arm_cm,
        chest_cm,
        notes,
      ],
    )
    persist()
    return queryOne(
      `SELECT id, profile_id, logged_at, body_fat_pct, height_cm,
              waist_cm, hip_cm, arm_cm, chest_cm, notes
       FROM body_metrics WHERE id = last_insert_rowid()`,
    )
  }

  function deleteBodyMetrics(id) {
    getDb().run(`DELETE FROM body_metrics WHERE id = ?`, [id])
    persist()
    return { ok: true }
  }

  // --- Treino ---
  function listWorkouts(profileId, limit = 40) {
    return queryAll(
      `SELECT id, profile_id, logged_at, day, done, activity, duration_min, notes
       FROM workout_logs
       WHERE profile_id = ?
       ORDER BY day DESC, id DESC
       LIMIT ?`,
      [profileId, limit],
    )
  }

  function createWorkout(profileId, payload) {
    const day = String(payload?.day ?? '').trim()
    if (!day) throw new Error('Dia do treino é obrigatório.')
    const logged_at = String(payload?.logged_at ?? `${day}T12:00`).trim()
    const done = payload?.done === false || payload?.done === 0 ? 0 : 1
    const activity = String(payload?.activity ?? '').trim() || null
    const duration_min = nullNumber(payload?.duration_min)
    const notes = String(payload?.notes ?? '').trim() || null

    getDb().run(
      `INSERT INTO workout_logs
        (profile_id, logged_at, day, done, activity, duration_min, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [profileId, logged_at, day, done, activity, duration_min, notes],
    )
    persist()
    return queryOne(
      `SELECT id, profile_id, logged_at, day, done, activity, duration_min, notes
       FROM workout_logs WHERE id = last_insert_rowid()`,
    )
  }

  function deleteWorkout(id) {
    getDb().run(`DELETE FROM workout_logs WHERE id = ?`, [id])
    persist()
    return { ok: true }
  }

  // --- Sono ---
  function listSleep(profileId, limit = 40) {
    return queryAll(
      `SELECT id, profile_id, day, hours, quality, notes, logged_at
       FROM sleep_logs
       WHERE profile_id = ?
       ORDER BY day DESC, id DESC
       LIMIT ?`,
      [profileId, limit],
    )
  }

  function createSleep(profileId, payload) {
    const day = String(payload?.day ?? '').trim()
    if (!day) throw new Error('Dia do sono é obrigatório.')
    const hours = nullNumber(payload?.hours)
    if (hours === null || hours < 0 || hours > 24) {
      throw new Error('Informe as horas de sono (0 a 24).')
    }
    const quality = nullNumber(payload?.quality)
    if (quality !== null && (quality < 1 || quality > 5)) {
      throw new Error('Qualidade do sono deve ser de 1 a 5.')
    }
    const notes = String(payload?.notes ?? '').trim() || null
    const logged_at = String(payload?.logged_at ?? `${day}T08:00`).trim()

    getDb().run(
      `INSERT INTO sleep_logs
        (profile_id, day, hours, quality, notes, logged_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [profileId, day, hours, quality, notes, logged_at],
    )
    persist()
    return queryOne(
      `SELECT id, profile_id, day, hours, quality, notes, logged_at
       FROM sleep_logs WHERE id = last_insert_rowid()`,
    )
  }

  function deleteSleep(id) {
    getDb().run(`DELETE FROM sleep_logs WHERE id = ?`, [id])
    persist()
    return { ok: true }
  }

  function getLatestSummary(profileId) {
    const latestWeight = queryOne(
      `SELECT id, profile_id, weight_kg, logged_at, notes
       FROM weight_logs
       WHERE profile_id = ?
       ORDER BY logged_at DESC, id DESC
       LIMIT 1`,
      [profileId],
    )
    const latestBody = queryOne(
      `SELECT id, profile_id, logged_at, body_fat_pct, height_cm,
              waist_cm, hip_cm, arm_cm, chest_cm, notes
       FROM body_metrics
       WHERE profile_id = ?
       ORDER BY logged_at DESC, id DESC
       LIMIT 1`,
      [profileId],
    )
    const latestHeight = queryOne(
      `SELECT height_cm FROM body_metrics
       WHERE profile_id = ? AND height_cm IS NOT NULL
       ORDER BY logged_at DESC, id DESC
       LIMIT 1`,
      [profileId],
    )

    let bmi = null
    if (latestWeight?.weight_kg && latestHeight?.height_cm) {
      const meters = Number(latestHeight.height_cm) / 100
      if (meters > 0) {
        bmi = Math.round((Number(latestWeight.weight_kg) / (meters * meters)) * 10) / 10
      }
    }

    return {
      latestWeight: latestWeight ?? null,
      latestBody: latestBody ?? null,
      latestHeightCm: latestHeight?.height_cm ?? null,
      bmi,
    }
  }

  return {
    listWeights,
    createWeight,
    updateWeight,
    deleteWeight,
    listBodyMetrics,
    createBodyMetrics,
    deleteBodyMetrics,
    listWorkouts,
    createWorkout,
    deleteWorkout,
    listSleep,
    createSleep,
    deleteSleep,
    getLatestSummary,
  }
}
