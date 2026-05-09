import { useState, useEffect, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { setFilter, selectFilters } from '@store/slices/courseSlice'
import { CATEGORIES, SORT_OPTIONS } from '@utils/constants'
import { useSound } from '@/context/SoundContext'
import { useLang } from '@/context/LangContext'
import { IoStar } from 'react-icons/io5'

export default function CourseFilter() {
  const { t } = useLang()
  const dispatch = useDispatch()
  const [expanded, setExpanded] = useState(false)
  const filters  = useSelector(selectFilters)

  const LEVELS = [
    { id: 'all',          label: t('filter.all') },
    { id: 'beginner',     label: t('filter.beginner') },
    { id: 'intermediate', label: t('filter.intermediate') },
    { id: 'advanced',     label: t('filter.advanced') },
  ]

  const RATINGS = [
    { value: 0,   label: t('filter.all') },
    { value: 4.5, label: '4.5+' },
    { value: 4.0, label: '4.0+' },
    { value: 3.5, label: '3.5+' },
  ]

  const COLLAPSED_COUNT = 4
  const displayedCategories = expanded ? CATEGORIES : CATEGORIES.slice(0, COLLAPSED_COUNT)
  const hasMore = CATEGORIES.length > COLLAPSED_COUNT

  const { playSound } = useSound()

  const playHoverSound = () => {
    playSound('/sounds/onlyclick.wav')
  }

  return (
    <div className="space-y-4">
      {/* Category Grid */}
      <div className="grid grid-cols-2 gap-2 min-[420px]:grid-cols-3 sm:grid-cols-4 lg:grid-cols-5">
        {displayedCategories.map((cat) => {
          const active = filters.category === cat.id
          return (
            <button
              key={cat.id}
              onMouseEnter={playHoverSound}
              onClick={() => dispatch(setFilter({ category: cat.id }))}
              className={
                'w-full rounded-xl px-3 py-2.5 text-center text-xs font-semibold transition-all duration-300 sm:text-sm ' +
                (active
                  ? 'scale-[1.02] bg-indigo-500 text-white shadow-[0_8px_25px_rgba(99,102,241,0.3)]'
                  : 'border border-base-content/5 bg-base-200/50 text-base-content/60 hover:scale-[1.01] hover:bg-base-300 hover:text-base-content')
              }
            >
              {t(`cat.${cat.id}`, cat.label)}
            </button>
          )
        })}

        {hasMore && (
          <button
            onClick={() => setExpanded(!expanded)}
            onMouseEnter={playHoverSound}
            className="w-full rounded-xl border border-dashed border-primary/30 bg-base-200/80 px-3 py-2.5 text-center text-xs font-bold text-primary transition-all duration-300 hover:border-primary/50 hover:bg-primary/10 sm:text-sm"
          >
            {expanded ? t('filter.collapse') : t('filter.expand')}
          </button>
        )}
      </div>

      {/* Level + Rating + Sort — stacked on mobile, inline on tablet+ */}
      <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center">
        {/* Level filter */}
        <div className="flex min-w-0 items-center gap-2 overflow-x-auto no-scrollbar">
          <span className="shrink-0 whitespace-nowrap text-xs text-base-content/40">{t('filter.level')}</span>
          <div className="flex gap-1">
            {LEVELS.map((lvl) => {
              const active = (filters.level || 'all') === lvl.id
              return (
                <button
                  key={lvl.id}
                  onMouseEnter={playHoverSound}
                  onClick={() => dispatch(setFilter({ level: lvl.id === 'all' ? undefined : lvl.id }))}
                  className={
                    'shrink-0 rounded-lg px-2.5 py-1 text-xs font-medium transition-all duration-200 ' +
                    (active
                      ? 'border border-primary/30 bg-primary/15 text-primary'
                      : 'border border-base-content/8 bg-base-200 text-base-content/45 hover:bg-base-300')
                  }
                >
                  {lvl.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Rating filter */}
        <div className="flex min-w-0 items-center gap-2 overflow-x-auto no-scrollbar">
          <span className="shrink-0 whitespace-nowrap text-xs text-base-content/40">{t('filter.rating')}</span>
          <div className="flex gap-1">
            {RATINGS.map((r) => {
              const active = (filters.minRating || 0) === r.value
              return (
                <button
                  key={r.value}
                  onMouseEnter={playHoverSound}
                  onClick={() => dispatch(setFilter({ minRating: r.value || undefined }))}
                  className={
                    'flex shrink-0 items-center gap-0.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-all duration-200 ' +
                    (active
                      ? 'border border-yellow-500/30 bg-yellow-500/15 text-yellow-400'
                      : 'border border-base-content/8 bg-base-200 text-base-content/45 hover:bg-base-300')
                  }
                >
                  {r.value > 0 && <IoStar className="text-[10px] text-yellow-400" />}
                  {r.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Sort */}
        <div className="flex items-center gap-2 md:ml-auto">
          <span className="shrink-0 whitespace-nowrap text-xs text-base-content/40">{t('filter.sort')}</span>
          <select
            value={filters.sort || 'newest'}
            onChange={(e) => dispatch(setFilter({ sort: e.target.value }))}
            className="select select-xs sm:select-sm w-full max-w-[220px] rounded-xl border-base-content/10 bg-base-200 text-xs sm:text-sm md:w-auto"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{t(`sort.${opt.value}`, opt.label)}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  )
}

