import type { DietFood } from '../vite-env'

export type MacroTotals = {
  calories: number
  protein: number
  carbs: number
  fat: number
}

export function emptyTotals(): MacroTotals {
  return { calories: 0, protein: 0, carbs: 0, fat: 0 }
}

export function sumFoods(foods: DietFood[]): MacroTotals {
  return foods.reduce((acc, food) => {
    acc.calories += Number(food.calories) || 0
    acc.protein += Number(food.protein) || 0
    acc.carbs += Number(food.carbs) || 0
    acc.fat += Number(food.fat) || 0
    return acc
  }, emptyTotals())
}

export function formatKcal(value: number) {
  return `${Math.round(value)} kcal`
}

export function formatMacro(value: number, suffix = 'g') {
  const rounded = Math.round(value * 10) / 10
  return `${rounded}${suffix}`
}
