import { SSR_API_BASE_URL } from '@/utils/constants'
import CoursesClient from './CoursesClient'

// Server-rendered so the courses list is real HTML for crawlers (the page used
// to be fully client-rendered — `useSearchParams` pushed everything into a
// client-only Suspense boundary, leaving the SSR HTML empty). Dynamic because it
// reads the category/search query params; the data fetch itself is cached 30 min.
export const dynamic = 'force-dynamic'

import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Barcha dasturlash kurslari | Onlayn Frontend, Backend, va IT ta\'lim',
  description: 'Aidevix platformasida barcha yo\'nalishdagi onlayn dasturlash kurslarini topishingiz mumkin. O\'zbek tilida eng zo\'r Frontend, Python va AI kurslari ro\'yxati.',
  keywords: ['google dasturlash kurslari', 'onlayn dasturlash kurslari', 'dasturlash kurslari', 'frontend kurslari', 'barcha it kurslar', 'backend kurslari']
}

type Course = { _id: string; [k: string]: any }

type CoursesResult = { courses: Course[]; total: number; pages: number }

async function getInitialCourses(category?: string, search?: string): Promise<CoursesResult> {
  if (!SSR_API_BASE_URL.startsWith('http')) {
    return { courses: [], total: 0, pages: 0 }
  }
  try {
    const qs = new URLSearchParams({ sort: 'newest', page: '1', limit: '12' })
    if (category && category !== 'all') qs.set('category', category)
    if (search) qs.set('search', search)

    const res = await fetch(`${SSR_API_BASE_URL}courses?${qs.toString()}`, {
      next: { revalidate: 1800 },
    })
    if (!res.ok) return { courses: [], total: 0, pages: 0 }

    const data = await res.json()
    const payload = data?.data ?? {}
    const courses = (payload.courses || []) as Course[]
    return {
      courses,
      total: payload.pagination?.total ?? payload.total ?? courses.length,
      pages: payload.pagination?.pages ?? 0,
    }
  } catch {
    return { courses: [], total: 0, pages: 0 }
  }
}

export default async function CoursesPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  const category = typeof searchParams?.category === 'string' ? searchParams.category : undefined
  const search   = typeof searchParams?.search === 'string' ? searchParams.search : undefined

  const { courses, total, pages } = await getInitialCourses(category, search)

  return (
    <CoursesClient
      initialCourses={courses}
      initialTotal={total}
      initialPages={pages}
      initialCategory={category ?? 'all'}
      initialSearch={search ?? ''}
    />
  )
}
