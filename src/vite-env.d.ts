/// <reference types="vite/client" />

export type Profile = {
  id: number
  name: string
  created_at: string
  updated_at: string
}

export type FoodUnit = 'g' | 'unidade'

export type DietFood = {
  id?: number
  diet_meal_id?: number
  name: string
  quantity: number
  unit: FoodUnit
  calories?: number | null
  protein?: number | null
  carbs?: number | null
  fat?: number | null
}

export type DietMealInput = {
  name: string
  start_time: string
  end_time: string
  notes?: string | null
  foods: DietFood[]
}

export type DietMeal = DietMealInput & {
  id: number
  profile_id: number
  sort_order: number
  created_at: string
  updated_at: string
  totals: {
    calories: number
    protein: number
    carbs: number
    fat: number
  }
}

export type MealLogFood = {
  id?: number
  meal_log_id?: number
  name: string
  quantity: number
  unit: FoodUnit
  calories?: number | null
  protein?: number | null
  carbs?: number | null
  fat?: number | null
}

export type MealLogInput = {
  diet_meal_id?: number | null
  logged_at: string
  day: string
  notes?: string | null
  foods: MealLogFood[]
}

export type MealLog = MealLogInput & {
  id: number
  profile_id: number
  created_at: string
  updated_at: string
  diet_meal_name?: string | null
  diet_meal_start?: string | null
  diet_meal_end?: string | null
  totals: {
    calories: number
    protein: number
    carbs: number
    fat: number
  }
}

export type WeightLog = {
  id: number
  profile_id: number
  weight_kg: number
  logged_at: string
  notes?: string | null
}

export type WeightLogInput = {
  weight_kg: number
  logged_at: string
  notes?: string | null
}

export type BodyMetrics = {
  id: number
  profile_id: number
  logged_at: string
  body_fat_pct?: number | null
  height_cm?: number | null
  waist_cm?: number | null
  hip_cm?: number | null
  arm_cm?: number | null
  chest_cm?: number | null
  notes?: string | null
}

export type BodyMetricsInput = {
  logged_at: string
  body_fat_pct?: number | null
  height_cm?: number | null
  waist_cm?: number | null
  hip_cm?: number | null
  arm_cm?: number | null
  chest_cm?: number | null
  notes?: string | null
}

export type WorkoutLog = {
  id: number
  profile_id: number
  logged_at: string
  day: string
  done: number
  activity?: string | null
  duration_min?: number | null
  notes?: string | null
}

export type WorkoutLogInput = {
  day: string
  logged_at?: string
  done?: boolean | number
  activity?: string | null
  duration_min?: number | null
  notes?: string | null
}

export type SleepLog = {
  id: number
  profile_id: number
  day: string
  hours: number
  quality?: number | null
  notes?: string | null
  logged_at: string
}

export type SleepLogInput = {
  day: string
  hours: number
  quality?: number | null
  notes?: string | null
  logged_at?: string
}

export type MetricsSummary = {
  latestWeight: WeightLog | null
  latestBody: BodyMetrics | null
  latestHeightCm: number | null
  bmi: number | null
}

export type AppApi = {
  listProfiles: () => Promise<Profile[]>
  createProfile: (name: string) => Promise<Profile>
  renameProfile: (id: number, name: string) => Promise<Profile>
  deleteProfile: (id: number) => Promise<{ ok: boolean }>
  getSetting: (key: string) => Promise<string | null>
  setSetting: (key: string, value: string) => Promise<{ ok: boolean }>
  getPaths: () => Promise<{ dataDir: string; dbPath: string }>
  listDietMeals: (profileId: number) => Promise<DietMeal[]>
  getDietMeal: (id: number) => Promise<DietMeal | null>
  createDietMeal: (profileId: number, meal: DietMealInput) => Promise<DietMeal>
  updateDietMeal: (id: number, meal: DietMealInput) => Promise<DietMeal>
  deleteDietMeal: (id: number) => Promise<{ ok: boolean }>
  listMealLogsByDay: (profileId: number, day: string) => Promise<MealLog[]>
  listMealLogsByRange: (
    profileId: number,
    fromDay: string,
    toDay: string,
  ) => Promise<MealLog[]>
  getMealLog: (id: number) => Promise<MealLog | null>
  createMealLog: (profileId: number, log: MealLogInput) => Promise<MealLog>
  updateMealLog: (id: number, log: MealLogInput) => Promise<MealLog>
  deleteMealLog: (id: number) => Promise<{ ok: boolean }>
  getMetricsSummary: (profileId: number) => Promise<MetricsSummary>
  listWeights: (profileId: number, limit?: number) => Promise<WeightLog[]>
  createWeight: (profileId: number, payload: WeightLogInput) => Promise<WeightLog>
  updateWeight: (id: number, payload: WeightLogInput) => Promise<WeightLog>
  deleteWeight: (id: number) => Promise<{ ok: boolean }>
  listBodyMetrics: (profileId: number, limit?: number) => Promise<BodyMetrics[]>
  createBodyMetrics: (
    profileId: number,
    payload: BodyMetricsInput,
  ) => Promise<BodyMetrics>
  deleteBodyMetrics: (id: number) => Promise<{ ok: boolean }>
  listWorkouts: (profileId: number, limit?: number) => Promise<WorkoutLog[]>
  createWorkout: (
    profileId: number,
    payload: WorkoutLogInput,
  ) => Promise<WorkoutLog>
  deleteWorkout: (id: number) => Promise<{ ok: boolean }>
  listSleep: (profileId: number, limit?: number) => Promise<SleepLog[]>
  createSleep: (profileId: number, payload: SleepLogInput) => Promise<SleepLog>
  deleteSleep: (id: number) => Promise<{ ok: boolean }>
  minimizeWindow?: () => Promise<void>
  maximizeToggle?: () => Promise<boolean>
  closeWindow?: () => Promise<void>
  isWindowMaximized?: () => Promise<boolean>
}

declare global {
  interface Window {
    api: AppApi
  }
}

export {}
