// Transform Spoonacular API responses into Meal Buddy's internal recipe format.
// Works with both complexSearch results (with addRecipeInformation=true)
// and /recipes/{id}/information responses.

const CATEGORY_EMOJI = {
  breakfast: '🍳',
  lunch: '🥗',
  dinner: '🍽️',
  snack: '🍎',
}

// Map Spoonacular aisle string → Meal Buddy ingredient category
function mapAisle(aisle = '') {
  const s = aisle.toLowerCase()
  if (/meat|poultry|seafood|fish/.test(s)) return 'protein'
  if (/dairy|cheese|milk|cream|refriger/.test(s)) return 'dairy'
  if (/produce|vegetable|fruit|fresh/.test(s)) return 'produce'
  if (/pasta|rice|bread|cereal|grain|baking|flour|canned/.test(s)) return 'carbs'
  if (/condiment|sauce|spice|oil|vinegar|dressing/.test(s)) return 'sauces'
  if (/snack|nut|candy|chip/.test(s)) return 'snacks'
  return 'other'
}

function getNutrient(recipe, name) {
  const n = recipe.nutrition?.nutrients || []
  return Math.round(n.find(x => x.name === name)?.amount || 0)
}

function inferCategory(recipe, override) {
  if (override) return override
  const types = (recipe.dishTypes || []).map(t => t.toLowerCase())
  if (types.some(t => /breakfast|brunch|morning meal/.test(t))) return 'breakfast'
  if (types.some(t => /snack|appetizer|starter|fingerfood/.test(t))) return 'snack'
  if (types.some(t => /lunch|soup|salad/.test(t))) return 'lunch'
  return 'dinner'
}

function extractInstructions(recipe) {
  // Prefer structured step-by-step
  const steps = recipe.analyzedInstructions?.[0]?.steps
  if (steps?.length > 0) return steps.map(s => s.step).filter(Boolean)

  // Fall back to stripping HTML from instructions string
  if (recipe.instructions) {
    return recipe.instructions
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .split(/[\n\r]+/)
      .map(s => s.trim())
      .filter(s => s.length > 10)
      .slice(0, 12)
  }
  return []
}

function extractAllergens(recipe) {
  const a = []
  if (!recipe.dairyFree) a.push('dairy')
  if (!recipe.glutenFree) a.push('gluten')
  const names = (recipe.extendedIngredients || [])
    .map(i => (i.nameClean || i.name || '').toLowerCase())
  if (names.some(n => /\beggs?\b/.test(n))) a.push('eggs')
  if (names.some(n => /peanut/.test(n))) a.push('peanuts')
  if (names.some(n => /shrimp|prawn|shellfish|lobster|crab|oyster|mussel|clam/.test(n))) a.push('shellfish')
  return [...new Set(a)]
}

function extractDietaryFlags(recipe) {
  const f = []
  if (recipe.glutenFree) f.push('gluten_free')
  if (recipe.dairyFree) f.push('dairy_free')
  if (recipe.vegetarian) f.push('vegetarian')
  return f
}

/**
 * Transform a raw Spoonacular recipe object into Meal Buddy's internal format.
 *
 * Ingredient amounts in Spoonacular are for the TOTAL recipe (all servings).
 * We store them that way and keep meal.servings = spoon.servings so that
 * scaleIngredient() in addMealToGrocery() correctly scales to requested servings.
 *
 * Macros from addRecipeNutrition are already per-serving — stored as-is.
 */
export function transformRecipe(spoon, categoryOverride = null) {
  const category = inferCategory(spoon, categoryOverride)
  const totalMin = spoon.readyInMinutes || 30
  const prepMin = spoon.preparationMinutes > 0 ? spoon.preparationMinutes : Math.floor(totalMin * 0.3)
  const cookMin = spoon.cookingMinutes > 0 ? spoon.cookingMinutes : Math.ceil(totalMin * 0.7)

  return {
    id: `sp_${spoon.id}`,
    spoonacularId: spoon.id,
    name: spoon.title,
    emoji: CATEGORY_EMOJI[category] || '🍽️',
    category,
    // Direct photo URL from Spoonacular (no Pexels call needed)
    photoUrl: spoon.image ? spoon.image.replace('-312x231', '-636x393') : null,
    allergens: extractAllergens(spoon),
    dietaryFlags: extractDietaryFlags(spoon),
    tags: spoon.dishTypes || [],
    prepTime: prepMin,
    cookTime: cookMin,
    servings: spoon.servings || 2,
    macrosPerServing: {
      calories: getNutrient(spoon, 'Calories'),
      protein: getNutrient(spoon, 'Protein'),
      carbs: getNutrient(spoon, 'Carbohydrates'),
      fat: getNutrient(spoon, 'Fat'),
    },
    // Total ingredient amounts (for spoon.servings portions — scaleIngredient handles the rest)
    ingredients: (spoon.extendedIngredients || []).map((ing, i) => ({
      id: `sp_${spoon.id}-i${i + 1}`,
      name: ing.nameClean || ing.name || 'ingredient',
      grams: Math.round(ing.measures?.metric?.amount || (ing.amount * 28.35) || 0),
      oz: Math.round((ing.measures?.us?.amount || ing.amount || 0) * 10) / 10,
      category: mapAisle(ing.aisle || ''),
      note: ing.measures?.us?.unitShort || ing.unit || '',
    })),
    instructions: extractInstructions(spoon),
    prepInstructions: `Recipe serves ${spoon.servings || 2}. Scale up ingredients proportionally for meal prep — most dishes keep well for 3–4 days refrigerated.`,
    storageInstructions: 'Store in airtight containers in the refrigerator for 3–4 days, or freeze for up to 3 months.',
    reheatingInstructions: 'Microwave 1–2 minutes, stirring halfway. Add a splash of broth or water to prevent drying out.',
    sourceUrl: spoon.sourceUrl || null,
    isSpoonacular: true,
  }
}