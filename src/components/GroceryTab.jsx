import { useMemo, useState } from 'react'
import { GROCERY_CATEGORIES } from '../data/meals'
import { getGroceryStats } from '../utils/mealUtils'

const CATEGORY_ICONS = {
  protein: '🥩',
  carbs: '🌾',
  produce: '🥦',
  dairy: '🧀',
  sauces: '🫙',
  snacks: '🥜',
  other: '📦',
}

const CATEGORY_LABELS = {
  protein: 'Protein',
  carbs: 'Carbs & Grains',
  produce: 'Produce',
  dairy: 'Dairy & Eggs',
  sauces: 'Sauces & Seasonings',
  snacks: 'Snacks',
  other: 'Other',
}

export default function GroceryTab({
  groceryList,
  settings,
  onToggleGrocery,
  onClearChecked,
  onMarkTripComplete,
  onUpdateGroceryItem,
  setActiveTab,
}) {
  const [confirmClear, setConfirmClear] = useState(false)
  const unitPref = settings?.unitPreference || 'g'

  const stats = useMemo(() => getGroceryStats(groceryList), [groceryList])

  const grouped = useMemo(() => {
    const groups = {}
    Object.values(groceryList || {}).forEach(item => {
      const cat = item.category || 'other'
      if (!groups[cat]) groups[cat] = []
      groups[cat].push(item)
    })
    // Sort within each group: unchecked first
    Object.keys(groups).forEach(cat => {
      groups[cat].sort((a, b) => (a.checked ? 1 : 0) - (b.checked ? 1 : 0))
    })
    return groups
  }, [groceryList])

  const categoryOrder = [...GROCERY_CATEGORIES.map(c => c.id), 'other']
  const orderedCategories = categoryOrder.filter(c => grouped[c] && grouped[c].length > 0)

  if (stats.total === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
        <div className="text-6xl mb-4">🛒</div>
        <h2 className="text-xl font-bold text-stone-800 mb-2">Grocery list is empty</h2>
        <p className="text-stone-500 text-sm mb-6">Plan some meals to auto-generate your grocery list.</p>
        <button
          onClick={() => setActiveTab('plan')}
          className="bg-emerald-600 text-white px-6 py-3 rounded-2xl font-semibold text-sm active:bg-emerald-700"
        >
          Plan Meals
        </button>
      </div>
    )
  }

  return (
    <div className="pb-6">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-stone-100 px-4 pt-5 pb-3">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-xl font-bold text-stone-900">Grocery List</h1>
            <p className="text-sm text-stone-500">
              {stats.remaining === 0 ? 'All items checked!' : `${stats.remaining} of ${stats.total} remaining`}
            </p>
          </div>
          <div className="flex gap-2">
            {stats.checked > 0 && (
              <button
                onClick={onClearChecked}
                className="text-xs font-semibold text-stone-500 bg-stone-100 px-3 py-2 rounded-xl active:bg-stone-200"
              >
                Clear ✓
              </button>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 rounded-full transition-all duration-500"
            style={{ width: stats.total > 0 ? `${(stats.checked / stats.total) * 100}%` : '0%' }}
          />
        </div>
      </div>

      {/* Category groups */}
      <div className="px-4 pt-3 space-y-5">
        {orderedCategories.map(catId => {
          const items = grouped[catId] || []
          const catChecked = items.filter(i => i.checked).length
          return (
            <section key={catId}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">{CATEGORY_ICONS[catId] || '📦'}</span>
                <h2 className="font-semibold text-stone-700 text-sm">{CATEGORY_LABELS[catId] || catId}</h2>
                <span className="text-xs text-stone-400 ml-auto">{catChecked}/{items.length}</span>
              </div>
              <div className="space-y-1.5">
                {items.map(item => (
                  <GroceryItem
                    key={item.key}
                    item={item}
                    unitPref={unitPref}
                    onToggle={() => onToggleGrocery(item.key)}
                  />
                ))}
              </div>
            </section>
          )
        })}
      </div>

      {/* Bottom actions */}
      <div className="px-4 mt-6 space-y-2.5">
        {stats.remaining === 0 && stats.total > 0 && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3.5 text-center">
            <p className="text-emerald-700 font-semibold text-sm">🎉 All items checked!</p>
            <p className="text-emerald-600 text-xs mt-0.5">Ready to mark your trip complete?</p>
          </div>
        )}
        <button
          onClick={() => {
            if (confirmClear) {
              onMarkTripComplete()
              setConfirmClear(false)
            } else {
              setConfirmClear(true)
              setTimeout(() => setConfirmClear(false), 3000)
            }
          }}
          className={`w-full py-3.5 rounded-2xl font-semibold text-sm transition-all ${
            confirmClear
              ? 'bg-red-500 text-white'
              : 'bg-stone-900 text-white active:bg-stone-800'
          }`}
        >
          {confirmClear ? 'Tap again to confirm clear list' : '✅ Mark Grocery Trip Complete'}
        </button>
      </div>
    </div>
  )
}

function GroceryItem({ item, unitPref, onToggle }) {
  const weight = unitPref === 'oz'
    ? (item.oz != null ? `${item.oz.toFixed(1)} oz` : `${(item.grams / 28.35).toFixed(1)} oz`)
    : (item.grams != null ? `${Math.round(item.grams)}g` : '')

  return (
    <button
      onClick={onToggle}
      className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
        item.checked
          ? 'bg-stone-50 border-stone-100 opacity-60'
          : 'bg-white border-stone-200'
      }`}
    >
      <div className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
        item.checked ? 'bg-emerald-500 border-emerald-500' : 'border-stone-300'
      }`}>
        {item.checked && (
          <svg viewBox="0 0 12 12" fill="none" className="w-3 h-3">
            <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </div>
      <span className={`flex-1 text-sm font-medium capitalize ${item.checked ? 'line-through text-stone-400' : 'text-stone-800'}`}>
        {item.name}
      </span>
      {weight && (
        <span className={`text-xs font-semibold ${item.checked ? 'text-stone-300' : 'text-stone-500'}`}>
          {weight}
        </span>
      )}
    </button>
  )
}
