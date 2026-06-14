import { useMemo, useState } from 'react'
import { GROCERY_CATEGORIES } from '../data/meals'
import { getGroceryStats } from '../utils/mealUtils'

export default function GroceryTab({ groceryList, settings, onToggleGrocery, onClearChecked, onMarkTripComplete, setActiveTab }) {
  const [confirmClear, setConfirmClear] = useState(false)
  const [showInstacart, setShowInstacart] = useState(false)
  const [copied, setCopied] = useState(false)

  const dark = settings?.darkMode || false
  const unitPref = settings?.unitPreference || 'g'
  const stats = useMemo(() => getGroceryStats(groceryList), [groceryList])

  const grouped = useMemo(() => {
    const groups = {}
    Object.values(groceryList || {}).forEach(item => {
      const cat = item.category || 'other'
      if (!groups[cat]) groups[cat] = []
      groups[cat].push(item)
    })
    Object.keys(groups).forEach(cat => {
      groups[cat].sort((a, b) => (a.checked ? 1 : 0) - (b.checked ? 1 : 0))
    })
    return groups
  }, [groceryList])

  const categoryOrder = [...GROCERY_CATEGORIES.map(c => c.key), 'other']
  const orderedCategories = categoryOrder.filter(c => grouped[c]?.length > 0)

  const uncheckedItems = useMemo(() =>
    Object.values(groceryList || {}).filter(i => !i.checked),
  [groceryList])

  // ── Instacart helpers ─────────────────────────────────────────────────────

  function formatList() {
    const lines = ['Meal Buddy — Grocery List', '']
    orderedCategories.forEach(catKey => {
      const catInfo = GROCERY_CATEGORIES.find(c => c.key === catKey)
      const items = (grouped[catKey] || []).filter(i => !i.checked)
      if (items.length === 0) return
      lines.push((catInfo?.label || catKey).toUpperCase())
      items.forEach(item => {
        const weight = unitPref === 'oz'
          ? `${((item.oz ?? item.grams / 28.35)).toFixed(1)} oz`
          : item.grams != null ? `${Math.round(item.grams)}g` : ''
        lines.push(`• ${item.name}${weight ? ` — ${weight}` : ''}`)
      })
      lines.push('')
    })
    return lines.join('\n').trim()
  }

  async function handleCopy() {
    const text = formatList()
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      // Fallback for environments without Clipboard API
      const el = document.createElement('textarea')
      el.value = text
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  async function handleShare() {
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Grocery List', text: formatList() })
        return
      } catch {}
    }
    // Fallback to copy
    handleCopy()
  }

  // ── Theming ───────────────────────────────────────────────────────────────

  const bg      = dark ? 'bg-stone-900' : 'bg-white'
  const card    = dark ? 'bg-stone-800 border-stone-700' : 'bg-white border-stone-200'
  const text    = dark ? 'text-white' : 'text-stone-900'
  const sub     = dark ? 'text-stone-400' : 'text-stone-500'
  const itemBg  = dark ? 'bg-stone-800 border-stone-700' : 'bg-white border-stone-200'
  const hdr     = dark ? 'bg-stone-900 border-stone-800' : 'bg-white border-stone-100'

  // ── Empty state ───────────────────────────────────────────────────────────

  if (stats.total === 0) {
    return (
      <div className={`flex flex-col items-center justify-center min-h-[60vh] px-6 text-center ${bg}`}>
        <div className="text-6xl mb-4">🛒</div>
        <h2 className={`text-xl font-bold mb-2 ${text}`}>Grocery list is empty</h2>
        <p className={`text-sm mb-6 ${sub}`}>Plan some meals to auto-generate your list.</p>
        <button onClick={() => setActiveTab('plan')} className="bg-emerald-600 text-white px-6 py-3 rounded-2xl font-semibold text-sm">
          Plan Meals
        </button>
      </div>
    )
  }

  // ── Instacart sheet ───────────────────────────────────────────────────────

  if (showInstacart) {
    return (
      <div className={`fixed inset-0 z-50 flex flex-col ${bg}`}>
        {/* Header */}
        <div className={`flex-shrink-0 flex items-center gap-3 px-4 pt-5 pb-4 border-b ${hdr}`}>
          <button type="button" onClick={() => { setShowInstacart(false); setCopied(false) }}
            className={`px-3 py-2 rounded-xl text-sm font-medium ${dark ? 'bg-stone-700 text-stone-300' : 'bg-stone-100 text-stone-600'}`}>
            ← Back
          </button>
          <div>
            <h1 className={`font-bold text-base ${text}`}>Order on Instacart</h1>
            <p className={`text-xs ${sub}`}>{uncheckedItems.length} item{uncheckedItems.length !== 1 ? 's' : ''} remaining</p>
          </div>
        </div>

        {/* CTAs */}
        <div className={`flex-shrink-0 px-4 py-4 space-y-2.5 border-b ${dark ? 'border-stone-800' : 'border-stone-100'}`}>
          {/* Primary: Open Instacart */}
          <a href="https://www.instacart.com" target="_blank" rel="noopener noreferrer"
            className="w-full py-4 rounded-2xl font-bold text-base bg-emerald-600 active:bg-emerald-700 text-white flex items-center justify-center gap-2">
            🛒 Open Instacart
          </a>

          {/* Secondary: Copy + Share */}
          <div className="flex gap-2.5">
            <button type="button" onClick={handleCopy}
              className={`flex-1 py-3 rounded-2xl font-semibold text-sm border transition-colors ${
                copied
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                  : dark ? 'bg-stone-700 border-stone-600 text-stone-300' : 'bg-stone-50 border-stone-200 text-stone-700'
              }`}>
              {copied ? '✓ Copied!' : '📋 Copy List'}
            </button>
            <button type="button" onClick={handleShare}
              className={`flex-1 py-3 rounded-2xl font-semibold text-sm border ${dark ? 'bg-stone-700 border-stone-600 text-stone-300' : 'bg-stone-50 border-stone-200 text-stone-700'}`}>
              📤 Share
            </button>
          </div>

          <p className={`text-[11px] text-center ${sub}`}>
            Tap an item below to search it on Instacart, or copy your list and paste into Instacart's list feature
          </p>
        </div>

        {/* Item list — grouped by category */}
        <div className="flex-1 overflow-y-auto px-4 pt-4 pb-8 space-y-5">
          {orderedCategories.map(catKey => {
            const catItems = (grouped[catKey] || []).filter(i => !i.checked)
            if (catItems.length === 0) return null
            const catInfo = GROCERY_CATEGORIES.find(c => c.key === catKey)
            return (
              <section key={catKey}>
                <div className="flex items-center gap-2 mb-2">
                  <h2 className={`text-xs font-semibold uppercase tracking-wide ${sub}`}>
                    {catInfo?.emoji} {catInfo?.label || catKey}
                  </h2>
                  <span className={`text-[10px] ${sub} ml-auto`}>{catItems.length} item{catItems.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="space-y-1.5">
                  {catItems.map(item => {
                    const weight = unitPref === 'oz'
                      ? `${((item.oz ?? item.grams / 28.35)).toFixed(1)} oz`
                      : item.grams != null ? `${Math.round(item.grams)}g` : ''
                    return (
                      <a
                        key={item.key}
                        href={`https://www.instacart.com/store/s?k=${encodeURIComponent(item.name)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left active:opacity-70 ${itemBg}`}>
                        <span className={`flex-1 text-sm font-medium capitalize ${text}`}>{item.name}</span>
                        {weight && <span className={`text-xs font-semibold ${sub}`}>{weight}</span>}
                        <span className="text-xs text-emerald-600 font-bold flex-shrink-0">Find →</span>
                      </a>
                    )
                  })}
                </div>
              </section>
            )
          })}

          {uncheckedItems.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="text-4xl mb-3">✅</div>
              <p className={`text-sm font-medium ${sub}`}>All items are already checked off!</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── Main grocery view ─────────────────────────────────────────────────────

  return (
    <div className={`pb-6 ${bg}`}>
      {/* Header */}
      <div className={`sticky top-0 z-10 border-b px-4 pt-5 pb-3 ${hdr}`}>
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className={`text-xl font-bold ${text}`}>Grocery List</h1>
            <p className={`text-sm ${sub}`}>
              {stats.remaining === 0 ? 'All items checked!' : `${stats.remaining} of ${stats.total} remaining`}
            </p>
          </div>
          {stats.checked > 0 && (
            <button onClick={onClearChecked}
              className={`text-xs font-semibold px-3 py-2 rounded-xl ${dark ? 'bg-stone-700 text-stone-300' : 'bg-stone-100 text-stone-500'}`}>
              Clear ✓
            </button>
          )}
        </div>
        <div className={`h-2 rounded-full overflow-hidden ${dark ? 'bg-stone-700' : 'bg-stone-100'}`}>
          <div className="h-full bg-emerald-500 rounded-full transition-all duration-500"
            style={{ width: stats.total > 0 ? `${(stats.checked / stats.total) * 100}%` : '0%' }} />
        </div>
      </div>

      {/* Categories */}
      <div className="px-4 pt-4 space-y-5">
        {orderedCategories.map(catKey => {
          const catInfo = GROCERY_CATEGORIES.find(c => c.key === catKey)
          const items = grouped[catKey] || []
          const checkedCount = items.filter(i => i.checked).length
          const label = catInfo?.label || catKey
          return (
            <section key={catKey}>
              <div className="flex items-center gap-2 mb-2">
                <h2 className={`font-semibold text-sm ${dark ? 'text-stone-300' : 'text-stone-700'}`}>{label}</h2>
                <span className={`text-xs ml-auto ${sub}`}>{checkedCount}/{items.length}</span>
              </div>
              <div className="space-y-1.5">
                {items.map(item => (
                  <GroceryItem key={item.key} item={item} unitPref={unitPref} dark={dark} onToggle={() => onToggleGrocery(item.key)} />
                ))}
              </div>
            </section>
          )
        })}
      </div>

      {/* Footer */}
      <div className="px-4 mt-6 space-y-2.5">
        {stats.remaining === 0 && (
          <div className={`rounded-2xl p-3.5 text-center ${dark ? 'bg-emerald-900/30 border border-emerald-700' : 'bg-emerald-50 border border-emerald-200'}`}>
            <p className="text-emerald-600 font-semibold text-sm">🎉 All items checked!</p>
          </div>
        )}

        {/* Instacart button — only shown when items remain */}
        {stats.remaining > 0 && (
          <button type="button" onClick={() => setShowInstacart(true)}
            className="w-full py-3.5 rounded-2xl font-bold text-sm bg-emerald-600 active:bg-emerald-700 text-white flex items-center justify-center gap-2">
            🛒 Order on Instacart
          </button>
        )}

        <button
          onClick={() => {
            if (confirmClear) { onMarkTripComplete(); setConfirmClear(false) }
            else { setConfirmClear(true); setTimeout(() => setConfirmClear(false), 3000) }
          }}
          className={`w-full py-3.5 rounded-2xl font-semibold text-sm ${
            confirmClear ? 'bg-red-500 text-white' : dark ? 'bg-stone-700 text-stone-200' : 'bg-stone-900 text-white'
          }`}>
          {confirmClear ? 'Tap again to confirm — this clears everything' : '✅ Mark Grocery Trip Complete'}
        </button>
      </div>
    </div>
  )
}

function GroceryItem({ item, unitPref, dark, onToggle }) {
  const weight = unitPref === 'oz'
    ? `${((item.oz ?? item.grams / 28.35)).toFixed(1)} oz`
    : item.grams != null ? `${Math.round(item.grams)}g` : ''

  return (
    <button onClick={onToggle}
      className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-opacity ${
        item.checked
          ? dark ? 'bg-stone-800 border-stone-700 opacity-40' : 'bg-stone-50 border-stone-100 opacity-50'
          : dark ? 'bg-stone-800 border-stone-700' : 'bg-white border-stone-200'
      }`}>
      <div className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
        item.checked ? 'bg-emerald-500 border-emerald-500' : dark ? 'border-stone-500' : 'border-stone-300'
      }`}>
        {item.checked && (
          <svg viewBox="0 0 12 12" fill="none" className="w-3 h-3">
            <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </div>
      <span className={`flex-1 text-sm font-medium capitalize ${item.checked ? 'line-through text-stone-400' : dark ? 'text-white' : 'text-stone-800'}`}>
        {item.name}
      </span>
      {weight && (
        <span className={`text-xs font-semibold ${item.checked ? 'text-stone-300' : dark ? 'text-stone-400' : 'text-stone-500'}`}>
          {weight}
        </span>
      )}
    </button>
  )
}
