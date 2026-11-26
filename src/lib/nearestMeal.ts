import type { DietMeal } from '../vite-env'

export type NearestMealResult = {
  meal: DietMeal
  distanceMinutes: number
  insideWindow: boolean
}

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

/** Distância em minutos até o range [start, end], considerando virada de dia. */
export function distanceToWindow(
  nowMinutes: number,
  start: string,
  end: string,
): { distance: number; inside: boolean } {
  const startMin = toMinutes(start)
  const endMin = toMinutes(end)

  // Janela normal no mesmo dia
  if (startMin <= endMin) {
    if (nowMinutes >= startMin && nowMinutes <= endMin) {
      return { distance: 0, inside: true }
    }
    if (nowMinutes < startMin) {
      return { distance: startMin - nowMinutes, inside: false }
    }
    return { distance: nowMinutes - endMin, inside: false }
  }

  // Janela que atravessa meia-noite (ex.: 22:00–01:00)
  if (nowMinutes >= startMin || nowMinutes <= endMin) {
    return { distance: 0, inside: true }
  }

  const toStart = startMin - nowMinutes
  const toEnd = nowMinutes - endMin
  return { distance: Math.min(toStart, toEnd), inside: false }
}

export function findNearestMeal(
  meals: DietMeal[],
  at: Date = new Date(),
): NearestMealResult | null {
  if (!meals.length) return null

  const nowMinutes = at.getHours() * 60 + at.getMinutes()
  let best: NearestMealResult | null = null

  for (const meal of meals) {
    const { distance, inside } = distanceToWindow(
      nowMinutes,
      meal.start_time,
      meal.end_time,
    )
    const candidate: NearestMealResult = {
      meal,
      distanceMinutes: distance,
      insideWindow: inside,
    }

    if (!best) {
      best = candidate
      continue
    }

    // Prefere quem está dentro da janela; depois menor distância; depois mais cedo
    if (candidate.insideWindow && !best.insideWindow) {
      best = candidate
      continue
    }
    if (candidate.insideWindow === best.insideWindow) {
      if (candidate.distanceMinutes < best.distanceMinutes) {
        best = candidate
      } else if (
        candidate.distanceMinutes === best.distanceMinutes &&
        candidate.meal.start_time < best.meal.start_time
      ) {
        best = candidate
      }
    }
  }

  return best
}

export function formatDistanceLabel(result: NearestMealResult): string {
  if (result.insideWindow) return 'dentro do horário previsto'
  if (result.distanceMinutes < 60) {
    return `a ${result.distanceMinutes} min do horário`
  }
  const hours = Math.floor(result.distanceMinutes / 60)
  const mins = result.distanceMinutes % 60
  return mins
    ? `a ${hours}h ${mins}min do horário`
    : `a ${hours}h do horário`
}

export function localDayString(date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function localDateTimeValue(date = new Date()): string {
  const day = localDayString(date)
  const hh = String(date.getHours()).padStart(2, '0')
  const mm = String(date.getMinutes()).padStart(2, '0')
  return `${day}T${hh}:${mm}`
}

export function dayFromDateTimeLocal(value: string): string {
  return value.slice(0, 10)
}
