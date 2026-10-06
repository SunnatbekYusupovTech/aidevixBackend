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

function absoluteUrl(src: string | undefined): string | null {
  if (!src) return null;
  if (/^https?:\/\//i.test(src)) return src;
  return `https://aidevix.uz${src.startsWith('/') ? '' : '/'}${src}`;
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
    course.metaDescription || (course.description?.slice(0, 160) ||
    `${course.title} — O'zbek tilidagi professional dasturlash kursi.`);
  const image = absoluteUrl(course.thumbnail) || 'https://aidevix.uz/og-image.png';
  // SEO-007: canonical URL slug bilan (slug yo'q bo'lsa params.id)
  const canonicalSlug = (course.slug as string | undefined) || params.id;
  const url = `https://aidevix.uz/courses/${canonicalSlug}`;

  return {
    title,
    description,
    keywords: course.metaKeywords && course.metaKeywords.length > 0
      ? course.metaKeywords
      : ['dasturlash kurslari', course.title, course.category || 'kurs'],
    alternates: {
      canonical: url,
      languages: {
        'uz-UZ': url,
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

  // SEO-007: JSON-LD'da ham canonical slug URL
  const canonicalSlug = (course.slug as string | undefined) || params.id;
  const url = `https://aidevix.uz/courses/${canonicalSlug}`;
  // thumbnail ba'zan nisbiy yo'l (`/course-logos/x.svg`) — schema.org absolut URL talab qiladi
  const image = absoluteUrl(course.thumbnail) || 'https://aidevix.uz/og-image.png';
  const instructorName =
    typeof course.instructor === 'string'
      ? course.instructor
      : course.instructor?.firstName
        ? `${course.instructor.firstName}${course.instructor.lastName ? ` ${course.instructor.lastName}` : ''}`
        : course.instructor?.username || 'Aidevix';

  const courseSchema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Course',
    '@id': `${url}#course`,
    name: course.title,
    description: course.description?.slice(0, 500) || course.title,
    provider: { '@id': 'https://aidevix.uz/#organization' },
    offers: {
      '@type': 'Offer',
      category: course.price > 0 ? 'Paid' : 'Free',
      price: Number(course.price) || 0,
      priceCurrency: 'UZS',
      availability: 'https://schema.org/InStock',
      url,
    },
    url,
    image,
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
  const totalDuration = isoDurationFromMinutes(
    // Course.totalDuration backend'da SONIYADA saqlanadi — daqiqaga o'tkaziladi
    course.totalDurationMinutes || (course.totalDuration ? Math.round(course.totalDuration / 60) : undefined),
  );
  if (totalDuration) {
    courseSchema.timeRequired = totalDuration;
    // Google Course rich result CourseInstance'da courseWorkload yoki courseSchedule kutadi
    (courseSchema.hasCourseInstance as Record<string, unknown>).courseWorkload = totalDuration;
  }

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Bosh sahifa', item: 'https://aidevix.uz' },
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
