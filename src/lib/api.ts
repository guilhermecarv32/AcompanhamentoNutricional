import { sumFoods } from './nutrition'
import type {
  AppApi,
  BodyMetrics,
  DietMeal,
  DietMealInput,
  MealLog,
  MealLogInput,
  Profile,
  SleepLog,
  WeightLog,
  WorkoutLog,
} from '../vite-env'

const memoryProfiles: Profile[] = []
const memorySettings = new Map<string, string>()
const memoryMeals: DietMeal[] = []
const memoryLogs: MealLog[] = []
const memoryWeights: WeightLog[] = []
const memoryBody: BodyMetrics[] = []
const memoryWorkouts: WorkoutLog[] = []
const memorySleep: SleepLog[] = []
let mealSeq = 1
let foodSeq = 1
let logSeq = 1
let logFoodSeq = 1
let weightSeq = 1
let bodySeq = 1
let workoutSeq = 1
let sleepSeq = 1

function withMealTotals(
  meal: Omit<DietMeal, 'totals'> & { foods: DietMeal['foods'] },
): DietMeal {
  return {
    ...meal,
    totals: sumFoods(meal.foods),
  }
}

function withLogTotals(
  log: Omit<MealLog, 'totals'> & { foods: MealLog['foods'] },
): MealLog {
  return {
    ...log,
    totals: sumFoods(log.foods),
  }
}

