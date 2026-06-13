import { useState, useMemo, useEffect } from 'react'
import { MEAL_TYPES, toDateKey, getProteinDriverIngredient } from '../utils/mealUtils'
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

export default function CalendarTab({ mealPlan, customMeals, onOpenRecipe, onRemoveMeal, onSwapMeal, onAdjustServings, setActiveTab, settings }) {
  const [weekOffset, setWeekOffset] = useState(0)
  const [selectedDate, setSelectedDate] = useState(toDateKey(new Date()))
  const [expandedMeal, setExpandedMeal] = useState(null)
  const [swapping, setSwapping] = useState(null) // { dateKey, typeKey, typeInfo }
  const [swapSearch, setSwapSearch] = useState('')
  const [adjusting, setAdjusting] = useState(false)
  const [adjustTarget, setAdjustTarget] = useState(200)

  const dark = settings?.darkMode || false
  const allMeals = useMemo(() => [...MEALS, ...(customMeals || [])], [customMeals])
  const weekDates = useMemo(() => getWeekOffset(weekOffset), [weekOffset])
  const todayKey = toDateKey(new Date())

  const bg = dark ? 'bg-stone-900' : ''
  const card = dark ? 'bg-stone-800 border-stone-700' : 'bg-white border-stone-200'
  const text = dark ? 'text-white' : 'text-stone-900'
  const sub = dark ? 'text-stone-400' : 'text-stone-500'

  function findMeal(id) { return allMeals.find(m => m.id === id) }

  // Reset adjust view when the selected day changes
  useEffect(() => { setAdjusting(false) }, [selectedDate])

  const selectedDateMeals = useMemo(() => {
    const dayPlan = mealPlan[selectedDate] || {}
    return MEAL_TYPES
      .map(type => {
        const entry = dayPlan[type.key]
        if (!entry) return null
        const meal = findMeal(entry.mealId)
        if (!meal) return null
        return { type, meal, servings: entry.servings || 1 }
      })
      .filter(Boolean)
  }, [selectedDate, mealPlan, allMeals])

  const dayMacros = useMemo(() => {
    return selectedDateMeals.reduce(
      (acc, { meal, servings }) => ({
        protein: acc.protein + meal.macrosPerServing.protein * servings,
        calories: acc.calories + meal.macrosPerServing.calories * servings,
        carbs: acc.carbs + meal.macrosPerServing.carbs * servings,
        fat: acc.fat + meal.macrosPerServing.fat * servings,
      }),
      { protein: 0, calories: 0, carbs: 0, fat: 0 }
    )
  }, [selectedDateMeals])

  const weekLabel = useMemo(() => {
    if (weekOffset === 0) return 'This Week'
    if (weekOffset === 1) return 'Next Week'
    if (weekOffset === -1) return 'Last Week'
    const first = weekDates[0]
    return first.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }, [weekDates, weekOffset])

  const selectedDateLabel = useMemo(() => {
    const d = new Date(selectedDate + 'T00:00:00')
    if (selectedDate === todayKey) return 'Today'
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
  }, [selectedDate, todayKey])

  const proteinTarget = settings?.proteinTarget || 200
  const calorieTarget = settings?.calorieTarget || 2500

  function openAdjust() {
    setAdjustTarget(proteinTarget)
    setAdjusting(true)
  }

  // ── Macro Adjust View ──────────────────────────────────────────────────────
  if (adjusting) {
    const scaleFactor = dayMacros.protein > 0 ? adjustTarget / dayMacros.protein : 1

    // Round each meal's servings to nearest 0.25, clamped to [0.25, 10]
    const adjustments = selectedDateMeals.map(({ type, meal, servings }) => {
      const rawNew = servings * scaleFactor
      const rounded = Math.round(rawNew * 4) / 4
      const newServings = Math.max(0.25, Math.min(10, rounded))
      return { type, meal, currentServings: servings, newServings }
    })

    // Project macros from the rounded servings (not ideal = scaleFactor × current, due to rounding)
    const previewMacros = adjustments.reduce((acc, { meal, newServings }) => ({
      protein: acc.protein + meal.macrosPerServing.protein * newServings,
      calories: acc.calories + meal.macrosPerServing.calories * newServings,
      carbs: acc.carbs + meal.macrosPerServing.carbs * newServings,
      fat: acc.fat + meal.macrosPerServing.fat * newServings,
    }), { protein: 0, calories: 0, carbs: 0, fat: 0 })

    const alreadyOnTarget = Math.abs(dayMacros.protein - adjustTarget) / Math.max(adjustTarget, 1) < 0.03
    const previewHitsTarget = Math.abs(previewMacros.protein - adjustTarget) / Math.max(adjustTarget, 1) < 0.12
    const scalingUp = scaleFactor > 1.02

    return (
      <div className={`px-4 pt-5 pb-28 ${bg} min-h-full`}>
        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <button
            type="button"
            onClick={() => setAdjusting(false)}
            style={{ touchAction: 'manipulation' }}
            className={`px-3 py-2 rounded-xl text-sm font-medium cursor-pointer ${dark ? 'bg-stone-700 text-stone-300' : 'bg-stone-100 text-stone-600'}`}>
            ← Back
          </button>
          <div>
            <h2 className={`font-bold text-lg ${text}`}>🎯 Adjust Macros</h2>
            <p className={`text-xs ${sub}`}>{selectedDateLabel}</p>
          </div>
        </div>

        {/* Protein target input */}
        <div className={`rounded-2xl border p-4 mb-4 ${card}`}>
          <p className={`text-xs font-semibold uppercase tracking-wide mb-3 ${sub}`}>Protein Target</p>
          <div className="flex items-center gap-3 flex-wrap gap-y-2">
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={adjustTarget}
                min={1}
                max={999}
                onChange={e => setAdjustTarget(Math.max(1, Math.min(999, parseInt(e.target.value) || 1)))}
                className={`w-20 px-3 py-2 border rounded-xl text-center font-bold text-xl focus:outline-none focus:border-emerald-400 ${dark ? 'bg-stone-700 border-stone-600 text-white' : 'bg-white border-stone-200 text-stone-900'}`}
              />
              <span className={`text-sm font-medium ${sub}`}>g protein</span>
            </div>
            {adjustTarget !== proteinTarget && (
              <button
                type="button"
                onClick={() => setAdjustTarget(proteinTarget)}
                style={{ touchAction: 'manipulation' }}
                className={`text-xs px-3 py-1.5 rounded-lg ${dark ? 'bg-stone-700 text-stone-400' : 'bg-stone-100 text-stone-500'}`}>
                Reset to {proteinTarget}g
              </button>
            )}
          </div>
        </div>

        {/* Before → After preview */}
        <div className={`rounded-2xl border p-4 mb-4 ${card}`}>
          <p className={`text-xs font-semibold uppercase tracking-wide mb-3 ${sub}`}>Preview</p>
          <div className="grid grid-cols-2 gap-3 mb-2.5">
            {/* Current */}
            <div className={`rounded-xl p-3 ${dark ? 'bg-stone-700' : 'bg-stone-50'}`}>
              <p className={`text-[10px] font-semibold uppercase tracking-wider ${sub} mb-2`}>Current</p>
              <p className="text-blue-500 font-bold text-2xl leading-none">{Math.round(dayMacros.protein)}g</p>
              <p className={`text-xs mt-1 ${sub}`}>{Math.round(dayMacros.calories)} cal</p>
              <p className={`text-[10px] uppercase tracking-wide mt-0.5 ${sub}`}>protein</p>
            </div>
            {/* After */}
            <div className={`rounded-xl p-3 border-2 transition-colors ${
              alreadyOnTarget || previewHitsTarget
                ? (dark ? 'border-emerald-500 bg-emerald-900/20' : 'border-emerald-400 bg-emerald-50')
                : (dark ? 'border-stone-600 bg-stone-700' : 'border-stone-200 bg-stone-50')
            }`}>
              <p className={`text-[10px] font-semibold uppercase tracking-wider ${sub} mb-2`}>After</p>
              <p className={`font-bold text-2xl leading-none ${alreadyOnTarget || previewHitsTarget ? 'text-emerald-500' : 'text-blue-400'}`}>
                {alreadyOnTarget ? Math.round(dayMacros.protein) : Math.round(previewMacros.protein)}g
              </p>
              <p className={`text-xs mt-1 ${sub}`}>
                {alreadyOnTarget ? Math.round(dayMacros.calories) : Math.round(previewMacros.calories)} cal
              </p>
              <p className={`text-[10px] uppercase tracking-wide mt-0.5 ${alreadyOnTarget || previewHitsTarget ? 'text-emerald-500' : sub}`}>
                {alreadyOnTarget || previewHitsTarget ? '✓ on target' : 'projected'}
              </p>
            </div>
          </div>
          {alreadyOnTarget ? (
            <p className="text-xs text-emerald-500 font-medium">✓ You're already hitting your protein target!</p>
          ) : (
            <p className={`text-xs ${sub}`}>
              {scalingUp ? '↑' : '↓'} {scaleFactor.toFixed(2)}× scale applied to all meals · rounded to nearest ¼ serving
            </p>
          )}
        </div>

        {/* Per-meal breakdown */}
        <p className={`text-xs font-semibold uppercase tracking-wide mb-2.5 ${sub}`}>Per Meal</p>
        <div className="space-y-2.5 mb-6">
          {adjustments.map(({ type, meal, currentServings, newServings }) => {
            const driver = getProteinDriverIngredient(meal)
            const proteinBefore = Math.round(meal.macrosPerServing.protein * currentServings)
            const proteinAfter = Math.round(meal.macrosPerServing.protein * newServings)
            const colorClass = TYPE_COLORS[type.key] || 'bg-stone-100 text-stone-700 border-stone-200'
            const diff = newServings - currentServings
            const servingColor = diff > 0.01 ? 'text-emerald-500' : diff < -0.01 ? 'text-amber-500' : text
            return (
              <div key={type.key} className={`rounded-2xl border p-3.5 ${card}`}>
                <div className="flex items-center gap-3">
                  <span className="text-2xl leading-none flex-shrink-0">{meal.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <span className={`inline-block text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border ${colorClass}`}>
                      {type.label}
                    </span>
                    <p className={`font-semibold text-sm mt-0.5 ${text} truncate`}>{meal.name}</p>
                    {driver && (
                      <p className={`text-[11px] ${sub}`}>↑ {driver.name}</p>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0 ml-2">
                    <div className="flex items-center justify-end gap-1.5 mb-0.5">
                      <span className={`text-sm ${sub}`}>{currentServings}×</span>
                      <span className={`text-xs ${sub}`}>→</span>
                      <span className={`text-sm font-bold ${servingColor}`}>{newServings}×</span>
                    </div>
                    <p className="text-[11px]">
                      <span className="text-blue-400">{proteinBefore}g</span>
                      <span className={sub}> → </span>
                      <span className="text-blue-500 font-semibold">{proteinAfter}g</span>
                      <span className={sub}> P</span>
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Action */}
        {!alreadyOnTarget ? (
          <button
            type="button"
            style={{ touchAction: 'manipulation' }}
            onClick={() => {
              const result = {}
              adjustments.forEach(({ type, newServings }) => { result[type.key] = newServings })
              onAdjustServings(selectedDate, result)
              setAdjusting(false)
            }}
            className="w-full bg-emerald-600 active:bg-emerald-700 text-white py-4 rounded-2xl font-bold text-base mb-3">
            Apply Adjustments
          </button>
        ) : (
          <button
            type="button"
            style={{ touchAction: 'manipulation' }}
            onClick={() => setAdjusting(false)}
            className={`w-full py-4 rounded-2xl font-bold text-base mb-3 ${dark ? 'bg-stone-700 text-stone-300' : 'bg-stone-100 text-stone-600'}`}>
            Already on track ✓
          </button>
        )}
        <p className={`text-center text-xs ${sub}`}>
          Grocery list reflects original quantities — re-generate from Plan if needed
        </p>
      </div>
    )
  }

  // ── Swap Meal View ─────────────────────────────────────────────────────────
  if (swapping) {
    const filteredSwap = allMeals.filter(m =>
      m.category === swapping.typeKey &&
      (!swapSearch || m.name.toLowerCase().includes(swapSearch.toLowerCase()))
    )
    return (
      <div className={`px-4 pt-5 pb-6 ${bg} min-h-full`}>
        <div className="flex items-center gap-3 mb-5">
          <button type="button" onClick={() => { setSwapping(null); setSwapSearch('') }}
            className={`px-3 py-2 rounded-xl text-sm cursor-pointer ${dark ? 'bg-stone-700 text-stone-300' : 'bg-stone-100 text-stone-600'}`}>
            ← Cancel
          </button>
          <div>
            <h2 className={`font-bold text-lg ${text}`}>Swap {swapping.typeInfo?.emoji} {swapping.typeInfo?.label}</h2>
            <p className={`text-xs ${sub}`}>{new Date(swapping.dateKey + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</p>
          </div>
        </div>

        <input type="text" placeholder="Search meals..." value={swapSearch}
          onChange={e => setSwapSearch(e.target.value)}
          className={`w-full px-4 py-2.5 border rounded-xl text-sm mb-4 focus:outline-none focus:border-emerald-400 ${dark ? 'bg-stone-700 border-stone-600 text-white placeholder-stone-400' : 'bg-white border-stone-200'}`} />

        <div className="space-y-2.5">
          {filteredSwap.map(meal => {
            const m = meal.macrosPerServing
            const current = findMeal(mealPlan[swapping.dateKey]?.[swapping.typeKey]?.mealId)
            const isCurrent = current?.id === meal.id
            return (
              <button key={meal.id} type="button"
                onClick={() => {
                  const currentServings = mealPlan[swapping.dateKey]?.[swapping.typeKey]?.servings || 1
                  onSwapMeal(swapping.dateKey, swapping.typeKey, meal, currentServings)
                  setSwapping(null)
                  setSwapSearch('')
                }}
                className={`w-full text-left rounded-2xl border-2 p-3.5 cursor-pointer ${isCurrent ? 'border-emerald-500 bg-emerald-50' : `border-transparent ${card}`}`}>
                <div className="flex items-start gap-3">
                  <span className="text-3xl leading-none">{meal.emoji}</span>
                  <div className="flex-1">
                    <p className={`font-semibold text-sm ${isCurrent ? 'text-emerald-700' : text}`}>
                      {meal.name} {isCurrent ? '(current)' : ''}
                    </p>
                    <p className={`text-[11px] ${sub}`}>{meal.prepTime + meal.cookTime}min · {m.calories}cal</p>
                    <div className="flex gap-2.5 mt-1">
                      <span className="text-[11px] font-semibold text-blue-500">P {m.protein}g</span>
                      <span className="text-[11px] font-semibold text-amber-500">C {m.carbs}g</span>
                      <span className="text-[11px] font-semibold text-red-400">F {m.fat}g</span>
                    </div>
                  </div>
                </div>
              </button>
            )
          })}
          {filteredSwap.length === 0 && <p className={`text-center text-sm py-8 ${sub}`}>No meals found</p>}
        </div>
      </div>
    )
  }

  // ── Main Calendar View ────────────────────────────────────────────────────
  return (
    <div className={`pb-6 ${bg} min-h-full`}>
      {/* Header */}
      <div className={`sticky top-0 z-10 border-b ${dark ? 'bg-stone-900 border-stone-800' : 'bg-white border-stone-100'}`}>
        <div className="flex items-center justify-between px-4 pt-5 pb-2">
          <h1 className={`text-xl font-bold ${text}`}>Calendar</h1>
          <div className="flex items-center gap-1">
            <button onClick={() => setWeekOffset(w => w - 1)} className={`p-2 rounded-xl ${dark ? 'text-stone-400' : 'text-stone-500'}`}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M15 18l-6-6 6-6"/></svg>
            </button>
            <span className={`text-sm font-semibold min-w-[80px] text-center ${text}`}>{weekLabel}</span>
            <button onClick={() => setWeekOffset(w => w + 1)} className={`p-2 rounded-xl ${dark ? 'text-stone-400' : 'text-stone-500'}`}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M9 18l6-6-6-6"/></svg>
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
              <button key={dk} onClick={() => setSelectedDate(dk)}
                className={`flex flex-col items-center py-2 px-1 rounded-xl transition-all ${
                  isSelected ? 'bg-emerald-500 text-white'
                  : isToday ? dark ? 'bg-stone-800' : 'bg-emerald-50'
                  : ''}`}>
                <span className={`text-[10px] font-medium ${isSelected ? 'text-emerald-100' : sub}`}>{label}</span>
                <span className={`text-sm font-bold ${isSelected ? 'text-white' : isToday ? 'text-emerald-600' : text}`}>{date.getDate()}</span>
                <span className={`w-1.5 h-1.5 rounded-full mt-0.5 ${hasMeals ? isSelected ? 'bg-emerald-200' : 'bg-emerald-500' : 'bg-transparent'}`} />
              </button>
            )
          })}
        </div>
      </div>

      {/* Day content */}
      <div className="px-4 pt-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className={`font-bold ${text}`}>{selectedDateLabel}</h2>
          {selectedDateMeals.length > 0 && (
            <div className="flex gap-2 text-xs">
              <span className="text-blue-500 font-semibold">{Math.round(dayMacros.protein)}g P</span>
              <span className={sub}>·</span>
              <span className={`font-semibold ${sub}`}>{Math.round(dayMacros.calories)} cal</span>
            </div>
          )}
        </div>

        {selectedDateMeals.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="text-4xl mb-3">📅</div>
            <p className={`text-sm mb-4 ${sub}`}>No meals planned for this day</p>
            <button onClick={() => setActiveTab('plan')} className="bg-emerald-600 text-white px-5 py-2.5 rounded-2xl font-semibold text-sm">Plan Meals</button>
          </div>
        ) : (
          <div className="space-y-2.5">
            {selectedDateMeals.map(({ type, meal, servings }) => (
              <CalendarMealCard
                key={type.key}
                type={type}
                meal={meal}
                servings={servings}
                dark={dark}
                isExpanded={expandedMeal === type.key}
                onToggle={() => setExpandedMeal(expandedMeal === type.key ? null : type.key)}
                onOpenRecipe={() => onOpenRecipe(meal)}
                onRemove={() => { onRemoveMeal(selectedDate, type.key); setExpandedMeal(null) }}
                onSwap={() => setSwapping({ dateKey: selectedDate, typeKey: type.key, typeInfo: type })}
              />
            ))}
          </div>
        )}

        {/* Day totals */}
        {selectedDateMeals.length > 0 && (
          <div className={`mt-4 border rounded-2xl p-4 ${card}`}>
            <p className={`text-xs font-semibold uppercase tracking-wide mb-3 ${sub}`}>Day Totals</p>
            <div className="grid grid-cols-4 gap-2 text-center mb-3">
              {[
                { label: 'CALORIES', val: Math.round(dayMacros.calories), color: text },
                { label: 'PROTEIN', val: `${Math.round(dayMacros.protein)}g`, color: 'text-blue-500' },
                { label: 'CARBS', val: `${Math.round(dayMacros.carbs)}g`, color: 'text-amber-500' },
                { label: 'FAT', val: `${Math.round(dayMacros.fat)}g`, color: 'text-red-400' },
              ].map(({ label, val, color }) => (
                <div key={label} className={`rounded-xl p-2 ${dark ? 'bg-stone-700' : 'bg-stone-50'}`}>
                  <p className={`text-lg font-bold ${color}`}>{val}</p>
                  <p className={`text-[9px] font-medium uppercase ${sub}`}>{label}</p>
                </div>
              ))}
            </div>

            {/* Target progress bars */}
            <div className="space-y-2 mb-3">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-xs font-medium text-blue-500">Protein</span>
                  <span className="text-xs font-semibold text-blue-500">{Math.round(dayMacros.protein)}g / {proteinTarget}g</span>
                </div>
                <div className={`h-1.5 rounded-full ${dark ? 'bg-stone-700' : 'bg-stone-100'}`}>
                  <div className="h-full rounded-full bg-blue-500" style={{ width: `${Math.min(100, (dayMacros.protein / proteinTarget) * 100)}%` }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span className={`text-xs font-medium ${sub}`}>Calories</span>
                  <span className={`text-xs font-semibold ${sub}`}>{Math.round(dayMacros.calories)} / {calorieTarget}</span>
                </div>
                <div className={`h-1.5 rounded-full ${dark ? 'bg-stone-700' : 'bg-stone-100'}`}>
                  <div className="h-full rounded-full bg-stone-400" style={{ width: `${Math.min(100, (dayMacros.calories / calorieTarget) * 100)}%` }} />
                </div>
              </div>
            </div>

            {/* Macro adjust CTA */}
            <button
              type="button"
              onClick={openAdjust}
              style={{ touchAction: 'manipulation' }}
              className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold border transition-colors ${
                dark
                  ? 'border-stone-600 text-stone-300 bg-stone-700 active:bg-stone-600'
                  : 'border-stone-200 text-stone-600 bg-stone-50 active:bg-stone-100'
              }`}>
              🎯 Adjust serving sizes to hit protein target
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function CalendarMealCard({ type, meal, servings, dark, isExpanded, onToggle, onOpenRecipe, onRemove, onSwap }) {
  const colorClass = TYPE_COLORS[type.key] || 'bg-stone-100 text-stone-700 border-stone-200'
  const m = meal.macrosPerServing
  const card = dark ? 'bg-stone-800 border-stone-700' : 'bg-white border-stone-200'
  const text = dark ? 'text-white' : 'text-stone-900'
  const sub = dark ? 'text-stone-400' : 'text-stone-400'

  return (
    <div className={`border rounded-2xl overflow-hidden ${card}`}>
      <button onClick={onToggle} className="w-full flex items-center gap-3 p-3.5 text-left">
        <span className="text-2xl">{meal.emoji}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border ${colorClass}`}>{type.label}</span>
            {servings > 1 && <span className={`text-[10px] font-medium ${sub}`}>{servings}×</span>}
          </div>
          <p className={`font-semibold text-sm mt-0.5 ${text}`}>{meal.name}</p>
          <p className={`text-[11px] ${sub}`}>{m.calories * servings} cal · {m.protein * servings}g P</p>
        </div>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"
          className={`w-4 h-4 flex-shrink-0 transition-transform ${sub} ${isExpanded ? 'rotate-180' : ''}`}>
          <path d="M6 9l6 6 6-6"/>
        </svg>
      </button>

      {isExpanded && (
        <div className={`border-t px-3.5 pb-3.5 pt-3 ${dark ? 'border-stone-700' : 'border-stone-100'}`}>
          <div className="grid grid-cols-4 gap-1.5 mb-3">
            {[
              { label: 'Cal', val: m.calories * servings, color: text },
              { label: 'Protein', val: `${m.protein * servings}g`, color: 'text-blue-500' },
              { label: 'Carbs', val: `${m.carbs * servings}g`, color: 'text-amber-500' },
              { label: 'Fat', val: `${m.fat * servings}g`, color: 'text-red-400' },
            ].map(({ label, val, color }) => (
              <div key={label} className={`rounded-xl p-2 text-center ${dark ? 'bg-stone-700' : 'bg-stone-50'}`}>
                <p className={`text-sm font-bold ${color}`}>{val}</p>
                <p className={`text-[9px] uppercase ${sub}`}>{label}</p>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={onOpenRecipe} className="flex-1 bg-emerald-600 text-white py-2.5 rounded-xl text-sm font-semibold">View Recipe</button>
            <button onClick={onSwap} className={`px-3.5 py-2.5 rounded-xl text-sm font-semibold ${dark ? 'bg-stone-700 text-stone-300' : 'bg-blue-50 text-blue-600'}`}>Swap</button>
            <button onClick={onRemove} className={`px-3.5 py-2.5 rounded-xl text-sm font-semibold ${dark ? 'bg-stone-700 text-stone-400' : 'bg-stone-100 text-stone-500'}`}>
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
