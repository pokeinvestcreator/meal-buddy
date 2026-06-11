import { useState, useMemo } from 'react'
import { MEALS } from '../data/meals'
import { MEAL_TYPES, getWeekDates, toDateKey, formatDate } from '../utils/mealUtils'

const DAYS = [
  { id: 'monday', label: 'Mon', full: 'Monday' },
  { id: 'tuesday', label: 'Tue', full: 'Tuesday' },
  { id: 'wednesday', label: 'Wed', full: 'Wednesday' },
  { id: 'thursday', label: 'Thu', full: 'Thursday' },
  { id: 'friday', label: 'Fri', full: 'Friday' },
  { id: 'saturday', label: 'Sat', full: 'Saturday' },
  { id: 'sunday', label: 'Sun', full: 'Sunday' },
]

function MacroBadge({ label, value, color }) {
  return (
    <span className={`text-[11px] font-semibold ${color}`}>
      {label} {value}g
    </span>
  )
}

function MealCard({ meal, isSelected, onSelect }) {
  const m = meal.macrosPerServing
  return (
    <button
      onClick={() => onSelect(meal)}
      className={`w-full text-left rounded-2xl border-2 p-3.5 transition-all ${
        isSelected
          ? 'border-emerald-500 bg-emerald-50'
          : 'border-stone-200 bg-white'
      }`}
    >
      <div className="flex items-start gap-3">
        <span className="text-3xl leading-none">{meal.emoji}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-stone-900 text-sm leading-tight">{meal.name}</p>
            {isSelected && (
              <span className="flex-shrink-0 w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center">
                <svg viewBox="0 0 12 12" fill="white" className="w-2.5 h-2.5">
                  <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </span>
            )}
          </div>
          <p className="text-[11px] text-stone-500 mt-0.5">{meal.prepTime + meal.cookTime} min · {m.calories} cal/serving</p>
          <div className="flex gap-2.5 mt-1.5">
            <MacroBadge label="P" value={m.protein} color="text-blue-600" />
            <MacroBadge label="C" value={m.carbs} color="text-amber-600" />
            <MacroBadge label="F" value={m.fat} color="text-red-500" />
          </div>
        </div>
      </div>
    </button>
  )
}

