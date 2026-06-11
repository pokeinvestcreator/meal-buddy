import { useState, useEffect } from 'react'
import useLocalStorage from './hooks/useLocalStorage'
import { addMealToGrocery } from './utils/mealUtils'
import BottomNav from './components/BottomNav'
import PlanTab from './components/PlanTab'
import GroceryTab from './components/GroceryTab'
import CalendarTab from './components/CalendarTab'
import RecipesTab from './components/RecipesTab'
import SettingsTab from './components/SettingsTab'
import RecipeModal from './components/RecipeModal'
import AddMealModal from './components/AddMealModal'

const DEFAULT_SETTINGS = {
  prepDays: ['monday', 'thursday'],
  proteinTarget: 200,
  unitPreference: 'g',
  preferredFoods: ['pasta', 'steak', 'chicken', 'eggs', 'greek yogurt', 'rice', 'potatoes'],
  dislikedFoods: [],
}

export default function App() {
  const [activeTab, setActiveTab] = useState('plan')
  const [mealPlan, setMealPlan] = useLocalStorage('mb_mealPlan', {})
  const [groceryList, setGroceryList] = useLocalStorage('mb_grocery', {})
  const [favorites, setFavorites] = useLocalStorage('mb_favorites', [])
  const [customMeals, setCustomMeals] = useLocalStorage('mb_custom', [])
  const [settings, setSettings] = useLocalStorage('mb_settings', DEFAULT_SETTINGS)
  const [modalMeal, setModalMeal] = useState(null)
  const [showAddMeal, setShowAddMeal] = useState(false)
  const [toast, setToast] = useState(null)

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch(() => {})
      })
    }
  }, [])

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(null), 2800)
  }

  function toggleFavorite(mealId) {
    setFavorites(prev =>
      prev.includes(mealId) ? prev.filter(id => id !== mealId) : [...prev, mealId]
    )
  }

  function addCustomMeal(meal) {
    setCustomMeals(prev => [...prev, meal])
    showToast('Custom meal added!')
  }

  function deleteCustomMeal(mealId) {
    setCustomMeals(prev => prev.filter(m => m.id !== mealId))
    showToast('Meal deleted')
  }

  // planSelections: [{ dateKey, mealType, meal, servings }]
  function addMealsToPlan(planSelections) {
    const newPlan = { ...mealPlan }

    // Group by mealId to collect all dates for grocery deduplication
    const mealDateMap = {}
    planSelections.forEach(({ dateKey, mealType, meal, servings }) => {
      const key = `${meal.id}__${servings}`
      if (!mealDateMap[key]) {
        mealDateMap[key] = { meal, servings, dates: [] }
      }
      mealDateMap[key].dates.push(dateKey)

      if (!newPlan[dateKey]) newPlan[dateKey] = {}
      newPlan[dateKey][mealType] = { mealId: meal.id, servings }
    })

    setMealPlan(newPlan)

    // Add each unique meal+serving combo to grocery list once
    let updatedGrocery = { ...groceryList }
    Object.values(mealDateMap).forEach(({ meal, servings, dates }) => {
      updatedGrocery = addMealToGrocery(updatedGrocery, meal, servings, dates)
    })
    setGroceryList(updatedGrocery)
    showToast(`${planSelections.length} meal${planSelections.length > 1 ? 's' : ''} added to plan!`)
  }

  function removeMealFromPlan(dateKey, mealType) {
    setMealPlan(prev => {
      const updated = { ...prev }
      if (updated[dateKey]) {
        updated[dateKey] = { ...updated[dateKey] }
        delete updated[dateKey][mealType]
        if (Object.keys(updated[dateKey]).length === 0) delete updated[dateKey]
      }
      return updated
    })
    showToast('Meal removed from plan')
  }

  function toggleGroceryItem(key) {
    setGroceryList(prev => ({
      ...prev,
      [key]: { ...prev[key], checked: !prev[key].checked },
    }))
  }

  function clearCheckedItems() {
    setGroceryList(prev => {
      const updated = {}
      Object.entries(prev).forEach(([k, v]) => {
        if (!v.checked) updated[k] = v
      })
      return updated
    })
    showToast('Checked items cleared')
  }

  function markGroceryTripComplete() {
    setGroceryList({})
    showToast('Grocery trip complete! List cleared.')
  }

  function updateGroceryItem(key, updates) {
    setGroceryList(prev => ({
      ...prev,
      [key]: { ...prev[key], ...updates },
    }))
  }

  const tabProps = {
    mealPlan,
    groceryList,
    favorites,
    customMeals,
    settings,
    setSettings,
    onAddMeals: addMealsToPlan,
    onRemoveMeal: removeMealFromPlan,
    onToggleGrocery: toggleGroceryItem,
    onClearChecked: clearCheckedItems,
    onMarkTripComplete: markGroceryTripComplete,
    onUpdateGroceryItem: updateGroceryItem,
    onToggleFavorite: toggleFavorite,
    onOpenRecipe: setModalMeal,
    onShowAddMeal: () => setShowAddMeal(true),
    onDeleteCustomMeal: deleteCustomMeal,
    setActiveTab,
  }

  function renderTab() {
    switch (activeTab) {
      case 'plan': return <PlanTab {...tabProps} />
      case 'grocery': return <GroceryTab {...tabProps} />
      case 'calendar': return <CalendarTab {...tabProps} />
      case 'recipes': return <RecipesTab {...tabProps} />
      case 'settings': return <SettingsTab {...tabProps} />
      default: return <PlanTab {...tabProps} />
    }
  }

  return (
    <div className="h-screen flex flex-col bg-slate-50 overflow-hidden">
      <main className="flex-1 overflow-y-auto pb-20">
        {renderTab()}
      </main>
      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} mealPlan={mealPlan} groceryList={groceryList} />
      {modalMeal && (
        <RecipeModal
          meal={modalMeal}
          settings={settings}
          isFavorite={favorites.includes(modalMeal.id)}
          onToggleFavorite={() => toggleFavorite(modalMeal.id)}
          onClose={() => setModalMeal(null)}
        />
      )}
      {showAddMeal && (
        <AddMealModal
          onAdd={addCustomMeal}
          onClose={() => setShowAddMeal(false)}
        />
      )}
      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-stone-900 text-white text-sm font-medium px-4 py-2.5 rounded-full shadow-xl pointer-events-none animate-fade-in whitespace-nowrap">
          {toast}
        </div>
      )}
    </div>
  )
}
