import { Metadata } from 'next';
import HomeClient from '@/components/home/HomeClient';
import { SSR_API_BASE_URL } from '@/utils/constants';
import { safeJsonLd } from '@/utils/jsonLd';

// Professional Metadata for SEO
export const metadata: Metadata = {
  title: 'Dasturlash kurslari — O\'zbek tilida onlayn Frontend va IT kurslari | Aidevix',
  description: 'O\'zbekistondagi eng ilg\'or onlayn dasturlash kurslari. Google dasturlash kurslari kabi sifatli Frontend, Backend va AI yo\'nalishlarini noldan boshlab professional darajagacha o\'rganing.',
  keywords: ['google dasturlash kurslari', 'onlayn dasturlash kurslari', 'dasturlash kurslari', 'frontend kurslari', 'it kurslari', 'dasturlashni o\'rganish', 'o\'zbek tilida dasturlash'],
  alternates: {
    canonical: 'https://aidevix.uz',
    languages: {
      'uz-UZ': 'https://aidevix.uz',
      'x-default': 'https://aidevix.uz',
    },
  },
  openGraph: {
    title: 'Dasturlash kurslari — Onlayn Frontend va IT kurslari',
    description: 'Aidevix orqali eng yaxshi onlayn dasturlash kurslari yordamida o\'rganing.',
    images: ['/Logo.jpg'],
  },
};

// Server functions to fetch data (SSR/ISR)
async function getTopCourses() {
  try {
    const res = await fetch(`${SSR_API_BASE_URL}courses/top?limit=8`, { next: { revalidate: 1800 } });
    if (!res.ok) return [];
    const data = await res.json();
    return data.data?.courses || [];
  } catch (e) {
    return [];
  }
}

async function getTopVideos() {
  try {
    const res = await fetch(`${SSR_API_BASE_URL}videos/top?limit=6`, { next: { revalidate: 1800 } });
    if (!res.ok) return [];
    const data = await res.json();
    return data.data?.videos || [];
  } catch (e) {
    return [];
  }
}

// Stats SSR — saves ~800ms client-side fetch + render hop on slow networks.
// Falls through to client fetch if backend is reachable from edge but slow.
async function getHomeStats() {
  try {
    const res = await fetch(`${SSR_API_BASE_URL}users/home-stats`, { next: { revalidate: 600 } });
    if (!res.ok) return null;
    const json = await res.json();
    const d = json?.data || {};
    return {
      students: Number(d.students || 0),
      videos: Number(d.videos || 0),
      mentors: Number(d.mentors || 0),
      rating: Number(d.rating || 0),
    };
  } catch {
    return null;
  }
}

export default async function HomePage() {
  // Fetch data on server in parallel for maximum performance
  const [initialCourses, initialVideos, initialStats] = await Promise.all([
    getTopCourses(),
    getTopVideos(),
    getHomeStats(),
  ]);

  // ItemList of real top courses — Google'ga bosh sahifada haqiqiy kurslar
  // borligini bildiradi ("dasturlash kurslari" rich natijasi uchun signal).
  // Kurs bo'lmasa schema chiqarilmaydi (soxta data yo'q).
  const courseItemList =
    Array.isArray(initialCourses) && initialCourses.length > 0
      ? {
          '@context': 'https://schema.org',
          '@type': 'ItemList',
          name: 'Aidevix mashhur dasturlash kurslari',
          numberOfItems: initialCourses.length,
          itemListElement: initialCourses.map((c: any, i: number) => ({
            '@type': 'ListItem',
            position: i + 1,
            url: `https://aidevix.uz/courses/${c.slug || c._id}`,
            name: c.title || 'Aidevix kurs',
          })),
        }
      : null;

  return (
    <>
      {courseItemList && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: safeJsonLd(courseItemList) }}
        />
      )}
      <HomeClient
        initialCourses={initialCourses}
        initialVideos={initialVideos}
        initialStats={initialStats}
      />
    </>
  );
}
