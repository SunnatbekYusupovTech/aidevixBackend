import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { safeJsonLd } from '@/utils/jsonLd';
import { BLOG_ARTICLES, getArticle } from '@/data/blogArticles';

const BASE = 'https://aidevix.uz';

// Statik maqolalar — build vaqtida barcha sahifalar generatsiya qilinadi (SSG).
export function generateStaticParams() {
  return BLOG_ARTICLES.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata(
  { params }: { params: { slug: string } },
): Promise<Metadata> {
  const article = getArticle(params.slug);
  if (!article) return { title: 'Maqola topilmadi' };

  const url = `${BASE}/blog/${article.slug}`;
  return {
    title: article.title, // brandsiz — root template "| Aidevix" qo'shadi
    description: article.description,
    keywords: article.keywords,
    alternates: { canonical: url },
    openGraph: {
      type: 'article',
      url,
      title: `${article.title} — Aidevix`,
      description: article.description,
      siteName: 'Aidevix',
      locale: 'uz_UZ',
      publishedTime: article.date,
      modifiedTime: article.updated || article.date,
      images: [{ url: `${BASE}/Logo.jpg`, width: 1200, height: 630, alt: article.title }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${article.title} — Aidevix`,
      description: article.description,
      images: [`${BASE}/Logo.jpg`],
    },
  };
}

export default function ArticlePage(
  { params }: { params: { slug: string } },
) {
  const article = getArticle(params.slug);
  if (!article) notFound();

  const url = `${BASE}/blog/${article.slug}`;

  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    '@id': `${url}#article`,
    headline: article.title,
    description: article.description,
    inLanguage: 'uz-UZ',
    datePublished: article.date,
    dateModified: article.updated || article.date,
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    author: { '@type': 'Organization', name: 'Aidevix', '@id': `${BASE}/#organization` },
    publisher: { '@id': `${BASE}/#organization` },
    image: `${BASE}/Logo.jpg`,
    keywords: article.keywords.join(', '),
  };

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    '@id': `${url}#breadcrumb`,
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Bosh sahifa', item: BASE },
      { '@type': 'ListItem', position: 2, name: 'Blog', item: `${BASE}/blog` },
      { '@type': 'ListItem', position: 3, name: article.title, item: url },
    ],
  };

  const faqSchema =
    article.faq && article.faq.length > 0
      ? {
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          '@id': `${url}#faq`,
          mainEntity: article.faq.map((f) => ({
            '@type': 'Question',
            name: f.q,
            acceptedAnswer: { '@type': 'Answer', text: f.a },
          })),
        }
      : null;

  const formattedDate = new Date(article.date).toLocaleDateString('uz-UZ', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  return (
    <div className="min-h-screen bg-base-100 text-base-content pt-24 pb-20">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(articleSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumbSchema) }} />
      {faqSchema && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(faqSchema) }} />
      )}

      <article className="mx-auto max-w-3xl px-4">
        {/* Breadcrumb */}
        <nav className="text-xs text-base-content/50 mb-6 flex flex-wrap gap-1.5" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-primary">Bosh sahifa</Link>
          <span>/</span>
          <Link href="/blog" className="hover:text-primary">Blog</Link>
          <span>/</span>
          <span className="text-base-content/70 line-clamp-1">{article.title}</span>
        </nav>

        {/* Header */}
        <header className="mb-8">
          <h1 className="font-display text-3xl sm:text-4xl font-black tracking-[-0.03em] mb-4 leading-tight">
            {article.title}
          </h1>
          <p className="text-base-content/60 text-base sm:text-lg leading-relaxed mb-4">
            {article.excerpt}
          </p>
          <div className="flex items-center gap-3 text-xs text-base-content/45 font-medium">
            <time dateTime={article.date}>{formattedDate}</time>
            <span>•</span>
            <span>{article.readMinutes} daqiqa o&apos;qish</span>
          </div>
        </header>

        {/* Body */}
        <div className="space-y-5 text-base-content/80 leading-relaxed text-[15px] sm:text-base">
          {article.blocks.map((block, i) => {
            if (block.type === 'h2') {
              return (
                <h2 key={i} className="font-display text-xl sm:text-2xl font-bold text-base-content pt-4 tracking-[-0.02em]">
                  {block.text}
                </h2>
              );
            }
            if (block.type === 'ul') {
              return (
                <ul key={i} className="list-disc pl-5 space-y-2 marker:text-primary">
                  {block.items.map((item, j) => <li key={j}>{item}</li>)}
                </ul>
              );
            }
            if (block.type === 'cta') {
              return (
                <div key={i} className="my-8 rounded-2xl border border-primary/20 bg-primary/5 p-6 text-center">
                  <p className="text-base-content/80 mb-4 font-medium">{block.text}</p>
                  <Link
                    href={block.href}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-content font-bold text-sm hover:opacity-90 transition-opacity"
                  >
                    {block.label} →
                  </Link>
                </div>
              );
            }
            return <p key={i}>{block.text}</p>;
          })}
        </div>

        {/* FAQ */}
        {article.faq && article.faq.length > 0 && (
          <section className="mt-12">
            <h2 className="font-display text-2xl font-bold mb-5 tracking-[-0.02em]">Ko&apos;p so&apos;raladigan savollar</h2>
            <div className="space-y-4">
              {article.faq.map((f, i) => (
                <details key={i} className="rounded-xl border border-base-content/10 bg-base-200/50 p-4 group">
                  <summary className="font-bold cursor-pointer list-none flex justify-between items-center">
                    {f.q}
                    <span className="text-primary group-open:rotate-45 transition-transform">+</span>
                  </summary>
                  <p className="mt-3 text-base-content/70 text-sm leading-relaxed">{f.a}</p>
                </details>
              ))}
            </div>
          </section>
        )}

        {/* Related */}
        {article.related && article.related.length > 0 && (
          <section className="mt-12 pt-8 border-t border-base-content/10">
            <h2 className="font-display text-lg font-bold mb-4">Tegishli maqolalar</h2>
            <div className="flex flex-col gap-2">
              {article.related.map((r, i) => (
                <Link key={i} href={r.href} className="text-primary hover:underline font-medium text-sm inline-flex items-center gap-1">
                  → {r.label}
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Back */}
        <div className="mt-12">
          <Link href="/blog" className="text-sm text-base-content/50 hover:text-primary">← Barcha maqolalar</Link>
        </div>
      </article>
    </div>
  );
}
