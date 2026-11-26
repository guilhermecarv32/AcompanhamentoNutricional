export type FoodSearchHit = {
  id: string
  name: string
  brand?: string
  caloriesPer100g: number | null
  proteinPer100g: number | null
  carbsPer100g: number | null
  fatPer100g: number | null
  servingQuantity?: number | null
  servingUnit?: 'g' | 'unidade'
}

type OffProduct = {
  code?: string
  product_name?: string
  product_name_pt?: string
  brands?: string
  nutriments?: Record<string, number | undefined>
  serving_quantity?: string | number
  serving_size?: string
}

function num(value: unknown): number | null {
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

function mapProduct(product: OffProduct): FoodSearchHit | null {
  const name =
    product.product_name_pt?.trim() ||
    product.product_name?.trim() ||
    ''
  if (!name) return null

  const nutriments = product.nutriments ?? {}
  const calories =
    num(nutriments['energy-kcal_100g']) ??
    num(nutriments['energy-kcal']) ??
    null

  return {
    id: String(product.code ?? name),
    name,
    brand: product.brands?.split(',')[0]?.trim() || undefined,
    caloriesPer100g: calories,
    proteinPer100g: num(nutriments.proteins_100g),
    carbsPer100g: num(nutriments.carbohydrates_100g),
    fatPer100g: num(nutriments.fat_100g),
    servingQuantity: num(product.serving_quantity) ?? 100,
    servingUnit: 'g',
  }
}

/** Escala valores de per 100g para a quantidade informada. */
export function scaleFromPer100g(
  hit: FoodSearchHit,
  quantity: number,
  unit: 'g' | 'unidade',
) {
  const grams =
    unit === 'g' ? quantity : quantity * (hit.servingQuantity || 100)
  const factor = grams / 100

  const scale = (value: number | null) =>
    value === null ? null : Math.round(value * factor * 10) / 10

  return {
    calories: scale(hit.caloriesPer100g),
    protein: scale(hit.proteinPer100g),
    carbs: scale(hit.carbsPer100g),
    fat: scale(hit.fatPer100g),
  }
}

export async function searchFoods(term: string): Promise<FoodSearchHit[]> {
  const query = term.trim()
  if (query.length < 2) return []

  const url = new URL('https://world.openfoodfacts.org/cgi/search.pl')
  url.searchParams.set('search_terms', query)
  url.searchParams.set('search_simple', '1')
  url.searchParams.set('action', 'process')
  url.searchParams.set('json', '1')
  url.searchParams.set('page_size', '8')
  url.searchParams.set('fields', 'code,product_name,product_name_pt,brands,nutriments,serving_quantity,serving_size')

  const response = await fetch(url.toString())
  if (!response.ok) {
    throw new Error('Não foi possível buscar alimentos agora.')
  }

  const data = (await response.json()) as { products?: OffProduct[] }
  return (data.products ?? [])
    .map(mapProduct)
    .filter((item): item is FoodSearchHit => Boolean(item))
}
