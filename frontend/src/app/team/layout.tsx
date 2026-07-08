import { Metadata } from 'next';
import { safeJsonLd } from '@/utils/jsonLd';

export const metadata: Metadata = {
  title: 'Jamoa — asoschilar va dasturchilar',
  description:
    "Aidevix jamoasi — O'zbek tilidagi eng yirik AI va dasturlash o'quv platformasini yaratgan dasturchilar. Founder & CEO Sunnatbek Yusupov boshchiligidagi yosh jamoa.",
  alternates: { canonical: 'https://aidevix.uz/team' },
  openGraph: {
    type: 'profile',
    url: 'https://aidevix.uz/team',
    title: 'Aidevix jamoasi — asoschilar va dasturchilar',
    description:
      "Aidevix platformasini yaratgan jamoa. Founder & CEO Sunnatbek Yusupov.",
    images: [{ url: '/team/sunnatbee.jpg', width: 1200, height: 630, alt: 'Aidevix jamoasi' }],
  },
};

// ProfilePage + Person schema for the founder. This is what lets Google connect
// "Aidevix" → its CEO and surface the LinkedIn profile in the knowledge panel /
// "People also search for" results (same effect tezcode.dev gets for its CEO).
const founderSchema = {
  '@context': 'https://schema.org',
  '@type': 'ProfilePage',
  url: 'https://aidevix.uz/team',
  mainEntity: {
    '@type': 'Person',
    '@id': 'https://aidevix.uz/team#sunnatbek',
    name: 'Sunnatbek Yusupov',
    givenName: 'Sunnatbek',
    familyName: 'Yusupov',
    alternateName: 'Sunnatbek Yusupov | Aidevix Founder',
    jobTitle: 'Founder & CEO',
    image: 'https://aidevix.uz/team/sunnatbee.jpg',
    description:
      "Aidevix asoschisi va bosh direktori (Founder & CEO). Frontend Engineer — React, " +
      "Next.js, TypeScript. O'zbekistonda AI-first dasturlash ta'limini rivojlantirmoqda.",
    knowsAbout: [
      'Artificial Intelligence',
      'Software Engineering',
      'Frontend Development',
      'React',
      'Next.js',
      'TypeScript',
      'Programming Education',
      'EdTech',
      'Startups',
    ],
    knowsLanguage: ['uz', 'ru', 'en'],
    nationality: { '@type': 'Country', name: 'Uzbekistan' },
    homeLocation: {
      '@type': 'Place',
      address: {
        '@type': 'PostalAddress',
        addressLocality: 'Toshkent',
        addressCountry: 'UZ',
      },
    },
    worksFor: {
      '@type': 'EducationalOrganization',
      '@id': 'https://aidevix.uz/#organization',
      name: 'Aidevix',
      url: 'https://aidevix.uz',
    },
    url: 'https://aidevix.uz/team',
    mainEntityOfPage: 'https://aidevix.uz/team',
    sameAs: [
      'https://www.linkedin.com/in/sunnatbekyusupov/',
      'https://github.com/SunnatbekYusupovTech',
      'https://www.instagram.com/sunnatbekyusupov.tech',
      'https://www.facebook.com/sunnatbek.yusupov.7',
      'https://t.me/SUNNATBEE',
    ],
  },
};

export default function TeamLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(founderSchema) }}
      />
      {children}
    </>
  );
}
