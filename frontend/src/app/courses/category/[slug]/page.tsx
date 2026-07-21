import { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { safeJsonLd } from '@/utils/jsonLd';
import { SSR_API_BASE_URL } from '@/utils/constants';
import { COURSE_CATEGORIES, getCategory, buildCategoryFaq } from '@/data/courseCategories';

const BASE = 'https://aidevix.uz';

type Course = {
  _id: string;
  slug?: string;
  title?: string;
  description?: string;
  thumbnail?: string;
  category?: string;
};

// Barcha kategoriya sahifalari build vaqtida generatsiya qilinadi (SSG).
export function generateStaticParams() {
  return COURSE_CATEGORIES.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata(
  { params }: { params: { slug: string } },
): Promise<Metadata> {
  const cat = getCategory(params.slug);
  if (!cat) return { title: 'Kategoriya topilmadi' };

  const url = `${BASE}/courses/category/${cat.slug}`;
  return {
    title: cat.title,
    description: cat.description,
    keywords: cat.keywords,
    alternates: {
      canonical: url,
      // hreflang reciprocal: узбекская ↔ русская версия категории (одинаковый slug).
      languages: {
        'uz-UZ': url,
        'ru-RU': `${BASE}/ru/courses/category/${cat.slug}`,
        'x-default': url,
      },
    },
    openGraph: {
      type: 'website',
      url,
      title: `${cat.title} — Aidevix`,
      description: cat.description,
      siteName: 'Aidevix',
      locale: 'uz_UZ',
      images: [{ url: `${BASE}/Logo.jpg`, width: 1200, height: 630, alt: cat.title }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${cat.title} — Aidevix`,
      description: cat.description,
      images: [`${BASE}/Logo.jpg`],
    },
  };
}

async function getCoursesByCategory(slug: string): Promise<Course[]> {
  if (!SSR_API_BASE_URL.startsWith('http')) return [];
  try {
    const res = await fetch(
      `${SSR_API_BASE_URL}courses?category=${encodeURIComponent(slug)}&limit=24`,
      { next: { revalidate: 1800 } },
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data?.data?.courses || []) as Course[];
  } catch {
    return [];
  }
}

export default async function CategoryPage(
  { params }: { params: { slug: string } },
) {
  const cat = getCategory(params.slug);
  if (!cat) notFound();

  const courses = await getCoursesByCategory(params.slug);
  const url = `${BASE}/courses/category/${cat.slug}`;
  const faq = buildCategoryFaq(cat);

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    '@id': `${url}#faq`,
    mainEntity: faq.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };

  const collectionSchema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    '@id': `${url}#collection`,
    url,
    name: cat.title,
    description: cat.description,
    inLanguage: 'uz-UZ',
    isPartOf: { '@id': `${BASE}/#organization` },
    breadcrumb: { '@id': `${url}#breadcrumb` },
  };

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    '@id': `${url}#breadcrumb`,
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Bosh sahifa', item: BASE },
      { '@type': 'ListItem', position: 2, name: 'Dasturlash kurslari', item: `${BASE}/courses` },
      { '@type': 'ListItem', position: 3, name: cat.label, item: url },
    ],
  };

  // Real kurslardan ItemList — bo'sh bo'lsa schema chiqarilmaydi (soxta data yo'q).
  const itemListSchema =
    courses.length > 0
      ? {
          '@context': 'https://schema.org',
          '@type': 'ItemList',
          name: cat.title,
          numberOfItems: courses.length,
          itemListElement: courses.map((c, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            url: `${BASE}/courses/${c.slug || c._id}`,
            name: c.title || 'Aidevix kurs',
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
          <Link href="/" className="hover:text-primary">Bosh sahifa</Link>
          <span>/</span>
          <Link href="/courses" className="hover:text-primary">Kurslar</Link>
          <span>/</span>
          <span className="text-base-content/70">{cat.label}</span>
        </nav>

        {/* Header */}
        <header className="mb-10 max-w-3xl">
          <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-black tracking-[-0.04em] mb-4 leading-tight">
            {cat.title}
          </h1>
          <p className="text-base-content/60 text-base sm:text-lg leading-relaxed">{cat.intro}</p>
        </header>

        {/* Kurslar */}
        {courses.length > 0 ? (
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
                      alt={c.title || 'Kurs'}
                      fill
                      sizes="(max-width: 640px) 50vw, 33vw"
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-3xl opacity-30">📚</div>
                  )}
                </div>
                <div className="p-4 flex-1 flex flex-col">
                  <h2 className="font-bold text-sm sm:text-base mb-1 line-clamp-2 group-hover:text-primary transition-colors">
                    {c.title}
                  </h2>
                  {c.description && (
                    <p className="text-xs text-base-content/50 line-clamp-2">{c.description}</p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-3xl border border-base-content/10 bg-base-200/40 p-12 text-center">
            <p className="text-base-content/60 mb-4">
              Bu yo&apos;nalishda kurslar tez orada qo&apos;shiladi. Barcha kurslarni ko&apos;ring:
            </p>
            <Link
              href="/courses"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-content font-bold text-sm hover:opacity-90 transition-opacity"
            >
              Barcha kurslar →
            </Link>
          </div>
        )}

        {/* Interaktiv filtr CTA */}
        {courses.length > 0 && (
          <div className="mt-10 text-center">
            <Link
              href={`/courses?category=${cat.slug}`}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-primary/30 bg-primary/10 text-primary font-bold text-sm hover:bg-primary/20 transition-colors"
            >
              {cat.label} bo&apos;yicha barcha kurslarni filtrlash →
            </Link>
          </div>
        )}

        {/* FAQ — kategoriyaga xos savol-javob (FAQPage schema yuqorida) */}
        <section className="mt-16 pt-8 border-t border-base-content/10 max-w-3xl">
          <h2 className="font-display text-2xl font-black mb-6">Ko&apos;p so&apos;raladigan savollar</h2>
          <div className="space-y-4">
            {faq.map((item, i) => (
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

        {/* Boshqa kategoriyalar — ichki linklar (internal linking) */}
        <section className="mt-16 pt-8 border-t border-base-content/10">
          <h2 className="font-display text-lg font-bold mb-4">Boshqa yo&apos;nalishlar</h2>
          <div className="flex flex-wrap gap-2">
            {COURSE_CATEGORIES.filter((c) => c.slug !== cat.slug).map((c) => (
              <Link
                key={c.slug}
                href={`/courses/category/${c.slug}`}
                className="px-4 py-2 rounded-xl border border-base-content/10 bg-base-200/40 text-sm font-medium hover:border-primary/30 hover:text-primary transition-colors"
              >
                {c.label}
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
