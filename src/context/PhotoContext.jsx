import { createContext, useContext, useState, useEffect, useRef } from 'react'
import { MEALS } from '../data/meals'

const PhotoContext = createContext({})

const CACHE_KEY = 'meal_buddy_photos_v2'
const STAGGER_MS = 150 // ms between Pexels requests to be polite

function loadCache() {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY) || '{}') } catch { return {} }
}

function saveCache(photos) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(photos)) } catch {}
}

export function PhotoProvider({ children, customMeals = [] }) {
  const [photos, setPhotos] = useState(loadCache)
  const fetching = useRef(false)

  useEffect(() => {
    const key = import.meta.env.VITE_PEXELS_API_KEY
    if (!key || fetching.current) return

    const allMeals = [...MEALS, ...customMeals]
    const missing = allMeals.filter(m => m.photoQuery && !photos[m.id])
    if (missing.length === 0) return

    fetching.current = true

    const cache = loadCache()

    missing.forEach((meal, i) => {
      setTimeout(async () => {
        // Re-check cache in case another instance already fetched it
        if (cache[meal.id]) return

        try {
          const res = await fetch(
            `https://api.pexels.com/v1/search?query=${encodeURIComponent(meal.photoQuery)}&per_page=3&orientation=square`,
            { headers: { Authorization: key } }
          )
          if (!res.ok) return
          const data = await res.json()

          // Pick the photo with the most downloads (index 0 from Pexels is most relevant)
          const photo = data.photos?.[0]
          if (!photo) return

          const url = photo.src.medium // ~350px, good quality

          setPhotos(prev => {
            const next = { ...prev, [meal.id]: url }
            saveCache(next)
            return next
          })
        } catch {
          // Silently fail — emoji fallback handles it
        }
      }, i * STAGGER_MS)
    })
  }, [customMeals.length]) // Re-run only when custom meals change

  return <PhotoContext.Provider value={photos}>{children}</PhotoContext.Provider>
}

export function useMealPhotos() {
  return useContext(PhotoContext)
}

/** Call this to clear the photo cache (e.g. from a settings button) */
export function clearPhotoCache() {
  try { localStorage.removeItem(CACHE_KEY) } catch {}
}
