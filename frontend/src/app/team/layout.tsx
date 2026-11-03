import { Metadata } from 'next';
import { safeJsonLd } from '@/utils/jsonLd';

export const metadata: Metadata = {
  title: 'Jamoa — asoschilar va dasturchilar',
  description:
    "Aidevix jamoasi — o'zbek tilidagi AI va dasturlash o'quv platformasi hamda biznes uchun AI yechimlarini (AI Coach, AI integratsiya, AI agentlar) yaratgan dasturchilar. Founder & CEO Sunnatbek Yusupov boshchiligida.",
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
    '@id': 'https://sunnatbekyusupov.uz/#person',
    name: 'Sunnatbek Yusupov',
    givenName: 'Sunnatbek',
    familyName: 'Yusupov',
    alternateName: 'Sunnatbek Yusupov | Aidevix Founder',
    jobTitle: ['Founder & CEO', 'CTO & Project Manager', 'AI Integration & Automation Specialist'],
    image: 'https://aidevix.uz/team/sunnatbee.jpg',
    description:
      "Aidevix asoschisi va bosh direktori (Founder & CEO). AI integratsiya va avtomatlashtirish " +
      "mutaxassisi, Frontend Engineer (React, Next.js, TypeScript). O'zbekistonda biznesga sun'iy " +
      "intellektni joriy qiladi, AI agentlar quradi va AI-first dasturlashdan dars beradi. " +
      "CEO AI kompaniyasida CTO va loyiha menejeri: biznes uchun AI integratsiya va AI agent loyihalarini boshqaradi.",
    knowsAbout: [
      'Artificial Intelligence',
      'AI Integration',
      'Business Process Automation',
      'AI Agents',
      'Prompt Engineering',
      'Corporate AI Training',
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
    // CEO AI hali ochiq veb-sayt/ijtimoiy tarmoqsiz (2026-11) — URL'siz Organization.
    affiliation: [
      { '@type': 'Organization', name: 'CEO AI', description: "O'zbekiston biznesi uchun AI integratsiya va AI agentlar" },
    ],
    hasOccupation: [
      { '@type': 'Occupation', name: 'Chief Technology Officer' },
      { '@type': 'Occupation', name: 'Project Manager' },
    ],
    url: 'https://sunnatbekyusupov.uz',
    mainEntityOfPage: 'https://aidevix.uz/team',
    sameAs: [
      'https://sunnatbekyusupov.uz',
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
