'use client';

import { useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { gsap } from 'gsap';
import { IoTime, IoBookOutline, IoStar } from 'react-icons/io5';
import { ROUTES } from '@/utils/constants';
import { formatDurationText } from '@/utils/formatDuration';
import { useSound } from '@/context/SoundContext';
import { useLang } from '@/context/LangContext';
import { localizeCourseText } from '@/utils/courseTextFallback';
import DynamicSVG from './DynamicSVG';

const CAT = {
  html:       { bg: 'bg-orange-500/10', border: 'border-orange-500/20', text: 'text-orange-400',  label: 'HTML',   glow: 'hover:shadow-orange-500/10', hex: '#fb923c' },
  css:        { bg: 'bg-blue-500/10',   border: 'border-blue-500/20',   text: 'text-blue-400',    label: 'CSS',    glow: 'hover:shadow-blue-500/10', hex: '#60a5fa' },
  javascript: { bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', text: 'text-yellow-400',  label: 'JS',     glow: 'hover:shadow-yellow-500/10', hex: '#facc15' },
  typescript: { bg: 'bg-blue-600/10',   border: 'border-blue-600/20',   text: 'text-blue-300',    label: 'TS',     glow: 'hover:shadow-blue-600/10', hex: '#93c5fd' },
  react:      { bg: 'bg-cyan-500/10',   border: 'border-cyan-500/20',   text: 'text-cyan-400',    label: 'React',  glow: 'hover:shadow-cyan-500/10', hex: '#22d3ee' },
  redux:      { bg: 'bg-purple-500/10', border: 'border-purple-500/20', text: 'text-purple-400',  label: 'Redux',  glow: 'hover:shadow-purple-500/10', hex: '#c084fc' },
  nodejs:     { bg: 'bg-green-500/10',  border: 'border-green-500/20',  text: 'text-green-400',   label: 'Node',   glow: 'hover:shadow-green-500/10', hex: '#4ade80' },
  tailwind:   { bg: 'bg-teal-500/10',   border: 'border-teal-500/20',   text: 'text-teal-400',    label: 'TW',     glow: 'hover:shadow-teal-500/10', hex: '#2dd4bf' },
  ai:         { bg: 'bg-amber-500/10',  border: 'border-amber-500/20',  text: 'text-amber-500',   label: 'AI & Agentlar', glow: 'hover:shadow-amber-500/10', hex: '#f59e0b' },
  general:    { bg: 'bg-violet-500/10', border: 'border-violet-500/20', text: 'text-violet-400',  label: 'Other',  glow: 'hover:shadow-violet-500/10', hex: '#a78bfa' },
}

const glowColors = {
  html:       'rgba(249, 115, 22, 0.2)',
  css:        'rgba(59, 130, 246, 0.2)',
  javascript: 'rgba(234, 179, 8, 0.2)',
  typescript: 'rgba(37, 99, 235, 0.2)',
  react:      'rgba(6, 182, 212, 0.2)',
  redux:      'rgba(168, 85, 247, 0.2)',
  nodejs:     'rgba(34, 197, 94, 0.2)',
  tailwind:   'rgba(20, 184, 166, 0.2)',
  ai:         'rgba(245, 158, 11, 0.2)',
  general:    'rgba(139, 92, 246, 0.2)',
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
    const glowColor = glowColors[course.category as keyof typeof glowColors] || glowColors.general
    gsap.to(cardRef.current, {
      y: -8,
      scale: 1.02,
      boxShadow: `0 20px 40px -10px ${glowColor}`,
      duration: 0.3,
      ease: 'power2.out',
      overwrite: 'auto'
    })
  }

  const onLeave = () => {
    if (!cardRef.current) return
    gsap.to(cardRef.current, {
      y: 0,
      scale: 1,
      boxShadow: '0 10px 30px -10px rgba(0, 0, 0, 0.5)',
      duration: 0.3,
      ease: 'power2.out',
      overwrite: 'auto'
    })
  }

  if (!course) return null

  const cat          = CAT[course.category as keyof typeof CAT] || CAT.general
  const videoCount   = course.videos?.length ?? course.videoCount ?? 0
  const rating       = typeof course.rating === 'object' ? (course.rating?.average ?? 0) : (course.rating ?? 0)
  const ratingCount  = typeof course.rating === 'object' ? (course.rating?.count ?? 0)   : (course.ratingCount ?? 0)
  const instructorName = typeof course.instructor === 'object'
    ? (course.instructor?.firstName ? `${course.instructor.firstName} ${course.instructor.lastName || ''}` : course.instructor?.username) 
    : course.instructor
    
  const localizedCourse = localizeCourseText(lang, course.title, course.description)

  return (
    <Link
      href={ROUTES.COURSE(course.slug || course._id)}
      ref={cardRef}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      className={
        'group block overflow-hidden rounded-none bg-[#11141b] shadow-[0_10px_30px_-10px_rgba(0,0,0,0.5)] ' +
        'transition-all duration-500 ' +
        cat.glow + ' ' + className
      }
    >
      {/* Thumbnail */}
      <div className="relative aspect-video overflow-hidden" style={{ backgroundColor: 'var(--course-thumbnail-bg, #0f1115)' }}>
        {course.thumbnail ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative w-32 h-32 sm:w-36 sm:h-36 rounded-none overflow-hidden shadow-2xl p-4 sm:p-5 flex items-center justify-center bg-white dark:bg-[#11141b]">
              <div className="relative w-full h-full">
                <DynamicSVG
                  src={course.thumbnail}
                  alt={localizedCourse.title}
                  className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-700"
                />
              </div>
            </div>
          </div>
        ) : (
          <div className={'w-full h-full flex items-center justify-center ' + cat.bg}>
            <span className={'text-4xl font-black tracking-tighter opacity-40 ' + cat.text}>
              {cat.label}
            </span>
          </div>
        )}

        {/* Overlays */}
        <div className="absolute inset-0 opacity-95 transition-all duration-500" style={{ background: 'var(--course-thumbnail-gradient)' }} />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(86,98,246,0.12),transparent_45%)] opacity-80" />




        <div className={'absolute right-2.5 top-2.5 rounded-none border px-2 py-0.5 text-[9px] font-bold backdrop-blur-md sm:right-4 sm:top-4 sm:px-3 sm:py-1 sm:text-[10px] ' + cat.bg + ' ' + cat.text + ' ' + cat.border}>
          {(t(`cat.${course.category}`) || cat.label || '').toUpperCase()}
        </div>
      </div>

      {/* Body */}
      <div className="flex h-auto flex-col justify-between p-4 sm:p-5 md:p-6">
        <div className="space-y-3">
          {/* Lessons badge (top of body) */}
          <div className="flex items-center gap-1.5 text-[10px] font-medium tracking-wide text-white/40">
            <span className="flex items-center gap-1.5 rounded-none border border-white/8 bg-white/5 px-2.5 py-1">
              <IoBookOutline className="text-platinum-400 text-xs" />
              {videoCount} {t('courses.lessons')}
            </span>
          </div>

          {/* Title */}
          <h3 
            style={{
              backgroundImage: `linear-gradient(to right, ${cat.hex} 50%, var(--course-title-fallback, #ffffff) 50%)`,
              backgroundSize: '200% 100%',
              backgroundPosition: 'right bottom',
            }}
            className="line-clamp-2 text-sm font-semibold leading-snug tracking-[-0.03em] bg-clip-text text-transparent group-hover:bg-left transition-[background-position] duration-500 ease-out sm:text-base md:text-lg"
          >
            {localizedCourse.title}
          </h3>

          {/* Rating Row */}
          <div className="flex items-center justify-between text-xs sm:text-sm pt-2">
            <span className="text-white/40 font-medium">
              {t('courses.rating')} ({ratingCount})
            </span>
            <span className="text-platinum-400 font-bold flex items-center gap-1">
              {rating > 0 ? Number(rating).toFixed(1) : '0.0'} ★
            </span>
          </div>

          {/* Orange Divider */}
          <div className="relative h-[3px] w-full bg-white/10 rounded-none my-3 overflow-hidden">
            <div 
              style={{ backgroundColor: cat.hex }} 
              className="absolute inset-y-0 left-0 w-full origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-500 ease-out" 
            />
          </div>

          {/* Bottom Row: Instructor & Action button */}
          <div className="flex items-center justify-between pt-1">
            {/* Instructor */}
            <div className="group/author flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-none border border-platinum-800 bg-[#15181e] text-[10px] font-bold text-platinum-400 transition-colors group-hover/author:bg-platinum-800/20 sm:h-7 sm:w-7">
                {instructorName?.[0]?.toUpperCase() || 'A'}
              </div>
              <div className="flex flex-col">
                <span className="truncate text-[11px] font-semibold text-white transition-colors group-hover/author:text-white/70 sm:text-xs">
                  {instructorName || 'aidevix_admin'}
                </span>
                <span className="text-[9px] text-white/30 sm:text-[10px]">
                  Mentor
                </span>
              </div>
            </div>

            {/* Ko'rish button */}
            <span className="flex items-center gap-1 text-[11px] font-bold text-platinum-400 sm:text-xs hover:text-platinum-300 transition-colors">
              Ko'rish <span className="text-[10px] sm:text-xs">▸</span>
            </span>
          </div>
        </div>
      </div>
    </Link>
  )
}
