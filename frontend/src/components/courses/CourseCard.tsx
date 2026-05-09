'use client';

import { useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { gsap } from 'gsap';
import { IoPlay, IoTime, IoBookOutline, IoStar } from 'react-icons/io5';
import { ROUTES } from '@/utils/constants';
import { formatDurationText } from '@/utils/formatDuration';
import { useSound } from '@/context/SoundContext';
import { useLang } from '@/context/LangContext';
import { localizeCourseText } from '@/utils/courseTextFallback';

const CAT = {
  html:       { bg: 'bg-orange-500/10', border: 'border-orange-500/20', text: 'text-orange-400',  label: 'HTML',   glow: 'hover:shadow-orange-500/10'  },
  css:        { bg: 'bg-blue-500/10',   border: 'border-blue-500/20',   text: 'text-blue-400',    label: 'CSS',    glow: 'hover:shadow-blue-500/10'    },
  javascript: { bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', text: 'text-yellow-400',  label: 'JS',     glow: 'hover:shadow-yellow-500/10'  },
  typescript: { bg: 'bg-blue-600/10',   border: 'border-blue-600/20',   text: 'text-blue-300',    label: 'TS',     glow: 'hover:shadow-blue-600/10'    },
  react:      { bg: 'bg-cyan-500/10',   border: 'border-cyan-500/20',   text: 'text-cyan-400',    label: 'React',  glow: 'hover:shadow-cyan-500/10'    },
  redux:      { bg: 'bg-purple-500/10', border: 'border-purple-500/20', text: 'text-purple-400',  label: 'Redux',  glow: 'hover:shadow-purple-500/10'  },
  nodejs:     { bg: 'bg-green-500/10',  border: 'border-green-500/20',  text: 'text-green-400',   label: 'Node',   glow: 'hover:shadow-green-500/10'   },
  tailwind:   { bg: 'bg-teal-500/10',   border: 'border-teal-500/20',   text: 'text-teal-400',    label: 'TW',     glow: 'hover:shadow-teal-500/10'    },
  general:    { bg: 'bg-violet-500/10', border: 'border-violet-500/20', text: 'text-violet-400',  label: 'Other',  glow: 'hover:shadow-violet-500/10'  },
}

interface CourseProps {
  course: any;
  index?: number;
  className?: string;
}

export default function CourseCard({ course, index = 0, className = '' }: CourseProps) {
  const cardRef = useRef(null)
  const { playSound } = useSound()
  const { t, lang } = useLang()

  useEffect(() => {
    if (!cardRef.current) return
    gsap.fromTo(
      cardRef.current,
      { opacity: 0, y: 30 },
      { opacity: 1, y: 0, duration: 0.6, delay: Math.min(index * 0.1, 1), ease: 'power3.out' },
    )
  }, [index])

  const onEnter = () => {
    playSound('/sounds/onlyclick.wav')
    gsap.to(cardRef.current, { y: -4, boxShadow: '0 10px 40px -5px rgba(124, 58, 237, 0.2)', scale: 1.01, duration: 0.3, ease: 'power2.out' })
  }
  const onLeave = () => gsap.to(cardRef.current, { y: 0,  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', scale: 1,     duration: 0.3, ease: 'power2.out' })

  if (!course) return null

  const cat          = CAT[course.category as keyof typeof CAT] || CAT.general
  const totalSecs    = (course.videos || []).reduce((s: any, v: any) => s + (v.duration || 0), 0)
  const videoCount   = course.videos?.length ?? course.videoCount ?? 0
  const rating       = typeof course.rating === 'object' ? (course.rating?.average ?? 0) : (course.rating ?? 0)
  const ratingCount  = typeof course.rating === 'object' ? (course.rating?.count ?? 0)   : (course.ratingCount ?? 0)
  const instructorName = typeof course.instructor === 'object'
    ? (course.instructor?.firstName ? `${course.instructor.firstName} ${course.instructor.lastName || ''}` : course.instructor?.username) 
    : course.instructor
    
  const isNew = course.createdAt
    ? Date.now() - new Date(course.createdAt).getTime() < 14 * 24 * 60 * 60 * 1000
    : false
  const localizedCourse = localizeCourseText(lang, course.title, course.description)

  return (
    <Link
      href={ROUTES.COURSE(course._id)}
      ref={cardRef}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      className={
        'group block overflow-hidden rounded-[2rem] border border-white/8 bg-[#11141b] ' +
        'transition-all duration-500 ' +
        cat.glow + ' ' + className
      }
    >
      {/* Thumbnail */}
      <div className="relative aspect-video bg-[#0f1115] overflow-hidden">
        {course.thumbnail ? (
          <Image
            src={course.thumbnail}
            alt={localizedCourse.title}
            fill
            className="object-cover group-hover:scale-110 transition-transform duration-700"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 33vw, 25vw"
          />
        ) : (
          <div className={'w-full h-full flex items-center justify-center ' + cat.bg}>
            <span className={'text-4xl font-black tracking-tighter opacity-40 ' + cat.text}>
              {cat.label}
            </span>
          </div>
        )}

        {/* Overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#11141b] via-[#11141b]/20 to-transparent opacity-90" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(86,98,246,0.18),transparent_40%)] opacity-80" />

        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500">
           <div className="scale-50 rounded-full border border-white/15 bg-white/10 p-3 backdrop-blur-md transition-transform duration-500 group-hover:scale-100">
             <IoPlay className="text-white text-xl translate-x-0.5" />
           </div>
        </div>

        {/* Badges */}
        <div className="absolute left-2.5 top-2.5 flex gap-2 sm:left-4 sm:top-4">
          {isNew && (
            <span className="rounded-full bg-emerald-500/90 px-2 py-0.5 text-[9px] font-bold text-white shadow-lg shadow-emerald-500/20 backdrop-blur-md sm:px-2.5 sm:py-1 sm:text-[10px]">
              {t('courses.newBadge')}
            </span>
          )}
        </div>

        <div className={'absolute right-2.5 top-2.5 rounded-full border px-2 py-0.5 text-[9px] font-bold backdrop-blur-md sm:right-4 sm:top-4 sm:px-3 sm:py-1 sm:text-[10px] ' + cat.bg + ' ' + cat.text + ' ' + cat.border}>
          {t(`cat.${course.category}`) || cat.label}
        </div>
      </div>

      {/* Body */}
      <div className="flex h-auto flex-col justify-between p-4 sm:p-5 md:p-6">
        <div className="space-y-2.5 sm:space-y-3">
          <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-medium tracking-wide text-white/30 sm:gap-2">
            <span className="flex items-center gap-1 rounded-full border border-white/8 bg-white/5 px-2 py-0.5 sm:gap-1.5 sm:px-2.5 sm:py-1">
              <IoBookOutline className="text-[10px] sm:text-xs" />
              {videoCount} {t('courses.lessons')}
            </span>
            {totalSecs > 0 && (
              <span className="flex items-center gap-1 rounded-full border border-white/8 bg-white/5 px-2 py-0.5 sm:gap-1.5 sm:px-2.5 sm:py-1">
                <IoTime className="text-[10px] sm:text-xs" />
                {formatDurationText(totalSecs)}
              </span>
            )}
          </div>

          <h3 className="line-clamp-2 text-sm font-semibold leading-snug tracking-[-0.03em] text-white transition-colors duration-300 group-hover:text-indigo-300 sm:text-base md:text-lg">
            {localizedCourse.title}
          </h3>

          <div className="group/author flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-full border border-indigo-500/20 bg-indigo-600/20 text-[10px] font-bold text-indigo-300 transition-colors group-hover/author:bg-indigo-600/30 sm:h-7 sm:w-7">
              {instructorName?.[0]?.toUpperCase() || 'A'}
            </div>
            <span className="truncate text-[11px] text-white/45 transition-colors group-hover/author:text-white/70 sm:text-xs">
              {instructorName || 'Aidevix Mentor'}
            </span>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-white/8 pt-3 sm:mt-6 sm:pt-5">
          <div className="flex items-center gap-1.5">
            <div className="flex text-yellow-500">
              <IoStar className="text-xs" />
            </div>
            <span className="text-xs font-bold text-white/80 sm:text-sm">
              {rating > 0 ? Number(rating).toFixed(1) : '—'}
            </span>
            {ratingCount > 0 && (
              <span className="text-[10px] font-medium text-white/20 sm:text-xs">({ratingCount})</span>
            )}
          </div>

          <span className="flex items-center gap-1 text-[11px] font-semibold text-indigo-300 sm:text-xs">
            <IoPlay className="text-[10px] sm:text-xs" />
            {t('courses.view')}
          </span>
        </div>
      </div>
    </Link>
  )
}
