import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from './lib/supabase'
import { useAuth } from './context/AuthContext'
import { addMealToGrocery } from './utils/mealUtils'
import AuthPage from './components/AuthPage'
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
  calorieTarget: 2500,
  unitPreference: 'g',
  preferredFoods: ['pasta', 'steak', 'chicken', 'eggs', 'greek yogurt', 'rice', 'potatoes'],
  dislikedFoods: [],
  darkMode: false,
  profile: {
    gender: 'male',
    age: null,
    weightLbs: null,
    heightFt: null,
    heightIn: null,
    activityLevel: 'moderate',
    goal: 'maintain',
  },
}

export default function App() {
  const { user, loading: authLoading, signOut } = useAuth()
  const [dataLoading, setDataLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('plan')
  const [mealPlan, setMealPlan] = useState({})
  const [groceryList, setGroceryList] = useState({})
  const [favorites, setFavorites] = useState([])
  const [customMeals, setCustomMeals] = useState([])
  const [settings, setSettings] = useState(DEFAULT_SETTINGS)
  const [modalMeal, setModalMeal] = useState(null)
  const [showAddMeal, setShowAddMeal] = useState(false)
  const [toast, setToast] = useState(null)
  const saveTimer = useRef(null)
  const currentData = useRef({})

  // Load data from Supabase when user logs in
  useEffect(() => {
    if (!user) { setDataLoading(false); return }
    loadData()
  }, [user])

  async function loadData() {
    setDataLoading(true)
    try {
      const { data } = await supabase
        .from('user_data')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (data) {
        const mp = data.meal_plan || {}
        const gl = data.grocery_list || {}
        const fv = data.favorites || []
        const cm = data.custom_meals || []
        const st = { ...DEFAULT_SETTINGS, ...(data.settings || {}) }
        setMealPlan(mp); setGroceryList(gl); setFavorites(fv)
        setCustomMeals(cm); setSettings(st)
        currentData.current = { meal_plan: mp, grocery_list: gl, favorites: fv, custom_meals: cm, settings: st }
      }
    } catch (e) { console.error('Load error:', e) }
    setDataLoading(false)
  }

  // Debounced save to Supabase
  const scheduleSave = useCallback((updates) => {
    currentData.current = { ...currentData.current, ...updates }
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      if (!user) return
      await supabase.from('user_data').upsert({
        user_id: user.id,
        ...currentData.current,
        updated_at: new Date().toISOString(),
      })
    }, 1500)
  }, [user])

  // Wrapped setters that also trigger save
  function updateMealPlan(val) {
    const v = typeof val === 'function' ? val(mealPlan) : val
    setMealPlan(v); scheduleSave({ meal_plan: v })
  }
  function updateGroceryList(val) {
    const v = typeof val === 'function' ? val(groceryList) : val
    setGroceryList(v); scheduleSave({ grocery_list: v })
  }
  function updateFavorites(val) {
    const v = typeof val === 'function' ? val(favorites) : val
    setFavorites(v); scheduleSave({ favorites: v })
  }
  function updateCustomMeals(val) {
    const v = typeof val === 'function' ? val(customMeals) : val
    setCustomMeals(v); scheduleSave({ custom_meals: v })
  }
  function updateSettings(val) {
    const v = typeof val === 'function' ? val(settings) : val
    setSettings(v); scheduleSave({ settings: v })
  }

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(null), 2800)
  }

  function toggleFavorite(mealId) {
    updateFavorites(prev =>
      prev.includes(mealId) ? prev.filter(id => id !== mealId) : [...prev, mealId]
    )
  }

  function addCustomMeal(meal) {
    updateCustomMeals(prev => [...prev, meal])
    showToast('Custom meal added!')
  }

  function deleteCustomMeal(mealId) {
    updateCustomMeals(prev => prev.filter(m => m.id !== mealId))
    showToast('Meal deleted')
  }

  function addMealsToPlan(planSelections) {
    const newPlan = { ...mealPlan }
    const mealDateMap = {}
    planSelections.forEach(({ dateKey, mealType, meal, servings }) => {
      const key = `${meal.id}__${servings}`
      if (!mealDateMap[key]) mealDateMap[key] = { meal, servings, dates: [] }
      mealDateMap[key].dates.push(dateKey)
      if (!newPlan[dateKey]) newPlan[dateKey] = {}
      newPlan[dateKey][mealType] = { mealId: meal.id, servings }
    })
    updateMealPlan(newPlan)
    let updatedGrocery = { ...groceryList }
    Object.values(mealDateMap).forEach(({ meal, servings, dates }) => {
      updatedGrocery = addMealToGrocery(updatedGrocery, meal, servings, dates)
    })
    updateGroceryList(updatedGrocery)
    showToast(`${planSelections.length} meal${planSelections.length > 1 ? 's' : ''} added to plan!`)
  }

  function removeMealFromPlan(dateKey, mealType) {
    updateMealPlan(prev => {
      const updated = { ...prev }
      if (updated[dateKey]) {
        updated[dateKey] = { ...updated[dateKey] }
        delete updated[dateKey][mealType]
        if (Object.keys(updated[dateKey]).length === 0) delete updated[dateKey]
      }
      return updated
    })
    showToast('Meal removed')
  }

  function toggleGroceryItem(key) {
    updateGroceryList(prev => ({ ...prev, [key]: { ...prev[key], checked: !prev[key].checked } }))
  }

  function clearCheckedItems() {
    updateGroceryList(prev => {
      const updated = {}
      Object.entries(prev).forEach(([k, v]) => { if (!v.checked) updated[k] = v })
      return updated
    })
    showToast('Checked items cleared')
  }

  function markGroceryTripComplete() {
    updateGroceryList({})
    showToast('Grocery trip complete!')
  }

  // Show loading or auth
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-4xl animate-pulse">🥗</div>
      </div>
    )
  }

  if (!user) return <AuthPage />

  if (dataLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-3">
        <div className="text-4xl">🥗</div>
        <p className="text-stone-500 text-sm font-medium">Loading your meal plan...</p>
      </div>
    )
  }

  const tabProps = {
    mealPlan, groceryList, favorites, customMeals, settings,
    setSettings: updateSettings,
    onAddMeals: addMealsToPlan,
    onRemoveMeal: removeMealFromPlan,
    onToggleGrocery: toggleGroceryItem,
    onClearChecked: clearCheckedItems,
    onMarkTripComplete: markGroceryTripComplete,
    onUpdateGroceryItem: (key, updates) => updateGroceryList(prev => ({ ...prev, [key]: { ...prev[key], ...updates } })),
    onToggleFavorite: toggleFavorite,
    onOpenRecipe: setModalMeal,
    onShowAddMeal: () => setShowAddMeal(true),
    onDeleteCustomMeal: deleteCustomMeal,
    setActiveTab,
    onSignOut: signOut,
    userEmail: user.email,
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
    <div className={`h-screen flex flex-col overflow-hidden safe-top ${settings?.darkMode ? 'bg-stone-900' : 'bg-slate-50'}`}>
      <main className="flex-1 overflow-y-auto pb-20">{renderTab()}</main>
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
      {showAddMeal && <AddMealModal onAdd={addCustomMeal} onClose={() => setShowAddMeal(false)} />}
      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-stone-900 text-white text-sm font-medium px-4 py-2.5 rounded-full shadow-xl pointer-events-none animate-fade-in whitespace-nowrap">
          {toast}
        </div>
      )}
    </div>
  )
}
