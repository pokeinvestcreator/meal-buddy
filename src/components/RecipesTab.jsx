import { useState, useMemo } from 'react'
import { MEALS } from '../data/meals'
import { MEAL_TYPES } from '../utils/mealUtils'

function HeartIcon({ filled }) {
  return (
    <svg viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
    </svg>
  )
}

function MealCard({ meal, isFavorite, onFavorite, onOpenRecipe, onDelete, isCustom }) {
  const m = meal.macrosPerServing
  return (
    <div className="bg-white border border-stone-200 rounded-2xl p-3.5">
      <div className="flex items-start gap-3">
        <span className="text-3xl leading-none mt-0.5">{meal.emoji}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <p className="font-semibold text-stone-900 text-sm leading-tight">{meal.name}</p>
              <p className="text-[11px] text-stone-400 mt-0.5">{meal.prepTime + meal.cookTime} min · {m.calories} cal</p>
            </div>
            <div className="flex items-center gap-1.5">
              {isCustom && (
                <span className="text-[10px] bg-amber-100 text-amber-700 font-semibold px-1.5 py-0.5 rounded-full">Custom</span>
              )}
              <button
                onClick={e => { e.stopPropagation(); onFavorite() }}
                className={`p-1.5 rounded-full transition-colors ${isFavorite ? 'text-red-500' : 'text-stone-300'}`}
              >
                <HeartIcon filled={isFavorite} />
              </button>
            </div>
          </div>

          <div className="flex gap-2.5 mt-1.5">
            <span className="text-[11px] font-semibold text-blue-600">P {m.protein}g</span>
            <span className="text-[11px] font-semibold text-amber-600">C {m.carbs}g</span>
            <span className="text-[11px] font-semibold text-red-500">F {m.fat}g</span>
          </div>

          <div className="flex gap-2 mt-2.5">
            <button
              onClick={onOpenRecipe}
              className="flex-1 bg-stone-900 text-white py-2 rounded-xl text-xs font-semibold active:bg-stone-800"
            >
              View Recipe
            </button>
            {isCustom && (
              <button
                onClick={onDelete}
                className="px-3 bg-stone-100 text-stone-500 py-2 rounded-xl text-xs font-semibold active:bg-stone-200"
              >
                Delete
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function RecipesTab({ favorites, customMeals, onToggleFavorite, onOpenRecipe, onShowAddMeal, onDeleteCustomMeal }) {
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [showFavs, setShowFavs] = useState(false)

  const allMeals = useMemo(() => [...MEALS, ...customMeals], [customMeals])

  const filtered = useMemo(() => {
    return allMeals.filter(m => {
      const matchesType = filterType === 'all' || m.category === filterType
      const matchesSearch = !search || m.name.toLowerCase().includes(search.toLowerCase())
      const matchesFav = !showFavs || favorites.includes(m.id)
      return matchesType && matchesSearch && matchesFav
    })
  }, [allMeals, filterType, search, showFavs, favorites])

  const allTypes = [{ id: 'all', label: 'All', emoji: '🍽️' }, ...MEAL_TYPES]

  return (
    <div className="pb-6">
      {/* Header + search */}
      <div className="sticky top-0 z-10 bg-white border-b border-stone-100 px-4 pt-5 pb-3">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl font-bold text-stone-900">Recipes</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFavs(f => !f)}
              className={`p-2 rounded-xl transition-colors ${showFavs ? 'bg-red-100 text-red-500' : 'bg-stone-100 text-stone-400'}`}
            >
              <HeartIcon filled={showFavs} />
            </button>
            <button
              onClick={onShowAddMeal}
              className="bg-emerald-600 text-white px-3 py-2 rounded-xl text-sm font-semibold flex items-center gap-1.5 active:bg-emerald-700"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" className="w-4 h-4">
                <path d="M12 5v14M5 12h14"/>
              </svg>
              Add
            </button>
          </div>
        </div>

        <div className="relative mb-3">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            type="text"
            placeholder="Search recipes..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:border-emerald-400"
          />
        </div>

        {/* Type filters */}
        <div className="flex gap-2 overflow-x-auto pb-0.5 hide-scrollbar">
          {allTypes.map(type => (
            <button
              key={type.key}
              onClick={() => setFilterType(type.key)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                filterType === type.key
                  ? 'bg-stone-900 text-white border-stone-900'
                  : 'bg-white text-stone-600 border-stone-200'
              }`}
            >
              <span>{type.emoji}</span>
              <span>{type.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Results count */}
      <div className="px-4 pt-3 pb-1">
        <p className="text-xs text-stone-400 font-medium">
          {filtered.length} recipe{filtered.length !== 1 ? 's' : ''}
          {showFavs ? ' · Favorites' : ''}
          {filterType !== 'all' ? ` · ${MEAL_TYPES.find(t => t.key === filterType)?.label}` : ''}
        </p>
      </div>

      {/* Meal grid */}
      <div className="px-4 space-y-2.5">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="text-4xl mb-3">{showFavs ? '💔' : '🔍'}</div>
            <p className="text-stone-500 text-sm">
              {showFavs ? 'No favorites yet. Tap ♥ on any recipe!' : 'No recipes found'}
            </p>
          </div>
        ) : (
          filtered.map(meal => (
            <MealCard
              key={meal.id}
              meal={meal}
              isFavorite={favorites.includes(meal.id)}
              onFavorite={() => onToggleFavorite(meal.id)}
              onOpenRecipe={() => onOpenRecipe(meal)}
              isCustom={!MEALS.find(m => m.id === meal.id)}
              onDelete={() => onDeleteCustomMeal(meal.id)}
            />
          ))
        )}
      </div>
    </div>
  )
}
