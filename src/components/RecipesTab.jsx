import { useState, useEffect, useRef, useMemo } from 'react'
import { MEALS } from '../data/meals'
import { MEAL_TYPES } from '../utils/mealUtils'
import { searchRecipes, hasApiKey } from '../services/spoonacular'
import { transformRecipe } from '../utils/recipeTransform'
import MealImage from './MealImage'

function HeartIcon({ filled }) {
  return (
    <svg viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
    </svg>
  )
}

function RecipeCard({ meal, isFavorite, onFavorite, onOpenRecipe, onDelete, isCustom, dark }) {
  const m = meal.macrosPerServing
  const card = dark ? 'bg-stone-800 border-stone-700' : 'bg-white border-stone-200'
  const text = dark ? 'text-white' : 'text-stone-900'
  const sub  = dark ? 'text-stone-400' : 'text-stone-400'
  return (
    <div className={`border rounded-2xl overflow-hidden ${card}`}>
      <div className="w-full h-36 overflow-hidden">
        <MealImage meal={meal} size="hero" className="!h-36 !rounded-none" />
      </div>
      <div className="p-3.5">
        <div className="flex items-start gap-2 mb-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className={`font-semibold text-sm leading-tight ${text}`}>{meal.name}</p>
                <p className={`text-[11px] mt-0.5 ${sub}`}>{meal.prepTime + meal.cookTime} min · {m.calories} cal</p>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {isCustom && <span className="text-[10px] bg-amber-100 text-amber-700 font-semibold px-1.5 py-0.5 rounded-full">Custom</span>}
                <button onClick={e => { e.stopPropagation(); onFavorite() }}
                  className={`p-1.5 rounded-full transition-colors ${isFavorite ? 'text-red-500' : dark ? 'text-stone-500' : 'text-stone-300'}`}>
                  <HeartIcon filled={isFavorite} />
                </button>
              </div>
            </div>
          </div>
        </div>
        <div className="flex gap-2.5 mb-2.5">
          <span className="text-[11px] font-semibold text-blue-500">P {m.protein}g</span>
          <span className="text-[11px] font-semibold text-amber-500">C {m.carbs}g</span>
          <span className="text-[11px] font-semibold text-red-400">F {m.fat}g</span>
        </div>
        <div className="flex gap-2">
          <button onClick={onOpenRecipe}
            className={`flex-1 py-2 rounded-xl text-xs font-semibold ${dark ? 'bg-stone-700 text-white' : 'bg-stone-900 text-white'} active:opacity-80`}>
            View Recipe
          </button>
          {isCustom && (
            <button onClick={onDelete}
              className={`px-3 py-2 rounded-xl text-xs font-semibold ${dark ? 'bg-stone-700 text-stone-400' : 'bg-stone-100 text-stone-500'}`}>
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default function RecipesTab({ favorites, customMeals, onToggleFavorite, onOpenRecipe, onShowAddMeal, onDeleteCustomMeal, settings, savedRecipes = {}, onSaveRecipe }) {
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [showFavs, setShowFavs] = useState(false)
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)

  const dark  = settings?.darkMode || false
  const noKey = !hasApiKey()
  const searchTimer = useRef(null)

  const favoriteMeals = useMemo(() => {
    if (!showFavs) return []
    return favorites.map(id => {
      if (id.startsWith('sp_')) return savedRecipes[id]
      return [...MEALS, ...(customMeals || [])].find(m => m.id === id)
    }).filter(Boolean)
  }, [favorites, savedRecipes, customMeals, showFavs])

  async function fetchRecipes(newOffset = 0, query = search, type = filterType) {
    if (noKey) return
    setLoading(true)
    setError(null)
    try {
      const allergens = settings?.dietary?.avoidAllergens || []
      const dietaryPrefs = settings?.dietary?.dietaryPreferences || []
      const category = type === 'all' ? '' : type
      const { results: r, total: t } = await searchRecipes({ query, category, allergens, dietaryPrefs, number: 20, offset: newOffset })
      const meals = r.map(rec => transformRecipe(rec, category || null))
      setResults(prev => newOffset === 0 ? meals : [...prev, ...meals])
      setTotal(t)
      setOffset(newOffset)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Only hit Spoonacular when user has typed a search query
  useEffect(() => {
    if (showFavs || !search.trim()) {
      setResults([])
      setTotal(0)
      setError(null)
      return
    }
    clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => fetchRecipes(0, search, filterType), 500)
    return () => clearTimeout(searchTimer.current)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, filterType, showFavs])

  // Default curated meals (shown before any search)
  const defaultMeals = useMemo(() => {
    const base = [...MEALS, ...(customMeals || [])]
    const byCat = filterType === 'all' ? base : base.filter(m => m.category === filterType)
    return byCat
  }, [filterType, customMeals])

  const bg   = dark ? 'bg-stone-900' : 'bg-white'
  const text = dark ? 'text-white' : 'text-stone-900'
  const sub  = dark ? 'text-stone-400' : 'text-stone-500'
  const hdr  = dark ? 'bg-stone-900 border-stone-800' : 'bg-white border-stone-100'
  const allTypes = [{ key: 'all', label: 'All', emoji: '🍽️' }, ...MEAL_TYPES]
  const displayResults = search.trim() ? results : defaultMeals.filter(m =>
    !showFavs && (filterType === 'all' || m.category === filterType)
  )
  const canLoadMore = !showFavs && search.trim() && results.length < total && !loading

  return (
    <div className={`pb-6 ${bg}`}>
      {/* Sticky header */}
      <div className={`sticky top-0 z-10 border-b px-4 pt-5 pb-3 ${hdr}`}>
        <div className="flex items-center justify-between mb-3">
          <h1 className={`text-xl font-bold ${text}`}>Recipes</h1>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowFavs(f => !f)}
              className={`p-2 rounded-xl transition-colors ${showFavs ? 'bg-red-100 text-red-500' : dark ? 'bg-stone-700 text-stone-400' : 'bg-stone-100 text-stone-400'}`}>
              <HeartIcon filled={showFavs} />
            </button>
            <button onClick={onShowAddMeal}
              className="bg-emerald-600 text-white px-3 py-2 rounded-xl text-sm font-semibold flex items-center gap-1.5 active:bg-emerald-700">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" className="w-4 h-4"><path d="M12 5v14M5 12h14"/></svg>
              Add
            </button>
          </div>
        </div>

        {!showFavs && (
          <>
            <div className="relative mb-3">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${sub}`}>
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
              <input type="text" placeholder="Search Spoonacular or browse 200 curated below..." value={search}
                onChange={e => setSearch(e.target.value)}
                className={`w-full pl-9 pr-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:border-emerald-400 ${dark ? 'bg-stone-800 border-stone-700 text-white placeholder-stone-500' : 'bg-stone-50 border-stone-200'}`} />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-0.5 hide-scrollbar">
              {allTypes.map(t => (
                <button key={t.key} onClick={() => setFilterType(t.key)}
                  className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                    filterType === t.key
                      ? 'bg-stone-900 text-white border-stone-900'
                      : dark ? 'bg-stone-800 text-stone-300 border-stone-700' : 'bg-white text-stone-600 border-stone-200'
                  }`}>
                  <span>{t.emoji}</span><span>{t.label}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Count */}
      <div className="px-4 pt-3 pb-2">
        <p className={`text-xs font-medium ${sub}`}>
          {showFavs ? `${favoriteMeals.length} favorite${favoriteMeals.length !== 1 ? 's' : ''}` :
           search.trim() ? (loading ? 'Searching Spoonacular...' : total > 0 ? `${total.toLocaleString()} results` : '') :
           `${defaultMeals.length} curated recipes`}
        </p>
      </div>

      {/* No API key */}
      {noKey && !showFavs && search.trim() && (
        <div className="px-4">
          <div className={`rounded-2xl border p-6 text-center ${dark ? 'bg-stone-800 border-stone-700' : 'bg-stone-50 border-stone-200'}`}>
            <p className="text-3xl mb-2">🔑</p>
            <p className={`font-bold text-sm mb-1 ${text}`}>Add your Spoonacular API key</p>
            <p className={`text-xs ${sub} mb-1`}>Sign up free at spoonacular.com/food-api</p>
            <p className={`text-xs ${sub}`}>Then add VITE_SPOONACULAR_API_KEY to Vercel environment variables</p>
          </div>
        </div>
      )}

      {/* Error */}
      {error && !noKey && (
        <div className="px-4 mb-3">
          <div className={`rounded-2xl border p-4 ${dark ? 'bg-red-900/20 border-red-700' : 'bg-red-50 border-red-200'}`}>
            <p className={`text-sm font-semibold ${dark ? 'text-red-300' : 'text-red-600'}`}>
              {error === 'QUOTA_EXCEEDED' ? '⚠️ Daily recipe limit reached — try again tomorrow' : '⚠️ Could not load recipes — check connection'}
            </p>
            <button onClick={() => fetchRecipes(0)} className="text-xs text-emerald-600 font-semibold mt-1">Retry</button>
          </div>
        </div>
      )}

      {/* Skeleton */}
      {loading && results.length === 0 && !showFavs && (
        <div className="px-4 space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className={`rounded-2xl overflow-hidden animate-pulse ${dark ? 'bg-stone-800' : 'bg-stone-100'}`}>
              <div className={`w-full h-36 ${dark ? 'bg-stone-700' : 'bg-stone-200'}`} />
              <div className="p-3.5 space-y-2">
                <div className={`h-3 rounded w-3/4 ${dark ? 'bg-stone-700' : 'bg-stone-200'}`} />
                <div className={`h-2 rounded w-1/2 ${dark ? 'bg-stone-700' : 'bg-stone-200'}`} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Custom meals section */}
      {!showFavs && (customMeals || []).length > 0 && (
        <div className="px-4 mb-4">
          <p className={`text-xs font-semibold uppercase tracking-wide mb-2 ${sub}`}>Your Custom Meals</p>
          <div className="space-y-3">
            {(customMeals || []).map(meal => (
              <RecipeCard key={meal.id} meal={meal} dark={dark}
                isFavorite={favorites.includes(meal.id)}
                onFavorite={() => onToggleFavorite(meal.id)}
                onOpenRecipe={() => onOpenRecipe(meal)}
                isCustom onDelete={() => onDeleteCustomMeal(meal.id)} />
            ))}
          </div>
          {results.length > 0 && <div className={`mt-4 border-t ${dark ? 'border-stone-800' : 'border-stone-100'}`} />}
        </div>
      )}

      {/* Main results / favorites */}
      <div className="px-4 space-y-3">
        {(showFavs ? favoriteMeals : displayResults).map(meal => (
          <RecipeCard key={meal.id} meal={meal} dark={dark}
            isFavorite={favorites.includes(meal.id)}
            onFavorite={() => {
              if (!favorites.includes(meal.id) && meal.isSpoonacular) onSaveRecipe?.(meal)
              onToggleFavorite(meal.id)
            }}
            onOpenRecipe={() => onOpenRecipe(meal)}
            isCustom={false} />
        ))}

        {showFavs && favoriteMeals.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="text-4xl mb-3">💔</div>
            <p className={`text-sm ${sub}`}>No favorites yet — tap ♥ on any recipe!</p>
          </div>
        )}

        {!loading && !showFavs && results.length === 0 && !error && !noKey && search && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="text-4xl mb-3">🔍</div>
            <p className={`text-sm ${sub}`}>No recipes found for "{search}"</p>
          </div>
        )}
      </div>

      {/* Load more */}
      {canLoadMore && (
        <div className="px-4 mt-4">
          <button onClick={() => fetchRecipes(offset + 20)}
            className={`w-full py-3 rounded-2xl text-sm font-semibold border ${dark ? 'border-stone-600 text-stone-300 bg-stone-800' : 'border-stone-200 text-stone-600 bg-stone-50'}`}>
            {loading ? 'Loading...' : `Load more (${(total - results.length).toLocaleString()} remaining)`}
          </button>
        </div>
      )}
    </div>
  )
}
