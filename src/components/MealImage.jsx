import { useEffect, useRef } from 'react'
import { useMealPhotos } from '../context/PhotoContext'

const SIZES = {
  xs:   'w-10 h-10 text-lg',
  sm:   'w-14 h-14 text-xl',
  md:   'w-16 h-16 text-2xl',
  lg:   'w-20 h-20 text-3xl',
  hero: 'w-full h-full text-4xl',
}

export default function MealImage({ meal, size = 'md', className = '' }) {
  const { photos, requestPhoto } = useMealPhotos()
  const ref = useRef(null)

  useEffect(() => {
    // Only fetch when meal card scrolls into view (IntersectionObserver)
    // This prevents all 200 photos from being requested at once
    if (!ref.current || meal?.photoUrl) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          requestPhoto(meal)
          observer.disconnect()
        }
      },
      { threshold: 0.1 }
    )

    observer.observe(ref.current)
    return () => observer.disconnect()
  }, [meal?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const photoUrl = meal?.photoUrl || photos[meal?.id]
  const sizeClass = SIZES[size] || SIZES.md

  return (
    <div ref={ref} className={`${sizeClass} ${className} flex-shrink-0 overflow-hidden rounded-xl bg-stone-100 dark:bg-stone-800`}>
      {photoUrl ? (
        <img
          src={photoUrl}
          alt={meal?.name || ''}
          loading="lazy"
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <span>{meal?.emoji || '🍽️'}</span>
        </div>
      )}
    </div>
  )
}
