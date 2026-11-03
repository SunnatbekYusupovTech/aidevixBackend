import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { safeJsonLd } from '@/utils/jsonLd';
import { CASE_STUDIES, getCaseStudy } from '@/data/caseStudies';

const BASE = 'https://aidevix.uz';
const PERSON_ID = 'https://sunnatbekyusupov.uz/#person';

// Har keys — alohida statik (SSG) sahifa: TechArticle (about: SoftwareApplication)
// + FAQPage + BreadcrumbList JSON-LD. Muallif — Sunnatbek Yusupov (Person @id
// portfolio saytiga unifikatsiya qilingan).
export function generateStaticParams() {
  return CASE_STUDIES.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> },
): Promise<Metadata> {
  const { slug } = await params;
  const cs = getCaseStudy(slug);
  if (!cs) return { title: 'Keys topilmadi' };

  const url = `${BASE}/keyslar/${cs.slug}`;
  return {
    title: `Keys: ${cs.title}`,
    description: cs.description,
    keywords: cs.keywords,
    alternates: { canonical: url },
    openGraph: {
      type: 'article',
      url,
      siteName: 'Aidevix',
      locale: 'uz_UZ',
      title: `Keys: ${cs.shortTitle} — Aidevix`,
      description: cs.description,
      publishedTime: cs.datePublished,
      modifiedTime: cs.dateModified,
      authors: ['https://sunnatbekyusupov.uz'],
      images: [{ url: `${BASE}/og-image.png`, width: 1200, height: 630, alt: cs.shortTitle }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `Keys: ${cs.shortTitle} — Aidevix`,
      description: cs.description,
      images: [`${BASE}/og-image.png`],
    },
  };
}

export default async function CaseStudyPage(
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const cs = getCaseStudy(slug);
  if (!cs) notFound();

  const url = `${BASE}/keyslar/${cs.slug}`;

  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'TechArticle',
    '@id': `${url}#article`,
    headline: cs.title,
    description: cs.description,
    url,
    inLanguage: 'uz-UZ',
    datePublished: cs.datePublished,
    dateModified: cs.dateModified,
    keywords: cs.keywords.join(', '),
    author: {
      '@type': 'Person',
      '@id': PERSON_ID,
      name: 'Sunnatbek Yusupov',
      url: 'https://sunnatbekyusupov.uz',
      jobTitle: 'Founder & CEO, Aidevix',
    },
    publisher: { '@id': `${BASE}/#organization` },
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    about: {
      '@type': 'SoftwareApplication',
      name: cs.product.name,
      url: cs.product.url,
      applicationCategory: cs.product.category,
      operatingSystem: 'Web',
      creator: { '@id': `${BASE}/#organization` },
      contributor: { '@id': PERSON_ID },
    },
    citation: cs.sources.map((s) => s.href),
  };

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    '@id': `${url}#breadcrumb`,
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Bosh sahifa', item: BASE },
      { '@type': 'ListItem', position: 2, name: 'Keyslar', item: `${BASE}/keyslar` },
      { '@type': 'ListItem', position: 3, name: cs.shortTitle, item: url },
    ],
  };

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    '@id': `${url}#faq`,
    mainEntity: cs.faq.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };

  return (
    <div className="min-h-screen bg-base-100 text-base-content pt-24 pb-20">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(articleSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumbSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(faqSchema) }} />

      <article className="mx-auto max-w-3xl px-4">
        <nav className="text-xs text-base-content/50 mb-6 flex flex-wrap gap-1.5" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-primary">Bosh sahifa</Link>
          <span>/</span>
          <Link href="/keyslar" className="hover:text-primary">Keyslar</Link>
          <span>/</span>
          <span className="text-base-content/70 line-clamp-1">{cs.shortTitle}</span>
        </nav>

        <header className="mb-8">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary mb-3">{cs.kind}</p>
          <h1 className="font-display text-3xl sm:text-4xl font-black tracking-[-0.03em] mb-4 leading-tight">
            {cs.title}
          </h1>
          <p className="text-base-content/70 text-base sm:text-lg leading-relaxed">{cs.summary}</p>
          <dl className="mt-6 grid gap-3 sm:grid-cols-2 text-sm">
            <div className="rounded-xl border border-base-content/10 bg-base-200/50 p-4">
              <dt className="text-[11px] font-bold uppercase tracking-[0.18em] text-base-content/50 mb-1">Holati</dt>
              <dd className="text-base-content/80">{cs.status}</dd>
            </div>
            <div className="rounded-xl border border-base-content/10 bg-base-200/50 p-4">
              <dt className="text-[11px] font-bold uppercase tracking-[0.18em] text-base-content/50 mb-1">Muallif</dt>
              <dd className="text-base-content/80">
                <a href="https://sunnatbekyusupov.uz" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Sunnatbek Yusupov</a>
                {' '}— Aidevix asoschisi · yangilangan {cs.dateModified}
              </dd>
            </div>
          </dl>
        </header>

        <div className="space-y-8 text-base-content/80 leading-relaxed text-[15px] sm:text-base">
          {cs.sections.map((sec) => (
            <section key={sec.heading}>
              <h2 className="font-display text-xl sm:text-2xl font-bold text-base-content tracking-[-0.02em] mb-3">{sec.heading}</h2>
              {sec.paragraphs?.map((p, i) => <p key={i} className="mb-3">{p}</p>)}
              {sec.bullets && (
                <ul className="list-disc pl-5 space-y-2 marker:text-primary">
                  {sec.bullets.map((b, i) => <li key={i}>{b}</li>)}
                </ul>
              )}
            </section>
          ))}

          <section>
            <h2 className="font-display text-xl sm:text-2xl font-bold text-base-content tracking-[-0.02em] mb-3">Texnologiyalar</h2>
            <div className="flex flex-wrap gap-2">
              {cs.stack.map((s) => (
                <span key={s} className="rounded-lg border border-base-content/10 bg-base-200/50 px-3 py-1 text-xs font-semibold">{s}</span>
              ))}
            </div>
          </section>

          <section>
            <h2 className="font-display text-xl sm:text-2xl font-bold text-base-content tracking-[-0.02em] mb-3">Tekshirish uchun manbalar</h2>
            <ul className="space-y-2">
              {cs.sources.map((s) => (
                <li key={s.href}>
                  <a href={s.href} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium break-all">
                    {s.label} ↗
                  </a>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <section className="mt-12">
          <h2 className="font-display text-2xl font-bold mb-5 tracking-[-0.02em]">Ko&apos;p so&apos;raladigan savollar</h2>
          <div className="space-y-4">
            {cs.faq.map((f, i) => (
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

        <section className="my-10 rounded-2xl border border-primary/20 bg-primary/5 p-6 text-center">
          <p className="text-base-content/80 mb-4 font-medium">Biznesingiz uchun shunga o&apos;xshash AI yordamchi yoki agent kerakmi?</p>
          <a
            href="https://t.me/aidevix"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-content font-bold text-sm hover:opacity-90 transition-opacity"
          >
            Telegram orqali yozish →
          </a>
        </section>

        <section className="mt-12 pt-8 border-t border-base-content/10">
          <h2 className="font-display text-lg font-bold mb-4">Tegishli sahifalar</h2>
          <div className="flex flex-col gap-2">
            {cs.related.map((r) => (
              <Link key={r.href} href={r.href} className="text-primary hover:underline font-medium text-sm inline-flex items-center gap-1">
                → {r.label}
              </Link>
            ))}
          </div>
        </section>

        <div className="mt-12">
          <Link href="/keyslar" className="text-sm text-base-content/50 hover:text-primary">← Barcha keyslar</Link>
        </div>
      </article>
    </div>
  );
}
