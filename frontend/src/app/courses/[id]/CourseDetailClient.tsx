'use client';

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import {
  IoChevronForward, IoStar, IoPeople, IoTime, IoBookOutline,
  IoTrophy, IoBarChart, IoCalendar, IoLanguage, IoChevronDown,
  IoChevronUp, IoPlay, IoLockClosed, IoCheckmarkCircle,
  IoCodeSlash, IoRocket, IoFlash,
} from 'react-icons/io5'
import dynamic from 'next/dynamic'
import DynamicSVG from '@components/courses/DynamicSVG'

const RecommendedCarousel = dynamic(
  () => import('@components/courses/RecommendedCarousel'),
  { ssr: false, loading: () => <div className="h-40 rounded-lg bg-slate-900/30" /> }
)

import { useSelector } from 'react-redux'
import { selectIsLoggedIn } from '@store/slices/authSlice'
import { selectInstagramSub, selectTelegramSub } from '@store/slices/subscriptionSlice'
import { useCourse, useCourses } from '@hooks/useCourses'
import { useVideos } from '@hooks/useVideos'
import { useSubscription } from '@hooks/useSubscription'
import StarRating from '@components/common/StarRating'
import CourseCard from '@components/courses/CourseCard'
import SubscriptionGate from '@components/subscription/SubscriptionGate'
import CourseCheckoutModal from '@components/courses/CourseCheckoutModal'
import { formatDurationText, formatDuration } from '@utils/formatDuration'
import { ROUTES } from '@utils/constants'
import api from '@api/axiosInstance'
import { useLang } from '@/context/LangContext'
import { localizeCourseText } from '@/utils/courseTextFallback'

const LEVEL_COLORS = { beginner: 'badge-success', intermediate: 'badge-warning', advanced: 'badge-error' }
const CAT_TEXT = {
  html: 'text-orange-400', css: 'text-blue-400', javascript: 'text-yellow-400',
  react: 'text-cyan-400', typescript: 'text-blue-300', nodejs: 'text-green-400',
  redux: 'text-purple-400', tailwind: 'text-teal-400', general: 'text-violet-400',
}

// ── Video row ──────────────────────────────────────────────────
function VideoRow({ video, index }) {
  return (
    <Link
      href={`/videos/${video._id}`}
      className="flex items-center gap-3 px-3 py-2.5 rounded-none hover:bg-zinc-800/40 transition-colors group"
    >
      <div className="w-7 h-7 rounded-none bg-zinc-800 flex items-center justify-center flex-shrink-0 text-xs font-mono font-bold text-zinc-500 group-hover:bg-platinum-800 group-hover:text-white transition-colors">
        {String(index + 1).padStart(2, '0')}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs sm:text-sm text-white line-clamp-1 group-hover:text-platinum-300 transition-colors">{video.title}</p>
        {video.duration > 0 && (
          <p className="text-xs text-zinc-500 mt-0.5 flex items-center gap-1">
            <IoTime className="text-xs" />{formatDuration(video.duration)}
          </p>
        )}
      </div>
      <div className="flex-shrink-0">
        <IoPlay className="text-zinc-600 group-hover:text-platinum-300 text-sm transition-colors" />
      </div>
    </Link>
  )
}

// ── Accordion ─────────────────────────────────────────────────
function Accordion({ title, subtitle, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border border-zinc-800 rounded-none overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 sm:px-5 py-3.5 bg-zinc-900/60 hover:bg-zinc-900/80 transition-colors text-left"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-semibold text-sm truncate text-white">{title}</span>
          {subtitle && <span className="text-xs text-zinc-500 flex-shrink-0">{subtitle}</span>}
        </div>
        {open ? <IoChevronUp className="text-zinc-500 flex-shrink-0 ml-2" />
               : <IoChevronDown className="text-zinc-500 flex-shrink-0 ml-2" />}
      </button>
      {open && <div className="bg-slate-950/20 p-2">{children}</div>}
    </div>
  )
}

// ── Stat row ──────────────────────────────────────────────────
function StatRow({ icon, label, value }) {
  return (
    <div className="flex items-center justify-between text-sm py-1">
      <span className="flex items-center gap-2 text-zinc-400 font-mono">{icon}{label}</span>
      <span className="font-semibold text-white text-right font-mono">{value}</span>
    </div>
  )
}

