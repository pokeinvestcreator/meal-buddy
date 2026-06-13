import { MEALS } from '../data/meals';

// ── Date helpers ──────────────────────────────────────────────────────────────

export const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const DAYS_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function toDateKey(date) {
  return date.toISOString().split('T')[0]; // 'YYYY-MM-DD'
}

export function getWeekDates(referenceDate = new Date()) {
  const d = new Date(referenceDate);
  const day = d.getDay(); // 0 = Sun
  const monday = new Date(d);
  monday.setDate(d.getDate() - ((day + 6) % 7)); // adjust to Monday start
  const week = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    week.push(date);
  }
  return week;
}

export function formatDate(date) {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function isToday(date) {
  const today = new Date();
  return toDateKey(date) === toDateKey(today);
}

// ── Meal helpers ──────────────────────────────────────────────────────────────

export function getAllMeals(customMeals = []) {
  return [...MEALS, ...customMeals];
}

export function findMeal(id, customMeals = []) {
  return getAllMeals(customMeals).find((m) => m.id === id) || null;
}

// ── Serving scale ─────────────────────────────────────────────────────────────

export function scaleIngredient(ingredient, requestedServings, baseServings) {
  const factor = requestedServings / baseServings;
  return {
    ...ingredient,
    grams: Math.round(ingredient.grams * factor * 10) / 10,
    oz: Math.round(ingredient.oz * factor * 10) / 10,
  };
}

// ── Grocery list helpers ──────────────────────────────────────────────────────

export function addMealToGrocery(groceryList, meal, requestedServings, datesAdded) {
  const updated = { ...groceryList };

  meal.ingredients.forEach((ing) => {
    const key = normalizeIngredientKey(ing.name);
    const scaled = scaleIngredient(ing, requestedServings, meal.servings);

    if (updated[key]) {
      updated[key] = {
        ...updated[key],
        grams: Math.round((updated[key].grams + scaled.grams) * 10) / 10,
        oz: Math.round((updated[key].oz + scaled.oz) * 10) / 10,
        meals: [...new Set([...updated[key].meals, meal.name])],
        dates: [...new Set([...updated[key].dates, ...datesAdded])],
      };
    } else {
      updated[key] = {
        key,
        name: ing.name,
        grams: scaled.grams,
        oz: scaled.oz,
        category: ing.category,
        note: ing.note || '',
        checked: false,
        meals: [meal.name],
        dates: datesAdded,
      };
    }
  });

  return updated;
}

export function normalizeIngredientKey(name) {
  return name.toLowerCase().trim().replace(/\s+/g, ' ');
}

/**
 * Rebuilds the entire grocery list from scratch by scanning the full mealPlan.
 * Call this after adjusting servings so quantities stay accurate.
 * Pass the old grocery list separately to preserve .checked states.
 *
 * Usage in App.jsx:
 *   const rebuilt = rebuildGroceryFromPlan(newMealPlan, customMeals)
 *   // then merge checked states before calling updateGroceryList
 */
export function rebuildGroceryFromPlan(mealPlan, customMeals = []) {
  const allMeals = [...MEALS, ...customMeals];
  let grocery = {};
  Object.entries(mealPlan).forEach(([dateKey, dayPlan]) => {
    Object.entries(dayPlan).forEach(([, entry]) => {
      if (!entry?.mealId) return;
      const meal = allMeals.find((m) => m.id === entry.mealId);
      if (!meal) return;
      grocery = addMealToGrocery(grocery, meal, entry.servings || 1, [dateKey]);
    });
  });
  return grocery;
}

// ── Macro totals ──────────────────────────────────────────────────────────────

export function scaleMacros(macros, requestedServings, baseServings) {
  const factor = requestedServings / baseServings;
  return {
    calories: Math.round(macros.calories * factor),
    protein: Math.round(macros.protein * factor),
    carbs: Math.round(macros.carbs * factor),
    fat: Math.round(macros.fat * factor),
  };
}

// ── Protein driver ────────────────────────────────────────────────────────────

export function getProteinDriverIngredient(meal) {
  if (!meal.ingredients || meal.ingredients.length === 0) return null;
  const proteinIngs = meal.ingredients.filter((i) => i.category === 'protein');
  if (proteinIngs.length > 0) {
    return proteinIngs.reduce((max, i) => (i.grams > max.grams ? i : max));
  }
  return meal.ingredients.reduce((max, i) => (i.grams > max.grams ? i : max));
}

// ── Meal plan helpers ─────────────────────────────────────────────────────────

export const MEAL_TYPES = [
  { key: 'breakfast', label: 'Breakfast', emoji: '🌅' },
  { key: 'lunch', label: 'Lunch', emoji: '☀️' },
  { key: 'dinner', label: 'Dinner', emoji: '🌙' },
  { key: 'snack', label: 'Snacks', emoji: '🍎' },
];

export function getMealTypeLabel(type) {
  return MEAL_TYPES.find((t) => t.key === type)?.label || type;
}

export function getMealTypeEmoji(type) {
  return MEAL_TYPES.find((t) => t.key === type)?.emoji || '';
}

// ── Grocery list summary ──────────────────────────────────────────────────────

export function getGroceryStats(groceryList) {
  const items = Object.values(groceryList);
  const total = items.length;
  const checked = items.filter((i) => i.checked).length;
  return { total, checked, remaining: total - checked };
}

// ── Format weight display ─────────────────────────────────────────────────────

export function formatWeight(grams, oz, useOz = false) {
  if (useOz) {
    return `${oz} oz`;
  }
  if (grams >= 1000) {
    return `${(grams / 1000).toFixed(2)} kg`;
  }
  return `${grams} g`;
}
