import { Metadata } from 'next';

export const coursesMetadata: Metadata = {
  // "Dasturlash kurslari" — asosiy target query'ni title boshiga olib chiqildi.
  title: "Dasturlash kurslari — O'zbek tilida onlayn ta'lim",
  description:
    "Aidevix dasturlash kurslari: React, Node.js, Python, TypeScript, AI va kiberxavfsizlik bo'yicha O'zbek tilidagi professional onlayn kurslar. Boshlang'ichdan senior darajagacha amaliy ta'lim.",
  keywords: [
    'dasturlash kurslari', 'onlayn dasturlash kurslari', 'o\'zbek tilida dasturlash',
    'react kurslari', 'python kurslari', 'javascript kurslari', 'frontend kurslari',
    'backend kurslari', 'AI kurslari', 'it kurslar', 'kodlashni o\'rganish', 'aidevix kurslar',
  ],
  alternates: {
    canonical: 'https://aidevix.uz/courses',
  },
  openGraph: {
    type: 'website',
    url: 'https://aidevix.uz/courses',
    title: "Dasturlash kurslari — Aidevix",
    description: "O'zbek tilidagi eng keng dasturlash kurs kutubxonasi. React, Python, AI va boshqalar.",
    siteName: 'Aidevix',
    locale: 'uz_UZ',
    images: [
      {
        url: 'https://aidevix.uz/Logo.jpg',
        width: 1200,
        height: 630,
        alt: 'Aidevix dasturlash kurslari',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: "Dasturlash kurslari — Aidevix",
    description: "O'zbek tilidagi professional dasturlash kurslari.",
    images: ['https://aidevix.uz/Logo.jpg'],
  },
};
