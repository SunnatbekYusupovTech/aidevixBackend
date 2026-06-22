import { Metadata } from 'next';
import { safeJsonLd } from '@/utils/jsonLd';

export const metadata: Metadata = {
  title: 'Jamoa — Aidevix asoschilari va dasturchilari',
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
    jobTitle: 'Founder & CEO',
    image: 'https://aidevix.uz/team/sunnatbee.jpg',
    description:
      "Aidevix asoschisi va bosh direktori. Aidevix strategiyasi, mahsulot yo'nalishi va frontend arxitekturasi.",
    knowsAbout: ['Software Engineering', 'React', 'Next.js', 'TypeScript', 'AI', 'EdTech'],
    worksFor: {
      '@type': 'EducationalOrganization',
      '@id': 'https://aidevix.uz/#organization',
      name: 'Aidevix',
      url: 'https://aidevix.uz',
    },
    url: 'https://aidevix.uz/team',
    sameAs: [
      'https://www.linkedin.com/in/sunnatbee/',
      'https://t.me/SUNNATBEE',
      'https://www.instagram.com/sunnatbee',
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
