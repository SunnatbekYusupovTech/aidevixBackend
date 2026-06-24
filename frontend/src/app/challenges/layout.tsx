import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Kunlik Challenges',
  description:
    "Har kuni yangi dasturlash va AI vazifalari. Streak quring, XP yig'ing, badge'lar oling — Claude, Cursor va boshqa AI vositalar bilan tajriba orting.",
  alternates: {
    canonical: 'https://aidevix.uz/challenges',
    languages: {
      'uz-UZ': 'https://aidevix.uz/challenges',
      'ru-RU': 'https://aidevix.uz/challenges',
      'en-US': 'https://aidevix.uz/challenges',
      'x-default': 'https://aidevix.uz/challenges',
    },
  },
  openGraph: {
    type: 'website',
    url: 'https://aidevix.uz/challenges',
    title: 'Kunlik Challenges — Aidevix',
    description: "Har kun yangi vazifa — react, python, AI prompts. Streak va XP bilan o'sing.",
    siteName: 'Aidevix',
    locale: 'uz_UZ',
    images: [{ url: 'https://aidevix.uz/Logo.jpg', width: 1200, height: 630, alt: 'Aidevix Challenges' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Kunlik Challenges — Aidevix',
    description: "Har kun yangi dasturlash vazifasi. +80 / +150 / +250 XP.",
    images: ['https://aidevix.uz/Logo.jpg'],
  },
};

export default function ChallengesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
