// SEO-001: Server Component — kurs ma'lumotini SSR'da yuklaydi va
// CourseDetailClient'ga prop sifatida uzatadi. Shu tufayli h1 va description
// initial HTML'da bo'ladi (crawlerlar uchun) — `isMounted` gate'ini kutmaydi.
// layout.tsx ham xuddi shu URL bilan fetch qiladi — Next.js fetch deduplication
// orqali network call qayta ketmaydi (bir xil URL + revalidate parametr).

import { SSR_API_BASE_URL } from '@utils/constants';
import { permanentRedirect } from 'next/navigation';
import CourseDetailClient from './CourseDetailClient';

const OBJECT_ID_RE = /^[a-f0-9]{24}$/i;

interface Props {
  params: { id: string };
}

async function fetchCourseForPage(id: string) {
  if (!SSR_API_BASE_URL.startsWith('http')) return null;
  try {
    const res = await fetch(`${SSR_API_BASE_URL}courses/${id}`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.data?.course ?? null;
  } catch {
    return null;
  }
}

export default async function CourseDetailPage({ params }: Props) {
  // SSR fetch — layout.tsx bilan bir xil URL, Next.js cache'dan qaytadi
  const initialCourse = await fetchCourseForPage(params.id);

  // SEO-007: eski /courses/<ObjectId> URL'lari slug URL'ga 308 redirect —
  // Google'da bitta kurs uchun ikki xil URL indekslanmasin.
  if (OBJECT_ID_RE.test(params.id) && initialCourse?.slug) {
    permanentRedirect(`/courses/${initialCourse.slug}`);
  }

  // Client'dagi progress/projects API'lari ObjectId kutadi — slug emas.
  return <CourseDetailClient id={initialCourse?._id ?? params.id} initialCourse={initialCourse} />;
}
