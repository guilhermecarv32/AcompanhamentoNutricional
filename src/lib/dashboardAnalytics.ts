import {
  eachDayOfInterval,
  format,
  parseISO,
  subDays,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { distanceToWindow } from './nearestMeal'
import { emptyTotals, sumFoods, type MacroTotals } from './nutrition'
import type {
  BodyMetrics,
  DietMeal,
  MealLog,
  SleepLog,
  WeightLog,
  WorkoutLog,
} from '../vite-env'

export type DashboardRange = 7 | 30

export type DashboardModel = {
  todayAdherencePct: number
  weekAdherencePct: number
  todayPlannedKcal: number
  todayActualKcal: number
  calorieSeries: { day: string; label: string; planned: number; actual: number; delta: number }[]
  accumulatedDelta: number
  mostSkipped: { name: string; skipped: number; plannedDays: number }[]
  punctualityPct: number
  avgDelayMinutes: number
  weightSeries: { day: string; label: string; weight: number }[]
  weightDeltaWeek: number | null
  weightDeltaMonth: number | null
  weightCalorieCorr: { weekLabel: string; avgKcal: number; weightChange: number }[]
  macrosPlanned: MacroTotals
  macrosActual: MacroTotals
  workoutDays: number
  workoutTotalDays: number
  sleepSeries: { day: string; label: string; hours: number; quality: number | null }[]
  avgSleepHours: number | null
  bodyMeasureSeries: {
    day: string
    label: string
    waist: number | null
    hip: number | null
    arm: number | null
    chest: number | null
  }[]
  bodyFatSeries: { day: string; label: string; fat: number }[]
  weekdayStats: { weekday: string; avgDelta: number; samples: number }[]
  bestWeekday: string | null
  worstWeekday: string | null
  weeklySummary: string
}

function dayKey(date: Date) {
  return format(date, 'yyyy-MM-dd')
}

function shortLabel(day: string) {
  return format(parseISO(`${day}T12:00:00`), 'dd/MM')
}

function weekdayName(day: string) {
  return format(parseISO(`${day}T12:00:00`), 'EEEE', { locale: ptBR })
}

function plannedDayKcal(meals: DietMeal[]) {
  return meals.reduce((sum, meal) => sum + (meal.totals.calories || 0), 0)
}

function actualDayKcal(logs: MealLog[]) {
  return logs.reduce((sum, log) => sum + (log.totals.calories || 0), 0)
}

function adherenceForDay(meals: DietMeal[], logs: MealLog[]) {
  if (!meals.length) return 0
  const done = meals.filter((meal) =>
    logs.some((log) => log.diet_meal_id === meal.id),
  ).length
  return (done / meals.length) * 100
}

function logMinutes(loggedAt: string) {
  const time = loggedAt.includes('T')
    ? loggedAt.slice(11, 16)
    : loggedAt.slice(11, 16)
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

function signedDelayMinutes(
  loggedAt: string,
  start: string,
  end: string,
): { onTime: boolean; delay: number } {
  const now = logMinutes(loggedAt)
  const { inside, distance } = distanceToWindow(now, start, end)
  if (inside) return { onTime: true, delay: 0 }

  // positivo = atrasado em relação ao fim; negativo = adiantado em relação ao início
  const startMin = Number(start.slice(0, 2)) * 60 + Number(start.slice(3, 5))
  const endMin = Number(end.slice(0, 2)) * 60 + Number(end.slice(3, 5))
  if (startMin <= endMin) {
    if (now < startMin) return { onTime: false, delay: -(startMin - now) }
    return { onTime: false, delay: now - endMin }
  }
  return { onTime: false, delay: distance }
}

export function buildDashboard(input: {
  today: string
  rangeDays: DashboardRange
  dietMeals: DietMeal[]
  logs: MealLog[]
  weights: WeightLog[]
  bodies: BodyMetrics[]
  workouts: WorkoutLog[]
  sleep: SleepLog[]
}): DashboardModel {
  const {
    today,
    rangeDays,
    dietMeals,
    logs,
    weights,
    bodies,
    workouts,
    sleep,
  } = input

  const todayDate = parseISO(`${today}T12:00:00`)
  const fromDate = subDays(todayDate, rangeDays - 1)
  const days = eachDayOfInterval({ start: fromDate, end: todayDate }).map(dayKey)
  const weekDays = eachDayOfInterval({
    start: subDays(todayDate, 6),
    end: todayDate,
  }).map(dayKey)

  const logsByDay = new Map<string, MealLog[]>()
  for (const day of days) logsByDay.set(day, [])
  for (const log of logs) {
    const bucket = logsByDay.get(log.day)
    if (bucket) bucket.push(log)
  }

  const plannedKcal = plannedDayKcal(dietMeals)
  const todayLogs = logsByDay.get(today) ?? []
  const todayAdherencePct = Math.round(adherenceForDay(dietMeals, todayLogs))
  const weekAdherencePct = Math.round(
    weekDays.reduce(
      (sum, day) => sum + adherenceForDay(dietMeals, logsByDay.get(day) ?? []),
      0,
    ) / weekDays.length,
  )

  const calorieSeries = days.map((day) => {
    const actual = actualDayKcal(logsByDay.get(day) ?? [])
    return {
      day,
      label: shortLabel(day),
      planned: plannedKcal,
      actual,
      delta: actual - plannedKcal,
    }
  })

  const accumulatedDelta = calorieSeries.reduce((sum, row) => sum + row.delta, 0)

  const skippedMap = new Map<string, { name: string; skipped: number; plannedDays: number }>()
  for (const meal of dietMeals) {
    skippedMap.set(String(meal.id), {
      name: meal.name,
      skipped: 0,
      plannedDays: days.length,
    })
  }
  for (const day of days) {
    const dayLogs = logsByDay.get(day) ?? []
    for (const meal of dietMeals) {
      const done = dayLogs.some((log) => log.diet_meal_id === meal.id)
      if (!done) {
        const row = skippedMap.get(String(meal.id))
        if (row) row.skipped += 1
      }
    }
  }
  const mostSkipped = [...skippedMap.values()]
    .sort((a, b) => b.skipped - a.skipped)
    .slice(0, 5)

  let onTimeCount = 0
  let timedCount = 0
  let delaySum = 0
  for (const log of logs) {
    if (log.diet_meal_id == null) continue
    const meal = dietMeals.find((m) => m.id === log.diet_meal_id)
    if (!meal) continue
    const result = signedDelayMinutes(log.logged_at, meal.start_time, meal.end_time)
    timedCount += 1
    if (result.onTime) onTimeCount += 1
    delaySum += result.delay
  }
  const punctualityPct = timedCount ? Math.round((onTimeCount / timedCount) * 100) : 0
  const avgDelayMinutes = timedCount ? Math.round(delaySum / timedCount) : 0

  const weightSorted = [...weights].sort((a, b) =>
    a.logged_at.localeCompare(b.logged_at),
  )
  const weightSeries = weightSorted.map((w) => {
    const day = w.logged_at.slice(0, 10)
    return {
      day,
      label: shortLabel(day),
      weight: w.weight_kg,
    }
  })

  function weightNear(targetDay: string) {
    const target = parseISO(`${targetDay}T12:00:00`).getTime()
    let best: WeightLog | null = null
    let bestDist = Infinity
    for (const w of weightSorted) {
      const t = parseISO(w.logged_at.slice(0, 16)).getTime()
      const dist = Math.abs(t - target)
      if (dist < bestDist) {
        best = w
        bestDist = dist
      }
    }
    return best
  }

  const weekAgo = dayKey(subDays(todayDate, 7))
  const monthAgo = dayKey(subDays(todayDate, 30))
  const nowW = weightNear(today)
  const weekW = weightNear(weekAgo)
  const monthW = weightNear(monthAgo)
  const weightDeltaWeek =
    nowW && weekW ? Math.round((nowW.weight_kg - weekW.weight_kg) * 10) / 10 : null
  const weightDeltaMonth =
    nowW && monthW
      ? Math.round((nowW.weight_kg - monthW.weight_kg) * 10) / 10
      : null

  const weightCalorieCorr: DashboardModel['weightCalorieCorr'] = []
  for (let i = 3; i >= 0; i -= 1) {
    const end = subDays(todayDate, i * 7)
    const start = subDays(end, 6)
    const keys = eachDayOfInterval({ start, end }).map(dayKey)
    const avgKcal =
      keys.reduce((sum, day) => sum + actualDayKcal(logsByDay.get(day) ?? []), 0) /
      keys.length
    const startW = weightNear(dayKey(start))
    const endW = weightNear(dayKey(end))
    weightCalorieCorr.push({
      weekLabel: `${shortLabel(dayKey(start))}–${shortLabel(dayKey(end))}`,
      avgKcal: Math.round(avgKcal),
      weightChange:
        startW && endW
          ? Math.round((endW.weight_kg - startW.weight_kg) * 10) / 10
          : 0,
    })
  }

  const macrosPlanned = dietMeals.reduce((acc, meal) => {
    const t = sumFoods(meal.foods)
    acc.calories += t.calories
    acc.protein += t.protein
    acc.carbs += t.carbs
    acc.fat += t.fat
    return acc
  }, emptyTotals())

  const macrosActual = (logsByDay.get(today) ?? []).reduce((acc, log) => {
    const t = sumFoods(log.foods)
    acc.calories += t.calories
    acc.protein += t.protein
    acc.carbs += t.carbs
    acc.fat += t.fat
    return acc
  }, emptyTotals())

  const workoutDays = new Set(
    workouts.filter((w) => w.done).map((w) => w.day),
  ).size
  const workoutTotalDays = days.length

  const sleepByDay = new Map(sleep.map((s) => [s.day, s]))
  const sleepSeries = days
    .map((day) => {
      const row = sleepByDay.get(day)
      if (!row) return null
      return {
        day,
        label: shortLabel(day),
        hours: row.hours,
        quality: row.quality ?? null,
      }
    })
    .filter((row): row is NonNullable<typeof row> => Boolean(row))
  const avgSleepHours = sleepSeries.length
    ? Math.round(
        (sleepSeries.reduce((sum, row) => sum + row.hours, 0) / sleepSeries.length) *
          10,
      ) / 10
    : null

  const bodyMeasureSeries = [...bodies]
    .sort((a, b) => a.logged_at.localeCompare(b.logged_at))
    .map((b) => {
      const day = b.logged_at.slice(0, 10)
      return {
        day,
        label: shortLabel(day),
        waist: b.waist_cm ?? null,
        hip: b.hip_cm ?? null,
        arm: b.arm_cm ?? null,
        chest: b.chest_cm ?? null,
      }
    })

  const bodyFatSeries = [...bodies]
    .filter((b) => b.body_fat_pct != null)
    .sort((a, b) => a.logged_at.localeCompare(b.logged_at))
    .map((b) => {
      const day = b.logged_at.slice(0, 10)
      return {
        day,
        label: shortLabel(day),
        fat: Number(b.body_fat_pct),
      }
    })

  const weekdayBucket = new Map<string, { total: number; samples: number }>()
  for (const day of days) {
    const name = weekdayName(day)
    const delta = actualDayKcal(logsByDay.get(day) ?? []) - plannedKcal
    const current = weekdayBucket.get(name) ?? { total: 0, samples: 0 }
    current.total += delta
    current.samples += 1
    weekdayBucket.set(name, current)
  }
  const weekdayStats = [...weekdayBucket.entries()].map(([weekday, row]) => ({
    weekday,
    avgDelta: row.samples ? Math.round(row.total / row.samples) : 0,
    samples: row.samples,
  }))
  const ranked = [...weekdayStats].sort((a, b) => a.avgDelta - b.avgDelta)
  const bestWeekday = ranked[0]?.weekday ?? null
  const worstWeekday = ranked[ranked.length - 1]?.weekday ?? null

  const weekDelta = calorieSeries
    .filter((row) => weekDays.includes(row.day))
    .reduce((sum, row) => sum + row.delta, 0)
  const weeklySummary = [
    `Você bateu ${weekAdherencePct}% da dieta na média da semana`,
    `${weekDelta >= 0 ? '+' : ''}${Math.round(weekDelta)} kcal na diferença acumulada`,
    weightDeltaWeek != null
      ? `e o peso ${weightDeltaWeek >= 0 ? 'subiu' : 'caiu'} ${Math.abs(weightDeltaWeek)} kg`
      : 'e ainda sem variação de peso suficiente no período',
  ].join(', ')

  return {
    todayAdherencePct,
    weekAdherencePct,
    todayPlannedKcal: plannedKcal,
    todayActualKcal: actualDayKcal(todayLogs),
    calorieSeries,
    accumulatedDelta: Math.round(accumulatedDelta),
    mostSkipped,
    punctualityPct,
    avgDelayMinutes,
    weightSeries,
    weightDeltaWeek,
    weightDeltaMonth,
    weightCalorieCorr,
    macrosPlanned,
    macrosActual,
    workoutDays,
    workoutTotalDays,
    sleepSeries,
    avgSleepHours,
    bodyMeasureSeries,
    bodyFatSeries,
    weekdayStats,
    bestWeekday,
    worstWeekday,
    weeklySummary: `${weeklySummary}.`,
  }
}

export function rangeFromToday(today: string, rangeDays: DashboardRange) {
  const todayDate = parseISO(`${today}T12:00:00`)
  const fromDate = subDays(todayDate, rangeDays - 1)
  return {
    fromDay: dayKey(fromDate),
    toDay: today,
  }
}
