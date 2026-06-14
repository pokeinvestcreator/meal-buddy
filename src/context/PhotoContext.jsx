// Lazy-loading photo context — fetches only when a meal is actually rendered
import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react'

const CACHE_KEY = 'meal_buddy_photos_v3'
const PEXELS_KEY = () => import.meta.env.VITE_PEXELS_API_KEY

const PhotoCtx = createContext({ photos: {}, requestPhoto: () => {} })
export const useMealPhotos = () => useContext(PhotoCtx)

export function PhotoProvider({ children }) {
  const [photos, setPhotos] = useState(() => {
    try { return JSON.parse(localStorage.getItem(CACHE_KEY)) || {} }
    catch { return {} }
  })

  const queue    = useRef([])          // { id, query }
  const fetching = useRef(new Set())   // IDs currently in-flight
  const timer    = useRef(null)
  const photosRef = useRef(photos)
  photosRef.current = photos

  const processNext = useCallback(async () => {
    timer.current = null
    if (!PEXELS_KEY() || queue.current.length === 0) return

    const { id, query } = queue.current.shift()
    fetching.current.add(id)

    try {
      const res = await fetch(
        `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=1&orientation=landscape`,
        { headers: { Authorization: PEXELS_KEY() } }
      )
      if (res.ok) {
        const data = await res.json()
        const url = data.photos?.[0]?.src?.medium
        if (url) {
          setPhotos(prev => {
            const next = { ...prev, [id]: url }
            try { localStorage.setItem(CACHE_KEY, JSON.stringify(next)) } catch {}
            return next
          })
        }
      }
    } catch {}

    fetching.current.delete(id)

    // Rate-limit: 200ms between requests (~5/sec, well within Pexels free tier)
    if (queue.current.length > 0) {
      timer.current = setTimeout(processNext, 200)
    }
  }, [])

  const requestPhoto = useCallback((meal) => {
    if (!meal?.id || !meal?.photoQuery || meal?.photoUrl) return
    if (photosRef.current[meal.id]) return          // already cached
    if (fetching.current.has(meal.id)) return       // already fetching
    if (queue.current.some(q => q.id === meal.id)) return  // already queued

    queue.current.push({ id: meal.id, query: meal.photoQuery })

    if (!timer.current) {
      timer.current = setTimeout(processNext, 0)
    }
  }, [processNext])

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])

  return (
    <PhotoCtx.Provider value={{ photos, requestPhoto }}>
      {children}
    </PhotoCtx.Provider>
  )
}
