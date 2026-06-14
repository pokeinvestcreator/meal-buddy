import { useEffect } from 'react'
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

  // Trigger a fetch the first time this meal is rendered
  useEffect(() => {
    requestPhoto(meal)
  }, [meal?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const photoUrl = meal?.photoUrl || photos[meal?.id]
  const sizeClass = SIZES[size] || SIZES.md

  if (!photoUrl) {
    return (
      <div className={`${sizeClass} ${className} bg-stone-100 dark:bg-stone-800 rounded-xl flex items-center justify-center flex-shrink-0`}>
        <span>{meal?.emoji || '🍽️'}</span>
      </div>
    )
  }

  return (
    <img
      src={photoUrl}
      alt={meal?.name || ''}
      loading="lazy"
      className={`${sizeClass} ${className} object-cover rounded-xl flex-shrink-0`}
    />
  )
}
