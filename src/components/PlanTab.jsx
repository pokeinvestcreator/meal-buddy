import { useState, useMemo } from 'react'
import { MEALS } from '../data/meals'
import { MEAL_TYPES, getWeekDates, toDateKey } from '../utils/mealUtils'

export default function PlanTab({ customMeals, onAddMeals, setActiveTab, settings }) {
  const [step, setStep] = useState(1)
  const [selectedDates, setSelectedDates] = useState([])
  const [selectedTypes, setSelectedTypes] = useState([])
  const [mealSelections, setMealSelections] = useState({})
  const [servings, setServings] = useState({})
  const [searchQuery, setSearchQuery] = useState('')
  const [browsingType, setBrowsingType] = useState(null)

  const allMeals = useMemo(() => [...MEALS, ...(customMeals || [])], [customMeals])
  const weekDates = useMemo(() => getWeekDates(), [])
  const todayKey = toDateKey(new Date())
  const dark = settings?.darkMode || false

  const proteinTarget = settings?.proteinTarget || 200
  const calorieTarget = settings?.calorieTarget || 2500

  const canProceed1 = selectedDates.length > 0 && selectedTypes.length > 0
  const canProceed2 = selectedTypes.every(t => mealSelections[t])

  const filteredMeals = browsingType
    ? allMeals.filter(m => m.category === browsingType && (!searchQuery || m.name.toLowerCase().includes(searchQuery.toLowerCase())))
    : []

  // Per-day macro totals for step 4
  const dayMacros = useMemo(() => {
    return selectedDates.map(dk => {
      const d = new Date(dk + 'T00:00:00')
      const label = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
      let protein = 0, calories = 0, carbs = 0, fat = 0
      selectedTypes.forEach(tid => {
        const meal = mealSelections[tid]
        const sv = servings[tid] || 1
        if (meal) {
          protein += meal.macrosPerServing.protein * sv
          calories += meal.macrosPerServing.calories * sv
          carbs += meal.macrosPerServing.carbs * sv
          fat += meal.macrosPerServing.fat * sv
        }
      })
      return { dk, label, protein: Math.round(protein), calories: Math.round(calories), carbs: Math.round(carbs), fat: Math.round(fat) }
    })
  }, [selectedDates, selectedTypes, mealSelections, servings])

  function reset() {
    setStep(1); setSelectedDates([]); setSelectedTypes([])
    setMealSelections({}); setServings({}); setSearchQuery(''); setBrowsingType(null)
  }

  function handleAddToPlan() {
    const sel = []
    selectedDates.forEach(dk => {
      selectedTypes.forEach(tid => {
        const meal = mealSelections[tid]
        if (meal) sel.push({ dateKey: dk, mealType: tid, meal, servings: servings[tid] || 1 })
      })
    })
    if (sel.length > 0) { onAddMeals(sel); reset(); setTimeout(() => setActiveTab('calendar'), 600) }
  }

  const btnStyle = { touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }

  const bg = dark ? 'bg-stone-900' : ''
  const card = dark ? 'bg-stone-800 border-stone-700' : 'bg-white border-stone-200'
  const text = dark ? 'text-white' : 'text-stone-900'
  const sub = dark ? 'text-stone-400' : 'text-stone-500'
  const inputCls = dark ? 'bg-stone-700 border-stone-600 text-white placeholder-stone-400' : 'bg-white border-stone-200'

  // ── MEAL BROWSER ──────────────────────────────────────────────────────────────
  if (browsingType) {
    const typeInfo = MEAL_TYPES.find(t => t.key === browsingType)
    return (
      <div className={`px-4 pt-5 pb-6 ${bg} min-h-full`}>
        <div className="flex items-center gap-3 mb-5">
          <button type="button" style={btnStyle} onClick={() => { setBrowsingType(null); setSearchQuery('') }}
            className={`p-2 rounded-xl cursor-pointer ${dark ? 'bg-stone-700 text-stone-300' : 'bg-stone-100 text-stone-600'}`}>
            ← Back
          </button>
          <div>
            <h2 className={`font-bold text-lg ${text}`}>{typeInfo?.emoji} {typeInfo?.label}</h2>
            <p className={`text-xs ${sub}`}>Tap a meal to select it</p>
          </div>
        </div>

        <input type="text" placeholder="Search meals..." value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className={`w-full px-4 py-2.5 border rounded-xl text-sm mb-4 focus:outline-none focus:border-emerald-400 ${inputCls}`} />

        <div className="space-y-2.5">
          {filteredMeals.map(meal => {
            const m = meal.macrosPerServing
            const isSel = mealSelections[browsingType]?.id === meal.id
            return (
              <button key={meal.id} type="button" style={btnStyle}
                onClick={() => {
                  setMealSelections(p => ({ ...p, [browsingType]: meal }))
                  if (!servings[browsingType]) setServings(p => ({ ...p, [browsingType]: selectedDates.length || 1 }))
                  setBrowsingType(null)
                }}
                className={`w-full text-left rounded-2xl border-2 p-3.5 cursor-pointer ${isSel ? 'border-emerald-500 bg-emerald-50' : `border-transparent ${card}`}`}>
                <div className="flex items-start gap-3">
                  <span className="text-3xl leading-none">{meal.emoji}</span>
                  <div className="flex-1">
                    <p className={`font-semibold text-sm ${isSel ? 'text-emerald-700' : text}`}>{meal.name} {isSel ? '✓' : ''}</p>
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
          {filteredMeals.length === 0 && <p className={`text-center text-sm py-8 ${sub}`}>No meals found</p>}
        </div>
      </div>
    )
  }

  // ── STEP 1: Days + Meal Types ─────────────────────────────────────────────────
  if (step === 1) {
    return (
      <div className={`px-4 pt-5 pb-6 ${bg} min-h-full`}>
        <h1 className={`text-xl font-bold mb-1 ${text}`}>Plan Meals</h1>
        <p className={`text-sm mb-6 ${sub}`}>Step 1 of 4 — Choose days & meal types</p>

        <p className={`text-sm font-semibold uppercase tracking-wide mb-3 ${dark ? 'text-stone-300' : 'text-stone-700'}`}>Which days?</p>
        <div className="grid grid-cols-7 gap-1 mb-2">
          {weekDates.map(date => {
            const dk = toDateKey(date)
            const isSel = selectedDates.includes(dk)
            const isToday = dk === todayKey
            return (
              <button key={dk} type="button" style={btnStyle}
                onClick={() => setSelectedDates(p => p.includes(dk) ? p.filter(d => d !== dk) : [...p, dk])}
                className={`flex flex-col items-center py-2 rounded-xl border-2 cursor-pointer ${
                  isSel ? 'border-emerald-500 bg-emerald-500 text-white'
                  : dark ? 'border-stone-700 bg-stone-800 text-stone-300'
                  : 'border-stone-200 bg-white'}`}>
                <span className="text-[10px]">{date.toLocaleDateString('en-US',{weekday:'short'}).slice(0,3)}</span>
                <span className={`text-sm font-bold ${isToday && !isSel ? 'text-emerald-500' : ''}`}>{date.getDate()}</span>
              </button>
            )
          })}
        </div>
        {selectedDates.length > 0 && <p className="text-xs text-emerald-600 mb-5 font-medium">{selectedDates.length} day{selectedDates.length>1?'s':''} selected</p>}

        <p className={`text-sm font-semibold uppercase tracking-wide mb-3 ${dark ? 'text-stone-300' : 'text-stone-700'}`}>Which meal types?</p>
        <div className="grid grid-cols-2 gap-3 mb-8">
          {MEAL_TYPES.map(type => {
            const isSel = selectedTypes.includes(type.key)
            return (
              <button key={type.key} type="button" style={btnStyle}
                onClick={() => setSelectedTypes(p => p.includes(type.key) ? p.filter(t => t !== type.key) : [...p, type.key])}
                className={`flex items-center gap-3 p-4 rounded-2xl border-2 cursor-pointer text-left ${
                  isSel ? 'border-emerald-500 bg-emerald-50'
                  : dark ? 'border-stone-700 bg-stone-800' : 'border-stone-200 bg-white'}`}>
                <span className="text-2xl leading-none">{type.emoji}</span>
                <span className={`font-semibold text-sm ${isSel ? 'text-emerald-700' : text}`}>{type.label}{isSel ? ' ✓' : ''}</span>
              </button>
            )
          })}
        </div>

        <button type="button" style={btnStyle} disabled={!canProceed1} onClick={() => setStep(2)}
          className={`w-full py-4 rounded-2xl font-semibold text-base cursor-pointer ${canProceed1 ? 'bg-emerald-600 text-white' : dark ? 'bg-stone-700 text-stone-500' : 'bg-stone-200 text-stone-400'}`}>
          Choose Meals →
        </button>
      </div>
    )
  }

  // ── STEP 2: Choose meals ──────────────────────────────────────────────────────
  if (step === 2) {
    return (
      <div className={`px-4 pt-5 pb-6 ${bg} min-h-full`}>
        <div className="flex items-center gap-3 mb-5">
          <button type="button" style={btnStyle} onClick={() => setStep(1)} className={`px-3 py-2 rounded-xl text-sm cursor-pointer ${dark ? 'bg-stone-700 text-stone-300' : 'bg-stone-100 text-stone-600'}`}>← Back</button>
          <div>
            <h1 className={`text-xl font-bold ${text}`}>Choose Meals</h1>
            <p className={`text-sm ${sub}`}>Step 2 of 4</p>
          </div>
        </div>

        <div className="space-y-3 mb-8">
          {selectedTypes.map(typeKey => {
            const typeInfo = MEAL_TYPES.find(t => t.key === typeKey)
            const selected = mealSelections[typeKey]
            return (
              <div key={typeKey} className={`border rounded-2xl p-4 ${card}`}>
                <p className={`text-xs font-semibold uppercase tracking-wide mb-2 ${sub}`}>{typeInfo?.emoji} {typeInfo?.label}</p>
                {selected ? (
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{selected.emoji}</span>
                    <div className="flex-1">
                      <p className={`font-semibold text-sm ${text}`}>{selected.name}</p>
                      <p className={`text-xs ${sub}`}>{selected.macrosPerServing.protein}g P · {selected.macrosPerServing.calories} cal</p>
                    </div>
                    <button type="button" style={btnStyle} onClick={() => setBrowsingType(typeKey)}
                      className="text-xs text-emerald-600 font-semibold px-3 py-2 bg-emerald-50 rounded-lg cursor-pointer">
                      Change
                    </button>
                  </div>
                ) : (
                  <button type="button" style={btnStyle} onClick={() => setBrowsingType(typeKey)}
                    className={`w-full py-3 border-2 border-dashed rounded-xl text-sm font-medium cursor-pointer ${dark ? 'border-stone-600 text-stone-400' : 'border-stone-300 text-stone-500'}`}>
                    + Choose {typeInfo?.label}
                  </button>
                )}
              </div>
            )
          })}
        </div>

        <button type="button" style={btnStyle} disabled={!canProceed2} onClick={() => setStep(3)}
          className={`w-full py-4 rounded-2xl font-semibold text-base cursor-pointer ${canProceed2 ? 'bg-emerald-600 text-white' : dark ? 'bg-stone-700 text-stone-500' : 'bg-stone-200 text-stone-400'}`}>
          Set Servings →
        </button>
      </div>
    )
  }

  // ── STEP 3: Servings ──────────────────────────────────────────────────────────
  if (step === 3) {
    return (
      <div className={`px-4 pt-5 pb-6 ${bg} min-h-full`}>
        <div className="flex items-center gap-3 mb-5">
          <button type="button" style={btnStyle} onClick={() => setStep(2)} className={`px-3 py-2 rounded-xl text-sm cursor-pointer ${dark ? 'bg-stone-700 text-stone-300' : 'bg-stone-100 text-stone-600'}`}>← Back</button>
          <div>
            <h1 className={`text-xl font-bold ${text}`}>Set Servings</h1>
            <p className={`text-sm ${sub}`}>Step 3 of 4</p>
          </div>
        </div>

        <div className="space-y-3 mb-8">
          {selectedTypes.map(typeKey => {
            const typeInfo = MEAL_TYPES.find(t => t.key === typeKey)
            const meal = mealSelections[typeKey]
            const sv = servings[typeKey] || selectedDates.length || 1
            if (!meal) return null
            return (
              <div key={typeKey} className={`border rounded-2xl p-4 ${card}`}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-2xl">{meal.emoji}</span>
                  <div>
                    <p className={`font-semibold text-sm ${text}`}>{meal.name}</p>
                    <p className={`text-xs ${sub}`}>{typeInfo?.label}</p>
                  </div>
                </div>
                <div className={`flex items-center justify-between rounded-xl p-3 ${dark ? 'bg-stone-700' : 'bg-stone-50'}`}>
                  <span className={`text-sm font-medium ${text}`}>Servings</span>
                  <div className="flex items-center gap-3">
                    <button type="button" style={btnStyle} onClick={() => setServings(p => ({ ...p, [typeKey]: Math.max(1,(p[typeKey]||1)-1) }))}
                      className={`w-9 h-9 rounded-full font-bold text-lg cursor-pointer ${dark ? 'bg-stone-600 text-white' : 'bg-stone-200 text-stone-700'}`}>−</button>
                    <span className={`text-lg font-bold w-6 text-center ${text}`}>{sv}</span>
                    <button type="button" style={btnStyle} onClick={() => setServings(p => ({ ...p, [typeKey]: (p[typeKey]||1)+1 }))}
                      className="w-9 h-9 rounded-full bg-emerald-500 text-white font-bold text-lg cursor-pointer">+</button>
                  </div>
                </div>
                <p className={`text-xs mt-2 text-center ${sub}`}>{sv*meal.macrosPerServing.calories}cal · {sv*meal.macrosPerServing.protein}g protein total</p>
              </div>
            )
          })}
        </div>

        <button type="button" style={btnStyle} onClick={() => setStep(4)}
          className="w-full py-4 rounded-2xl font-semibold text-base cursor-pointer bg-emerald-600 text-white">
          Review Macros →
        </button>
      </div>
    )
  }

  // ── STEP 4: Macro Day Review ──────────────────────────────────────────────────
  return (
    <div className={`px-4 pt-5 pb-6 ${bg} min-h-full`}>
      <div className="flex items-center gap-3 mb-5">
        <button type="button" style={btnStyle} onClick={() => setStep(3)} className={`px-3 py-2 rounded-xl text-sm cursor-pointer ${dark ? 'bg-stone-700 text-stone-300' : 'bg-stone-100 text-stone-600'}`}>← Back</button>
        <div>
          <h1 className={`text-xl font-bold ${text}`}>Macro Preview</h1>
          <p className={`text-sm ${sub}`}>Step 4 of 4 — Review before confirming</p>
        </div>
      </div>

      {/* Targets reference */}
      <div className={`border rounded-2xl p-3.5 mb-4 ${dark ? 'bg-stone-800 border-stone-700' : 'bg-stone-50 border-stone-200'}`}>
        <p className={`text-xs font-semibold uppercase tracking-wide mb-2 ${sub}`}>Your Daily Targets</p>
        <div className="flex gap-4">
          <div className="text-center">
            <p className={`text-base font-bold ${text}`}>{calorieTarget}</p>
            <p className={`text-[10px] ${sub}`}>CAL TARGET</p>
          </div>
          <div className="text-center">
            <p className="text-base font-bold text-blue-500">{proteinTarget}g</p>
            <p className={`text-[10px] ${sub}`}>PROTEIN TARGET</p>
          </div>
        </div>
      </div>

      {/* Per-day breakdown */}
      <div className="space-y-3 mb-6">
        {dayMacros.map(({ dk, label, protein, calories, carbs, fat }) => {
          const proteinPct = Math.min(100, Math.round((protein / proteinTarget) * 100))
          const calPct = Math.min(100, Math.round((calories / calorieTarget) * 100))
          const proteinOver = protein > proteinTarget
          const calOver = calories > calorieTarget
          const proteinLow = protein < proteinTarget * 0.85
          const calLow = calories < calorieTarget * 0.85

          return (
            <div key={dk} className={`border rounded-2xl p-4 ${card}`}>
              <p className={`font-semibold text-sm mb-3 ${text}`}>{label}</p>

              {/* Macro bars */}
              <div className="space-y-2 mb-3">
                {/* Protein */}
                <div>
                  <div className="flex justify-between mb-1">
                    <span className={`text-xs font-medium text-blue-500`}>Protein</span>
                    <span className={`text-xs font-bold ${proteinOver ? 'text-emerald-500' : proteinLow ? 'text-red-400' : 'text-blue-500'}`}>
                      {protein}g / {proteinTarget}g {proteinOver ? '✓' : proteinLow ? '↓' : ''}
                    </span>
                  </div>
                  <div className={`h-2 rounded-full overflow-hidden ${dark ? 'bg-stone-700' : 'bg-stone-100'}`}>
                    <div className={`h-full rounded-full transition-all ${proteinOver ? 'bg-emerald-500' : proteinLow ? 'bg-red-400' : 'bg-blue-500'}`}
                      style={{ width: `${proteinPct}%` }} />
                  </div>
                </div>
                {/* Calories */}
                <div>
                  <div className="flex justify-between mb-1">
                    <span className={`text-xs font-medium ${sub}`}>Calories</span>
                    <span className={`text-xs font-bold ${calOver ? 'text-amber-500' : calLow ? 'text-red-400' : sub}`}>
                      {calories} / {calorieTarget} {calOver ? '↑' : calLow ? '↓' : ''}
                    </span>
                  </div>
                  <div className={`h-2 rounded-full overflow-hidden ${dark ? 'bg-stone-700' : 'bg-stone-100'}`}>
                    <div className={`h-full rounded-full ${calOver ? 'bg-amber-500' : 'bg-stone-400'}`}
                      style={{ width: `${calPct}%` }} />
                  </div>
                </div>
              </div>

              {/* Mini macro grid */}
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { label: 'Cal', val: calories, color: text },
                  { label: 'Protein', val: `${protein}g`, color: 'text-blue-500' },
                  { label: 'Carbs', val: `${carbs}g`, color: 'text-amber-500' },
                  { label: 'Fat', val: `${fat}g`, color: 'text-red-400' },
                ].map(({ label: l, val, color }) => (
                  <div key={l} className={`rounded-xl p-2 text-center ${dark ? 'bg-stone-700' : 'bg-stone-50'}`}>
                    <p className={`text-xs font-bold ${color}`}>{val}</p>
                    <p className={`text-[9px] uppercase font-medium ${sub}`}>{l}</p>
                  </div>
                ))}
              </div>

              {/* Warning/tip */}
              {proteinLow && (
                <p className="text-xs text-amber-500 mt-2 font-medium">
                  ↓ {proteinTarget - protein}g below protein target — consider adding a snack or increasing servings
                </p>
              )}
              {proteinOver && (
                <p className="text-xs text-emerald-600 mt-2 font-medium">
                  ✓ Protein target hit!
                </p>
              )}
            </div>
          )
        })}
      </div>

      {/* Meals summary */}
      <div className={`border rounded-2xl p-4 mb-6 ${card}`}>
        <p className={`text-xs font-semibold uppercase tracking-wide mb-3 ${sub}`}>Meals per day</p>
        <div className="space-y-1.5">
          {selectedTypes.map(typeKey => {
            const typeInfo = MEAL_TYPES.find(t => t.key === typeKey)
            const meal = mealSelections[typeKey]
            const sv = servings[typeKey] || 1
            if (!meal) return null
            return (
              <div key={typeKey} className="flex items-center gap-2">
                <span className="text-sm">{meal.emoji}</span>
                <span className={`text-sm flex-1 ${text}`}>{meal.name}</span>
                <span className={`text-xs ${sub}`}>{sv > 1 ? `×${sv}` : ''}</span>
                <button type="button" style={btnStyle}
                  onClick={() => { setBrowsingType(typeKey); setStep(2) }}
                  className="text-xs text-emerald-600 font-semibold cursor-pointer">
                  Swap
                </button>
              </div>
            )
          })}
        </div>
      </div>

      <button type="button" style={btnStyle} onClick={handleAddToPlan}
        className="w-full py-4 rounded-2xl font-semibold text-base bg-emerald-600 text-white cursor-pointer shadow-lg shadow-emerald-200">
        Add to Plan & Grocery List ✓
      </button>
    </div>
  )
}
