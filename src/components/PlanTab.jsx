import { useState, useMemo } from 'react'
import { MEALS } from '../data/meals'
import { MEAL_TYPES, getWeekDates, toDateKey, getProteinDriverIngredient, filterMealsByDietary } from '../utils/mealUtils'

// ── Macro analysis helpers ────────────────────────────────────────────────────

function proteinEff(meal) {
  return meal.macrosPerServing.protein / Math.max(meal.macrosPerServing.calories, 1)
}

// Uniform: every meal × same factor, 0.05 serving precision
function computeUniform(meals, proteinTarget, currentProtein) {
  const factor = currentProtein > 0 ? proteinTarget / currentProtein : 1
  return meals.map(({ type, meal, servings }) => ({
    type, meal,
    currentServings: servings,
    newServings: Math.max(0.25, Math.min(10, Math.round(servings * factor * 20) / 20)),
  }))
}

// Smart: weight meals by P:cal efficiency
function computeSmart(meals, proteinTarget) {
  const effs = meals.map(({ meal }) => proteinEff(meal))
  const avg = effs.reduce((a, b) => a + b, 0) / (effs.length || 1)
  const weights = effs.map(e => avg > 0 ? e / avg : 1)
  const wPSum = meals.reduce((acc, { meal, servings }, i) =>
    acc + servings * weights[i] * meal.macrosPerServing.protein, 0)
  const k = wPSum > 0 ? proteinTarget / wPSum : 1
  return meals.map(({ type, meal, servings }, i) => ({
    type, meal,
    currentServings: servings,
    newServings: Math.max(0.25, Math.min(10, Math.round(servings * k * weights[i] * 20) / 20)),
  }))
}

function sumMacros(adjs) {
  return adjs.reduce((acc, { meal, newServings: s }) => ({
    protein: acc.protein + meal.macrosPerServing.protein * s,
    calories: acc.calories + meal.macrosPerServing.calories * s,
    carbs: acc.carbs + meal.macrosPerServing.carbs * s,
    fat: acc.fat + meal.macrosPerServing.fat * s,
  }), { protein: 0, calories: 0, carbs: 0, fat: 0 })
}

function getSwapAlts(meal, allMeals, settings) {
  const safe = filterMealsByDietary(allMeals, settings)
  return safe
    .filter(m => m.category === meal.category && m.id !== meal.id)
    .sort((a, b) => proteinEff(b) - proteinEff(a))
    .slice(0, 3)
}

function getTopSnacks(allMeals, settings) {
  const safe = filterMealsByDietary(allMeals, settings)
  return safe
    .filter(m => m.category === 'snack')
    .sort((a, b) => proteinEff(b) - proteinEff(a))
    .slice(0, 3)
}

