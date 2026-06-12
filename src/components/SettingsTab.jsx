import { useState } from 'react'

const DAY_OPTIONS = [
  { id: 'monday', label: 'Monday' },
  { id: 'tuesday', label: 'Tuesday' },
  { id: 'wednesday', label: 'Wednesday' },
  { id: 'thursday', label: 'Thursday' },
  { id: 'friday', label: 'Friday' },
  { id: 'saturday', label: 'Saturday' },
  { id: 'sunday', label: 'Sunday' },
]

const COMMON_FOODS = [
  'chicken', 'steak', 'ground beef', 'salmon', 'eggs', 'egg whites',
  'greek yogurt', 'cottage cheese', 'pasta', 'rice', 'potatoes',
  'oatmeal', 'sourdough', 'bagels', 'fruit', 'broccoli', 'spinach',
]

function Toggle({ checked, onChange }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative w-12 h-6 rounded-full transition-colors ${checked ? 'bg-emerald-500' : 'bg-stone-300'}`}
    >
      <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-7' : 'translate-x-1'}`} />
    </button>
  )
}

export default function SettingsTab({ settings, setSettings, onSignOut, userEmail }) {
  const [newLike, setNewLike] = useState('')
  const [newDislike, setNewDislike] = useState('')

  function update(key, value) {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  function togglePrepDay(dayId) {
    const current = settings.prepDays || []
    update('prepDays', current.includes(dayId)
      ? current.filter(d => d !== dayId)
      : [...current, dayId]
    )
  }

  function togglePreferredFood(food) {
    const current = settings.preferredFoods || []
    update('preferredFoods', current.includes(food)
      ? current.filter(f => f !== food)
      : [...current, food]
    )
  }

  function addLike() {
    const val = newLike.trim().toLowerCase()
    if (!val) return
    const current = settings.preferredFoods || []
    if (!current.includes(val)) update('preferredFoods', [...current, val])
    setNewLike('')
  }

  function removeLike(food) {
    update('preferredFoods', (settings.preferredFoods || []).filter(f => f !== food))
  }

  function addDislike() {
    const val = newDislike.trim().toLowerCase()
    if (!val) return
    const current = settings.dislikedFoods || []
    if (!current.includes(val)) update('dislikedFoods', [...current, val])
    setNewDislike('')
  }

  function removeDislike(food) {
    update('dislikedFoods', (settings.dislikedFoods || []).filter(f => f !== food))
  }

  return (
    <div className="px-4 pt-5 pb-8 space-y-6">
      <h1 className="text-xl font-bold text-stone-900">Settings</h1>

      {/* Prep days */}
      <section>
        <h2 className="text-sm font-semibold text-stone-700 uppercase tracking-wide mb-3">Meal Prep Days</h2>
        <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden divide-y divide-stone-100">
          {DAY_OPTIONS.map(day => (
            <div key={day.id} className="flex items-center justify-between px-4 py-3">
              <span className="text-sm font-medium text-stone-800">{day.label}</span>
              <Toggle
                checked={(settings.prepDays || []).includes(day.id)}
                onChange={() => togglePrepDay(day.id)}
              />
            </div>
          ))}
        </div>
      </section>

      {/* Nutrition goals */}
      <section>
        <h2 className="text-sm font-semibold text-stone-700 uppercase tracking-wide mb-3">Nutrition Goals</h2>
        <div className="bg-white border border-stone-200 rounded-2xl p-4 space-y-4">
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-sm font-medium text-stone-800">Daily Protein Target</label>
              <span className="text-sm font-bold text-blue-600">{settings.proteinTarget || 200}g</span>
            </div>
            <input
              type="range"
              min={100}
              max={350}
              step={5}
              value={settings.proteinTarget || 200}
              onChange={e => update('proteinTarget', Number(e.target.value))}
              className="w-full accent-emerald-500"
            />
            <div className="flex justify-between text-[10px] text-stone-400 mt-0.5">
              <span>100g</span><span>350g</span>
            </div>
          </div>
        </div>
      </section>

      {/* Units */}
      <section>
        <h2 className="text-sm font-semibold text-stone-700 uppercase tracking-wide mb-3">Measurements</h2>
        <div className="bg-white border border-stone-200 rounded-2xl p-1 flex">
          {['g', 'oz'].map(unit => (
            <button
              key={unit}
              onClick={() => update('unitPreference', unit)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                settings.unitPreference === unit
                  ? 'bg-stone-900 text-white'
                  : 'text-stone-500'
              }`}
            >
              {unit === 'g' ? 'Grams (g)' : 'Ounces (oz)'}
            </button>
          ))}
        </div>
      </section>

      {/* Food preferences */}
      <section>
        <h2 className="text-sm font-semibold text-stone-700 uppercase tracking-wide mb-3">Foods I Like</h2>
        <div className="bg-white border border-stone-200 rounded-2xl p-4">
          <div className="flex flex-wrap gap-2 mb-3">
            {(settings.preferredFoods || []).map(food => (
              <span key={food} className="flex items-center gap-1.5 text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-full">
                {food}
                <button onClick={() => removeLike(food)} className="text-emerald-500 hover:text-emerald-700 font-bold text-sm leading-none">×</button>
              </span>
            ))}
            {(settings.preferredFoods || []).length === 0 && (
              <p className="text-xs text-stone-400">No preferences set</p>
            )}
          </div>

          <div className="mb-3">
            <p className="text-xs text-stone-400 mb-2">Quick add:</p>
            <div className="flex flex-wrap gap-1.5">
              {COMMON_FOODS
                .filter(f => !(settings.preferredFoods || []).includes(f))
                .map(food => (
                  <button
                    key={food}
                    onClick={() => togglePreferredFood(food)}
                    className="text-xs bg-stone-100 text-stone-600 px-2.5 py-1 rounded-full active:bg-stone-200"
                  >
                    + {food}
                  </button>
                ))}
            </div>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Add custom food..."
              value={newLike}
              onChange={e => setNewLike(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addLike()}
              className="flex-1 px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:border-emerald-400"
            />
            <button onClick={addLike} className="px-3 py-2 bg-emerald-600 text-white rounded-xl text-sm font-semibold active:bg-emerald-700">Add</button>
          </div>
        </div>
      </section>

      {/* Foods to avoid */}
      <section>
        <h2 className="text-sm font-semibold text-stone-700 uppercase tracking-wide mb-3">Foods I Dislike / Avoid</h2>
        <div className="bg-white border border-stone-200 rounded-2xl p-4">
          <div className="flex flex-wrap gap-2 mb-3">
            {(settings.dislikedFoods || []).map(food => (
              <span key={food} className="flex items-center gap-1.5 text-xs font-medium bg-red-50 text-red-600 border border-red-100 px-2.5 py-1 rounded-full">
                {food}
                <button onClick={() => removeDislike(food)} className="text-red-400 font-bold text-sm leading-none">×</button>
              </span>
            ))}
            {(settings.dislikedFoods || []).length === 0 && (
              <p className="text-xs text-stone-400">Nothing avoided</p>
            )}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="e.g. cilantro, mushrooms..."
              value={newDislike}
              onChange={e => setNewDislike(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addDislike()}
              className="flex-1 px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:border-red-400"
            />
            <button onClick={addDislike} className="px-3 py-2 bg-red-100 text-red-600 rounded-xl text-sm font-semibold active:bg-red-200">Add</button>
          </div>
        </div>
      </section>

      {/* App info */}
      <section>
        <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 text-center">
          <p className="text-2xl mb-1">🥗</p>
          <p className="font-bold text-stone-800">Meal Buddy</p>
          <p className="text-xs text-stone-400 mt-0.5">Your personal meal prep companion</p>
        </div>
      </section>

      {/* Account */}
      <section>
        <h2 className="text-sm font-semibold text-stone-700 uppercase tracking-wide mb-3">Account</h2>
        <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden divide-y divide-stone-100">
          <div className="px-4 py-3">
            <p className="text-xs text-stone-400 font-medium">Logged in as</p>
            <p className="text-sm font-semibold text-stone-800 mt-0.5">{userEmail}</p>
          </div>
          <button
            onClick={onSignOut}
            className="w-full px-4 py-3 text-left text-sm font-semibold text-red-500"
          >
            Sign Out
          </button>
        </div>
      </section>
    </div>
  )
}