function browserFallback(): AppApi {
  console.warn(
    '[api] Rodando no navegador sem Electron — usando armazenamento em memória.',
  )

  return {
    async listProfiles() {
      return [...memoryProfiles].sort((a, b) =>
        a.name.localeCompare(b.name, 'pt-BR'),
      )
    },
    async createProfile(name) {
      const trimmed = name.trim()
      if (!trimmed) throw new Error('Nome do perfil é obrigatório.')
      if (memoryProfiles.some((p) => p.name.toLowerCase() === trimmed.toLowerCase())) {
        throw new Error('Já existe um perfil com esse nome.')
      }
      const now = new Date().toISOString()
      const profile: Profile = {
        id: Date.now(),
        name: trimmed,
        created_at: now,
        updated_at: now,
      }
      memoryProfiles.push(profile)
      return profile
    },
    async renameProfile(id, name) {
      const trimmed = name.trim()
      const profile = memoryProfiles.find((p) => p.id === id)
      if (!profile) throw new Error('Perfil não encontrado.')
      profile.name = trimmed
      profile.updated_at = new Date().toISOString()
      return { ...profile }
    },
    async deleteProfile(id) {
      const index = memoryProfiles.findIndex((p) => p.id === id)
      if (index >= 0) memoryProfiles.splice(index, 1)
      for (let i = memoryMeals.length - 1; i >= 0; i -= 1) {
        if (memoryMeals[i].profile_id === id) memoryMeals.splice(i, 1)
      }
      for (let i = memoryLogs.length - 1; i >= 0; i -= 1) {
        if (memoryLogs[i].profile_id === id) memoryLogs.splice(i, 1)
      }
      return { ok: true }
    },
    async getSetting(key) {
      return memorySettings.get(key) ?? null
    },
    async setSetting(key, value) {
      memorySettings.set(key, value)
      return { ok: true }
    },
    async getPaths() {
      return { dataDir: '(memória)', dbPath: '(memória)' }
    },
    async listDietMeals(profileId) {
      return memoryMeals
        .filter((m) => m.profile_id === profileId)
        .sort((a, b) => a.start_time.localeCompare(b.start_time))
        .map((m) => withMealTotals({ ...m, foods: [...m.foods] }))
    },
    async getDietMeal(id) {
      const meal = memoryMeals.find((m) => m.id === id)
      return meal ? withMealTotals({ ...meal, foods: [...meal.foods] }) : null
    },
    async createDietMeal(profileId, meal) {
      const now = new Date().toISOString()
      const created = withMealTotals({
        id: mealSeq++,
        profile_id: profileId,
        name: meal.name.trim(),
        start_time: meal.start_time,
        end_time: meal.end_time,
        notes: meal.notes ?? null,
        sort_order: memoryMeals.filter((m) => m.profile_id === profileId).length,
        created_at: now,
        updated_at: now,
        foods: meal.foods.map((food) => ({
          ...food,
          id: foodSeq++,
        })),
      })
      memoryMeals.push(created)
      return created
    },
    async updateDietMeal(id, meal) {
      const index = memoryMeals.findIndex((m) => m.id === id)
      if (index < 0) throw new Error('Refeição não encontrada.')
      const current = memoryMeals[index]
      const updated = withMealTotals({
        ...current,
        name: meal.name.trim(),
        start_time: meal.start_time,
        end_time: meal.end_time,
        notes: meal.notes ?? null,
        updated_at: new Date().toISOString(),
        foods: meal.foods.map((food) => ({
          ...food,
          id: food.id ?? foodSeq++,
        })),
      })
      memoryMeals[index] = updated
      return updated
    },
    async deleteDietMeal(id) {
      const index = memoryMeals.findIndex((m) => m.id === id)
      if (index >= 0) memoryMeals.splice(index, 1)
      return { ok: true }
    },
    async listMealLogsByDay(profileId, day) {
      return memoryLogs
        .filter((l) => l.profile_id === profileId && l.day === day)
        .sort((a, b) => a.logged_at.localeCompare(b.logged_at))
        .map((l) => withLogTotals({ ...l, foods: [...l.foods] }))
    },
    async listMealLogsByRange(profileId, fromDay, toDay) {
      return memoryLogs
        .filter(
          (l) =>
            l.profile_id === profileId &&
            l.day >= fromDay &&
            l.day <= toDay,
        )
        .sort((a, b) =>
          a.day === b.day
            ? a.logged_at.localeCompare(b.logged_at)
            : a.day.localeCompare(b.day),
        )
        .map((l) => withLogTotals({ ...l, foods: [...l.foods] }))
    },
    async getMealLog(id) {
      const log = memoryLogs.find((l) => l.id === id)
      return log ? withLogTotals({ ...log, foods: [...log.foods] }) : null
    },
    async createMealLog(profileId, log) {
      const now = new Date().toISOString()
      const diet = memoryMeals.find((m) => m.id === log.diet_meal_id)
      const created = withLogTotals({
        id: logSeq++,
        profile_id: profileId,
        diet_meal_id: log.diet_meal_id ?? null,
        logged_at: log.logged_at,
        day: log.day,
        notes: log.notes ?? null,
        created_at: now,
        updated_at: now,
        diet_meal_name: diet?.name ?? null,
        diet_meal_start: diet?.start_time ?? null,
        diet_meal_end: diet?.end_time ?? null,
        foods: log.foods.map((food) => ({
          ...food,
          id: logFoodSeq++,
        })),
      })
      memoryLogs.push(created)
      return created
    },
    async updateMealLog(id, log) {
      const index = memoryLogs.findIndex((l) => l.id === id)
      if (index < 0) throw new Error('Registro não encontrado.')
      const current = memoryLogs[index]
      const diet = memoryMeals.find((m) => m.id === log.diet_meal_id)
      const updated = withLogTotals({
        ...current,
        diet_meal_id: log.diet_meal_id ?? null,
        logged_at: log.logged_at,
        day: log.day,
        notes: log.notes ?? null,
        updated_at: new Date().toISOString(),
        diet_meal_name: diet?.name ?? null,
        diet_meal_start: diet?.start_time ?? null,
        diet_meal_end: diet?.end_time ?? null,
        foods: log.foods.map((food) => ({
          ...food,
          id: food.id ?? logFoodSeq++,
        })),
      })
      memoryLogs[index] = updated
      return updated
    },
    async deleteMealLog(id) {
      const index = memoryLogs.findIndex((l) => l.id === id)
      if (index >= 0) memoryLogs.splice(index, 1)
      return { ok: true }
    },
    async getMetricsSummary(profileId) {
      const latestWeight =
        memoryWeights
          .filter((w) => w.profile_id === profileId)
          .sort((a, b) => b.logged_at.localeCompare(a.logged_at))[0] ?? null
      const latestBody =
        memoryBody
          .filter((b) => b.profile_id === profileId)
          .sort((a, b) => b.logged_at.localeCompare(a.logged_at))[0] ?? null
      const latestHeightCm =
        memoryBody
          .filter((b) => b.profile_id === profileId && b.height_cm != null)
          .sort((a, b) => b.logged_at.localeCompare(a.logged_at))[0]?.height_cm ??
        null
      let bmi: number | null = null
      if (latestWeight && latestHeightCm) {
        const meters = Number(latestHeightCm) / 100
        if (meters > 0) {
          bmi =
            Math.round((latestWeight.weight_kg / (meters * meters)) * 10) / 10
        }
      }
      return { latestWeight, latestBody, latestHeightCm, bmi }
    },
    async listWeights(profileId, limit = 60) {
      return memoryWeights
        .filter((w) => w.profile_id === profileId)
        .sort((a, b) => b.logged_at.localeCompare(a.logged_at))
        .slice(0, limit)
    },
    async createWeight(profileId, payload) {
      const row: WeightLog = {
        id: weightSeq++,
        profile_id: profileId,
        weight_kg: payload.weight_kg,
        logged_at: payload.logged_at,
        notes: payload.notes ?? null,
      }
      memoryWeights.unshift(row)
      return row
    },
    async updateWeight(id, payload) {
      const row = memoryWeights.find((w) => w.id === id)
      if (!row) throw new Error('Registro de peso não encontrado.')
      row.weight_kg = payload.weight_kg
      row.logged_at = payload.logged_at
      row.notes = payload.notes ?? null
      return { ...row }
    },
    async deleteWeight(id) {
      const index = memoryWeights.findIndex((w) => w.id === id)
      if (index >= 0) memoryWeights.splice(index, 1)
      return { ok: true }
    },
    async listBodyMetrics(profileId, limit = 40) {
      return memoryBody
        .filter((b) => b.profile_id === profileId)
        .sort((a, b) => b.logged_at.localeCompare(a.logged_at))
        .slice(0, limit)
    },
    async createBodyMetrics(profileId, payload) {
      const row: BodyMetrics = {
        id: bodySeq++,
        profile_id: profileId,
        logged_at: payload.logged_at,
        body_fat_pct: payload.body_fat_pct ?? null,
        height_cm: payload.height_cm ?? null,
        waist_cm: payload.waist_cm ?? null,
        hip_cm: payload.hip_cm ?? null,
        arm_cm: payload.arm_cm ?? null,
        chest_cm: payload.chest_cm ?? null,
        notes: payload.notes ?? null,
      }
      memoryBody.unshift(row)
      return row
    },
    async deleteBodyMetrics(id) {
      const index = memoryBody.findIndex((b) => b.id === id)
      if (index >= 0) memoryBody.splice(index, 1)
      return { ok: true }
    },
    async listWorkouts(profileId, limit = 40) {
      return memoryWorkouts
        .filter((w) => w.profile_id === profileId)
        .sort((a, b) => b.day.localeCompare(a.day))
        .slice(0, limit)
    },
    async createWorkout(profileId, payload) {
      const row: WorkoutLog = {
        id: workoutSeq++,
        profile_id: profileId,
        logged_at: payload.logged_at ?? `${payload.day}T12:00`,
        day: payload.day,
        done: payload.done === false || payload.done === 0 ? 0 : 1,
        activity: payload.activity ?? null,
        duration_min: payload.duration_min ?? null,
        notes: payload.notes ?? null,
      }
      memoryWorkouts.unshift(row)
      return row
    },
    async deleteWorkout(id) {
      const index = memoryWorkouts.findIndex((w) => w.id === id)
      if (index >= 0) memoryWorkouts.splice(index, 1)
      return { ok: true }
    },
    async listSleep(profileId, limit = 40) {
      return memorySleep
        .filter((s) => s.profile_id === profileId)
        .sort((a, b) => b.day.localeCompare(a.day))
        .slice(0, limit)
    },
    async createSleep(profileId, payload) {
      const row: SleepLog = {
        id: sleepSeq++,
        profile_id: profileId,
        day: payload.day,
        hours: payload.hours,
        quality: payload.quality ?? null,
        notes: payload.notes ?? null,
        logged_at: payload.logged_at ?? `${payload.day}T08:00`,
      }
      memorySleep.unshift(row)
      return row
    },
    async deleteSleep(id) {
      const index = memorySleep.findIndex((s) => s.id === id)
      if (index >= 0) memorySleep.splice(index, 1)
      return { ok: true }
    },
    async minimizeWindow() {},
    async maximizeToggle() {
      return false
    },
    async closeWindow() {},
    async isWindowMaximized() {
      return false
    },
  }
}

export function getApi(): AppApi {
  if (typeof window !== 'undefined' && window.api) return window.api
  return browserFallback()
}

export type { DietMeal, DietMealInput, MealLog, MealLogInput }
