import { Metadata } from 'next';
import Link from 'next/link';
import BlogClient from './BlogClient';
import { SSR_API_BASE_URL } from '@/utils/constants';
import { BLOG_ARTICLES } from '@/data/blogArticles';
import { safeJsonLd } from '@/utils/jsonLd';

export const metadata: Metadata = {
  title: 'Blog',
  description: 'AI dunyosi va dasturlash bo\'yicha yangiliklar, qo\'llanmalar va tahlillar — o\'zbek tilida.',
  alternates: { canonical: '/blog' },
  openGraph: {
    title: 'Aidevix Blog — AI va dasturlash yangiliklari',
    description: 'Eng so\'nggi AI tools yangiliklari va amaliy qo\'llanmalar.',
    images: [{ url: 'https://aidevix.uz/Logo.jpg', width: 1200, height: 630, alt: 'Aidevix Blog' }],
  },
};

// Maqolalar ro'yxati — Google uchun ItemList (crawlable internal links).
const blogItemList = {
  '@context': 'https://schema.org',
  '@type': 'ItemList',
  name: 'Aidevix qo\'llanmalari',
  itemListElement: BLOG_ARTICLES.map((a, i) => ({
    '@type': 'ListItem',
    position: i + 1,
    url: `https://aidevix.uz/blog/${a.slug}`,
    name: a.title,
  })),
};

async function getNews() {
  try {
    const res = await fetch(`${SSR_API_BASE_URL}public/ai-news`, { next: { revalidate: 600 } });
    if (!res.ok) return [];
    const data = await res.json();
    return data?.data?.news || [];
  } catch {
    return [];
  }
}

export default async function BlogPage() {
  const news = await getNews();
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(blogItemList) }} />

      {/* Qo'llanmalar — statik SEO maqolalar (server-render, crawlable). */}
      <section className="bg-base-100 text-base-content pt-24 pb-4">
        <div className="mx-auto max-w-7xl px-4">
          <div className="mb-6">
            <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-indigo-400 mb-2">
              Qo&apos;llanmalar
            </div>
            <h2 className="font-display text-2xl sm:text-3xl font-black tracking-[-0.03em]">
              AI va dasturlash bo&apos;yicha qo&apos;llanmalar
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {BLOG_ARTICLES.map((a) => (
              <Link
                key={a.slug}
                href={`/blog/${a.slug}`}
                className="group rounded-2xl border border-base-content/10 bg-base-200/40 p-5 hover:border-primary/30 hover:-translate-y-0.5 transition-all flex flex-col"
              >
                <div className="text-[10px] font-bold uppercase tracking-widest text-base-content/40 mb-2">
                  {a.readMinutes} daqiqa o&apos;qish
                </div>
                <h3 className="font-bold text-base mb-2 group-hover:text-primary transition-colors line-clamp-2">
                  {a.title}
                </h3>
                <p className="text-sm text-base-content/55 line-clamp-3 flex-1">{a.excerpt}</p>
                <span className="mt-3 text-xs font-bold text-primary">O&apos;qish →</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <BlogClient initialNews={news} />
    </>
  );
}
