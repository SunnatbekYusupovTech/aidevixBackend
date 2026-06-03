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
    'dasturlash', 'online ta\'lim', 'uzbek tilida', 'react', 'nextjs', 'javascript', 
    'backend o\'rganish', 'frontend kurslar', 'python uzbekcha', 'it kurslar'
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
    languages: {
      'uz-UZ': 'https://aidevix.uz',
      'ru-RU': 'https://aidevix.uz',
      'en-US': 'https://aidevix.uz',
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
  manifest: '/site.webmanifest',
  verification: {
    google: 'TUCRHfBmNAFXN61L3px29vaGKe1epzTfbY1lB0zeydk',
  },
};

export const viewport = {
  themeColor: '#4f46e5',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

// Site-wide Organization schema — every page inherits this. Powers the Google
// "knowledge panel" for "Aidevix" queries and validates publisher in nested
// schemas (Course, VideoObject, Person).
const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Aidevix',
  alternateName: ['Aidevix.uz', 'Aidevix Platform'],
  url: 'https://aidevix.uz',
  logo: 'https://aidevix.uz/Logo.jpg',
  description:
    "O'zbek tilidagi eng yirik AI va dasturlash o'quv platformasi. Claude Code, Cursor, GitHub Copilot va boshqa AI vositalar.",
  sameAs: [
    'https://t.me/aidevix',
    'https://instagram.com/aidevix',
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