// ── Skeleton ──────────────────────────────────────────────────
function Skeleton() {
  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-8 animate-pulse">
      <div className="h-3 bg-zinc-900 rounded-none w-48 mb-6" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex gap-2"><div className="h-5 bg-zinc-900 rounded-none w-16" /><div className="h-5 bg-zinc-900 rounded-none w-20" /></div>
          <div className="h-8 bg-zinc-900 rounded-none w-3/4" />
          <div className="h-4 bg-zinc-900 rounded-none w-full" />
          <div className="h-4 bg-zinc-900 rounded-none w-4/5" />
          <div className="h-14 bg-zinc-900 rounded-none mt-2" />
        </div>
        <div className="h-80 bg-zinc-900 rounded-none" />
      </div>
    </div>
  )
}

// ── Props ──────────────────────────────────────────────────────
interface CourseDetailClientProps {
  id: string;
  // SEO-001: SSR'dan kelgan kurs ma'lumoti — h1/description render uchun
  initialCourse?: any;
}

// ── Main ──────────────────────────────────────────────────────
export default function CourseDetailClient({ id, initialCourse }: CourseDetailClientProps) {
  const { t, lang } = useLang()
  const localText = {
    home: lang === 'en' ? 'Home' : lang === 'ru' ? 'Главная' : 'Bosh sahifa',
    courses: lang === 'en' ? 'Courses' : lang === 'ru' ? 'Курсы' : 'Kurslar',
    students: lang === 'en' ? 'students' : lang === 'ru' ? 'студентов' : "o'quvchi",
    instructor: lang === 'en' ? 'Instructor' : lang === 'ru' ? 'Инструктор' : 'Instruktor',
    whatYouLearn: lang === 'en' ? 'What will you learn?' : lang === 'ru' ? 'Что вы изучите?' : "Nima o'rganasiz?",
    courseProgram: lang === 'en' ? 'Course Program' : lang === 'ru' ? 'Программа курса' : 'Kurs Dasturi',
    lessonsSuffix: lang === 'en' ? 'lessons' : lang === 'ru' ? 'уроков' : 'dars',
    allLessons: lang === 'en' ? 'All lessons' : lang === 'ru' ? 'Все уроки' : 'Barcha darslar',
    lessonsNotAdded: lang === 'en' ? 'Lessons have not been added yet' : lang === 'ru' ? 'Уроки пока не добавлены' : "Darslar hali qo'shilmagan",
    practicalProjects: lang === 'en' ? 'Practical Projects' : lang === 'ru' ? 'Практические проекты' : 'Amaliy Loyihalar',
    recommendedCourses: lang === 'en' ? 'Recommended courses' : lang === 'ru' ? 'Рекомендуемые курсы' : 'Tavsiya etilgan kurslar',
    subscribedTitle: lang === 'en' ? 'You are subscribed!' : lang === 'ru' ? 'Вы подписаны!' : "Siz obuna bo'lgansiz!",
    subscribedDesc:
      lang === 'en'
        ? 'All subscriptions are verified. You can now watch videos.'
        : lang === 'ru'
          ? 'Все подписки подтверждены. Теперь вы можете смотреть видео.'
          : "Barcha obunalar tasdiqlangan. Videolarni ko'rishingiz mumkin.",
    watchVideo: lang === 'en' ? 'Watch video' : lang === 'ru' ? 'Смотреть видео' : "Video ko'rish",
    close: lang === 'en' ? 'Close' : lang === 'ru' ? 'Закрыть' : 'Yopish',
    watchOrSubscribe: lang === 'en' ? 'Subscribe to watch' : lang === 'ru' ? 'Подписаться и smotret\'' : "Obuna bo'lish va ko'rish",
    lessonsLabel: lang === 'en' ? 'Lessons' : lang === 'ru' ? 'Уроки' : 'Darslar',
    totalTime: lang === 'en' ? 'Total time' : lang === 'ru' ? 'Общее время' : 'Umumiy vaqt',
    rating: lang === 'en' ? 'Rating' : lang === 'ru' ? 'Рейтинг' : 'Reyting',
    learners: lang === 'en' ? 'Learners' : lang === 'ru' ? 'Ученики' : "O'quvchilar",
    projects: lang === 'en' ? 'Projects' : lang === 'ru' ? 'Проекты' : 'Loyihalar',
    buyCourse: lang === 'en' ? 'Buy course' : lang === 'ru' ? 'Купить курс' : 'Kursni sotib olish',
    dateLocale: lang === 'en' ? 'en-US' : lang === 'ru' ? 'ru-RU' : 'uz-UZ',
  }

  const { course: reduxCourse, loading }                = useCourse(id)
  const { courseVideos, loading: vLoad, fetchByCourse } = useVideos()
  const [recommended, setRecommended]                   = useState([])
  const [projects, setProjects]                         = useState([])

  // Serverdan obuna holatini avtomatik yuklash
  useSubscription()

  useEffect(() => {
    if (!id) return
    fetchByCourse(id)
    api.get(`/courses/${id}/recommended?limit=4`).then(r => setRecommended(r.data?.data?.courses || [])).catch(() => {})
    api.get(`/projects/course/${id}`).then(r => setProjects(r.data?.data?.projects || [])).catch(() => {})
  }, [id])

  const [isMounted, setIsMounted] = useState(false)
  useEffect(() => {
    setIsMounted(true)
  }, [])

  const isLoggedIn     = useSelector(selectIsLoggedIn)
  const instagram      = useSelector(selectInstagramSub)
  const telegram       = useSelector(selectTelegramSub)
  const isSubscribed   = !!(isLoggedIn && instagram?.subscribed && telegram?.subscribed)
  const [showGate, setShowGate] = useState(false)
  const [showSubscribedModal, setShowSubscribedModal] = useState(false)
  const [showCheckout, setShowCheckout] = useState(false)

  // SEO-001: SSR'dan kelgan initialCourse — h1/description initial HTML'da bo'lishi uchun.
  // Redux yuklanguncha initialCourse ishlatiladi; undan keyin reduxCourse ustuvorlik oladi.
  const course = reduxCourse || initialCourse || null

  // Ma'lumot umuman yo'q (initialCourse ham kelmaganda) — skeleton ko'rsat
  if (!course && (!isMounted || loading)) return <Skeleton />
  if (!course)  return null

  const levelLabels = {
    beginner: t('filter.beginner'),
    intermediate: t('filter.intermediate'),
    advanced: t('filter.advanced'),
  } as Record<string, string>

  const rating         = typeof course.rating === 'object' ? (course.rating?.average ?? 0) : (course.rating ?? 0)
  const ratingCount    = typeof course.rating === 'object' ? (course.rating?.count ?? 0)   : (course.ratingCount ?? 0)
  const totalSecs      = courseVideos.reduce((s, v) => s + (v.duration || 0), 0)
  const level          = course.level || 'beginner'
  const instructorName = typeof course.instructor === 'object' ? course.instructor?.username : course.instructor
  const instructorTitle = typeof course.instructor === 'object' ? course.instructor?.jobTitle : null
  const catColor       = CAT_TEXT[course.category] || 'text-violet-400'
  const localizedCourse = localizeCourseText(lang, course.title, course.description)

  const handleWatch = () => {
    if (isSubscribed) {
      setShowSubscribedModal(true)
    } else {
      setShowGate(true)
    }
  }

  const isPaid = !course.isFree && Number(course.price || 0) > 0
  const handleBuy = () => {
    if (!isLoggedIn) { setShowGate(true); return }
    setShowCheckout(true)
  }

  return (
    <div className="min-h-screen bg-[#101214] relative overflow-hidden text-[#e2e6e9] selection:bg-platinum-500/30">
      {/* Background ambient glows */}
      <div className="absolute inset-x-0 top-0 h-[40rem] pointer-events-none z-0">
        <div className="absolute left-[5%] top-[-10%] w-[45%] h-[30rem] rounded-full blur-[140px] opacity-[0.08] bg-platinum-600 pointer-events-none" />
        <div className="absolute right-[5%] top-[-5%] w-[45%] h-[30rem] rounded-full blur-[140px] opacity-[0.06] bg-platinum-500 pointer-events-none" />
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-10 relative z-10">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-1 text-xs text-zinc-500 mb-6 flex-wrap font-mono">
          <Link href={ROUTES.HOME} className="hover:text-white transition-colors">{localText.home}</Link>
          <IoChevronForward className="text-xs opacity-50 text-zinc-600" />
          <Link href={ROUTES.COURSES} className="hover:text-white transition-colors">{localText.courses}</Link>
          <IoChevronForward className="text-xs opacity-50 text-zinc-600" />
          <span className="text-zinc-400 line-clamp-1 max-w-[160px] sm:max-w-xs">{localizedCourse.title}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-10">
          {/* ══ LEFT ════════════════════════════════════════════ */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="lg:col-span-2 space-y-6 sm:space-y-8"
          >
            {/* Badges */}
            <div className="flex flex-wrap gap-2">
              {course.category && (
                <span className={'badge badge-outline text-xs font-bold capitalize rounded-none border-zinc-800 px-3 ' + catColor}>
                  {t(`cat.${course.category}`)}
                </span>
              )}
              <span className={'badge text-xs font-semibold rounded-none border-zinc-850 px-3 ' + (LEVEL_COLORS[level] || 'badge-ghost')}>
                {levelLabels[level] || level}
              </span>
            </div>

            {/* Title — SEO-001: h1 initialCourse bilan SSR'da ham render bo'ladi */}
            <div className="space-y-3">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-title font-extrabold text-white leading-tight">
                {localizedCourse.title}
              </h1>
              {localizedCourse.description && (
                <p className="text-zinc-400 leading-relaxed text-sm sm:text-base font-light">
                  {localizedCourse.description}
                </p>
              )}
            </div>

            {/* Meta */}
            <div className="flex flex-wrap items-center gap-3 sm:gap-4 font-mono text-zinc-500">
              <StarRating value={rating} count={ratingCount} size="sm" />
              {course.studentsCount > 0 && (
                <span className="flex items-center gap-1 text-xs sm:text-sm text-zinc-500">
                  <IoPeople className="text-platinum-400 text-sm" />
                  {course.studentsCount.toLocaleString()} {localText.students}
                </span>
              )}
              {course.updatedAt && (
                <span className="flex items-center gap-1 text-xs sm:text-sm text-zinc-500">
                  <IoCalendar className="text-platinum-400 text-sm" />
                  {new Date(course.updatedAt).toLocaleDateString(localText.dateLocale)}
                </span>
              )}
              {course.language && (
                <span className="flex items-center gap-1 text-xs sm:text-sm text-zinc-500">
                  <IoLanguage className="text-platinum-400 text-sm" />
                  {course.language}
                </span>
              )}
            </div>

            {/* Instructor */}
            {instructorName && (
              <div className="flex items-center gap-3 p-3 sm:p-4 rounded-none bg-[#16191d]/50 border border-zinc-800 backdrop-blur-md">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-none bg-platinum-900/60 border border-platinum-800 flex items-center justify-center text-white font-black text-base sm:text-lg flex-shrink-0">
                  {instructorName[0]?.toUpperCase()}
                </div>
                <div>
                  <p className="font-bold text-sm text-white">{instructorName}</p>
                  <p className="text-xs text-zinc-500 mt-0.5">{instructorTitle || t('courses.instructorFallback')}</p>
                </div>
              </div>
            )}

            {/* Price card — mobile only (shows above videos) */}
            <div className="lg:hidden">
              <MobilePriceCard
                course={course}
                courseVideos={courseVideos}
                totalSecs={totalSecs}
                level={level}
                levelDisplay={levelLabels[level] || level}
                levelFieldLabel={t('filter.level').replace(/:\s*$/, '')}
                rating={rating}
                projects={projects}
                catColor={catColor}
                isSubscribed={isSubscribed}
                onWatch={handleWatch}
                isPaid={isPaid}
                onBuy={handleBuy}
                uiText={localText}
              />
            </div>

            {/* What you'll learn */}
            {course.requirements?.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-base sm:text-lg font-bold flex items-center gap-2 text-white">
                  <IoCheckmarkCircle className="text-emerald-400" />
                  {localText.whatYouLearn}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-none bg-[#16191d]/20 border border-zinc-850">
                  {course.requirements.map((req, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs sm:text-sm text-zinc-400">
                      <IoCheckmarkCircle className="text-emerald-500 text-sm flex-shrink-0 mt-0.5" />
                      {req}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Videos */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-base sm:text-lg font-bold flex items-center gap-2 text-white">
                  <IoPlay className="text-platinum-400" />
                  {localText.courseProgram}
                </h2>
                {courseVideos.length > 0 && (
                  <span className="text-xs text-zinc-500 font-mono">
                    {courseVideos.length} {localText.lessonsSuffix}{totalSecs > 0 && ' · ' + formatDurationText(totalSecs)}
                  </span>
                )}
              </div>

              {vLoad ? (
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="h-12 bg-zinc-900 rounded-none animate-pulse" />
                  ))}
                </div>
              ) : courseVideos.length > 0 ? (
                <Accordion
                  title={localText.allLessons}
                  subtitle={`${courseVideos.length} ${localText.lessonsSuffix} · ${formatDurationText(totalSecs)}`}
                  defaultOpen
                >
                  <div className="space-y-0.5">
                    {courseVideos.map((v, i) => <VideoRow key={v._id} video={v} index={i} />)}
                  </div>
                </Accordion>
              ) : (
                <div className="py-8 text-center text-sm text-zinc-500 rounded-none bg-[#16191d]/20 border border-zinc-850">
                  {localText.lessonsNotAdded}
                </div>
              )}
            </div>

            {/* Projects */}
            {projects.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-base sm:text-lg font-bold flex items-center gap-2 text-white">
                  <IoCodeSlash className="text-platinum-400" />
                  {localText.practicalProjects}
                </h2>
                <div className="space-y-3">
                  {projects.map((p) => (
                    <div key={p._id} className="p-4 rounded-none bg-[#16191d]/40 border border-zinc-800 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-semibold text-sm text-white">{p.title}</p>
                        <div className="flex gap-1 flex-shrink-0">
                          <span className={'badge badge-sm rounded-none border-zinc-850 ' + (LEVEL_COLORS[p.level] || 'badge-ghost')}>
                            {levelLabels[p.level] || p.level}
                          </span>
                          {p.xpReward > 0 && (
                            <span className="badge badge-sm rounded-none bg-yellow-500/10 text-yellow-500 border-yellow-500/20 font-mono">
                              +{p.xpReward} XP
                            </span>
                          )}
                        </div>
                      </div>
                      {p.description && <p className="text-xs text-zinc-400 line-clamp-2">{p.description}</p>}
                      {p.technologies?.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-1">
                          {p.technologies.map((tech, i) => (
                            <span key={i} className="px-2 py-0.5 rounded-none text-xs bg-[#16191d]/60 border border-zinc-850 text-zinc-400">{tech}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>

          {/* ══ RIGHT STICKY — desktop only ═════════════════════ */}
          <div className="hidden lg:block lg:sticky lg:top-24 self-start z-10">
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: "easeOut", delay: 0.1 }}
            >
              <DesktopPriceCard
                course={course}
                courseVideos={courseVideos}
                totalSecs={totalSecs}
                level={level}
                levelDisplay={levelLabels[level] || level}
                levelFieldLabel={t('filter.level').replace(/:\s*$/, '')}
                rating={rating}
                projects={projects}
                catColor={catColor}
                isSubscribed={isSubscribed}
                onWatch={handleWatch}
                isPaid={isPaid}
                onBuy={handleBuy}
                uiText={localText}
              />
            </motion.div>
          </div>
        </div>

        {/* Recommended */}
        {recommended.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="mt-12 sm:mt-16"
          >
            <h2 className="text-base sm:text-xl font-bold mb-4 sm:mb-6 flex items-center gap-2 text-white">
              <IoFlash className="text-platinum-400" />
              {localText.recommendedCourses}
            </h2>
            <RecommendedCarousel courses={recommended} />
          </motion.div>
        )}
      </div>

      <SubscriptionGate
        isOpen={showGate}
        onClose={() => setShowGate(false)}
        onSuccess={() => {
          setShowGate(false)
          setShowSubscribedModal(true)
        }}
      />

      {/* Obuna bo'lgan user uchun modal */}
      {showSubscribedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowSubscribedModal(false)}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative w-full max-w-sm mx-auto bg-base-200 rounded-2xl border border-base-content/10 p-6 text-center space-y-4"
          >
            <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center">
              <IoCheckmarkCircle className="text-emerald-400 text-3xl" />
            </div>
            <h3 className="text-lg font-bold text-base-content">{localText.subscribedTitle}</h3>
            <p className="text-sm text-base-content/50">
              {localText.subscribedDesc}
            </p>
            <div className="flex flex-col gap-2 pt-2">
              {courseVideos.length > 0 && (
                <button
                  onClick={() => window.location.href = ROUTES.VIDEO(courseVideos[0]._id)}
                  className="btn btn-primary btn-block rounded-xl font-bold gap-2"
                >
                  <IoPlay className="text-base" />
                  {localText.watchVideo}
                </button>
              )}
              <button
                onClick={() => setShowSubscribedModal(false)}
                className="btn btn-ghost btn-sm rounded-xl text-base-content/50"
              >
                {localText.close}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Checkout (Payme/Click + promo) */}
      <CourseCheckoutModal
        open={showCheckout}
        onClose={() => setShowCheckout(false)}
        course={course}
        lang={lang}
      />
    </div>
  )
}

function PriceCardContent({
  course,
  courseVideos,
  totalSecs,
  levelDisplay,
  levelFieldLabel,
  rating,
  projects,
  isSubscribed,
  onWatch,
  isPaid,
  onBuy,
  uiText,
}) {
  const priceLabel = isPaid
    ? new Intl.NumberFormat(uiText.dateLocale).format(Math.round(Number(course.price || 0))) + " so'm"
    : null
  return (
    <div className="p-4 sm:p-5 space-y-4">
      <div className="space-y-2">
        {isPaid && (
          <button onClick={onBuy} className="btn bg-gradient-to-r from-platinum-700 to-platinum-600 hover:from-platinum-600 hover:to-platinum-500 border-none text-white btn-block rounded-none font-bold gap-2 shadow-md">
            <IoFlash className="text-base" />
            {uiText.buyCourse} · {priceLabel}
          </button>
        )}
        <button
          onClick={onWatch}
          className={`btn btn-block rounded-none font-bold gap-2 ${
            isPaid
              ? 'bg-transparent hover:bg-zinc-900 border border-zinc-800 text-zinc-300'
              : 'bg-platinum-600 hover:bg-platinum-500 border-none text-white'
          }`}
        >
          {isSubscribed ? <IoPlay className="text-base" /> : <IoLockClosed className="text-base" />}
          {isSubscribed ? uiText.watchVideo : uiText.watchOrSubscribe}
        </button>
      </div>
      <div className="divider my-0 opacity-10" />
      <div className="space-y-2.5">
        <StatRow icon={<IoBookOutline className="text-platinum-400 text-sm" />} label={uiText.lessonsLabel} value={courseVideos.length} />
        {totalSecs > 0 && <StatRow icon={<IoTime className="text-platinum-400 text-sm" />} label={uiText.totalTime} value={formatDurationText(totalSecs)} />}
        <StatRow icon={<IoBarChart className="text-platinum-400 text-sm" />} label={levelFieldLabel} value={levelDisplay} />
        {rating > 0 && <StatRow icon={<IoStar className="text-yellow-500 text-sm" />} label={uiText.rating} value={Number(rating).toFixed(1)} />}
        {course.studentsCount > 0 && <StatRow icon={<IoPeople className="text-platinum-400 text-sm" />} label={uiText.learners} value={course.studentsCount.toLocaleString()} />}
        {projects.length > 0 && <StatRow icon={<IoCodeSlash className="text-platinum-400 text-sm" />} label={uiText.projects} value={projects.length} />}
      </div>
    </div>
  )
}

function DesktopPriceCard(props) {
  const { course, catColor } = props
  const currentLang = props.uiText.dateLocale === 'ru-RU' ? 'ru' : props.uiText.dateLocale === 'en-US' ? 'en' : 'uz'
  const localizedTitle = localizeCourseText(currentLang, course.title).title

  return (
    <div className="rounded-none border border-zinc-800 bg-[#16191d]/90 backdrop-blur-xl overflow-hidden shadow-2xl">
      <div className="relative aspect-video overflow-hidden" style={{ backgroundColor: 'var(--course-thumbnail-bg, #0f1115)' }}>
        {course.thumbnail ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative w-32 h-32 sm:w-36 sm:h-36 rounded-none overflow-hidden shadow-2xl p-4 sm:p-5 flex items-center justify-center bg-white dark:bg-[#16191d]">
              <div className="relative w-full h-full">
                <DynamicSVG
                  src={course.thumbnail}
                  alt={localizedTitle}
                  className="w-full h-full object-contain"
                />
              </div>
            </div>
          </div>
        ) : (
          <div className={'w-full h-full flex items-center justify-center text-5xl font-black opacity-10 ' + catColor}>
            {course.category?.toUpperCase().slice(0, 2)}
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#16191d] via-[#16191d]/50 to-transparent pointer-events-none" />
      </div>
      <PriceCardContent {...props} />
    </div>
  )
}

function MobilePriceCard(props) {
  const { isSubscribed, onWatch, uiText } = props
  return (
    <div className="rounded-none border border-zinc-800 bg-[#16191d]/90 backdrop-blur-xl overflow-hidden shadow-lg">
      <div className="flex items-center justify-center px-4 py-3">
        <button onClick={onWatch} className="btn bg-platinum-600 hover:bg-platinum-500 border-none text-white btn-sm rounded-none gap-1">
          {isSubscribed ? <IoPlay className="text-sm" /> : <IoLockClosed className="text-sm" />}
          {isSubscribed ? uiText.watchVideo : uiText.watchOrSubscribe}
        </button>
      </div>
    </div>
  )
}
