import { useState, useMemo } from 'react'
import { MEALS } from '../data/meals'
import { MEAL_TYPES, getWeekDates, toDateKey } from '../utils/mealUtils'

const DAYS = [
  { id: 'monday', label: 'Mon' },
  { id: 'tuesday', label: 'Tue' },
  { id: 'wednesday', label: 'Wed' },
  { id: 'thursday', label: 'Thu' },
  { id: 'friday', label: 'Fri' },
  { id: 'saturday', label: 'Sat' },
  { id: 'sunday', label: 'Sun' },
]

// iOS-safe tap handler: uses onTouchEnd on mobile, onClick on desktop
function useTap(handler) {
  return {
    onTouchEnd: (e) => { e.preventDefault(); handler() },
    onClick: handler,
  }
}

function MacroBadge({ label, value, color }) {
  return <span className={`text-[11px] font-semibold ${color}`}>{label} {value}g</span>
}

function MealCard({ meal, isSelected, onSelect }) {
  const m = meal.macrosPerServing
  const tap = useTap(() => onSelect(meal))
  return (
    <div
      {...tap}
      className={`w-full text-left rounded-2xl border-2 p-3.5 select-none ${
        isSelected ? 'border-emerald-500 bg-emerald-50' : 'border-stone-200 bg-white'
      }`}
    >
      <div className="flex items-start gap-3">
        <span className="text-3xl leading-none">{meal.emoji}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-stone-900 text-sm leading-tight">{meal.name}</p>
            {isSelected && (
              <span className="flex-shrink-0 w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center">
                <svg viewBox="0 0 12 12" fill="none" className="w-2.5 h-2.5">
                  <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
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
    </div>
  )
}

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
          planSelections.push({ dateKey, mealType: typeId, meal, servings: servings[typeId] || 1 })
        }
      })
    })
    if (planSelections.length > 0) {
      onAddMeals(planSelections)
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

  // STEP 1
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
              const label = date.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 3)
              const dayNum = date.getDate()
              const isSelected = selectedDates.includes(dk)
              const isToday = toDateKey(new Date()) === dk
              const tap = useTap(() => toggleDate(dk))
              return (
                <div
                  key={dk}
                  {...tap}
                  className={`flex flex-col items-center py-2 px-1 rounded-xl border-2 select-none ${
                    isSelected
                      ? 'border-emerald-500 bg-emerald-500 text-white'
                      : 'border-stone-200 bg-white text-stone-700'
                  }`}
                >
                  <span className="text-[10px] font-medium">{label}</span>
                  <span className={`text-base font-bold leading-tight ${isToday && !isSelected ? 'text-emerald-600' : ''}`}>{dayNum}</span>
                  {isToday && <span className={`w-1 h-1 rounded-full mt-0.5 ${isSelected ? 'bg-white' : 'bg-emerald-500'}`} />}
                </div>
              )
            })}
          </div>
          {selectedDates.length > 0 && (
            <p className="text-xs text-emerald-700 mt-2 font-medium">{selectedDates.length} day{selectedDates.length > 1 ? 's' : ''} selected</p>
          )}
        </section>

        <section className="mb-8">
          <h2 className="text-sm font-semibold text-stone-700 uppercase tracking-wide mb-3">Which meal types?</h2>
          <div className="grid grid-cols-2 gap-3">
            {MEAL_TYPES.map(type => {
              const isSelected = selectedTypes.includes(type.id)
              const tap = useTap(() => toggleType(type.id))
              return (
                <div
                  key={type.id}
                  {...tap}
                  className={`flex items-center gap-3 p-4 rounded-2xl border-2 select-none ${
                    isSelected ? 'border-emerald-500 bg-emerald-50' : 'border-stone-200 bg-white'
                  }`}
                >
                  <span className="text-2xl">{type.emoji}</span>
                  <div>
                    <p className={`font-semibold text-sm ${isSelected ? 'text-emerald-700' : 'text-stone-800'}`}>{type.label}</p>
                    {isSelected && <p className="text-[10px] text-emerald-600">Selected ✓</p>}
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        <div
          {...useTap(() => canProceedStep1 && setStep(2))}
          className={`w-full py-4 rounded-2xl font-semibold text-base text-center select-none ${
            canProceedStep1 ? 'bg-emerald-600 text-white' : 'bg-stone-200 text-stone-400'
          }`}
        >
          Choose Meals →
        </div>
      </div>
    )
  }

  // STEP 2 — browsing meals for a type
  if (step === 2 && browsingType) {
    const typeInfo = MEAL_TYPES.find(t => t.id === browsingType)
    return (
      <div className="px-4 pt-5 pb-6">
        <div className="flex items-center gap-3 mb-5">
          <div
            {...useTap(() => { setBrowsingType(null); setSearchQuery('') })}
            className="p-2 rounded-xl bg-stone-100 text-stone-600 select-none"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
          </div>
          <div>
            <h2 className="font-bold text-stone-900 text-lg">{typeInfo?.emoji} {typeInfo?.label}</h2>
            <p className="text-xs text-stone-500">Tap a meal to select it</p>
          </div>
        </div>

        <div className="relative mb-4">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none">
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

  // STEP 2 — type overview
  if (step === 2) {
    return (
      <div className="px-4 pt-5 pb-6">
        <div className="flex items-center gap-3 mb-5">
          <div
            {...useTap(() => setStep(1))}
            className="p-2 rounded-xl bg-stone-100 text-stone-600 select-none"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
          </div>
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
                <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2">
                  {typeInfo?.emoji} {typeInfo?.label}
                </p>
                {selected ? (
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{selected.emoji}</span>
                    <div className="flex-1">
                      <p className="font-semibold text-stone-900 text-sm">{selected.name}</p>
                      <p className="text-xs text-stone-500">{selected.macrosPerServing.protein}g protein</p>
                    </div>
                    <div
                      {...useTap(() => setBrowsingType(typeId))}
                      className="text-xs text-emerald-600 font-semibold px-3 py-1.5 bg-emerald-50 rounded-lg select-none"
                    >
                      Change
                    </div>
                  </div>
                ) : (
                  <div
                    {...useTap(() => setBrowsingType(typeId))}
                    className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-stone-300 rounded-xl text-stone-500 text-sm font-medium select-none"
                  >
                    + Choose {typeInfo?.label}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <div
          {...useTap(() => canProceedStep2 && setStep(3))}
          className={`w-full py-4 rounded-2xl font-semibold text-base text-center select-none ${
            canProceedStep2 ? 'bg-emerald-600 text-white' : 'bg-stone-200 text-stone-400'
          }`}
        >
          Set Servings →
        </div>
      </div>
    )
  }

  // STEP 3
  return (
    <div className="px-4 pt-5 pb-6">
      <div className="flex items-center gap-3 mb-5">
        <div
          {...useTap(() => setStep(2))}
          className="p-2 rounded-xl bg-stone-100 text-stone-600 select-none"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
        </div>
        <div>
          <h1 className="text-xl font-bold text-stone-900">Review & Confirm</h1>
          <p className="text-sm text-stone-500">Step 3 of 3</p>
        </div>
      </div>

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
                  <p className="text-xs text-stone-500">{typeInfo?.label} · {meal.macrosPerServing.protein}g P/serving</p>
                </div>
              </div>
              <div className="flex items-center justify-between bg-stone-50 rounded-xl p-3">
                <span className="text-sm font-medium text-stone-700">Servings</span>
                <div className="flex items-center gap-3">
                  <div
                    {...useTap(() => adjustServings(typeId, -1))}
                    className="w-9 h-9 rounded-full bg-stone-200 text-stone-700 font-bold text-lg flex items-center justify-center select-none"
                  >−</div>
                  <span className="text-lg font-bold text-stone-900 w-6 text-center">{sv}</span>
                  <div
                    {...useTap(() => adjustServings(typeId, 1))}
                    className="w-9 h-9 rounded-full bg-emerald-500 text-white font-bold text-lg flex items-center justify-center select-none"
                  >+</div>
                </div>
              </div>
              <p className="text-xs text-stone-400 mt-2 text-center">
                {sv * meal.macrosPerServing.calories} cal · {sv * meal.macrosPerServing.protein}g protein total
              </p>
            </div>
          )
        })}
      </div>

      <div
        {...useTap(handleAddToPlan)}
        className="w-full py-4 rounded-2xl font-semibold text-base bg-emerald-600 text-white text-center shadow-lg shadow-emerald-200 select-none"
      >
        Add to Plan & Grocery List ✓
      </div>
    </div>
  )
}
