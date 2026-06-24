import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'O\'quv yo\'l xaritasi',
  description: 'Frontend, backend, Python va AI yo\'nalishlari bo\'yicha bosqichma-bosqich o\'quv yo\'l xaritasi — qaysi kursdan boshlash va keyin nimani o\'rganishni rejalashtiring.',
  alternates: { canonical: '/roadmap' },
  openGraph: {
    title: 'O\'quv yo\'l xaritasi — Aidevix',
    description: 'Dasturchi bo\'lish uchun bosqichma-bosqich yo\'l xaritasi.',
  },
};

export default function RoadmapLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
