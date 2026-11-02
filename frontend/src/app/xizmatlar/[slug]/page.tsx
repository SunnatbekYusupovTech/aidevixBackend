import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { safeJsonLd } from '@/utils/jsonLd';
import { SERVICES, SERVICES_UPDATED, getService } from '@/data/services';

const BASE = 'https://aidevix.uz';

// Har xizmat — alohida statik (SSG) landing: Service + FAQPage + Breadcrumb JSON-LD.
export function generateStaticParams() {
  return SERVICES.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> },
): Promise<Metadata> {
  const { slug } = await params;
  const service = getService(slug);
  if (!service) return { title: 'Xizmat topilmadi' };

  const url = `${BASE}/xizmatlar/${service.slug}`;
  return {
    title: service.title,
    description: service.description,
    keywords: service.keywords,
    alternates: { canonical: url },
    openGraph: {
      type: 'website',
      url,
      siteName: 'Aidevix',
      locale: 'uz_UZ',
      title: `${service.title} — Aidevix`,
      description: service.description,
      images: [{ url: `${BASE}/og-image.png`, width: 1200, height: 630, alt: service.shortTitle }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${service.title} — Aidevix`,
      description: service.description,
      images: [`${BASE}/og-image.png`],
    },
  };
}

export default async function ServicePage(
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const service = getService(slug);
  if (!service) notFound();

  const url = `${BASE}/xizmatlar/${service.slug}`;

  const serviceSchema = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    '@id': `${url}#service`,
    name: service.shortTitle,
    alternateName: service.title,
    serviceType: service.serviceType,
    description: service.description,
    url,
    inLanguage: 'uz-UZ',
    provider: { '@id': `${BASE}/#organization` },
    areaServed: { '@type': 'Country', name: 'Uzbekistan' },
    availableLanguage: ['uz', 'ru', 'en'],
    availableChannel: {
      '@type': 'ServiceChannel',
      serviceUrl: 'https://t.me/aidevix',
      availableLanguage: ['uz', 'ru', 'en'],
    },
    // Sahifaning o'zi (WebPage) — sana va asosiy mavzu uchun.
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': url,
      dateModified: SERVICES_UPDATED,
      author: { '@id': `${BASE}/team#sunnatbek` },
      publisher: { '@id': `${BASE}/#organization` },
    },
  };

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    '@id': `${url}#breadcrumb`,
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Bosh sahifa', item: BASE },
      { '@type': 'ListItem', position: 2, name: 'Xizmatlar', item: `${BASE}/xizmatlar` },
      { '@type': 'ListItem', position: 3, name: service.shortTitle, item: url },
    ],
  };

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    '@id': `${url}#faq`,
    mainEntity: service.faq.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };

  return (
    <div className="min-h-screen bg-base-100 text-base-content pt-24 pb-20">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(serviceSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumbSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(faqSchema) }} />

      <article className="mx-auto max-w-3xl px-4">
        <nav className="text-xs text-base-content/50 mb-6 flex flex-wrap gap-1.5" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-primary">Bosh sahifa</Link>
          <span>/</span>
          <Link href="/xizmatlar" className="hover:text-primary">Xizmatlar</Link>
          <span>/</span>
          <span className="text-base-content/70 line-clamp-1">{service.shortTitle}</span>
        </nav>

        <header className="mb-8">
          <h1 className="font-display text-3xl sm:text-4xl font-black tracking-[-0.03em] mb-4 leading-tight">
            {service.title}
          </h1>
          <p className="text-base-content/70 text-base sm:text-lg leading-relaxed">{service.intro}</p>
        </header>

        <div className="space-y-5 text-base-content/80 leading-relaxed text-[15px] sm:text-base">
          {service.blocks.map((block, i) => {
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
              const external = block.href.startsWith('http');
              const cls = 'inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-content font-bold text-sm hover:opacity-90 transition-opacity';
              return (
                <div key={i} className="my-8 rounded-2xl border border-primary/20 bg-primary/5 p-6 text-center">
                  <p className="text-base-content/80 mb-4 font-medium">{block.text}</p>
                  {external ? (
                    <a href={block.href} target="_blank" rel="noopener noreferrer" className={cls}>{block.label} →</a>
                  ) : (
                    <Link href={block.href} className={cls}>{block.label} →</Link>
                  )}
                </div>
              );
            }
            return <p key={i}>{block.text}</p>;
          })}
        </div>

        <section className="mt-12">
          <h2 className="font-display text-2xl font-bold mb-5 tracking-[-0.02em]">Ko&apos;p so&apos;raladigan savollar</h2>
          <div className="space-y-4">
            {service.faq.map((f, i) => (
              <details key={i} className="rounded-xl border border-base-content/10 bg-base-200/50 p-4 group">
                <summary className="font-bold cursor-pointer list-none flex justify-between items-center gap-4">
                  {f.q}
                  <span className="text-primary group-open:rotate-45 transition-transform">+</span>
                </summary>
                <p className="mt-3 text-base-content/70 text-sm leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="mt-12 pt-8 border-t border-base-content/10">
          <h2 className="font-display text-lg font-bold mb-4">Tegishli sahifalar</h2>
          <div className="flex flex-col gap-2">
            {service.related.map((r, i) => (
              <Link key={i} href={r.href} className="text-primary hover:underline font-medium text-sm inline-flex items-center gap-1">
                → {r.label}
              </Link>
            ))}
            {SERVICES.filter((s) => s.slug !== service.slug).map((s) => (
              <Link key={s.slug} href={`/xizmatlar/${s.slug}`} className="text-primary hover:underline font-medium text-sm inline-flex items-center gap-1">
                → {s.shortTitle}
              </Link>
            ))}
          </div>
        </section>

        <div className="mt-12">
          <Link href="/xizmatlar" className="text-sm text-base-content/50 hover:text-primary">← Barcha xizmatlar</Link>
        </div>
      </article>
    </div>
  );
}
