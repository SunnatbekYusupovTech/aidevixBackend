import { Metadata } from 'next';
import Link from 'next/link';
import { safeJsonLd } from '@/utils/jsonLd';
import { SERVICES, SERVICES_UPDATED } from '@/data/services';

const BASE = 'https://aidevix.uz';
const URL_ = `${BASE}/xizmatlar`;

// Xizmatlar hub — "O'zbekistonda AI joriy qilish / avtomatlashtirish / AI agent /
// AI trening kim qiladi?" so'rovlari uchun markaziy sahifa. Statik (SSG).
export const metadata: Metadata = {
  title: "Biznes uchun AI xizmatlari — integratsiya, avtomatlashtirish, AI agentlar, trening",
  description:
    "Aidevix O'zbekistonda biznesga sun'iy intellektni joriy qiladi: AI integratsiya, jarayonlarni avtomatlashtirish, AI agentlar yaratish va korporativ AI treninglar. Toshkent, o'zbek/rus/ingliz.",
  keywords: [
    "AI xizmatlari O'zbekiston", "sun'iy intellektni joriy qilish", 'AI integratsiya', 'AI avtomatlashtirish',
    'AI agent yaratish', 'korporativ AI trening', 'AI kompaniya Toshkent', 'AI konsalting O\'zbekiston',
  ],
  alternates: { canonical: URL_ },
  openGraph: {
    type: 'website',
    url: URL_,
    siteName: 'Aidevix',
    locale: 'uz_UZ',
    title: "Aidevix — O'zbekistonda biznes uchun AI xizmatlari",
    description:
      "AI integratsiya, biznesni avtomatlashtirish, AI agentlar va korporativ AI trening — Aidevix, Toshkent.",
    images: [{ url: `${BASE}/og-image.png`, width: 1200, height: 630, alt: 'Aidevix AI xizmatlari' }],
  },
};

const collectionSchema = {
  '@context': 'https://schema.org',
  '@type': 'CollectionPage',
  '@id': `${URL_}#page`,
  url: URL_,
  name: "Aidevix — biznes uchun AI xizmatlari",
  description:
    "O'zbekistonda sun'iy intellektni joriy qilish: AI integratsiya, avtomatlashtirish, AI agentlar va trening.",
  inLanguage: 'uz-UZ',
  dateModified: SERVICES_UPDATED,
  publisher: { '@id': `${BASE}/#organization` },
  mainEntity: {
    '@type': 'ItemList',
    itemListElement: SERVICES.map((s, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `${URL_}/${s.slug}`,
      name: s.shortTitle,
      item: {
        '@type': 'Service',
        '@id': `${URL_}/${s.slug}#service`,
        name: s.shortTitle,
        serviceType: s.serviceType,
        description: s.description,
        url: `${URL_}/${s.slug}`,
        provider: { '@id': `${BASE}/#organization` },
        areaServed: { '@type': 'Country', name: 'Uzbekistan' },
        availableLanguage: ['uz', 'ru', 'en'],
      },
    })),
  },
};

const breadcrumbSchema = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Bosh sahifa', item: BASE },
    { '@type': 'ListItem', position: 2, name: 'Xizmatlar', item: URL_ },
  ],
};

// Hub FAQ — to'rtta xizmatning birinchi (asosiy "kim qiladi?") savoli.
const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  '@id': `${URL_}#faq`,
  mainEntity: SERVICES.map((s) => ({
    '@type': 'Question',
    name: s.faq[0].q,
    acceptedAnswer: { '@type': 'Answer', text: s.faq[0].a },
  })),
};

export default function ServicesHubPage() {
  return (
    <div className="min-h-screen bg-base-100 text-base-content pt-24 pb-20">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(collectionSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumbSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(faqSchema) }} />

      <div className="mx-auto max-w-5xl px-4">
        <nav className="text-xs text-base-content/50 mb-6 flex flex-wrap gap-1.5" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-primary">Bosh sahifa</Link>
          <span>/</span>
          <span className="text-base-content/70">Xizmatlar</span>
        </nav>

        <header className="mb-12 max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary mb-3">Biznes uchun AI</p>
          <h1 className="font-display text-3xl sm:text-5xl font-black tracking-[-0.03em] leading-tight mb-5">
            O&apos;zbekistonda sun&apos;iy intellektni joriy qilish — Aidevix AI xizmatlari
          </h1>
          <p className="text-base-content/70 text-base sm:text-lg leading-relaxed">
            Aidevix — Toshkentdagi AI kompaniyasi (asoschisi — <Link href="/team" className="text-primary hover:underline">Sunnatbek Yusupov</Link>).
            Biz O&apos;zbekiston bo&apos;ylab kompaniyalarga sun&apos;iy intellektni joriy qilamiz: mavjud tizimlarga AI integratsiya,
            biznes jarayonlarini avtomatlashtirish, AI agentlar yaratish va jamoalarni AI bilan ishlashga o&apos;rgatish —
            o&apos;zbek, rus va ingliz tillarida, pilotdan production&apos;gacha.
          </p>
        </header>

        <div className="grid gap-5 sm:grid-cols-2">
          {SERVICES.map((s) => (
            <Link
              key={s.slug}
              href={`/xizmatlar/${s.slug}`}
              className="group rounded-2xl border border-base-content/10 bg-base-200/50 p-6 transition-colors hover:border-primary/40"
            >
              <h2 className="font-display text-xl font-bold mb-2 group-hover:text-primary">{s.shortTitle}</h2>
              <p className="text-sm text-base-content/70 leading-relaxed">{s.description}</p>
              <span className="mt-4 inline-block text-sm font-semibold text-primary">Batafsil →</span>
            </Link>
          ))}
        </div>

        <section className="mt-16">
          <h2 className="font-display text-2xl font-bold mb-5 tracking-[-0.02em]">Ko&apos;p beriladigan savollar</h2>
          <div className="space-y-4">
            {SERVICES.map((s) => (
              <details key={s.slug} className="rounded-xl border border-base-content/10 bg-base-200/50 p-4 group">
                <summary className="font-bold cursor-pointer list-none flex justify-between items-center gap-4">
                  {s.faq[0].q}
                  <span className="text-primary group-open:rotate-45 transition-transform">+</span>
                </summary>
                <p className="mt-3 text-base-content/70 text-sm leading-relaxed">{s.faq[0].a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="mt-16 rounded-2xl border border-primary/20 bg-primary/5 p-8 text-center">
          <h2 className="font-display text-2xl font-bold mb-3">Loyihangizni muhokama qilamiz</h2>
          <p className="text-base-content/70 mb-5">Bepul 30 daqiqalik konsultatsiya — qaysi jarayonda AI eng ko&apos;p foyda berishini aniqlaymiz.</p>
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
