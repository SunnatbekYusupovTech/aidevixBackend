import CourseCard from './CourseCard'
import CourseSkeleton from './CourseSkeleton'
import { useLang } from '@/context/LangContext'

export default function CourseGrid({ courses = [], loading = false, emptyText = 'Kurs topilmadi' }) {
  const { t } = useLang()
  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5">
        {Array.from({ length: 6 }).map((_, i) => (
          <CourseSkeleton key={i} />
        ))}
      </div>
    )
  }

  if (!courses.length) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in-up">
        <div className="w-16 h-16 rounded-2xl bg-base-200 flex items-center justify-center mb-4 text-3xl">
          🔍
        </div>
        <p className="text-base-content/40 text-base font-medium">{emptyText}</p>
        <p className="text-base-content/25 text-sm mt-1">{t('courses.emptyHint')}</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5">
      {courses.map((course, i) => (
        <CourseCard key={course._id} course={course} index={i} />
      ))}
    </div>
  )
}