function getCalCtx(goal) {
  if (goal === 'gain') return {
    isBulking: true, icon: '💪', color: 'text-emerald-500',
    bgLight: 'bg-emerald-50 border-emerald-200',
    bgDark: 'bg-emerald-900/20 border-emerald-600',
    barColor: 'bg-emerald-500',
    label: 'calorie surplus',
    note: "You're in a surplus — great for muscle gain and recovery",
  }
  if (goal === 'lose') return {
    isBulking: false, icon: '🚨', color: 'text-red-500',
    bgLight: 'bg-red-50 border-red-200',
    bgDark: 'bg-red-900/20 border-red-700',
    barColor: 'bg-red-400',
    label: 'over calorie target',
    note: 'Staying in deficit matters for fat loss — try swapping a meal',
  }
  return {
    isBulking: false, icon: '⚠️', color: 'text-amber-500',
    bgLight: 'bg-amber-50 border-amber-200',
    bgDark: 'bg-amber-900/20 border-amber-600',
    barColor: 'bg-amber-500',
    label: 'over calorie target',
    note: 'Try swapping a meal or adjusting servings to stay on track',
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function PlanTab({ customMeals, onAddMeals, setActiveTab, settings }) {
  const [step, setStep] = useState(1)
  const [selectedDates, setSelectedDates] = useState([])
  const [selectedTypes, setSelectedTypes] = useState([])
  const [mealSelections, setMealSelections] = useState({})
  const [servings, setServings] = useState({})
  const [searchQuery, setSearchQuery] = useState('')
  const [browsingType, setBrowsingType] = useState(null)

  // Adjust view state
  const [adjusting, setAdjusting] = useState(false)
  const [adjustTarget, setAdjustTarget] = useState(200)
  const [scaleMode, setScaleMode] = useState('uniform')

  const allMeals = useMemo(() => [...MEALS, ...(customMeals || [])], [customMeals])
  const weekDates = useMemo(() => getWeekDates(), [])
  const todayKey = toDateKey(new Date())
  const dark = settings?.darkMode || false

  const proteinTarget = settings?.proteinTarget || 200
  const calorieTarget = settings?.calorieTarget || 2500
  const goal = settings?.profile?.goal || 'maintain'

  const canProceed1 = selectedDates.length > 0 && selectedTypes.length > 0
  const canProceed2 = selectedTypes.every(t => mealSelections[t])

  const dietaryAllMeals = filterMealsByDietary(allMeals, settings)
  const filteredMeals = browsingType
    ? dietaryAllMeals.filter(m => m.category === browsingType && (!searchQuery || m.name.toLowerCase().includes(searchQuery.toLowerCase())))
    : []

  // Per-day macro totals — all days identical since same meals apply
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
    setAdjusting(false)
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

  function openAdjust() {
    setAdjustTarget(proteinTarget)
    setScaleMode('uniform')
    setAdjusting(true)
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

  // ── ADJUST VIEW (step 4 sub-screen) ──────────────────────────────────────────
  if (adjusting) {
    // Build meals list from current plan selections
    const planMeals = selectedTypes
      .filter(tk => mealSelections[tk])
      .map(tk => ({
        type: MEAL_TYPES.find(t => t.key === tk),
        meal: mealSelections[tk],
        servings: servings[tk] || 1,
      }))

    const currentProtein = planMeals.reduce((acc, { meal, servings: s }) => acc + meal.macrosPerServing.protein * s, 0)

    const adjustments = scaleMode === 'smart'
      ? computeSmart(planMeals, adjustTarget)
      : computeUniform(planMeals, adjustTarget, currentProtein)

    const preview = sumMacros(adjustments)
    const calorieOverage = Math.round(preview.calories - calorieTarget)
    const isOverCalories = calorieOverage > 30
    const calCtx = getCalCtx(goal)
    const alreadyOnTarget = Math.abs(currentProtein - adjustTarget) / Math.max(adjustTarget, 1) < 0.03
    const previewHitsTarget = Math.abs(preview.protein - adjustTarget) / Math.max(adjustTarget, 1) < 0.06

    return (
      <div className={`px-4 pt-5 pb-28 ${bg} min-h-full`}>

        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <button type="button" onClick={() => setAdjusting(false)}
            style={btnStyle}
            className={`px-3 py-2 rounded-xl text-sm font-medium ${dark ? 'bg-stone-700 text-stone-300' : 'bg-stone-100 text-stone-600'}`}>
            ← Back
          </button>
          <div>
            <h2 className={`font-bold text-lg ${text}`}>🎯 Adjust Servings</h2>
            <p className={`text-xs ${sub}`}>
              {selectedDates.length} day{selectedDates.length !== 1 ? 's' : ''} · same meals applied to all
            </p>
          </div>
        </div>

        {/* Scale mode toggle */}
        <div className={`flex rounded-xl p-1 mb-1 ${dark ? 'bg-stone-800' : 'bg-stone-100'}`}>
          {[
            { key: 'uniform', label: 'Uniform' },
            { key: 'smart', label: '⚡ Smart' },
          ].map(({ key, label }) => (
            <button key={key} type="button" onClick={() => setScaleMode(key)}
              style={btnStyle}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                scaleMode === key ? 'bg-emerald-600 text-white shadow-sm' : dark ? 'text-stone-400' : 'text-stone-500'
              }`}>
              {label}
            </button>
          ))}
        </div>
        <p className={`text-xs text-center mb-4 ${sub}`}>
          {scaleMode === 'uniform' ? 'Same scale factor applied to every meal' : 'High protein-per-calorie meals scale more favorably'}
        </p>

        {/* Protein target input */}
        <div className={`rounded-2xl border p-4 mb-4 ${card}`}>
          <p className={`text-xs font-semibold uppercase tracking-wide mb-3 ${sub}`}>Protein Target</p>
          <div className="flex items-center gap-3 flex-wrap gap-y-2">
            <div className="flex items-center gap-2">
              <input type="number" value={adjustTarget} min={1} max={999}
                onChange={e => setAdjustTarget(Math.max(1, Math.min(999, parseInt(e.target.value) || 1)))}
                className={`w-20 px-3 py-2 border rounded-xl text-center font-bold text-xl focus:outline-none focus:border-emerald-400 ${dark ? 'bg-stone-700 border-stone-600 text-white' : 'bg-white border-stone-200'}`}
              />
              <span className={`text-sm font-medium ${sub}`}>g protein</span>
            </div>
            {adjustTarget !== proteinTarget && (
              <button type="button" onClick={() => setAdjustTarget(proteinTarget)}
                style={btnStyle}
                className={`text-xs px-3 py-1.5 rounded-lg ${dark ? 'bg-stone-700 text-stone-400' : 'bg-stone-100 text-stone-500'}`}>
                Reset to {proteinTarget}g
              </button>
            )}
          </div>
        </div>

        {/* Before / After preview */}
        <div className={`rounded-2xl border p-4 mb-4 ${card}`}>
          <p className={`text-xs font-semibold uppercase tracking-wide mb-3 ${sub}`}>Preview</p>
          <div className="grid grid-cols-2 gap-3 mb-2.5">
            <div className={`rounded-xl p-3 ${dark ? 'bg-stone-700' : 'bg-stone-50'}`}>
              <p className={`text-[10px] font-semibold uppercase tracking-wider ${sub} mb-2`}>Current</p>
              <p className="text-blue-500 font-bold text-2xl leading-none">{Math.round(currentProtein)}g</p>
              <p className={`text-xs mt-1 ${sub}`}>{Math.round(planMeals.reduce((a, { meal, servings: s }) => a + meal.macrosPerServing.calories * s, 0))} cal</p>
              <p className={`text-[10px] uppercase tracking-wide mt-0.5 ${sub}`}>protein</p>
            </div>
            <div className={`rounded-xl p-3 border-2 transition-colors ${
              previewHitsTarget
                ? dark ? 'border-emerald-500 bg-emerald-900/20' : 'border-emerald-400 bg-emerald-50'
                : dark ? 'border-stone-600 bg-stone-700' : 'border-stone-200 bg-stone-50'
            }`}>
              <p className={`text-[10px] font-semibold uppercase tracking-wider ${sub} mb-2`}>After</p>
              <p className={`font-bold text-2xl leading-none ${previewHitsTarget ? 'text-emerald-500' : 'text-blue-400'}`}>
                {Math.round(preview.protein)}g
              </p>
              <p className={`text-xs mt-1 font-medium ${isOverCalories ? calCtx.color : sub}`}>
                {Math.round(preview.calories)} cal{isOverCalories ? ` (+${calorieOverage})` : ''}
              </p>
              <p className={`text-[10px] uppercase tracking-wide mt-0.5 ${previewHitsTarget ? 'text-emerald-500' : sub}`}>
                {previewHitsTarget ? '✓ on target' : 'projected'}
              </p>
            </div>
          </div>
          {alreadyOnTarget ? (
            <p className="text-xs text-emerald-500 font-medium">✓ Already at your protein target!</p>
          ) : (
            <p className={`text-xs ${sub}`}>
              {scaleMode === 'uniform'
                ? `${(adjustTarget / Math.max(currentProtein, 1)).toFixed(2)}× uniform scale · ±0.05 serving precision`
                : '⚡ Efficiency-weighted — preserves your best protein-per-calorie meals'}
            </p>
          )}
        </div>

        {/* Calorie warning */}
        {isOverCalories && (
          <div className={`rounded-2xl border p-4 mb-4 ${dark ? calCtx.bgDark : calCtx.bgLight}`}>
            <div className="flex items-start gap-2">
              <span className="text-lg leading-none mt-0.5 flex-shrink-0">{calCtx.icon}</span>
              <div className="flex-1">
                <p className={`text-sm font-bold ${calCtx.color}`}>+{calorieOverage} cal {calCtx.label}</p>
                <p className={`text-xs mt-0.5 ${dark ? 'text-stone-400' : 'text-stone-600'}`}>{calCtx.note}</p>
              </div>
              {scaleMode === 'uniform' && !calCtx.isBulking && (
                <button type="button" onClick={() => setScaleMode('smart')}
                  style={btnStyle}
                  className="flex-shrink-0 bg-emerald-600 text-white text-xs px-3 py-1.5 rounded-lg font-semibold">
                  Try ⚡ Smart
                </button>
              )}
            </div>
          </div>
        )}

        {/* Per-meal breakdown */}
        <p className={`text-xs font-semibold uppercase tracking-wide mb-2.5 ${sub}`}>Per Meal</p>
        <div className="space-y-2.5 mb-6">
          {adjustments.map(({ type, meal, currentServings, newServings }) => {
            const driver = getProteinDriverIngredient(meal)
            const proteinBefore = Math.round(meal.macrosPerServing.protein * currentServings)
            const proteinAfter = Math.round(meal.macrosPerServing.protein * newServings)
            const TYPE_COLORS = {
              breakfast: 'bg-amber-100 text-amber-800 border-amber-200',
              lunch: 'bg-blue-100 text-blue-800 border-blue-200',
              dinner: 'bg-purple-100 text-purple-800 border-purple-200',
              snack: 'bg-green-100 text-green-800 border-green-200',
            }
            const colorClass = TYPE_COLORS[type.key] || 'bg-stone-100 text-stone-700 border-stone-200'
            const diff = newServings - currentServings
            return (
              <div key={type.key} className={`rounded-2xl border p-3.5 ${card}`}>
                <div className="flex items-center gap-3">
                  <span className="text-2xl leading-none flex-shrink-0">{meal.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <span className={`inline-block text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border ${colorClass}`}>
                      {type.label}
                    </span>
                    <p className={`font-semibold text-sm mt-0.5 ${text} truncate`}>{meal.name}</p>
                    {driver && <p className={`text-[11px] ${sub}`}>↑ {driver.name}</p>}
                  </div>
                  <div className="text-right flex-shrink-0 ml-2">
                    <div className="flex items-center justify-end gap-1.5 mb-0.5">
                      <span className={`text-sm ${sub}`}>{currentServings}×</span>
                      <span className={`text-xs ${sub}`}>→</span>
                      <span className={`text-sm font-bold ${diff > 0.01 ? 'text-emerald-500' : diff < -0.01 ? 'text-amber-500' : text}`}>
                        {newServings}×
                      </span>
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

        {/* Apply */}
        {!alreadyOnTarget ? (
          <button type="button" style={btnStyle}
            onClick={() => {
              const newSv = {}
              adjustments.forEach(({ type, newServings }) => { newSv[type.key] = newServings })
              setServings(p => ({ ...p, ...newSv }))
              setAdjusting(false)
            }}
            className="w-full bg-emerald-600 active:bg-emerald-700 text-white py-4 rounded-2xl font-bold text-base mb-3">
            Apply Adjustments
          </button>
        ) : (
          <button type="button" style={btnStyle}
            onClick={() => setAdjusting(false)}
            className={`w-full py-4 rounded-2xl font-bold text-base mb-3 ${dark ? 'bg-stone-700 text-stone-300' : 'bg-stone-100 text-stone-600'}`}>
            Already on track ✓
          </button>
        )}
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

  // ── STEP 4: Macro Preview + Analysis ─────────────────────────────────────────
  const calCtx = getCalCtx(goal)
  const sample = dayMacros[0] || { protein: 0, calories: 0, carbs: 0, fat: 0 }
  const calorieOverage = sample.calories - calorieTarget
  const isOverCalories = calorieOverage > 30
  const isUnderProtein = sample.protein < proteinTarget * 0.95
  const isOnTarget = !isOverCalories && !isUnderProtein

  const mealEntries = selectedTypes
    .filter(tk => mealSelections[tk])
    .map(tk => ({ typeKey: tk, meal: mealSelections[tk], currentServings: servings[tk] || 1 }))
  const sortedByEff = [...mealEntries].sort((a, b) => proteinEff(a.meal) - proteinEff(b.meal))
  const worstEntry = (isOverCalories && !calCtx.isBulking) ? sortedByEff[0] : null
  const swapAlts = worstEntry ? getSwapAlts(worstEntry.meal, allMeals, settings) : []
  const hasSnack = selectedTypes.includes('snack')
  const showSnackRec = isUnderProtein && !hasSnack && !calCtx.isBulking
  const topSnacks = showSnackRec ? getTopSnacks(allMeals, settings) : []

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
          <div className="text-center">
            <p className={`text-base font-bold capitalize ${text}`}>{goal}</p>
            <p className={`text-[10px] ${sub}`}>GOAL</p>
          </div>
        </div>
      </div>

      {/* Per-day breakdown */}
      <div className="space-y-3 mb-4">
        {dayMacros.map(({ dk, label, protein, calories, carbs, fat }) => {
          const proteinPct = Math.min(100, Math.round((protein / proteinTarget) * 100))
          const calPct = Math.min(100, Math.round((calories / calorieTarget) * 100))
          const proteinOver = protein >= proteinTarget * 0.95
          const proteinLow = protein < proteinTarget * 0.85
          const calOver = calories > calorieTarget + 30
          const calBarColor = calOver && goal === 'gain' ? 'bg-emerald-500'
            : calOver && goal === 'lose' ? 'bg-red-400'
            : calOver ? 'bg-amber-500' : 'bg-stone-400'
          const calLabelColor = calOver && goal === 'gain' ? 'text-emerald-500'
            : calOver && goal === 'lose' ? 'text-red-400'
            : calOver ? calCtx.color : sub

          return (
            <div key={dk} className={`border rounded-2xl p-4 ${card}`}>
              <p className={`font-semibold text-sm mb-3 ${text}`}>{label}</p>
              <div className="space-y-2 mb-3">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-xs font-medium text-blue-500">Protein</span>
                    <span className={`text-xs font-bold ${proteinOver ? 'text-emerald-500' : proteinLow ? 'text-red-400' : 'text-blue-500'}`}>
                      {protein}g / {proteinTarget}g {proteinOver ? '✓' : proteinLow ? '↓' : ''}
                    </span>
                  </div>
                  <div className={`h-2 rounded-full overflow-hidden ${dark ? 'bg-stone-700' : 'bg-stone-100'}`}>
                    <div className={`h-full rounded-full transition-all ${proteinOver ? 'bg-emerald-500' : proteinLow ? 'bg-red-400' : 'bg-blue-500'}`}
                      style={{ width: `${proteinPct}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <span className={`text-xs font-medium ${sub}`}>Calories</span>
                    <span className={`text-xs font-bold ${calLabelColor}`}>
                      {calories} / {calorieTarget} {calOver ? (goal === 'gain' ? '💪' : '↑') : ''}
                    </span>
                  </div>
                  <div className={`h-2 rounded-full overflow-hidden ${dark ? 'bg-stone-700' : 'bg-stone-100'}`}>
                    <div className={`h-full rounded-full ${calBarColor}`} style={{ width: `${calPct}%` }} />
                  </div>
                </div>
              </div>
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
            </div>
          )
        })}
      </div>

      {/* Adjust servings CTA */}
      <button type="button" style={btnStyle} onClick={openAdjust}
        className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold border mb-4 transition-colors ${
          dark ? 'border-stone-600 text-stone-300 bg-stone-700 active:bg-stone-600' : 'border-stone-200 text-stone-600 bg-stone-50 active:bg-stone-100'
        }`}>
        🎯 Adjust serving sizes to hit protein target
      </button>

      {/* Plan Analysis */}
      {isOnTarget ? (
        <div className={`border rounded-2xl p-4 mb-4 ${dark ? 'bg-stone-800 border-stone-700' : 'bg-emerald-50 border-emerald-200'}`}>
          <p className="text-sm font-bold text-emerald-600">✓ Plan looks great!</p>
          <p className={`text-xs mt-0.5 ${dark ? 'text-stone-400' : 'text-stone-600'}`}>
            Hitting protein target and within calorie budget for your {goal} goal.
          </p>
        </div>
      ) : (
        <div className={`border rounded-2xl p-4 mb-4 ${dark ? calCtx.bgDark : calCtx.bgLight}`}>
          {isOverCalories && (
            <div className="flex items-start gap-2 mb-4">
              <span className="text-lg leading-none mt-0.5 flex-shrink-0">{calCtx.icon}</span>
              <div>
                <p className={`text-sm font-bold ${calCtx.color}`}>+{calorieOverage} cal {calCtx.label}</p>
                <p className={`text-xs mt-0.5 ${dark ? 'text-stone-400' : 'text-stone-600'}`}>{calCtx.note}</p>
              </div>
            </div>
          )}
          {isUnderProtein && (
            <div className="flex items-start gap-2 mb-4">
              <span className="text-lg leading-none mt-0.5 flex-shrink-0">📉</span>
              <div>
                <p className={`text-sm font-bold ${dark ? 'text-stone-200' : 'text-stone-800'}`}>
                  {proteinTarget - sample.protein}g below protein target
                </p>
                <p className={`text-xs mt-0.5 ${dark ? 'text-stone-400' : 'text-stone-600'}`}>
                  Tap "Adjust serving sizes" above or add a snack below
                </p>
              </div>
            </div>
          )}
          {swapAlts.length > 0 && worstEntry && (
            <div className="mb-4">
              <p className={`text-[10px] font-bold uppercase tracking-wide mb-0.5 ${dark ? 'text-stone-400' : 'text-stone-500'}`}>
                💡 Swap out: {worstEntry.meal.name}
              </p>
              <p className={`text-[10px] mb-2 ${dark ? 'text-stone-500' : 'text-stone-400'}`}>
                Lowest protein-per-calorie meal in your plan · tap to swap
              </p>
              <div className="space-y-1.5">
                {swapAlts.map(alt => {
                  const calDiff = Math.round((alt.macrosPerServing.calories - worstEntry.meal.macrosPerServing.calories) * worstEntry.currentServings)
                  const pDiff = Math.round((alt.macrosPerServing.protein - worstEntry.meal.macrosPerServing.protein) * worstEntry.currentServings)
                  const isCurrent = mealSelections[worstEntry.typeKey]?.id === alt.id
                  return (
                    <button key={alt.id} type="button" style={btnStyle}
                      onClick={() => setMealSelections(p => ({ ...p, [worstEntry.typeKey]: alt }))}
                      className={`w-full flex items-center gap-2.5 p-2.5 rounded-xl text-left active:opacity-70 border ${
                        isCurrent
                          ? 'border-emerald-400 ' + (dark ? 'bg-emerald-900/30' : 'bg-emerald-50')
                          : dark ? 'border-transparent bg-stone-700' : 'border-stone-100 bg-white'
                      }`}>
                      <span className="text-xl leading-none flex-shrink-0">{alt.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-semibold ${text} truncate`}>{alt.name} {isCurrent ? '✓' : ''}</p>
                        <div className="flex gap-2 mt-0.5">
                          <span className={`text-[10px] font-medium ${pDiff >= 0 ? 'text-blue-500' : 'text-blue-400'}`}>
                            {pDiff >= 0 ? '+' : ''}{pDiff}g P
                          </span>
                          <span className={`text-[10px] font-medium ${calDiff < 0 ? 'text-emerald-500' : calDiff > 30 ? 'text-red-400' : sub}`}>
                            {calDiff > 0 ? '+' : ''}{calDiff} cal
                          </span>
                        </div>
                      </div>
                      <span className={`text-xs ${isCurrent ? 'text-emerald-500 font-bold' : sub}`}>{isCurrent ? '✓' : '→'}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
          {showSnackRec && topSnacks.length > 0 && (
            <div>
              <p className={`text-[10px] font-bold uppercase tracking-wide mb-0.5 ${dark ? 'text-stone-400' : 'text-stone-500'}`}>
                🍎 Add a protein snack
              </p>
              <p className={`text-[10px] mb-2 ${dark ? 'text-stone-500' : 'text-stone-400'}`}>
                No snack in your plan yet — add one to close the protein gap
              </p>
              <div className="space-y-1.5">
                {topSnacks.slice(0, 2).map(snack => (
                  <button key={snack.id} type="button" style={btnStyle}
                    onClick={() => {
                      setSelectedTypes(p => [...p, 'snack'])
                      setMealSelections(p => ({ ...p, snack }))
                      setServings(p => ({ ...p, snack: 1 }))
                    }}
                    className={`w-full flex items-center gap-2.5 p-2.5 rounded-xl text-left active:opacity-70 ${dark ? 'bg-stone-700' : 'bg-white border border-stone-100'}`}>
                    <span className="text-xl leading-none flex-shrink-0">{snack.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-semibold ${text} truncate`}>{snack.name}</p>
                      <div className="flex gap-2 mt-0.5">
                        <span className="text-[10px] font-medium text-blue-500">+{snack.macrosPerServing.protein}g P</span>
                        <span className={`text-[10px] ${sub}`}>{snack.macrosPerServing.calories} cal</span>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-emerald-500">+ Add</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

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
                <span className={`text-xs font-medium ${sub}`}>{sv > 1 ? `×${sv}` : '×1'}</span>
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
