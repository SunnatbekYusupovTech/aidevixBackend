import '../styles/globals.css';
import '../styles/animations.css';
import { Metadata } from 'next';
import Script from 'next/script';
import { Manrope, Space_Grotesk } from 'next/font/google';
import { Providers } from '@components/Providers';
import ClientLayoutWrapper from '@components/layout/ClientLayoutWrapper';
import { safeJsonLd } from '@/utils/jsonLd';

const manrope = Manrope({
  subsets: ['latin'],
  variable: '--app-font-sans',
  display: 'swap',
});

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--app-font-display',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://aidevix.uz'),
  title: {
    template: '%s | Aidevix',
    default: 'Aidevix - O\'zbek tilida dasturlashni o\'rganing',
  },
  description: 'Aidevix - O\'zbek tilidagi eng yirik va zamonaviy dasturlash o\'quv platformasi. React, Node.js, Python, Mobile va boshqa yo\'nalishlarda sifatli kurslar.',
  keywords: [
    'aidevix', 'dasturlash kurslari', 'dasturlash', 'online ta\'lim', 'uzbek tilida',
    'react', 'nextjs', 'javascript', 'backend o\'rganish', 'frontend kurslar',
    'python uzbekcha', 'it kurslar', 'AI kurslari', 'kodlashni o\'rganish'
  ],
  authors: [{ name: 'Aidevix Team' }],
  creator: 'Aidevix',
  publisher: 'Aidevix',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  alternates: {
    canonical: 'https://aidevix.uz',
    // [SEO-007] Lokalizatsiyalangan marshrutlar yo'q — barcha til hreflanglar
    // bir xil URL'ga ishora qilardi (ru-RU/en-US ortiqcha). Faqat uz + x-default.
    languages: {
      'uz-UZ': 'https://aidevix.uz',
      'x-default': 'https://aidevix.uz',
    },
  },
  openGraph: {
    type: 'website',
    locale: 'uz_UZ',
    url: 'https://aidevix.uz',
    siteName: 'Aidevix',
    title: 'Aidevix - Kelajakni kodlashni boshlang',
    description: 'O\'zbek tilidagi eng yirik va zamonaviy dasturlash o\'quv platformasi.',
    images: [{ url: '/Logo.jpg', width: 1200, height: 630, alt: 'Aidevix' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Aidevix - Kelajakni kodlashni boshlang',
    description: 'O\'zbek tilidagi eng yirik va zamonaviy dasturlash o\'quv platformasi.',
    images: ['/Logo.jpg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  // Faqat `public/` da haqiqiy mavjud fayllar; PNG favicon qo‘shganda yana kengaytirish mumkin.
  icons: {
    icon: [
      { url: '/favicon-32x32.ico', sizes: '32x32', type: 'image/x-icon' },
      { url: '/Logo.jpg', type: 'image/jpeg' },
    ],
    apple: [{ url: '/Logo.jpg', type: 'image/jpeg' }],
  },
  manifest: '/manifest.json',
  verification: {
    google: 'TUCRHfBmNAFXN61L3px29vaGKe1epzTfbY1lB0zeydk',
  },
};

export const viewport = {
  themeColor: '#4f46e5',
  width: 'device-width',
  initialScale: 1,
  // maximumScale olib tashlandi — foydalanuvchi zoom qila olishi kerak (WCAG 1.4.4).
};

// Site-wide Organization schema — every page inherits this. Powers the Google
// "knowledge panel" for "Aidevix" queries and validates publisher in nested
// schemas (Course, VideoObject, Person). Founder Person ties the brand to the
// CEO's LinkedIn so "Aidevix CEO" / "Sunnatbek Yusupov" surface in search.
const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'EducationalOrganization',
  '@id': 'https://aidevix.uz/#organization',
  name: 'Aidevix',
  legalName: 'Aidevix',
  alternateName: ['Aidevix.uz', 'Aidevix Platform', 'AIDEVIX'],
  url: 'https://aidevix.uz',
  logo: {
    '@type': 'ImageObject',
    url: 'https://aidevix.uz/Logo.jpg',
    width: 512,
    height: 512,
  },
  image: 'https://aidevix.uz/Logo.jpg',
  description:
    "O'zbek tilidagi eng yirik AI va dasturlash o'quv platformasi. Claude Code, Cursor, GitHub Copilot va boshqa AI vositalar bilan amaliy dasturlashni o'rganing.",
  foundingDate: '2024',
  slogan: "Kelajakni kodlashni boshlang",
  knowsLanguage: ['uz', 'ru', 'en'],
  areaServed: {
    '@type': 'Country',
    name: 'Uzbekistan',
  },
  // ⚠️ NAP — Google Business Profile bilan AYNAN bir xil bo'lishi shart.
  // (Profil ma'lumoti: Toshkent, Yangishahar ko'chasi 10, 100194)
  address: {
    '@type': 'PostalAddress',
    streetAddress: "Yangishahar ko'chasi, 10",
    addressLocality: 'Toshkent',
    addressRegion: 'Toshkent',
    postalCode: '100194',
    addressCountry: 'UZ',
  },
  telephone: '+998909712160',
  openingHoursSpecification: {
    '@type': 'OpeningHoursSpecification',
    dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
    opens: '11:00',
    closes: '20:00',
  },
  founder: {
    '@type': 'Person',
    '@id': 'https://aidevix.uz/team#sunnatbek',
    name: 'Sunnatbek Yusupov',
    jobTitle: 'Founder & CEO',
    image: 'https://aidevix.uz/team/sunnatbee.jpg',
    worksFor: { '@id': 'https://aidevix.uz/#organization' },
    url: 'https://aidevix.uz/team',
    sameAs: [
      'https://www.linkedin.com/in/sunnatbee/',
      'https://t.me/SUNNATBEE',
      'https://www.instagram.com/sunnatbee',
    ],
  },
  // Aidevix taklif qiladigan kurs yo'nalishlari — Google'ga platforma nimani
  // o'qitishini aniq bildiradi ("dasturlash kurslari" intentига mos keladi).
  hasOfferCatalog: {
    '@type': 'OfferCatalog',
    name: 'Dasturlash kurslari',
    itemListElement: [
      'Frontend dasturlash (React, Next.js, TypeScript)',
      'Backend dasturlash (Node.js, Express)',
      'Python dasturlash',
      'AI va Agentlar (Claude, Cursor, Copilot)',
      'Mobil dasturlash',
      'Kiberxavfsizlik',
      'Web3 va Kripto',
      'Karyera va Freelance',
    ].map((name) => ({
      '@type': 'Course',
      name,
      provider: { '@id': 'https://aidevix.uz/#organization' },
    })),
  },
  contactPoint: {
    '@type': 'ContactPoint',
    contactType: 'customer support',
    telephone: '+998909712160',
    email: 'support@aidevix.uz',
    url: 'https://aidevix.uz/contact',
    availableLanguage: ['uz', 'ru', 'en'],
  },
  sameAs: [
    'https://t.me/aidevix',
    'https://instagram.com/aidevix',
    'https://www.linkedin.com/company/aidevix',
  ],
};

const websiteSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'Aidevix',
  url: 'https://aidevix.uz',
  potentialAction: {
    '@type': 'SearchAction',
    target: 'https://aidevix.uz/courses?search={search_term_string}',
    'query-input': 'required name=search_term_string',
  },
  inLanguage: ['uz-UZ', 'ru-RU', 'en-US'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="uz" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://telegram.org" crossOrigin="" />
        <link rel="dns-prefetch" href="https://telegram.org" />
        {/* Kurs thumbnail'lari Cloudinary'dan keladi — preconnect LCP'ni qisqartiradi. */}
        <link rel="preconnect" href="https://res.cloudinary.com" crossOrigin="" />
        <link rel="dns-prefetch" href="https://res.cloudinary.com" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: safeJsonLd(organizationSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: safeJsonLd(websiteSchema) }}
        />
      </head>
      <body className={`${manrope.variable} ${spaceGrotesk.variable} min-w-0 w-full max-w-full antialiased selection:bg-indigo-500/30`}>
        {/* Inline script o'rniga statik /public fayllar — CSP `'unsafe-inline'` siz ishlaydi. */}
        <Script src="/theme-bootstrap.js" strategy="beforeInteractive" />
        <Script src="https://telegram.org/js/telegram-web-app.js" strategy="lazyOnload" />
        <Script src="/register-sw.js" strategy="afterInteractive" />
        <Providers>
          <ClientLayoutWrapper>
            {children}
          </ClientLayoutWrapper>
        </Providers>
      </body>
    </html>
  );
}
