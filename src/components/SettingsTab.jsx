import { useState } from 'react'
import { ALLERGENS, DIETARY_FLAGS } from '../utils/mealUtils'

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

const GOALS = [
  { id: 'bulk', label: 'Bulk', desc: 'Build muscle & gain weight', multiplier: 1.15 },
  { id: 'maintain', label: 'Maintain', desc: 'Keep current weight', multiplier: 1.0 },
  { id: 'cut', label: 'Cut', desc: 'Lose fat & get lean', multiplier: 0.85 },
]

const ACTIVITY_LEVELS = [
  { id: 'sedentary', label: 'Sedentary', desc: 'Desk job, little exercise', factor: 1.2 },
  { id: 'light', label: 'Lightly Active', desc: '1-3 days/week exercise', factor: 1.375 },
  { id: 'moderate', label: 'Moderate', desc: '3-5 days/week exercise', factor: 1.55 },
  { id: 'active', label: 'Very Active', desc: '6-7 days/week hard training', factor: 1.725 },
]

function Toggle({ checked, onChange, dark }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative w-12 h-6 rounded-full transition-colors ${checked ? 'bg-emerald-500' : dark ? 'bg-stone-600' : 'bg-stone-300'}`}
    >
      <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-7' : 'translate-x-1'}`} />
    </button>
  )
}

// TDEE Calculator
function calcTDEE(profile) {
  const { gender, weightLbs, heightFt, heightIn, age, activityLevel, goal } = profile
  if (!weightLbs || !age) return null

  const weightKg = (weightLbs || 160) * 0.453592
  const totalInches = ((heightFt || 5) * 12) + (heightIn || 10)
  const heightCm = totalInches * 2.54

  // Mifflin-St Jeor BMR
  const bmr = gender === 'female'
    ? (10 * weightKg) + (6.25 * heightCm) - (5 * (age || 25)) - 161
    : (10 * weightKg) + (6.25 * heightCm) - (5 * (age || 25)) + 5

  const actFactor = ACTIVITY_LEVELS.find(a => a.id === activityLevel)?.factor || 1.55
  const goalMult = GOALS.find(g => g.id === goal)?.multiplier || 1.0
  const tdee = Math.round(bmr * actFactor * goalMult)
  const protein = Math.round(weightLbs * (goal === 'bulk' ? 1.0 : goal === 'cut' ? 1.2 : 0.9))

  return { tdee, protein, bmr: Math.round(bmr) }
}

