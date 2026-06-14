import { useState } from 'react'
import { useMealPhotos } from '../context/PhotoContext'

/**
 * Renders a meal photo if available, otherwise falls back to the meal's emoji.
 *
 * Sizes:
 *   'xs'   — 40×40px  rounded-lg   (list items, step 4 summary)
 *   'sm'   — 48×48px  rounded-xl   (compact cards)
 *   'md'   — 64×64px  rounded-xl   (standard meal cards)
 *   'lg'   — 80×80px  rounded-2xl  (large cards, plan browser)
 *   'hero' — full width × 200px    (RecipeModal top)
 */
export default function MealImage({ meal, size = 'md', className = '' }) {
  const photos = useMealPhotos()
  const photoUrl = photos[meal?.id]
  const [error, setError] = useState(false)

  const show = photoUrl && !error

  // Size → CSS classes
  const dims = {
    xs:   { wrap: 'w-10 h-10',     radius: 'rounded-lg',  emoji: 'text-2xl' },
    sm:   { wrap: 'w-12 h-12',     radius: 'rounded-xl',  emoji: 'text-2xl' },
    md:   { wrap: 'w-16 h-16',     radius: 'rounded-xl',  emoji: 'text-3xl' },
    lg:   { wrap: 'w-20 h-20',     radius: 'rounded-2xl', emoji: 'text-4xl' },
    hero: { wrap: 'w-full h-52',   radius: 'rounded-2xl', emoji: 'text-7xl' },
  }
  const d = dims[size] || dims.md

  if (show) {
    return (
      <img
        src={photoUrl}
        alt={meal.name}
        className={`${d.wrap} ${d.radius} object-cover flex-shrink-0 ${className}`}
        onError={() => setError(true)}
      />
    )
  }

  if (size === 'hero') {
    // Hero emoji fallback — centered in a styled box
    return (
      <div className={`${d.wrap} ${d.radius} flex items-center justify-center bg-stone-100 flex-shrink-0 ${className}`}>
        <span className={d.emoji}>{meal?.emoji}</span>
      </div>
    )
  }

  return (
    <span className={`${d.emoji} leading-none flex-shrink-0 ${className}`}>
      {meal?.emoji}
    </span>
  )
}
