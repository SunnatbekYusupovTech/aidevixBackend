import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: "IT Vakansiyalar — O'zbekiston",
  description:
    "O'zbekiston va remote IT vakansiyalar: junior, middle, senior, lead. Frontend, backend, mobile, AI. Maosh, level, kompaniya.",
  alternates: {
    canonical: 'https://aidevix.uz/careers',
    languages: {
      'uz-UZ': 'https://aidevix.uz/careers',
      'ru-RU': 'https://aidevix.uz/careers',
      'en-US': 'https://aidevix.uz/careers',
      'x-default': 'https://aidevix.uz/careers',
    },
  },
  openGraph: {
    type: 'website',
    url: 'https://aidevix.uz/careers',
    title: 'IT Vakansiyalar | Aidevix',
    description: "O'zbekistondagi yangi IT vakansiyalar — har kun yangilanadi.",
    siteName: 'Aidevix',
    locale: 'uz_UZ',
    images: [{ url: 'https://aidevix.uz/Logo.jpg', width: 1200, height: 630, alt: 'Aidevix Careers' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'IT Vakansiyalar | Aidevix',
    description: "O'zbekiston IT bozori — qulay filtr va to'g'ri ma'lumot.",
    images: ['https://aidevix.uz/Logo.jpg'],
  },
};

export default function CareersLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