export default function SettingsTab({ settings, setSettings, onSignOut, userEmail }) {
  const [newLike, setNewLike] = useState('')
  const [newDislike, setNewDislike] = useState('')
  const [activeSection, setActiveSection] = useState('profile')
  const dark = settings?.darkMode || false

  function update(key, value) {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  function updateProfile(key, value) {
    setSettings(prev => ({ ...prev, profile: { ...(prev.profile || {}), [key]: value } }))
  }

  const profile = settings?.profile || {}
  const targets = calcTDEE(profile)

  // Auto-update targets when profile changes
  function handleProfileChange(key, value) {
    const newProfile = { ...(settings?.profile || {}), [key]: value }
    const newTargets = calcTDEE(newProfile)
    setSettings(prev => ({
      ...prev,
      profile: newProfile,
      ...(newTargets ? { proteinTarget: newTargets.protein, calorieTarget: newTargets.tdee } : {})
    }))
  }

  function togglePrepDay(dayId) {
    const current = settings.prepDays || []
    update('prepDays', current.includes(dayId)
      ? current.filter(d => d !== dayId)
      : [...current, dayId]
    )
  }


  function toggleAllergen(key) {
    const current = settings?.dietary?.avoidAllergens || []
    const updated = current.includes(key) ? current.filter(k => k !== key) : [...current, key]
    setSettings(prev => ({ ...prev, dietary: { ...(prev.dietary || {}), avoidAllergens: updated } }))
  }

  function toggleDietaryPref(key) {
    const current = settings?.dietary?.dietaryPreferences || []
    const updated = current.includes(key) ? current.filter(k => k !== key) : [...current, key]
    setSettings(prev => ({ ...prev, dietary: { ...(prev.dietary || {}), dietaryPreferences: updated } }))
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

  const bg = dark ? 'bg-stone-900' : 'bg-slate-50'
  const card = dark ? 'bg-stone-800 border-stone-700' : 'bg-white border-stone-200'
  const text = dark ? 'text-white' : 'text-stone-900'
  const subtext = dark ? 'text-stone-400' : 'text-stone-500'
  const label = dark ? 'text-stone-300' : 'text-stone-700'
  const input = dark ? 'bg-stone-700 border-stone-600 text-white placeholder-stone-400' : 'bg-stone-50 border-stone-200 text-stone-900'
  const divider = dark ? 'divide-stone-700' : 'divide-stone-100'
  const pill = dark ? 'bg-stone-700 text-stone-300 border-stone-600' : 'bg-stone-100 text-stone-600 border-stone-200'

  const SECTIONS = [
    { id: 'profile', label: 'Profile' },
    { id: 'nutrition', label: 'Nutrition' },
    { id: 'preferences', label: 'Preferences' },
    { id: 'app', label: 'App' },
  ]

  return (
    <div className={`${bg} min-h-full pb-8`}>
      <div className={`sticky top-0 z-10 ${dark ? 'bg-stone-900 border-stone-800' : 'bg-white border-stone-100'} border-b px-4 pt-5 pb-0`}>
        <h1 className={`text-xl font-bold ${text} mb-3`}>Settings</h1>
        <div className="flex gap-0 overflow-x-auto hide-scrollbar">
          {SECTIONS.map(s => (
            <button
              key={s.id}
              type="button"
              onClick={() => setActiveSection(s.id)}
              className={`flex-shrink-0 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
                activeSection === s.id
                  ? 'border-emerald-500 text-emerald-600'
                  : `border-transparent ${subtext}`
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 pt-5 space-y-5">

        {/* ── PROFILE ── */}
        {activeSection === 'profile' && (
          <>
            {/* Calculated targets banner */}
            {targets && (
              <div className={`${dark ? 'bg-emerald-900 border-emerald-700' : 'bg-emerald-50 border-emerald-200'} border rounded-2xl p-4`}>
                <p className={`text-xs font-semibold uppercase tracking-wide mb-2 ${dark ? 'text-emerald-400' : 'text-emerald-700'}`}>Your Personalized Targets</p>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className={`text-lg font-bold ${dark ? 'text-white' : 'text-stone-900'}`}>{targets.tdee}</p>
                    <p className={`text-[10px] font-medium ${subtext}`}>CALORIES</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-blue-500">{targets.protein}g</p>
                    <p className={`text-[10px] font-medium ${subtext}`}>PROTEIN</p>
                  </div>
                  <div>
                    <p className={`text-lg font-bold ${dark ? 'text-white' : 'text-stone-900'}`}>{targets.bmr}</p>
                    <p className={`text-[10px] font-medium ${subtext}`}>BMR</p>
                  </div>
                </div>
              </div>
            )}

            {/* Gender */}
            <section>
              <h2 className={`text-xs font-semibold uppercase tracking-wide mb-3 ${label}`}>Gender</h2>
              <div className={`${card} border rounded-2xl p-1 flex`}>
                {['male', 'female'].map(g => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => handleProfileChange('gender', g)}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-semibold capitalize transition-all ${
                      profile.gender === g
                        ? 'bg-emerald-600 text-white'
                        : subtext
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </section>

            {/* Age + Weight + Height */}
            <section>
              <h2 className={`text-xs font-semibold uppercase tracking-wide mb-3 ${label}`}>Body Stats</h2>
              <div className={`${card} border rounded-2xl p-4 space-y-4`}>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={`text-xs font-semibold ${subtext} mb-1 block`}>Age</label>
                    <input
                      type="number" min={13} max={99} placeholder="25"
                      value={profile.age || ''}
                      onChange={e => handleProfileChange('age', Number(e.target.value))}
                      className={`w-full px-3 py-2.5 border rounded-xl text-sm focus:outline-none focus:border-emerald-400 ${input}`}
                    />
                  </div>
                  <div>
                    <label className={`text-xs font-semibold ${subtext} mb-1 block`}>Weight (lbs)</label>
                    <input
                      type="number" min={80} max={400} placeholder="175"
                      value={profile.weightLbs || ''}
                      onChange={e => handleProfileChange('weightLbs', Number(e.target.value))}
                      className={`w-full px-3 py-2.5 border rounded-xl text-sm focus:outline-none focus:border-emerald-400 ${input}`}
                    />
                  </div>
                </div>
                <div>
                  <label className={`text-xs font-semibold ${subtext} mb-1 block`}>Height</label>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="relative">
                      <input
                        type="number" min={4} max={7} placeholder="5"
                        value={profile.heightFt || ''}
                        onChange={e => handleProfileChange('heightFt', Number(e.target.value))}
                        className={`w-full px-3 py-2.5 border rounded-xl text-sm focus:outline-none focus:border-emerald-400 ${input}`}
                      />
                      <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs ${subtext}`}>ft</span>
                    </div>
                    <div className="relative">
                      <input
                        type="number" min={0} max={11} placeholder="10"
                        value={profile.heightIn || ''}
                        onChange={e => handleProfileChange('heightIn', Number(e.target.value))}
                        className={`w-full px-3 py-2.5 border rounded-xl text-sm focus:outline-none focus:border-emerald-400 ${input}`}
                      />
                      <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs ${subtext}`}>in</span>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Activity Level */}
            <section>
              <h2 className={`text-xs font-semibold uppercase tracking-wide mb-3 ${label}`}>Activity Level</h2>
              <div className="space-y-2">
                {ACTIVITY_LEVELS.map(level => {
                  const isSelected = profile.activityLevel === level.id
                  return (
                    <button
                      key={level.id}
                      type="button"
                      onClick={() => handleProfileChange('activityLevel', level.id)}
                      className={`w-full flex items-center gap-3 p-3.5 rounded-2xl border-2 text-left transition-all ${
                        isSelected
                          ? 'border-emerald-500 bg-emerald-50' + (dark ? ' bg-emerald-900 border-emerald-600' : '')
                          : `border-transparent ${card}`
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${isSelected ? 'border-emerald-500 bg-emerald-500' : dark ? 'border-stone-600' : 'border-stone-300'}`}>
                        {isSelected && <span className="block w-2 h-2 bg-white rounded-full m-0.5"/>}
                      </div>
                      <div>
                        <p className={`font-semibold text-sm ${isSelected ? 'text-emerald-700' : text}`}>{level.label}</p>
                        <p className={`text-xs ${subtext}`}>{level.desc}</p>
                      </div>
                    </button>
                  )
                })}
              </div>
            </section>

            {/* Goal */}
            <section>
              <h2 className={`text-xs font-semibold uppercase tracking-wide mb-3 ${label}`}>Goal</h2>
              <div className="grid grid-cols-3 gap-2">
                {GOALS.map(goal => {
                  const isSelected = profile.goal === goal.id
                  return (
                    <button
                      key={goal.id}
                      type="button"
                      onClick={() => handleProfileChange('goal', goal.id)}
                      className={`p-3 rounded-2xl border-2 text-center transition-all ${
                        isSelected ? 'border-emerald-500 bg-emerald-50' : `${card} border-transparent`
                      }`}
                    >
                      <p className={`font-bold text-sm ${isSelected ? 'text-emerald-700' : text}`}>{goal.label}</p>
                      <p className={`text-[10px] mt-0.5 ${subtext}`}>{goal.desc}</p>
                    </button>
                  )
                })}
              </div>
            </section>
          </>
        )}

        {/* ── NUTRITION ── */}
        {activeSection === 'nutrition' && (
          <>
            <section>
              <h2 className={`text-xs font-semibold uppercase tracking-wide mb-3 ${label}`}>Daily Targets</h2>
              <div className={`${card} border rounded-2xl p-4 space-y-5`}>
                {[
                  { key: 'calorieTarget', label: 'Calories', min: 1200, max: 5000, step: 50, color: 'text-stone-700', unit: 'kcal' },
                  { key: 'proteinTarget', label: 'Protein', min: 50, max: 400, step: 5, color: 'text-blue-600', unit: 'g' },
                ].map(({ key, label: lbl, min, max, step, color, unit }) => (
                  <div key={key}>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className={`text-sm font-medium ${text}`}>{lbl}</label>
                      <span className={`text-sm font-bold ${color}`}>{settings[key] || (key === 'calorieTarget' ? 2500 : 200)}{unit}</span>
                    </div>
                    <input
                      type="range" min={min} max={max} step={step}
                      value={settings[key] || (key === 'calorieTarget' ? 2500 : 200)}
                      onChange={e => update(key, Number(e.target.value))}
                      className="w-full accent-emerald-500"
                    />
                    <div className={`flex justify-between text-[10px] ${subtext} mt-0.5`}>
                      <span>{min}{unit}</span><span>{max}{unit}</span>
                    </div>
                  </div>
                ))}
              </div>
              {targets && (
                <p className={`text-xs ${subtext} mt-2 text-center`}>
                  Based on your profile, we recommend {targets.tdee} cal & {targets.protein}g protein
                </p>
              )}
            </section>

            <section>
              <h2 className={`text-xs font-semibold uppercase tracking-wide mb-3 ${label}`}>Measurements</h2>
              <div className={`${card} border rounded-2xl p-1 flex`}>
                {['g', 'oz'].map(unit => (
                  <button
                    key={unit}
                    type="button"
                    onClick={() => update('unitPreference', unit)}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                      settings.unitPreference === unit ? 'bg-stone-900 text-white' : subtext
                    }`}
                  >
                    {unit === 'g' ? 'Grams (g)' : 'Ounces (oz)'}
                  </button>
                ))}
              </div>
            </section>

            <section>
              <h2 className={`text-xs font-semibold uppercase tracking-wide mb-3 ${label}`}>Meal Prep Days</h2>
              <div className={`${card} border rounded-2xl overflow-hidden divide-y ${divider}`}>
                {DAY_OPTIONS.map(day => (
                  <div key={day.id} className="flex items-center justify-between px-4 py-3">
                    <span className={`text-sm font-medium ${text}`}>{day.label}</span>
                    <Toggle
                      checked={(settings.prepDays || []).includes(day.id)}
                      onChange={() => togglePrepDay(day.id)}
                      dark={dark}
                    />
                  </div>
                ))}
              </div>
            </section>
          </>
        )}

        {/* ── PREFERENCES ── */}
        {activeSection === 'preferences' && (
          <>

            <section>
              <h2 className={`text-xs font-semibold uppercase tracking-wide mb-3 ${label}`}>Allergies</h2>
              <div className={`${card} border rounded-2xl p-4 mb-1`}>
                <p className={`text-xs ${subtext} mb-3`}>Meals containing these will be hidden from all meal browsers.</p>
                <div className="flex flex-wrap gap-2">
                  {ALLERGENS.map(({ key, label: aLabel, emoji }) => {
                    const active = (settings?.dietary?.avoidAllergens || []).includes(key)
                    return (
                      <button key={key} type="button" onClick={() => toggleAllergen(key)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                          active
                            ? 'bg-red-500 text-white border-red-500'
                            : dark ? 'bg-stone-700 text-stone-300 border-stone-600' : 'bg-white text-stone-600 border-stone-200'
                        }`}>
                        <span>{emoji}</span>
                        <span>{aLabel}</span>
                        {active && <span className="ml-0.5">✕</span>}
                      </button>
                    )
                  })}
                </div>
              </div>
            </section>

            <section>
              <h2 className={`text-xs font-semibold uppercase tracking-wide mb-3 ${label}`}>Dietary Preferences</h2>
              <div className={`${card} border rounded-2xl p-4 mb-1`}>
                <p className={`text-xs ${subtext} mb-3`}>Only show meals that match all selected preferences.</p>
                <div className="flex flex-wrap gap-2">
                  {DIETARY_FLAGS.map(({ key, label: dLabel, emoji }) => {
                    const active = (settings?.dietary?.dietaryPreferences || []).includes(key)
                    return (
                      <button key={key} type="button" onClick={() => toggleDietaryPref(key)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                          active
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : dark ? 'bg-stone-700 text-stone-300 border-stone-600' : 'bg-white text-stone-600 border-stone-200'
                        }`}>
                        <span>{emoji}</span>
                        <span>{dLabel}</span>
                        {active && <span className="ml-0.5">✓</span>}
                      </button>
                    )
                  })}
                </div>
              </div>
            </section>

            <section>
              <h2 className={`text-xs font-semibold uppercase tracking-wide mb-3 ${label}`}>Foods I Like</h2>
              <div className={`${card} border rounded-2xl p-4`}>
                <div className="flex flex-wrap gap-2 mb-3">
                  {(settings.preferredFoods || []).map(food => (
                    <span key={food} className="flex items-center gap-1.5 text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-full">
                      {food}
                      <button type="button" onClick={() => removeLike(food)} className="text-emerald-500 font-bold text-sm leading-none">×</button>
                    </span>
                  ))}
                  {(settings.preferredFoods || []).length === 0 && <p className={`text-xs ${subtext}`}>No preferences set</p>}
                </div>
                <div className="mb-3">
                  <p className={`text-xs ${subtext} mb-2`}>Quick add:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {COMMON_FOODS.filter(f => !(settings.preferredFoods || []).includes(f)).map(food => (
                      <button key={food} type="button" onClick={() => togglePreferredFood(food)}
                        className={`text-xs border px-2.5 py-1 rounded-full ${pill}`}>
                        + {food}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <input type="text" placeholder="Add custom food..." value={newLike}
                    onChange={e => setNewLike(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addLike()}
                    className={`flex-1 px-3 py-2 border rounded-xl text-sm focus:outline-none focus:border-emerald-400 ${input}`}
                  />
                  <button type="button" onClick={addLike} className="px-3 py-2 bg-emerald-600 text-white rounded-xl text-sm font-semibold">Add</button>
                </div>
              </div>
            </section>

            <section>
              <h2 className={`text-xs font-semibold uppercase tracking-wide mb-3 ${label}`}>Foods I Avoid</h2>
              <div className={`${card} border rounded-2xl p-4`}>
                <div className="flex flex-wrap gap-2 mb-3">
                  {(settings.dislikedFoods || []).map(food => (
                    <span key={food} className="flex items-center gap-1.5 text-xs font-medium bg-red-50 text-red-600 border border-red-100 px-2.5 py-1 rounded-full">
                      {food}
                      <button type="button" onClick={() => removeDislike(food)} className="text-red-400 font-bold text-sm leading-none">×</button>
                    </span>
                  ))}
                  {(settings.dislikedFoods || []).length === 0 && <p className={`text-xs ${subtext}`}>Nothing avoided</p>}
                </div>
                <div className="flex gap-2">
                  <input type="text" placeholder="e.g. cilantro, mushrooms..." value={newDislike}
                    onChange={e => setNewDislike(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addDislike()}
                    className={`flex-1 px-3 py-2 border rounded-xl text-sm focus:outline-none focus:border-red-400 ${input}`}
                  />
                  <button type="button" onClick={addDislike} className="px-3 py-2 bg-red-100 text-red-600 rounded-xl text-sm font-semibold">Add</button>
                </div>
              </div>
            </section>
          </>
        )}

        {/* ── APP ── */}
        {activeSection === 'app' && (
          <>
            <section>
              <h2 className={`text-xs font-semibold uppercase tracking-wide mb-3 ${label}`}>Appearance</h2>
              <div className={`${card} border rounded-2xl overflow-hidden`}>
                <div className="flex items-center justify-between px-4 py-3.5">
                  <div>
                    <p className={`text-sm font-medium ${text}`}>Dark Mode</p>
                    <p className={`text-xs ${subtext}`}>Easy on the eyes at night</p>
                  </div>
                  <Toggle checked={dark} onChange={v => update('darkMode', v)} dark={dark} />
                </div>
              </div>
            </section>

            <section>
              <div className={`${card} border rounded-2xl p-4 text-center`}>
                <p className="text-2xl mb-1">🥗</p>
                <p className={`font-bold ${text}`}>Meal Buddy</p>
                <p className={`text-xs ${subtext} mt-0.5`}>Your personal meal prep companion</p>
              </div>
            </section>

            <section>
              <h2 className={`text-xs font-semibold uppercase tracking-wide mb-3 ${label}`}>Account</h2>
              <div className={`${card} border rounded-2xl overflow-hidden divide-y ${divider}`}>
                <div className="px-4 py-3">
                  <p className={`text-xs ${subtext} font-medium`}>Logged in as</p>
                  <p className={`text-sm font-semibold mt-0.5 ${text}`}>{userEmail}</p>
                </div>
                <button type="button" onClick={onSignOut} className="w-full px-4 py-3 text-left text-sm font-semibold text-red-500">
                  Sign Out
                </button>
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  )
}
