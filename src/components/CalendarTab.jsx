import { useState, useMemo } from 'react'
import { MEAL_TYPES, getWeekDates, toDateKey } from '../utils/mealUtils'
import { MEALS } from '../data/meals'

function getWeekOffset(offset) {
  const today = new Date()
  const day = today.getDay()
  const mondayDiff = day === 0 ? -6 : 1 - day
  const monday = new Date(today)
  monday.setDate(today.getDate() + mondayDiff + offset * 7)
  monday.setHours(0, 0, 0, 0)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })
}

const TYPE_COLORS = {
  breakfast: 'bg-amber-100 text-amber-800 border-amber-200',
  lunch: 'bg-blue-100 text-blue-800 border-blue-200',
  dinner: 'bg-purple-100 text-purple-800 border-purple-200',
  snack: 'bg-green-100 text-green-800 border-green-200',
}

export default function CalendarTab({ mealPlan, customMeals, onOpenRecipe, onRemoveMeal, setActiveTab }) {
  const [weekOffset, setWeekOffset] = useState(0)
  const [selectedDate, setSelectedDate] = useState(toDateKey(new Date()))
  const [expandedMeal, setExpandedMeal] = useState(null)

  const allMeals = useMemo(() => [...MEALS, ...customMeals], [customMeals])
  const weekDates = useMemo(() => getWeekOffset(weekOffset), [weekOffset])
  const todayKey = toDateKey(new Date())

  function findMeal(id) {
    return allMeals.find(m => m.id === id)
  }

  const selectedDateMeals = useMemo(() => {
    const dayPlan = mealPlan[selectedDate] || {}
    return MEAL_TYPES
      .map(type => {
        const entry = dayPlan[type.id]
        if (!entry) return null
        const meal = findMeal(entry.mealId)
        if (!meal) return null
        return { type, meal, servings: entry.servings || 1 }
      })
      .filter(Boolean)
  }, [selectedDate, mealPlan, allMeals])

  const weekLabel = useMemo(() => {
    const first = weekDates[0]
    const last = weekDates[6]
    if (weekOffset === 0) return 'This Week'
    if (weekOffset === 1) return 'Next Week'
    if (weekOffset === -1) return 'Last Week'
    return `${first.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${last.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
  }, [weekDates, weekOffset])

  const selectedDateLabel = useMemo(() => {
    const d = new Date(selectedDate + 'T00:00:00')
    if (selectedDate === todayKey) return 'Today'
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
  }, [selectedDate, todayKey])

  // Total macros for selected day
  const dayMacros = useMemo(() => {
    return selectedDateMeals.reduce(
      (acc, { meal, servings }) => {
        acc.protein += meal.macrosPerServing.protein * servings
        acc.calories += meal.macrosPerServing.calories * servings
        acc.carbs += meal.macrosPerServing.carbs * servings
        acc.fat += meal.macrosPerServing.fat * servings
        return acc
      },
      { protein: 0, calories: 0, carbs: 0, fat: 0 }
    )
  }, [selectedDateMeals])

  return (
    <div className="pb-6">
      {/* Week nav */}
      <div className="sticky top-0 z-10 bg-white border-b border-stone-100">
        <div className="flex items-center justify-between px-4 pt-5 pb-2">
          <h1 className="text-xl font-bold text-stone-900">Calendar</h1>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setWeekOffset(w => w - 1)}
              className="p-2 rounded-xl text-stone-500 active:bg-stone-100"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                <path d="M15 18l-6-6 6-6"/>
              </svg>
            </button>
            <span className="text-sm font-semibold text-stone-700 min-w-[80px] text-center">{weekLabel}</span>
            <button
              onClick={() => setWeekOffset(w => w + 1)}
              className="p-2 rounded-xl text-stone-500 active:bg-stone-100"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                <path d="M9 18l6-6-6-6"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Day strip */}
        <div className="grid grid-cols-7 gap-1 px-3 pb-3">
          {weekDates.map(date => {
            const dk = toDateKey(date)
            const isSelected = dk === selectedDate
            const isToday = dk === todayKey
            const hasMeals = mealPlan[dk] && Object.keys(mealPlan[dk]).length > 0
            const label = date.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 1)

            return (
              <button
                key={dk}
                onClick={() => setSelectedDate(dk)}
                className={`flex flex-col items-center py-2 px-1 rounded-xl transition-all ${
                  isSelected
                    ? 'bg-emerald-500 text-white'
                    : isToday
                    ? 'bg-emerald-50'
                    : 'text-stone-600'
                }`}
              >
                <span className={`text-[10px] font-medium ${isSelected ? 'text-emerald-100' : 'text-stone-400'}`}>{label}</span>
                <span className={`text-sm font-bold ${isSelected ? 'text-white' : isToday ? 'text-emerald-600' : 'text-stone-800'}`}>
                  {date.getDate()}
                </span>
                <span className={`w-1.5 h-1.5 rounded-full mt-0.5 ${
                  hasMeals
                    ? isSelected ? 'bg-emerald-200' : 'bg-emerald-500'
                    : 'bg-transparent'
                }`} />
              </button>
            )
          })}
        </div>
      </div>

      {/* Selected day meals */}
      <div className="px-4 pt-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-stone-900">{selectedDateLabel}</h2>
          {selectedDateMeals.length > 0 && (
            <div className="flex gap-2 text-xs">
              <span className="text-blue-600 font-semibold">{Math.round(dayMacros.protein)}g P</span>
              <span className="text-stone-400">·</span>
              <span className="text-stone-600 font-semibold">{Math.round(dayMacros.calories)} cal</span>
            </div>
          )}
        </div>

        {selectedDateMeals.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="text-4xl mb-3">📅</div>
            <p className="text-stone-500 text-sm mb-4">No meals planned for this day</p>
            <button
              onClick={() => setActiveTab('plan')}
              className="bg-emerald-600 text-white px-5 py-2.5 rounded-2xl font-semibold text-sm active:bg-emerald-700"
            >
              Plan Meals
            </button>
          </div>
        ) : (
          <div className="space-y-2.5">
            {selectedDateMeals.map(({ type, meal, servings }) => (
              <CalendarMealCard
                key={type.id}
                type={type}
                meal={meal}
                servings={servings}
                isExpanded={expandedMeal === type.id}
                onToggle={() => setExpandedMeal(expandedMeal === type.id ? null : type.id)}
                onOpenRecipe={() => onOpenRecipe(meal)}
                onRemove={() => onRemoveMeal(selectedDate, type.id)}
              />
            ))}
          </div>
        )}

        {/* Day macros summary */}
        {selectedDateMeals.length > 0 && (
          <div className="mt-4 bg-stone-50 border border-stone-200 rounded-2xl p-4">
            <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-3">Day Totals</p>
            <div className="grid grid-cols-4 gap-2 text-center">
              <div>
                <p className="text-lg font-bold text-stone-900">{Math.round(dayMacros.calories)}</p>
                <p className="text-[10px] text-stone-400 font-medium">CALORIES</p>
              </div>
              <div>
                <p className="text-lg font-bold text-blue-600">{Math.round(dayMacros.protein)}g</p>
                <p className="text-[10px] text-stone-400 font-medium">PROTEIN</p>
              </div>
              <div>
                <p className="text-lg font-bold text-amber-600">{Math.round(dayMacros.carbs)}g</p>
                <p className="text-[10px] text-stone-400 font-medium">CARBS</p>
              </div>
              <div>
                <p className="text-lg font-bold text-red-500">{Math.round(dayMacros.fat)}g</p>
                <p className="text-[10px] text-stone-400 font-medium">FAT</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function CalendarMealCard({ type, meal, servings, isExpanded, onToggle, onOpenRecipe, onRemove }) {
  const colorClass = TYPE_COLORS[type.id] || 'bg-stone-100 text-stone-700 border-stone-200'
  const m = meal.macrosPerServing

  return (
    <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden">
      <button onClick={onToggle} className="w-full flex items-center gap-3 p-3.5 text-left">
        <span className="text-2xl">{meal.emoji}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border ${colorClass}`}>
              {type.label}
            </span>
            {servings > 1 && (
              <span className="text-[10px] text-stone-400 font-medium">{servings}x</span>
            )}
          </div>
          <p className="font-semibold text-stone-900 text-sm mt-0.5 leading-tight">{meal.name}</p>
          <p className="text-[11px] text-stone-400">{m.calories * servings} cal · {m.protein * servings}g P</p>
        </div>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className={`w-4 h-4 text-stone-400 flex-shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
          <path d="M6 9l6 6 6-6"/>
        </svg>
      </button>

      {isExpanded && (
        <div className="border-t border-stone-100 px-3.5 pb-3.5 pt-3">
          <div className="grid grid-cols-4 gap-1.5 mb-3">
            {[
              { label: 'Cal', val: m.calories * servings, color: 'text-stone-700' },
              { label: 'Protein', val: `${m.protein * servings}g`, color: 'text-blue-600' },
              { label: 'Carbs', val: `${m.carbs * servings}g`, color: 'text-amber-600' },
              { label: 'Fat', val: `${m.fat * servings}g`, color: 'text-red-500' },
            ].map(({ label, val, color }) => (
              <div key={label} className="bg-stone-50 rounded-xl p-2 text-center">
                <p className={`text-sm font-bold ${color}`}>{val}</p>
                <p className="text-[9px] text-stone-400 font-medium uppercase">{label}</p>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <button
              onClick={onOpenRecipe}
              className="flex-1 bg-emerald-600 text-white py-2.5 rounded-xl text-sm font-semibold active:bg-emerald-700"
            >
              View Recipe
            </button>
            <button
              onClick={onRemove}
              className="px-3.5 bg-stone-100 text-stone-500 py-2.5 rounded-xl text-sm font-semibold active:bg-stone-200"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
