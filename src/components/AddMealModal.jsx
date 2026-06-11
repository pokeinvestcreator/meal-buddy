import { useState } from 'react'
import { MEAL_TYPES } from '../utils/mealUtils'

const EMPTY_MEAL = {
  name: '',
  emoji: '🍽️',
  category: 'dinner',
  prepTime: 10,
  cookTime: 20,
  servings: 1,
  macrosPerServing: { calories: 0, protein: 0, carbs: 0, fat: 0 },
  ingredients: [],
  instructions: [],
  prepInstructions: '',
  storageInstructions: '',
  reheatingInstructions: '',
  tags: ['custom'],
}

const EMOJI_OPTIONS = ['🍽️','🥩','🍗','🥚','🥣','🍝','🌮','🌯','🥙','🍱','🫕','🥘','🍛','🥗','🫙','🧆','🥞','🍜','🫔','🍔']

export default function AddMealModal({ onAdd, onClose }) {
  const [meal, setMeal] = useState({ ...EMPTY_MEAL, macrosPerServing: { ...EMPTY_MEAL.macrosPerServing } })
  const [ingredientInput, setIngredientInput] = useState({ name: '', grams: '' })
  const [instructionInput, setInstructionInput] = useState('')
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [step, setStep] = useState(1)

  function update(key, value) {
    setMeal(prev => ({ ...prev, [key]: value }))
  }

  function updateMacro(key, value) {
    setMeal(prev => ({
      ...prev,
      macrosPerServing: { ...prev.macrosPerServing, [key]: Number(value) || 0 },
    }))
  }

  function addIngredient() {
    const name = ingredientInput.name.trim()
    const grams = parseFloat(ingredientInput.grams) || 0
    if (!name) return
    const newIng = {
      id: `ing_${Date.now()}`,
      name,
      grams,
      oz: grams / 28.35,
      category: 'other',
    }
    setMeal(prev => ({ ...prev, ingredients: [...prev.ingredients, newIng] }))
    setIngredientInput({ name: '', grams: '' })
  }

  function removeIngredient(id) {
    setMeal(prev => ({ ...prev, ingredients: prev.ingredients.filter(i => i.id !== id) }))
  }

  function addInstruction() {
    const val = instructionInput.trim()
    if (!val) return
    setMeal(prev => ({ ...prev, instructions: [...prev.instructions, val] }))
    setInstructionInput('')
  }

  function removeInstruction(index) {
    setMeal(prev => ({ ...prev, instructions: prev.instructions.filter((_, i) => i !== index) }))
  }

  function handleSubmit() {
    if (!meal.name.trim()) return
    const finalMeal = {
      ...meal,
      id: `custom_${Date.now()}`,
      name: meal.name.trim(),
    }
    onAdd(finalMeal)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white">
      {/* Header */}
      <div className="flex-shrink-0 flex items-center gap-3 px-4 pt-5 pb-4 border-b border-stone-100">
        <button onClick={onClose} className="p-2 rounded-xl bg-stone-100 text-stone-600 active:bg-stone-200">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
        <div>
          <h1 className="font-bold text-stone-900">Add Custom Meal</h1>
          <p className="text-xs text-stone-400">Step {step} of 3</p>
        </div>
        <div className="ml-auto flex gap-1">
          {[1,2,3].map(s => (
            <span key={s} className={`w-2 h-2 rounded-full ${s === step ? 'bg-emerald-500' : s < step ? 'bg-emerald-200' : 'bg-stone-200'}`} />
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4">

        {step === 1 && (
          <div className="space-y-4">
            <h2 className="font-semibold text-stone-800">Basic Info</h2>

            {/* Emoji */}
            <div>
              <label className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1.5 block">Icon</label>
              <button
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="text-3xl p-2 rounded-xl border border-stone-200 bg-stone-50"
              >
                {meal.emoji}
              </button>
              {showEmojiPicker && (
                <div className="mt-2 grid grid-cols-10 gap-1.5 p-2 bg-stone-50 rounded-xl border border-stone-200">
                  {EMOJI_OPTIONS.map(e => (
                    <button key={e} onClick={() => { update('emoji', e); setShowEmojiPicker(false) }}
                      className={`text-lg p-1 rounded-lg ${meal.emoji === e ? 'bg-emerald-100' : ''}`}>
                      {e}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Name */}
            <div>
              <label className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1.5 block">Meal Name *</label>
              <input
                type="text"
                placeholder="e.g. Teriyaki Salmon Bowl"
                value={meal.name}
                onChange={e => update('name', e.target.value)}
                className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:border-emerald-400"
              />
            </div>

            {/* Category */}
            <div>
              <label className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1.5 block">Meal Type</label>
              <div className="grid grid-cols-2 gap-2">
                {MEAL_TYPES.map(type => (
                  <button
                    key={type.id}
                    onClick={() => update('category', type.id)}
                    className={`flex items-center gap-2 p-3 rounded-xl border-2 text-left transition-all ${
                      meal.category === type.id
                        ? 'border-emerald-500 bg-emerald-50'
                        : 'border-stone-200 bg-white'
                    }`}
                  >
                    <span>{type.emoji}</span>
                    <span className={`text-sm font-medium ${meal.category === type.id ? 'text-emerald-700' : 'text-stone-700'}`}>{type.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Times + servings */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Prep Time', key: 'prepTime', unit: 'min' },
                { label: 'Cook Time', key: 'cookTime', unit: 'min' },
                { label: 'Servings', key: 'servings', unit: '' },
              ].map(({ label, key, unit }) => (
                <div key={key}>
                  <label className="text-[10px] font-semibold text-stone-400 uppercase tracking-wide mb-1 block">{label}</label>
                  <div className="relative">
                    <input
                      type="number"
                      min={1}
                      value={meal[key]}
                      onChange={e => update(key, Number(e.target.value))}
                      className="w-full px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:border-emerald-400"
                    />
                    {unit && <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-stone-400">{unit}</span>}
                  </div>
                </div>
              ))}
            </div>

            {/* Macros */}
            <div>
              <label className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2 block">Macros per Serving</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { key: 'calories', label: 'Calories', color: 'text-stone-700' },
                  { key: 'protein', label: 'Protein (g)', color: 'text-blue-600' },
                  { key: 'carbs', label: 'Carbs (g)', color: 'text-amber-600' },
                  { key: 'fat', label: 'Fat (g)', color: 'text-red-500' },
                ].map(({ key, label, color }) => (
                  <div key={key}>
                    <label className={`text-[10px] font-semibold uppercase tracking-wide mb-1 block ${color}`}>{label}</label>
                    <input
                      type="number"
                      min={0}
                      value={meal.macrosPerServing[key] || ''}
                      onChange={e => updateMacro(key, e.target.value)}
                      placeholder="0"
                      className="w-full px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:border-emerald-400"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h2 className="font-semibold text-stone-800">Ingredients</h2>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Ingredient name"
                value={ingredientInput.name}
                onChange={e => setIngredientInput(p => ({ ...p, name: e.target.value }))}
                className="flex-1 px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:border-emerald-400"
              />
              <input
                type="number"
                placeholder="g"
                value={ingredientInput.grams}
                onChange={e => setIngredientInput(p => ({ ...p, grams: e.target.value }))}
                className="w-16 px-2 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm text-center focus:outline-none focus:border-emerald-400"
              />
              <button onClick={addIngredient} className="px-3 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold active:bg-emerald-700">
                Add
              </button>
            </div>

            <div className="space-y-1.5">
              {meal.ingredients.length === 0 && (
                <p className="text-xs text-stone-400 text-center py-4">No ingredients added yet</p>
              )}
              {meal.ingredients.map(ing => (
                <div key={ing.id} className="flex items-center gap-2 bg-stone-50 rounded-xl px-3 py-2.5">
                  <span className="flex-1 text-sm text-stone-800 capitalize">{ing.name}</span>
                  {ing.grams > 0 && <span className="text-xs text-stone-500 font-medium">{Math.round(ing.grams)}g</span>}
                  <button onClick={() => removeIngredient(ing.id)} className="text-stone-400 p-0.5">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="w-4 h-4">
                      <path d="M18 6L6 18M6 6l12 12"/>
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h2 className="font-semibold text-stone-800">Instructions & Notes</h2>

            <div>
              <label className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2 block">Steps</label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  placeholder="Add a step..."
                  value={instructionInput}
                  onChange={e => setInstructionInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addInstruction()}
                  className="flex-1 px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:border-emerald-400"
                />
                <button onClick={addInstruction} className="px-3 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold active:bg-emerald-700">Add</button>
              </div>
              <div className="space-y-1.5">
                {meal.instructions.map((step, i) => (
                  <div key={i} className="flex items-start gap-2 bg-stone-50 rounded-xl px-3 py-2.5">
                    <span className="flex-shrink-0 w-5 h-5 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center text-[10px] font-bold mt-0.5">{i+1}</span>
                    <span className="flex-1 text-sm text-stone-800 leading-relaxed">{step}</span>
                    <button onClick={() => removeInstruction(i)} className="text-stone-400 flex-shrink-0">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="w-4 h-4">
                        <path d="M18 6L6 18M6 6l12 12"/>
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {[
              { key: 'prepInstructions', label: 'Meal Prep Notes', placeholder: 'How to batch cook this meal...' },
              { key: 'storageInstructions', label: 'Storage Notes', placeholder: 'Store in airtight containers...' },
              { key: 'reheatingInstructions', label: 'Reheating Notes', placeholder: 'Microwave for 2 min, adding water...' },
            ].map(({ key, label, placeholder }) => (
              <div key={key}>
                <label className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1.5 block">{label}</label>
                <textarea
                  rows={2}
                  placeholder={placeholder}
                  value={meal[key]}
                  onChange={e => update(key, e.target.value)}
                  className="w-full px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:border-emerald-400 resize-none"
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 px-4 py-4 border-t border-stone-100 flex gap-2.5">
        {step > 1 && (
          <button onClick={() => setStep(s => s - 1)} className="flex-1 py-3.5 rounded-2xl bg-stone-100 text-stone-700 font-semibold text-sm active:bg-stone-200">
            Back
          </button>
        )}
        {step < 3 ? (
          <button
            onClick={() => setStep(s => s + 1)}
            disabled={step === 1 && !meal.name.trim()}
            className={`flex-1 py-3.5 rounded-2xl font-semibold text-sm ${
              step === 1 && !meal.name.trim()
                ? 'bg-stone-200 text-stone-400'
                : 'bg-emerald-600 text-white active:bg-emerald-700'
            }`}
          >
            Next →
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={!meal.name.trim()}
            className={`flex-1 py-3.5 rounded-2xl font-semibold text-sm ${
              meal.name.trim()
                ? 'bg-emerald-600 text-white active:bg-emerald-700'
                : 'bg-stone-200 text-stone-400'
            }`}
          >
            Save Meal ✓
          </button>
        )}
      </div>
    </div>
  )
}
