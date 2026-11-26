import type { DietMeal, MealLog } from '../vite-env'

export type ProgressSlot = {
  key: string
  dietMeal: DietMeal | null
  logs: MealLog[]
  plannedCalories: number
  actualCalories: number
  status: 'done' | 'missed' | 'extra'
}

export type DayProgress = {
  slots: ProgressSlot[]
  plannedCalories: number
  actualCalories: number
  deltaCalories: number
  mealsPlanned: number
  mealsDone: number
  adherencePct: number
  unassignedCount: number
}

export function buildDayProgress(
  dietMeals: DietMeal[],
  logs: MealLog[],
): DayProgress {
  const ordered = [...dietMeals].sort((a, b) => {
    const byTime = a.start_time.localeCompare(b.start_time)
    if (byTime !== 0) return byTime
    return a.sort_order - b.sort_order || a.id - b.id
  })

  const usedLogIds = new Set<number>()
  const slots: ProgressSlot[] = ordered.map((meal) => {
    const mealLogs = logs.filter((log) => log.diet_meal_id === meal.id)
    for (const log of mealLogs) usedLogIds.add(log.id)

    const actualCalories = mealLogs.reduce(
      (sum, log) => sum + (log.totals.calories || 0),
      0,
    )

    return {
      key: `diet-${meal.id}`,
      dietMeal: meal,
      logs: mealLogs,
      plannedCalories: meal.totals.calories || 0,
      actualCalories,
      status: mealLogs.length > 0 ? 'done' : 'missed',
    }
  })

  const unassigned = logs.filter((log) => !usedLogIds.has(log.id))
  if (unassigned.length) {
    const actualCalories = unassigned.reduce(
      (sum, log) => sum + (log.totals.calories || 0),
      0,
    )
    slots.push({
      key: 'unassigned',
      dietMeal: null,
      logs: unassigned,
      plannedCalories: 0,
      actualCalories,
      status: 'extra',
    })
  }

  const plannedCalories = ordered.reduce(
    (sum, meal) => sum + (meal.totals.calories || 0),
    0,
  )
  const actualCalories = logs.reduce(
    (sum, log) => sum + (log.totals.calories || 0),
    0,
  )
  const mealsPlanned = ordered.length
  const mealsDone = ordered.filter((meal) =>
    logs.some((log) => log.diet_meal_id === meal.id),
  ).length
  const adherencePct =
    mealsPlanned === 0 ? 0 : Math.round((mealsDone / mealsPlanned) * 100)

  return {
    slots,
    plannedCalories,
    actualCalories,
    deltaCalories: actualCalories - plannedCalories,
    mealsPlanned,
    mealsDone,
    adherencePct,
    unassignedCount: unassigned.length,
  }
}

export function formatDayLabel(day: string): string {
  const date = new Date(`${day}T12:00:00`)
  return date.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  })
}

export function shiftDay(day: string, delta: number): string {
  const date = new Date(`${day}T12:00:00`)
  date.setDate(date.getDate() + delta)
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function formatSignedKcal(value: number): string {
  const rounded = Math.round(value)
  if (rounded > 0) return `+${rounded} kcal`
  return `${rounded} kcal`
}