export default function PlanTab({ customMeals, onAddMeals, setActiveTab, mealPlan }) {
  const [step, setStep] = useState(1)
  const [selectedDates, setSelectedDates] = useState([])
  const [selectedTypes, setSelectedTypes] = useState([])
  const [mealSelections, setMealSelections] = useState({}) // { mealTypeId: meal }
  const [servings, setServings] = useState({}) // { mealTypeId: number }
  const [searchQuery, setSearchQuery] = useState('')
  const [browsingType, setBrowsingType] = useState(null)

  const allMeals = useMemo(() => [...MEALS, ...customMeals], [customMeals])
  const weekDates = useMemo(() => getWeekDates(), [])

  function toggleDate(dateKey) {
    setSelectedDates(prev =>
      prev.includes(dateKey) ? prev.filter(d => d !== dateKey) : [...prev, dateKey]
    )
  }

  function toggleType(typeId) {
    setSelectedTypes(prev =>
      prev.includes(typeId) ? prev.filter(t => t !== typeId) : [...prev, typeId]
    )
  }

  function selectMealForType(typeId, meal) {
    setMealSelections(prev => ({ ...prev, [typeId]: meal }))
    if (!servings[typeId]) {
      setServings(prev => ({ ...prev, [typeId]: selectedDates.length || 1 }))
    }
    setBrowsingType(null)
  }

  function adjustServings(typeId, delta) {
    setServings(prev => ({ ...prev, [typeId]: Math.max(1, (prev[typeId] || 1) + delta) }))
  }

  function handleAddToPlan() {
    const planSelections = []
    selectedDates.forEach(dateKey => {
      selectedTypes.forEach(typeId => {
        const meal = mealSelections[typeId]
        if (meal) {
          planSelections.push({
            dateKey,
            mealType: typeId,
            meal,
            servings: servings[typeId] || 1,
          })
        }
      })
    })
    if (planSelections.length > 0) {
      onAddMeals(planSelections)
      // Reset
      setStep(1)
      setSelectedDates([])
      setSelectedTypes([])
      setMealSelections({})
      setServings({})
      setSearchQuery('')
      setTimeout(() => setActiveTab('calendar'), 600)
    }
  }

  const canProceedStep1 = selectedDates.length > 0 && selectedTypes.length > 0
  const canProceedStep2 = selectedTypes.every(t => mealSelections[t])
  const filteredMeals = browsingType
    ? allMeals
        .filter(m => m.category === browsingType)
        .filter(m => !searchQuery || m.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : []

  // Step 1: Days + meal types
  if (step === 1) {
    return (
      <div className="px-4 pt-5 pb-6">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-stone-900">Plan Meals</h1>
          <p className="text-sm text-stone-500 mt-0.5">Step 1 of 3 — Choose days & meal types</p>
        </div>

        <section className="mb-6">
          <h2 className="text-sm font-semibold text-stone-700 uppercase tracking-wide mb-3">Which days?</h2>
          <div className="grid grid-cols-7 gap-1.5">
            {weekDates.map(date => {
              const dk = toDateKey(date)
              const dayName = DAYS.find(d => d.id === date.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase())
              const label = date.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 3)
              const dayNum = date.getDate()
              const isSelected = selectedDates.includes(dk)
              const isToday = toDateKey(new Date()) === dk
              return (
                <button
                  key={dk}
                  onClick={() => toggleDate(dk)}
                  className={`flex flex-col items-center py-2 px-1 rounded-xl border-2 transition-all ${
                    isSelected
                      ? 'border-emerald-500 bg-emerald-500 text-white'
                      : 'border-stone-200 bg-white text-stone-700'
                  }`}
                >
                  <span className="text-[10px] font-medium">{label}</span>
                  <span className={`text-base font-bold leading-tight ${isToday && !isSelected ? 'text-emerald-600' : ''}`}>{dayNum}</span>
                  {isToday && (
                    <span className={`w-1 h-1 rounded-full mt-0.5 ${isSelected ? 'bg-white' : 'bg-emerald-500'}`} />
                  )}
                </button>
              )
            })}
          </div>
          {selectedDates.length > 0 && (
            <p className="text-xs text-emerald-700 mt-2 font-medium">{selectedDates.length} day{selectedDates.length > 1 ? 's' : ''} selected</p>
          )}
        </section>

        <section className="mb-8">
          <h2 className="text-sm font-semibold text-stone-700 uppercase tracking-wide mb-3">Which meal types?</h2>
          <div className="grid grid-cols-2 gap-2.5">
            {MEAL_TYPES.map(type => {
              const isSelected = selectedTypes.includes(type.id)
              return (
                <button
                  key={type.id}
                  onClick={() => toggleType(type.id)}
                  className={`flex items-center gap-3 p-3.5 rounded-2xl border-2 transition-all ${
                    isSelected
                      ? 'border-emerald-500 bg-emerald-50'
                      : 'border-stone-200 bg-white'
                  }`}
                >
                  <span className="text-2xl">{type.emoji}</span>
                  <div className="text-left">
                    <p className={`font-semibold text-sm ${isSelected ? 'text-emerald-700' : 'text-stone-800'}`}>{type.label}</p>
                    {isSelected && <p className="text-[10px] text-emerald-600">Selected</p>}
                  </div>
                </button>
              )
            })}
          </div>
        </section>

        <button
          onClick={() => setStep(2)}
          disabled={!canProceedStep1}
          className={`w-full py-4 rounded-2xl font-semibold text-base transition-all ${
            canProceedStep1
              ? 'bg-emerald-600 text-white active:bg-emerald-700'
              : 'bg-stone-200 text-stone-400 cursor-not-allowed'
          }`}
        >
          Choose Meals →
        </button>
      </div>
    )
  }

  // Step 2: Pick a meal for each type
  if (step === 2) {
    // If browsing meals for a specific type
    if (browsingType) {
      const typeInfo = MEAL_TYPES.find(t => t.id === browsingType)
      return (
        <div className="px-4 pt-5 pb-6">
          <div className="flex items-center gap-3 mb-5">
            <button onClick={() => { setBrowsingType(null); setSearchQuery('') }} className="p-1.5 rounded-xl bg-stone-100 text-stone-600">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                <path d="M19 12H5M12 5l-7 7 7 7" />
              </svg>
            </button>
            <div>
              <h2 className="font-bold text-stone-900 text-lg">{typeInfo?.emoji} {typeInfo?.label}</h2>
              <p className="text-xs text-stone-500">Tap a meal to select it</p>
            </div>
          </div>

          <div className="relative mb-4">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              type="text"
              placeholder="Search meals..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-white border border-stone-200 rounded-xl text-sm focus:outline-none focus:border-emerald-400"
            />
          </div>

          <div className="space-y-2.5">
            {filteredMeals.length === 0 && (
              <p className="text-center text-stone-400 text-sm py-8">No meals found</p>
            )}
            {filteredMeals.map(meal => (
              <MealCard
                key={meal.id}
                meal={meal}
                isSelected={mealSelections[browsingType]?.id === meal.id}
                onSelect={m => selectMealForType(browsingType, m)}
              />
            ))}
          </div>
        </div>
      )
    }

    return (
      <div className="px-4 pt-5 pb-6">
        <div className="flex items-center gap-3 mb-5">
          <button onClick={() => setStep(1)} className="p-1.5 rounded-xl bg-stone-100 text-stone-600">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
          </button>
          <div>
            <h1 className="text-xl font-bold text-stone-900">Choose Meals</h1>
            <p className="text-sm text-stone-500">Step 2 of 3 — Select a meal for each type</p>
          </div>
        </div>

        <div className="space-y-3 mb-8">
          {selectedTypes.map(typeId => {
            const typeInfo = MEAL_TYPES.find(t => t.id === typeId)
            const selected = mealSelections[typeId]
            return (
              <div key={typeId} className="bg-white border border-stone-200 rounded-2xl p-4">
                <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2">
                  {typeInfo?.emoji} {typeInfo?.label}
                </p>
                {selected ? (
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{selected.emoji}</span>
                    <div className="flex-1">
                      <p className="font-semibold text-stone-900 text-sm">{selected.name}</p>
                      <p className="text-xs text-stone-500">{selected.macrosPerServing.calories} cal · {selected.macrosPerServing.protein}g protein</p>
                    </div>
                    <button
                      onClick={() => { setBrowsingType(typeId); setSearchQuery('') }}
                      className="text-xs text-emerald-600 font-semibold"
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => { setBrowsingType(typeId); setSearchQuery('') }}
                    className="w-full flex items-center justify-center gap-2 py-2.5 border-2 border-dashed border-stone-300 rounded-xl text-stone-400 text-sm font-medium"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                      <path d="M12 5v14M5 12h14" strokeLinecap="round"/>
                    </svg>
                    Choose {typeInfo?.label}
                  </button>
                )}
              </div>
            )
          })}
        </div>

        <button
          onClick={() => setStep(3)}
          disabled={!canProceedStep2}
          className={`w-full py-4 rounded-2xl font-semibold text-base transition-all ${
            canProceedStep2
              ? 'bg-emerald-600 text-white active:bg-emerald-700'
              : 'bg-stone-200 text-stone-400 cursor-not-allowed'
          }`}
        >
          Set Servings →
        </button>
      </div>
    )
  }

  // Step 3: Set servings + confirm
  return (
    <div className="px-4 pt-5 pb-6">
      <div className="flex items-center gap-3 mb-5">
        <button onClick={() => setStep(2)} className="p-1.5 rounded-xl bg-stone-100 text-stone-600">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
        </button>
        <div>
          <h1 className="text-xl font-bold text-stone-900">Review & Confirm</h1>
          <p className="text-sm text-stone-500">Step 3 of 3 — Adjust servings</p>
        </div>
      </div>

      {/* Days summary */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3.5 mb-4">
        <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide mb-1.5">Adding to {selectedDates.length} day{selectedDates.length > 1 ? 's' : ''}</p>
        <div className="flex flex-wrap gap-1.5">
          {selectedDates.map(dk => {
            const d = new Date(dk + 'T00:00:00')
            return (
              <span key={dk} className="text-xs bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-medium">
                {d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
              </span>
            )
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
                  <p className="text-xs text-stone-500">{typeInfo?.label} · {meal.macrosPerServing.protein}g protein/serving</p>
                </div>
              </div>
              <div className="flex items-center justify-between bg-stone-50 rounded-xl p-3">
                <span className="text-sm font-medium text-stone-700">Servings</span>
                <div className="flex items-center gap-3">
                  <button onClick={() => adjustServings(typeId, -1)} className="w-8 h-8 rounded-full bg-stone-200 text-stone-700 font-bold text-lg flex items-center justify-center active:bg-stone-300">−</button>
                  <span className="text-lg font-bold text-stone-900 w-6 text-center">{sv}</span>
                  <button onClick={() => adjustServings(typeId, 1)} className="w-8 h-8 rounded-full bg-emerald-500 text-white font-bold text-lg flex items-center justify-center active:bg-emerald-600">+</button>
                </div>
              </div>
              <p className="text-xs text-stone-400 mt-2 text-center">
                {sv * meal.macrosPerServing.calories} cal · {sv * meal.macrosPerServing.protein}g protein total
              </p>
            </div>
          )
        })}
      </div>

      <button
        onClick={handleAddToPlan}
        className="w-full py-4 rounded-2xl font-semibold text-base bg-emerald-600 text-white active:bg-emerald-700 transition-all shadow-lg shadow-emerald-200"
      >
        Add to Plan & Grocery List ✓
      </button>
    </div>
  )
}
