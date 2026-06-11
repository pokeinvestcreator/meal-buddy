import { useState, useMemo } from 'react'
import { MEALS } from '../data/meals'
import { MEAL_TYPES, getWeekDates, toDateKey } from '../utils/mealUtils'

export default function PlanTab({ customMeals, onAddMeals, setActiveTab }) {
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

  const canProceed1 = selectedDates.length > 0 && selectedTypes.length > 0
  const canProceed2 = selectedTypes.every(t => mealSelections[t])

  const filteredMeals = browsingType
    ? allMeals.filter(m => m.category === browsingType && (!searchQuery || m.name.toLowerCase().includes(searchQuery.toLowerCase())))
    : []

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

  // ── MEAL BROWSER ─────────────────────────────────────────────────────────────
  if (browsingType) {
    const typeInfo = MEAL_TYPES.find(t => t.id === browsingType)
    return (
      <div className="px-4 pt-5 pb-6">
        <div className="flex items-center gap-3 mb-5">
          <button type="button" style={btnStyle} onClick={() => { setBrowsingType(null); setSearchQuery('') }}
            className="p-2 rounded-xl bg-stone-100 text-stone-600 cursor-pointer">
            ← Back
          </button>
          <div>
            <h2 className="font-bold text-stone-900 text-lg">{typeInfo?.emoji} {typeInfo?.label}</h2>
            <p className="text-xs text-stone-500">Tap a meal to select it</p>
          </div>
        </div>

        <input type="text" placeholder="Search meals..." value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full px-4 py-2.5 bg-white border border-stone-200 rounded-xl text-sm mb-4 focus:outline-none focus:border-emerald-400" />

        <div className="space-y-2.5">
          {filteredMeals.map(meal => {
            const m = meal.macrosPerServing
            const isSel = mealSelections[browsingType]?.id === meal.id
            return (
              <button key={meal.id} type="button" style={btnStyle}
                onClick={() => { setMealSelections(p => ({ ...p, [browsingType]: meal })); if (!servings[browsingType]) setServings(p => ({ ...p, [browsingType]: selectedDates.length || 1 })); setBrowsingType(null) }}
                className={`w-full text-left rounded-2xl border-2 p-3.5 cursor-pointer ${isSel ? 'border-emerald-500 bg-emerald-50' : 'border-stone-200 bg-white'}`}>
                <div className="flex items-start gap-3">
                  <span className="text-3xl leading-none">{meal.emoji}</span>
                  <div className="flex-1">
                    <p className="font-semibold text-stone-900 text-sm">{meal.name} {isSel ? '✓' : ''}</p>
                    <p className="text-[11px] text-stone-500">{meal.prepTime + meal.cookTime}min · {m.calories}cal</p>
                    <div className="flex gap-2.5 mt-1">
                      <span className="text-[11px] font-semibold text-blue-600">P {m.protein}g</span>
                      <span className="text-[11px] font-semibold text-amber-600">C {m.carbs}g</span>
                      <span className="text-[11px] font-semibold text-red-500">F {m.fat}g</span>
                    </div>
                  </div>
                </div>
              </button>
            )
          })}
          {filteredMeals.length === 0 && <p className="text-center text-stone-400 text-sm py-8">No meals found</p>}
        </div>
      </div>
    )
  }

  // ── STEP 1 ────────────────────────────────────────────────────────────────────
  if (step === 1) {
    return (
      <div className="px-4 pt-5 pb-6">
        <h1 className="text-xl font-bold text-stone-900 mb-1">Plan Meals</h1>
        <p className="text-sm text-stone-500 mb-6">Step 1 of 3 — Choose days & meal types</p>

        <p className="text-sm font-semibold text-stone-700 uppercase tracking-wide mb-3">Which days?</p>
        <div className="grid grid-cols-7 gap-1 mb-2">
          {weekDates.map(date => {
            const dk = toDateKey(date)
            const isSel = selectedDates.includes(dk)
            const isToday = dk === todayKey
            return (
              <button key={dk} type="button" style={btnStyle}
                onClick={() => setSelectedDates(p => p.includes(dk) ? p.filter(d => d !== dk) : [...p, dk])}
                className={`flex flex-col items-center py-2 rounded-xl border-2 cursor-pointer ${isSel ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-stone-200 bg-white'}`}>
                <span className="text-[10px]">{date.toLocaleDateString('en-US',{weekday:'short'}).slice(0,3)}</span>
                <span className={`text-sm font-bold ${isToday && !isSel ? 'text-emerald-600' : ''}`}>{date.getDate()}</span>
              </button>
            )
          })}
        </div>
        {selectedDates.length > 0 && <p className="text-xs text-emerald-700 mb-5 font-medium">{selectedDates.length} day{selectedDates.length>1?'s':''} selected</p>}

        <p className="text-sm font-semibold text-stone-700 uppercase tracking-wide mb-3">Which meal types?</p>
        <div className="grid grid-cols-2 gap-3 mb-8">
          {MEAL_TYPES.map(type => {
            const isSel = selectedTypes.includes(type.id)
            return (
              <button key={type.id} type="button" style={btnStyle}
                onClick={() => setSelectedTypes(p => p.includes(type.id) ? p.filter(t => t !== type.id) : [...p, type.id])}
                className={`flex items-center gap-3 p-4 rounded-2xl border-2 cursor-pointer text-left ${isSel ? 'border-emerald-500 bg-emerald-50' : 'border-stone-200 bg-white'}`}>
                <span className="text-2xl leading-none">{type.emoji}</span>
                <div>
                  <p className={`font-semibold text-sm ${isSel ? 'text-emerald-700' : 'text-stone-800'}`}>{type.label}</p>
                  <p className="text-[10px] text-emerald-600 h-3">{isSel ? '✓ Selected' : ''}</p>
                </div>
              </button>
            )
          })}
        </div>

        <button type="button" style={btnStyle} disabled={!canProceed1}
          onClick={() => setStep(2)}
          className={`w-full py-4 rounded-2xl font-semibold text-base cursor-pointer ${canProceed1 ? 'bg-emerald-600 text-white' : 'bg-stone-200 text-stone-400'}`}>
          Choose Meals →
        </button>
      </div>
    )
  }

  // ── STEP 2 ────────────────────────────────────────────────────────────────────
  if (step === 2) {
    return (
      <div className="px-4 pt-5 pb-6">
        <div className="flex items-center gap-3 mb-5">
          <button type="button" style={btnStyle} onClick={() => setStep(1)} className="px-3 py-2 rounded-xl bg-stone-100 text-stone-600 text-sm cursor-pointer">← Back</button>
          <div>
            <h1 className="text-xl font-bold text-stone-900">Choose Meals</h1>
            <p className="text-sm text-stone-500">Step 2 of 3</p>
          </div>
        </div>

        <div className="space-y-3 mb-8">
          {selectedTypes.map(typeId => {
            const typeInfo = MEAL_TYPES.find(t => t.id === typeId)
            const selected = mealSelections[typeId]
            return (
              <div key={typeId} className="bg-white border border-stone-200 rounded-2xl p-4">
                <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2">{typeInfo?.emoji} {typeInfo?.label}</p>
                {selected ? (
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{selected.emoji}</span>
                    <div className="flex-1">
                      <p className="font-semibold text-stone-900 text-sm">{selected.name}</p>
                      <p className="text-xs text-stone-500">{selected.macrosPerServing.protein}g protein</p>
                    </div>
                    <button type="button" style={btnStyle} onClick={() => setBrowsingType(typeId)}
                      className="text-xs text-emerald-600 font-semibold px-3 py-2 bg-emerald-50 rounded-lg cursor-pointer">
                      Change
                    </button>
                  </div>
                ) : (
                  <button type="button" style={btnStyle} onClick={() => setBrowsingType(typeId)}
                    className="w-full py-3 border-2 border-dashed border-stone-300 rounded-xl text-stone-500 text-sm font-medium cursor-pointer bg-white">
                    + Choose {typeInfo?.label}
                  </button>
                )}
              </div>
            )
          })}
        </div>

        <button type="button" style={btnStyle} disabled={!canProceed2}
          onClick={() => setStep(3)}
          className={`w-full py-4 rounded-2xl font-semibold text-base cursor-pointer ${canProceed2 ? 'bg-emerald-600 text-white' : 'bg-stone-200 text-stone-400'}`}>
          Set Servings →
        </button>
      </div>
    )
  }

  // ── STEP 3 ────────────────────────────────────────────────────────────────────
  return (
    <div className="px-4 pt-5 pb-6">
      <div className="flex items-center gap-3 mb-5">
        <button type="button" style={btnStyle} onClick={() => setStep(2)} className="px-3 py-2 rounded-xl bg-stone-100 text-stone-600 text-sm cursor-pointer">← Back</button>
        <div>
          <h1 className="text-xl font-bold text-stone-900">Review & Confirm</h1>
          <p className="text-sm text-stone-500">Step 3 of 3</p>
        </div>
      </div>

      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3.5 mb-4">
        <p className="text-xs font-semibold text-emerald-700 mb-1">{selectedDates.length} day{selectedDates.length>1?'s':''} selected</p>
        <div className="flex flex-wrap gap-1.5">
          {selectedDates.map(dk => {
            const d = new Date(dk+'T00:00:00')
            return <span key={dk} className="text-xs bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-medium">{d.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'})}</span>
          })}
        </div>
      </div>

      <div className="space-y-3 mb-8">
        {selectedTypes.map(typeId => {
          const typeInfo = MEAL_TYPES.find(t => t.id === typeId)
          const meal = mealSelections[typeId]
          const sv = servings[typeId] || selectedDates.length || 1
          if (!meal) return null
          return (
            <div key={typeId} className="bg-white border border-stone-200 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">{meal.emoji}</span>
                <div>
                  <p className="font-semibold text-stone-900 text-sm">{meal.name}</p>
                  <p className="text-xs text-stone-500">{typeInfo?.label}</p>
                </div>
              </div>
              <div className="flex items-center justify-between bg-stone-50 rounded-xl p-3">
                <span className="text-sm font-medium text-stone-700">Servings</span>
                <div className="flex items-center gap-3">
                  <button type="button" style={btnStyle} onClick={() => setServings(p => ({ ...p, [typeId]: Math.max(1,(p[typeId]||1)-1) }))}
                    className="w-9 h-9 rounded-full bg-stone-200 text-stone-700 font-bold text-lg cursor-pointer">−</button>
                  <span className="text-lg font-bold text-stone-900 w-6 text-center">{sv}</span>
                  <button type="button" style={btnStyle} onClick={() => setServings(p => ({ ...p, [typeId]: (p[typeId]||1)+1 }))}
                    className="w-9 h-9 rounded-full bg-emerald-500 text-white font-bold text-lg cursor-pointer">+</button>
                </div>
              </div>
              <p className="text-xs text-stone-400 mt-2 text-center">{sv*meal.macrosPerServing.calories}cal · {sv*meal.macrosPerServing.protein}g protein</p>
            </div>
          )
        })}
      </div>

      <button type="button" style={btnStyle} onClick={handleAddToPlan}
        className="w-full py-4 rounded-2xl font-semibold text-base bg-emerald-600 text-white cursor-pointer">
        Add to Plan & Grocery List ✓
      </button>
    </div>
  )
}
