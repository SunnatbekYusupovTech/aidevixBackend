import { Metadata } from 'next';
import Link from 'next/link';
import { safeJsonLd } from '@/utils/jsonLd';
import { CASE_STUDIES, CASES_UPDATED } from '@/data/caseStudies';

const BASE = 'https://aidevix.uz';
const URL_ = `${BASE}/keyslar`;

// Keyslar hub — Aidevix va Sunnatbek Yusupov bajargan AI ishlarining dalilli
// ro'yxati. Statik (SSG). Har keys alohida sahifa: /keyslar/[slug].
export const metadata: Metadata = {
  title: 'AI keyslar — Aidevix qurgan production AI tizimlar',
  description:
    "Aidevix va Sunnatbek Yusupov bajargan AI loyihalari: muammo, nima qurilgan, qanday ishlaydi, cheklovlari va manba kodi. O'lchanmagan natijaga raqam yozilmaydi.",
  keywords: ['AI keys', "AI loyiha O'zbekiston", 'Aidevix keyslar', 'LLM integratsiya misol', 'AI Coach keys'],
  alternates: { canonical: URL_ },
  openGraph: {
    type: 'website',
    url: URL_,
    siteName: 'Aidevix',
    locale: 'uz_UZ',
    title: 'Aidevix AI keyslari',
    description: 'Aidevix qurgan va ishlab turgan AI tizimlar — dalillar bilan.',
    images: [{ url: `${BASE}/og-image.png`, width: 1200, height: 630, alt: 'Aidevix AI keyslari' }],
  },
};

const collectionSchema = {
  '@context': 'https://schema.org',
  '@type': 'CollectionPage',
  '@id': `${URL_}#page`,
  url: URL_,
  name: 'Aidevix AI keyslari',
  description: 'Aidevix va Sunnatbek Yusupov qurgan production AI tizimlar — muammo, yechim, cheklovlar, manba kodi.',
  inLanguage: 'uz-UZ',
  dateModified: CASES_UPDATED,
  publisher: { '@id': `${BASE}/#organization` },
  mainEntity: {
    '@type': 'ItemList',
    itemListElement: CASE_STUDIES.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `${URL_}/${c.slug}`,
      name: c.shortTitle,
    })),
  },
};

const breadcrumbSchema = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Bosh sahifa', item: BASE },
    { '@type': 'ListItem', position: 2, name: 'Keyslar', item: URL_ },
  ],
};

export default function CasesHubPage() {
  return (
    <div className="min-h-screen bg-base-100 text-base-content pt-24 pb-20">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(collectionSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumbSchema) }} />

      <div className="mx-auto max-w-5xl px-4">
        <nav className="text-xs text-base-content/50 mb-6 flex flex-wrap gap-1.5" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-primary">Bosh sahifa</Link>
          <span>/</span>
          <span className="text-base-content/70">Keyslar</span>
        </nav>

        <header className="mb-10 max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary mb-3">Dalillar</p>
          <h1 className="font-display text-3xl sm:text-5xl font-black tracking-[-0.03em] leading-tight mb-5">
            Aidevix qurgan AI tizimlar — keyslar
          </h1>
          <p className="text-base-content/70 text-base sm:text-lg leading-relaxed">
            Har keysda: qanday muammo bor edi, nima qurildi, <Link href="/team" className="text-primary hover:underline">Sunnatbek Yusupov</Link>ning
            roli, qanday ishlaydi, qanday tekshirildi va cheklovlari nima. O&apos;lchanmagan natijaga raqam yozilmaydi;
            iloji bo&apos;lganda manba kodi va jonli sahifa havolasi beriladi.
          </p>
        </header>

        <div className="grid gap-5 sm:grid-cols-2">
          {CASE_STUDIES.map((c) => (
            <Link
              key={c.slug}
              href={`/keyslar/${c.slug}`}
              className="group rounded-2xl border border-base-content/10 bg-base-200/50 p-6 transition-colors hover:border-primary/40"
            >
              <span className="block text-[11px] font-bold uppercase tracking-[0.18em] text-primary mb-2">{c.kind}</span>
              <h2 className="font-display text-xl font-bold mb-2 group-hover:text-primary">{c.shortTitle}</h2>
              <p className="text-sm text-base-content/70 leading-relaxed">{c.description}</p>
              <span className="mt-4 inline-block text-sm font-semibold text-primary">Keysni o&apos;qish →</span>
            </Link>
          ))}
        </div>

        <section className="mt-16 rounded-2xl border border-primary/20 bg-primary/5 p-8 text-center">
          <h2 className="font-display text-2xl font-bold mb-3">Shunga o&apos;xshash tizim kerakmi?</h2>
          <p className="text-base-content/70 mb-5">
            AI integratsiya, avtomatlashtirish, AI agentlar va korporativ trening —{' '}
            <Link href="/xizmatlar" className="text-primary hover:underline">barcha xizmatlar</Link>.
          </p>
          <a
            href="https://t.me/aidevix"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-content font-bold text-sm hover:opacity-90 transition-opacity"
          >
            Telegram orqali yozish →
          </a>
        </section>
      </div>
    </div>
  );
}
