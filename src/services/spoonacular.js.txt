// Spoonacular API service
// Docs: https://spoonacular.com/food-api/docs
// Free tier: 150 points/day. complexSearch ≈ 1–2 points per call.

const BASE = 'https://api.spoonacular.com'

function key() {
  return import.meta.env.VITE_SPOONACULAR_API_KEY || ''
}

export function hasApiKey() {
  return Boolean(key())
}

// Meal Buddy allergen key → Spoonacular intolerance name
const INTOLERANCE_MAP = {
  dairy: 'dairy',
  eggs: 'egg',
  gluten: 'gluten',
  peanuts: 'peanut',
  shellfish: 'shellfish',
}

// Meal Buddy category → Spoonacular meal type
const MEAL_TYPE_MAP = {
  breakfast: 'breakfast',
  lunch: 'main course',
  dinner: 'main course',
  snack: 'snack',
}

// Minimum protein per serving by category (high-protein focus)
const MIN_PROTEIN = {
  breakfast: 25,
  lunch: 30,
  dinner: 35,
  snack: 15,
  '': 20,
}

/**
 * Search Spoonacular recipes.
 * Returns { results: transformable[], total: number, offset: number }
 *
 * With addRecipeInformation + fillIngredients + addRecipeNutrition,
 * each result contains everything needed (macros, ingredients, instructions)
 * so no separate /information call is required.
 */
export async function searchRecipes({
  query = '',
  category = '',   // 'breakfast' | 'lunch' | 'dinner' | 'snack' | ''
  allergens = [],
  dietaryPrefs = [],
  number = 20,
  offset = 0,
} = {}) {
  if (!key()) throw new Error('NO_KEY')

  // Build intolerances from allergens + dairy-free/gluten-free prefs
  const intolerances = [...new Set([
    ...allergens.map(a => INTOLERANCE_MAP[a]).filter(Boolean),
    ...(dietaryPrefs.includes('dairy_free') ? ['dairy'] : []),
    ...(dietaryPrefs.includes('gluten_free') ? ['gluten'] : []),
  ])]

  // Build diet string (Spoonacular supports one diet at a time)
  const diet = dietaryPrefs.includes('vegetarian') ? 'vegetarian' : ''

  const params = new URLSearchParams()
  params.set('apiKey', key())
  if (query) params.set('query', query)
  if (category && MEAL_TYPE_MAP[category]) params.set('type', MEAL_TYPE_MAP[category])
  if (intolerances.length) params.set('intolerances', intolerances.join(','))
  if (diet) params.set('diet', diet)
  params.set('minProtein', MIN_PROTEIN[category] || MIN_PROTEIN[''])
  params.set('addRecipeNutrition', 'true')
  params.set('fillIngredients', 'true')
  params.set('addRecipeInformation', 'true')
  params.set('instructionsRequired', 'true')
  params.set('number', number)
  params.set('offset', offset)
  params.set('sort', query ? 'relevance' : 'popularity')

  const res = await fetch(`${BASE}/recipes/complexSearch?${params}`)

  if (res.status === 402) throw new Error('QUOTA_EXCEEDED')
  if (!res.ok) throw new Error(`API_ERROR_${res.status}`)

  const data = await res.json()
  return {
    results: data.results || [],
    total: data.totalResults || 0,
    offset: data.offset || 0,
  }
}

/**
 * Get full recipe details (used as fallback if instructions missing).
 */
export async function getRecipeInfo(spoonacularId) {
  if (!key()) throw new Error('NO_KEY')

  const params = new URLSearchParams({ apiKey: key(), addRecipeNutrition: 'true' })
  const res = await fetch(`${BASE}/recipes/${spoonacularId}/information?${params}`)
  if (res.status === 402) throw new Error('QUOTA_EXCEEDED')
  if (!res.ok) throw new Error(`API_ERROR_${res.status}`)
  return res.json()
}