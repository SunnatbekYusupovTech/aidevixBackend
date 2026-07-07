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
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const filters  = useSelector(selectFilters)
  const dropdownRef = useRef<HTMLDivElement>(null)

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

  // Click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

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
                  ? 'scale-[1.02] bg-primary-500 text-white shadow-[0_8px_25px_rgba(99,102,241,0.35)]'
                  : 'border border-base-content/10 bg-base-200 text-base-content/70 hover:scale-[1.01] hover:bg-base-300 hover:text-base-content')
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
            className="w-full rounded-xl border border-dashed border-primary-500/30 bg-base-200/50 px-3 py-2.5 text-center text-xs font-bold text-primary-400 transition-all duration-300 hover:border-primary-500/60 hover:bg-primary-500/10 sm:text-sm"
          >
            {expanded ? t('filter.collapse') : t('filter.expand')}
          </button>
        )}
      </div>

      {/* Level + Rating + Sort — stacked on mobile, inline on tablet+ */}
      <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center relative z-20">
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
                      ? 'border border-primary-500/30 bg-primary-500/15 text-primary-400'
                      : 'border border-base-content/10 bg-base-200 text-base-content/60 hover:bg-base-300')
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
                      ? 'border border-primary-500/30 bg-primary-500/15 text-primary-400'
                      : 'border border-base-content/10 bg-base-200 text-base-content/60 hover:bg-base-300')
                  }
                >
                  {r.value > 0 && <IoStar className={`text-[10px] ${active ? 'text-primary-400' : 'text-base-content/40'}`} />}
                  {r.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Sort custom dropdown */}
        <div className="flex items-center gap-2 md:ml-auto relative z-30 animate-fade-in-up" ref={dropdownRef}>
          <span className="shrink-0 whitespace-nowrap text-xs text-base-content/40">{t('filter.sort')}</span>
          <div className="relative w-full min-w-[160px] sm:min-w-[180px] max-w-[220px]">
            <button
              onClick={() => {
                playHoverSound()
                setDropdownOpen(!dropdownOpen)
              }}
              type="button"
              className="flex w-full items-center justify-between rounded-xl border border-base-content/10 bg-base-200 px-3.5 py-2 text-left text-xs font-semibold text-base-content/80 transition-all duration-300 hover:border-primary-500/40 hover:bg-base-300 sm:text-sm"
            >
              <span>{t(`sort.${filters.sort || 'newest'}`, SORT_OPTIONS.find(o => o.value === (filters.sort || 'newest'))?.label)}</span>
              <svg
                className={`h-4 w-4 text-base-content/40 transition-transform duration-300 ${dropdownOpen ? 'rotate-180 text-primary-400' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 z-50 mt-1.5 w-full origin-top-right rounded-xl border border-primary-500/20 bg-base-200 p-1.5 shadow-[0_10px_30px_rgba(0,0,0,0.15)] focus:outline-none">
                <div className="space-y-1">
                  {SORT_OPTIONS.map((opt) => {
                    const active = (filters.sort || 'newest') === opt.value
                    return (
                      <button
                        key={opt.value}
                        onClick={() => {
                          playHoverSound()
                          dispatch(setFilter({ sort: opt.value }))
                          setDropdownOpen(false)
                        }}
                        className={`flex w-full items-center rounded-lg px-3 py-2 text-left text-xs font-medium transition-all duration-200 sm:text-sm ${
                          active
                            ? 'bg-primary-500 text-white font-bold'
                            : 'text-base-content/70 hover:bg-primary-500/10 hover:text-primary-400'
                        }`}
                      >
                        {t(`sort.${opt.value}`, opt.label)}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

