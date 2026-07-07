import { useState } from 'react'
import { IoStar, IoStarOutline, IoStarHalf } from 'react-icons/io5'
import clsx from 'clsx'

/**
 * Star Rating component
 * Props:
 *   value    {number}   - current average rating (0-5)
 *   count    {number}   - total ratings count
 *   editable {boolean}  - allow user to rate
 *   onRate   {function} - callback(rating: number)
 *   size     {sm|md|lg}
 */
export default function StarRating({ value = 0, count = 0, editable = false, onRate, size = 'md' }) {
  const [hovered, setHovered] = useState(0)

  const sizes = { sm: 'text-sm', md: 'text-xl', lg: 'text-2xl' }

  const renderStar = (index) => {
    const filled = hovered ? index <= hovered : index <= Math.floor(value)
    const half   = !hovered && index === Math.ceil(value) && value % 1 >= 0.5

    const star = half
      ? <IoStarHalf />
      : filled ? <IoStar /> : <IoStarOutline />

    return (
      <button
        key={index}
        type="button"
        disabled={!editable}
        onMouseEnter={() => editable && setHovered(index)}
        onMouseLeave={() => editable && setHovered(0)}
        onClick={() => editable && onRate?.(index)}
        className={clsx(
          'transition-all duration-150',
          sizes[size],
          filled || half ? 'text-yellow-400' : 'text-slate-600',
          editable && 'cursor-pointer hover:scale-110',
          !editable && 'cursor-default',
          editable && index <= hovered && 'text-yellow-300',
        )}
      >
        {star}
      </button>
    )
  }

  return (
    <div className="flex items-center gap-1">
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map(renderStar)}
      </div>
      {count > 0 && (
        <span className="text-xs text-slate-400 ml-1">
          {value.toFixed(1)} ({count})
        </span>
      )}
    </div>
  )
}
