import { Metadata } from 'next';
import { SSR_API_BASE_URL } from '@utils/constants';
import { safeJsonLd } from '@utils/jsonLd';

interface Props {
  params: { id: string };
  children: React.ReactNode;
}

async function fetchCourse(id: string) {
  try {
    const res = await fetch(`${SSR_API_BASE_URL}courses/${id}`, { next: { revalidate: 3600 } });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.data?.course || null;
  } catch {
    return null;
  }
}

function isoDurationFromMinutes(totalMinutes: number | undefined): string | null {
  if (!totalMinutes || totalMinutes <= 0) return null;
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `PT${h ? `${h}H` : ''}${m ? `${m}M` : ''}` || 'PT0M';
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const course = await fetchCourse(params.id);
  if (!course) {
    return {
      title: 'Kurs topilmadi',
      robots: { index: false, follow: false },
    };
  }

  const title = course.title;
  const description =
    course.description?.slice(0, 160) ||
    `${course.title} — O'zbek tilidagi professional dasturlash kursi.`;
  const image = course.thumbnail || 'https://aidevix.uz/Logo.jpg';
  const url = `https://aidevix.uz/courses/${params.id}`;

  return {
    title,
    description,
    alternates: {
      canonical: url,
      languages: {
        'uz-UZ': url,
        'ru-RU': url,
        'en-US': url,
        'x-default': url,
      },
    },
    openGraph: {
      type: 'article',
      url,
      title,
      description,
      siteName: 'Aidevix',
      locale: 'uz_UZ',
      images: [{ url: image, width: 1200, height: 630, alt: course.title }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image],
    },
    other: {
      ...(course.category && { 'article:section': course.category }),
      ...(course.instructor?.username && { 'article:author': course.instructor.username }),
    },
  };
}

export default async function CourseLayout({ params, children }: Props) {
  const course = await fetchCourse(params.id);
  if (!course) return <>{children}</>;

  const url = `https://aidevix.uz/courses/${params.id}`;
  const instructorName =
    typeof course.instructor === 'string'
      ? course.instructor
      : course.instructor?.firstName
        ? `${course.instructor.firstName}${course.instructor.lastName ? ` ${course.instructor.lastName}` : ''}`
        : course.instructor?.username || 'Aidevix';

  const courseSchema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Course',
    name: course.title,
    description: course.description?.slice(0, 500) || course.title,
    provider: {
      '@type': 'Organization',
      name: 'Aidevix',
      sameAs: 'https://aidevix.uz',
    },
    url,
    image: course.thumbnail || 'https://aidevix.uz/Logo.jpg',
    inLanguage: 'uz',
    courseMode: 'online',
    hasCourseInstance: {
      '@type': 'CourseInstance',
      courseMode: 'online',
      inLanguage: 'uz',
    },
    instructor: {
      '@type': 'Person',
      name: instructorName,
    },
  };

  if (course.level) courseSchema.educationalLevel = course.level;
  // ⚠️ aggregateRating ATAYIN chiqarib tashlandi. Kurs rating/ratingCount qiymatlari
  // hozircha seed qilingan (seedCourses.js — masalan 1240, 890, 2100 ovoz), real
  // foydalanuvchi sharhlariga asoslanmagan. Google siyosatiga ko'ra real review'siz
  // aggregateRating markup — "spammy structured data" → manual action xavfi.
  // Haqiqiy CourseRating'lar yig'ilgach, real review[] bilan birga qayta qo'shiladi.
  const totalDuration = isoDurationFromMinutes(course.totalDurationMinutes || course.totalDuration);
  if (totalDuration) courseSchema.timeRequired = totalDuration;

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://aidevix.uz' },
      { '@type': 'ListItem', position: 2, name: 'Kurslar', item: 'https://aidevix.uz/courses' },
      { '@type': 'ListItem', position: 3, name: course.title, item: url },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(courseSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumbSchema) }}
      />
      {children}
    </>
  );
}
