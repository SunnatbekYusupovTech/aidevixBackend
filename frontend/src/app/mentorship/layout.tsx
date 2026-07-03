import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Mentorlik dasturi',
  description: 'Aidevix mentorlik dasturi — tajribali dasturchilardan shaxsiy yo\'l-yo\'riq, kod review va karyera maslahati bilan tezroq o\'sing.',
  alternates: { canonical: '/mentorship' },
  openGraph: {
    title: 'Mentorlik dasturi — Aidevix',
    description: 'Tajribali dasturchilardan shaxsiy mentorlik va kod review.',
    images: [{ url: 'https://aidevix.uz/Logo.jpg', width: 1200, height: 630, alt: 'Aidevix' }],
  },
};

export default function MentorshipLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
