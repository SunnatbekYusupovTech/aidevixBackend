import { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { safeJsonLd } from '@/utils/jsonLd';
import { SSR_API_BASE_URL } from '@/utils/constants';
import { COURSE_CATEGORIES_RU } from '@/data/courseCategoriesRu';
import { COURSES_FAQ_RU } from '@/data/coursesFaqRu';

const BASE = 'https://aidevix.uz';
const URL = `${BASE}/ru/courses`;

// Русскоязычный landing «курсы программирования». Server-рендерится целиком, поэтому
// весь контент попадает в исходный HTML (индексируется). hreflang связывает эту
// страницу с узбекской /courses (reciprocal), чтобы Google/Yandex показывали нужную
// языковую версию русскоязычным пользователям.
export const metadata: Metadata = {
  title: 'Курсы программирования — онлайн-обучение на русском',
  description:
    'Курсы программирования Aidevix: React, Node.js, Python, TypeScript, AI и кибербезопасность на русском языке. Онлайн-обучение с нуля до senior с практикой и сертификатом.',
  keywords: [
    'курсы программирования', 'онлайн курсы программирования', 'курсы программирования узбекистан',
    'курсы react', 'курсы python', 'курсы javascript', 'курсы frontend', 'курсы backend',
    'курсы ai', 'it курсы', 'научиться программировать', 'курсы программирования ташкент',
  ],
  alternates: {
    canonical: URL,
    languages: {
      'uz-UZ': `${BASE}/courses`,
      'ru-RU': URL,
      'x-default': `${BASE}/courses`,
    },
  },
  openGraph: {
    type: 'website',
    url: URL,
    title: 'Курсы программирования — Aidevix',
    description: 'Самая широкая библиотека курсов программирования на русском языке. React, Python, AI и другое.',
    siteName: 'Aidevix',
    locale: 'ru_RU',
    images: [{ url: `${BASE}/Logo.jpg`, width: 1200, height: 630, alt: 'Курсы программирования Aidevix' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Курсы программирования — Aidevix',
    description: 'Профессиональные курсы программирования на русском языке.',
    images: [`${BASE}/Logo.jpg`],
  },
};

type Course = {
  _id: string;
  slug?: string;
  title?: string;
  description?: string;
  thumbnail?: string;
};

async function getTopCourses(): Promise<Course[]> {
  if (!SSR_API_BASE_URL.startsWith('http')) return [];
  try {
    const res = await fetch(`${SSR_API_BASE_URL}courses/top?limit=12`, { next: { revalidate: 1800 } });
    if (!res.ok) return [];
    const data = await res.json();
    return (data?.data?.courses || []) as Course[];
  } catch {
    return [];
  }
}

export default async function RuCoursesPage() {
  const courses = await getTopCourses();

  const collectionSchema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    '@id': `${URL}#collection`,
    url: URL,
    name: 'Курсы программирования — Aidevix',
    description:
      'Коллекция профессиональных курсов программирования на русском языке: React, Node.js, Python, TypeScript, AI и кибербезопасность.',
    inLanguage: 'ru-RU',
    isPartOf: { '@id': `${BASE}/#organization` },
    breadcrumb: { '@id': `${URL}#breadcrumb` },
  };

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    '@id': `${URL}#breadcrumb`,
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Главная', item: BASE },
      { '@type': 'ListItem', position: 2, name: 'Курсы программирования', item: URL },
    ],
  };

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    '@id': `${URL}#faq`,
    inLanguage: 'ru-RU',
    mainEntity: COURSES_FAQ_RU.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };

  const itemListSchema =
    courses.length > 0
      ? {
          '@context': 'https://schema.org',
          '@type': 'ItemList',
          name: 'Курсы программирования Aidevix',
          numberOfItems: courses.length,
          itemListElement: courses.map((c, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            url: `${BASE}/courses/${c.slug || c._id}`,
            name: c.title || 'Курс Aidevix',
          })),
        }
      : null;

  return (
    <div className="min-h-screen bg-base-100 text-base-content pt-24 pb-20">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(collectionSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumbSchema) }} />
      {itemListSchema && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(itemListSchema) }} />
      )}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(faqSchema) }} />

      <div className="mx-auto max-w-7xl px-4">
        {/* Breadcrumb */}
        <nav className="text-xs text-base-content/50 mb-6 flex flex-wrap gap-1.5" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-primary">Главная</Link>
          <span>/</span>
          <span className="text-base-content/70">Курсы программирования</span>
        </nav>

        {/* Header */}
        <header className="mb-10 max-w-3xl">
          <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-black tracking-[-0.04em] mb-4 leading-tight">
            Курсы программирования на русском языке
          </h1>
          <p className="text-base-content/60 text-base sm:text-lg leading-relaxed">
            Aidevix — онлайн-платформа обучения программированию для эпохи AI. React, JavaScript,
            TypeScript, Node.js, Python, искусственный интеллект и кибербезопасность — на русском
            языке, с практическими проектами и проверяемым сертификатом.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/courses"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-content font-bold text-sm hover:opacity-90 transition-opacity"
            >
              Смотреть все курсы →
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-primary/30 bg-primary/10 text-primary font-bold text-sm hover:bg-primary/20 transition-colors"
            >
              Начать бесплатно
            </Link>
          </div>
        </header>

        {/* Направления — внутренние ссылки на русскоязычные категории */}
        <section className="mb-14">
          <h2 className="text-lg font-bold mb-4">Курсы по направлениям</h2>
          <div className="flex flex-wrap gap-2">
            {COURSE_CATEGORIES_RU.map((c) => (
              <Link
                key={c.slug}
                href={`/ru/courses/category/${c.slug}`}
                className="px-4 py-2 rounded-xl border border-base-content/10 bg-base-200/40 text-sm font-medium hover:border-primary/30 hover:text-primary transition-colors"
              >
                {c.label}
              </Link>
            ))}
          </div>
        </section>

        {/* Популярные курсы */}
        {courses.length > 0 && (
          <section className="mb-16">
            <h2 className="text-lg font-bold mb-4">Популярные курсы</h2>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5">
              {courses.map((c) => (
                <Link
                  key={c._id}
                  href={`/courses/${c.slug || c._id}`}
                  className="group rounded-2xl border border-base-content/10 bg-base-200/40 overflow-hidden hover:border-primary/30 hover:-translate-y-0.5 transition-all flex flex-col"
                >
                  <div className="relative aspect-[16/9] bg-base-300">
                    {c.thumbnail ? (
                      <Image
                        src={c.thumbnail}
                        alt={c.title || 'Курс'}
                        fill
                        sizes="(max-width: 640px) 50vw, 33vw"
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-3xl opacity-30">📚</div>
                    )}
                  </div>
                  <div className="p-4 flex-1 flex flex-col">
                    <h3 className="font-bold text-sm sm:text-base mb-1 line-clamp-2 group-hover:text-primary transition-colors">
                      {c.title}
                    </h3>
                    {c.description && (
                      <p className="text-xs text-base-content/50 line-clamp-2">{c.description}</p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* SEO-текст */}
        <section className="max-w-4xl mt-4 pt-10 border-t border-base-content/10">
          <div className="text-base-content/70 space-y-4 text-sm sm:text-base">
            <h2 className="text-2xl sm:text-3xl font-black text-base-content mb-4">
              Онлайн-курсы программирования в Узбекистане
            </h2>
            <p className="leading-relaxed">
              Aidevix — образовательная онлайн-платформа для тех, кто хочет освоить программирование
              в эпоху искусственного интеллекта. Здесь вы изучаете <strong>React, JavaScript,
              TypeScript, Node.js, Python</strong> и <strong>искусственный интеллект</strong> на
              русском языке. Каждый курс построен вокруг практических проектов и реальных примеров —
              мы учим не теории, а навыкам, которые работают.
            </p>
            <p className="leading-relaxed">
              Курсы построены пошагово — от начального уровня до senior. Неважно, начинаете ли вы
              программирование с нуля или повышаете квалификацию: вы найдёте подходящее направление.
              Главное отличие Aidevix — наряду с классическим программированием мы учим работать с
              современными AI-инструментами <strong>Claude Code, Cursor и GitHub Copilot</strong>.
            </p>
          </div>
        </section>

        {/* FAQ */}
        <section className="max-w-3xl mt-14 pt-8 border-t border-base-content/10">
          <h2 className="text-2xl font-black mb-6">Часто задаваемые вопросы</h2>
          <div className="space-y-4">
            {COURSES_FAQ_RU.map((item, i) => (
              <details key={i} className="group rounded-2xl border border-base-content/10 bg-base-200/40 p-5">
                <summary className="cursor-pointer font-bold list-none flex items-center justify-between gap-4">
                  {item.q}
                  <span className="text-primary transition-transform group-open:rotate-45 text-xl leading-none">+</span>
                </summary>
                <p className="mt-3 text-base-content/65 text-sm leading-relaxed">{item.a}</p>
              </details>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
