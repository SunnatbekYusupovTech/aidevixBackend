import { safeJsonLd } from '@/utils/jsonLd';
import { SSR_API_BASE_URL } from '@/utils/constants';
import { coursesMetadata } from './metadata';

// `/courses` — "dasturlash kurslari" uchun asosiy landing. Bu sahifa client
// component bo'lgani uchun metadata shu layout orqali qo'llanadi (eski `head.tsx`
// konvensiyasi o'rniga). Bu yerda CollectionPage + BreadcrumbList + ItemList
// (real kurslar) JSON-LD ham beriladi → Google'da rich "courses" natijasi.
export const metadata = coursesMetadata;

type Course = {
  _id: string;
  title?: string;
  description?: string;
  thumbnail?: string;
  category?: string;
};

async function getTopCourses(): Promise<Course[]> {
  if (!SSR_API_BASE_URL.startsWith('http')) return [];
  try {
    const res = await fetch(`${SSR_API_BASE_URL}courses/top?limit=12`, {
      next: { revalidate: 1800 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data?.data?.courses || []) as Course[];
  } catch {
    return [];
  }
}

export default async function CoursesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const courses = await getTopCourses();

  const collectionSchema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    '@id': 'https://aidevix.uz/courses#collection',
    url: 'https://aidevix.uz/courses',
    name: "Dasturlash kurslari — Aidevix",
    description:
      "O'zbek tilidagi professional dasturlash kurslari to'plami: React, Node.js, Python, TypeScript, AI va kiberxavfsizlik.",
    inLanguage: 'uz-UZ',
    isPartOf: { '@id': 'https://aidevix.uz/#organization' },
    about: {
      '@type': 'Thing',
      name: 'Dasturlash va AI ta\'limi',
    },
    breadcrumb: { '@id': 'https://aidevix.uz/courses#breadcrumb' },
  };

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    '@id': 'https://aidevix.uz/courses#breadcrumb',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Bosh sahifa',
        item: 'https://aidevix.uz',
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Dasturlash kurslari',
        item: 'https://aidevix.uz/courses',
      },
    ],
  };

  // Real kurslardan ItemList — bo'sh bo'lsa schema chiqarilmaydi (soxta data yo'q).
  const itemListSchema =
    courses.length > 0
      ? {
          '@context': 'https://schema.org',
          '@type': 'ItemList',
          name: "Aidevix dasturlash kurslari",
          itemListOrder: 'https://schema.org/ItemListOrderDescending',
          numberOfItems: courses.length,
          itemListElement: courses.map((c, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            url: `https://aidevix.uz/courses/${c._id}`,
            name: c.title || 'Aidevix kurs',
          })),
        }
      : null;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(collectionSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumbSchema) }}
      />
      {itemListSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: safeJsonLd(itemListSchema) }}
        />
      )}
      {children}
    </>
  );
}
