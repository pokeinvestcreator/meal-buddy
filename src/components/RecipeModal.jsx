import { useState } from 'react'

function HeartIcon({ filled }) {
  return (
    <svg viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
    </svg>
  )
}

export default function RecipeModal({ meal, settings, isFavorite, onToggleFavorite, onClose }) {
  const [servings, setServings] = useState(meal.servings || 1)
  const [activeSection, setActiveSection] = useState('ingredients')
  const unitPref = settings?.unitPreference || 'g'

  const scale = servings / (meal.servings || 1)
  const m = meal.macrosPerServing

  function scaleWeight(ingredient) {
    const g = (ingredient.grams || 0) * scale
    const oz = (ingredient.oz || ingredient.grams / 28.35) * scale
    if (unitPref === 'oz') {
      return oz >= 10 ? `${oz.toFixed(1)} oz` : `${oz.toFixed(2)} oz`
    }
    return g < 10 ? `${g.toFixed(1)}g` : `${Math.round(g)}g`
  }

  const SECTIONS = [
    { id: 'ingredients', label: 'Ingredients' },
    { id: 'instructions', label: 'Steps' },
    { id: 'prep', label: 'Prep & Storage' },
  ]

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white">
      {/* Header */}
      <div className="flex-shrink-0 bg-white border-b border-stone-100">
        <div className="flex items-center gap-3 px-4 pt-5 pb-3">
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-stone-100 text-stone-600 active:bg-stone-200"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>

          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{meal.emoji}</span>
              <h1 className="font-bold text-stone-900 text-base leading-tight">{meal.name}</h1>
            </div>
          </div>

          <button
            onClick={onToggleFavorite}
            className={`p-2 rounded-xl transition-colors ${isFavorite ? 'text-red-500 bg-red-50' : 'text-stone-400 bg-stone-100'}`}
          >
            <HeartIcon filled={isFavorite} />
          </button>
        </div>

        {/* Quick stats */}
        <div className="px-4 pb-3">
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: 'CALORIES', val: Math.round(m.calories * scale), color: 'text-stone-800' },
              { label: 'PROTEIN', val: `${Math.round(m.protein * scale)}g`, color: 'text-blue-600' },
              { label: 'CARBS', val: `${Math.round(m.carbs * scale)}g`, color: 'text-amber-600' },
              { label: 'FAT', val: `${Math.round(m.fat * scale)}g`, color: 'text-red-500' },
            ].map(stat => (
              <div key={stat.label} className="bg-stone-50 rounded-xl p-2 text-center">
                <p className={`text-sm font-bold ${stat.color}`}>{stat.val}</p>
                <p className="text-[9px] font-semibold text-stone-400 tracking-wide">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Meta row */}
        <div className="flex items-center gap-4 px-4 pb-3">
          <span className="text-xs text-stone-500">⏱ Prep {meal.prepTime}m · Cook {meal.cookTime}m</span>
          <span className="text-xs text-stone-400">|</span>
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-xs text-stone-600 font-medium">Servings:</span>
            <div className="flex items-center gap-2">
              <button onClick={() => setServings(s => Math.max(1, s - 1))} className="w-7 h-7 rounded-full bg-stone-200 text-stone-700 font-bold flex items-center justify-center active:bg-stone-300 text-sm">−</button>
              <span className="text-sm font-bold text-stone-900 w-5 text-center">{servings}</span>
              <button onClick={() => setServings(s => s + 1)} className="w-7 h-7 rounded-full bg-emerald-500 text-white font-bold flex items-center justify-center active:bg-emerald-600 text-sm">+</button>
            </div>
          </div>
        </div>

        {/* Section tabs */}
        <div className="flex gap-0 px-4 pb-0">
          {SECTIONS.map(sec => (
            <button
              key={sec.id}
              onClick={() => setActiveSection(sec.id)}
              className={`flex-1 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
                activeSection === sec.id
                  ? 'border-emerald-500 text-emerald-600'
                  : 'border-transparent text-stone-400'
              }`}
            >
              {sec.label}
            </button>
          ))}
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        {activeSection === 'ingredients' && (
          <div className="px-4 py-4">
            <p className="text-xs text-stone-400 mb-3">
              {servings !== meal.servings
                ? `Scaled for ${servings} serving${servings > 1 ? 's' : ''} (base: ${meal.servings})`
                : `${meal.servings} serving${meal.servings > 1 ? 's' : ''}`
              }
            </p>

            {meal.ingredients && meal.ingredients.length > 0 ? (
              <div className="space-y-1.5">
                {meal.ingredients.map((ing, i) => (
                  <div key={ing.id || i} className="flex items-center justify-between bg-stone-50 rounded-xl px-3.5 py-2.5">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-stone-800 capitalize">{ing.name}</p>
                      {ing.note && <p className="text-[11px] text-stone-400">{ing.note}</p>}
                    </div>
                    <div className="text-right ml-3">
                      <p className="text-sm font-bold text-stone-700">{scaleWeight(ing)}</p>
                      {unitPref === 'oz' && ing.grams && (
                        <p className="text-[10px] text-stone-400">{Math.round(ing.grams * scale)}g</p>
                      )}
                      {unitPref === 'g' && ing.oz && (
                        <p className="text-[10px] text-stone-400">{((ing.oz) * scale).toFixed(1)} oz</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-stone-400 text-sm text-center py-6">No ingredients listed</p>
            )}
          </div>
        )}

        {activeSection === 'instructions' && (
          <div className="px-4 py-4">
            {meal.instructions && meal.instructions.length > 0 ? (
              <ol className="space-y-3">
                {meal.instructions.map((step, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="flex-shrink-0 w-7 h-7 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center text-xs font-bold">
                      {i + 1}
                    </span>
                    <p className="text-sm text-stone-700 leading-relaxed pt-0.5">{step}</p>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-stone-400 text-sm text-center py-6">No instructions available</p>
            )}
          </div>
        )}

        {activeSection === 'prep' && (
          <div className="px-4 py-4 space-y-4">
            {meal.prepInstructions && (
              <PrepSection
                icon="🔪"
                title="Meal Prep Instructions"
                content={meal.prepInstructions}
              />
            )}
            {meal.storageInstructions && (
              <PrepSection
                icon="📦"
                title="Storage"
                content={meal.storageInstructions}
              />
            )}
            {meal.reheatingInstructions && (
              <PrepSection
                icon="🔥"
                title="Reheating"
                content={meal.reheatingInstructions}
              />
            )}
            {!meal.prepInstructions && !meal.storageInstructions && !meal.reheatingInstructions && (
              <p className="text-stone-400 text-sm text-center py-6">No prep/storage notes available</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function PrepSection({ icon, title, content }) {
  return (
    <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">{icon}</span>
        <h3 className="font-semibold text-stone-800 text-sm">{title}</h3>
      </div>
      <p className="text-sm text-stone-600 leading-relaxed">{content}</p>
    </div>
  )
}
