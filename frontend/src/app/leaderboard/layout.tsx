import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: "XP Leaderboard — O'zbek Dasturchilar",
  description:
    "Global va kategoriyalar bo'yicha XP reyting: JavaScript, React, Python, UI/UX. Top dasturchilar, level'lar, AI stack va badge'lar.",
  alternates: {
    canonical: 'https://aidevix.uz/leaderboard',
    languages: {
      'uz-UZ': 'https://aidevix.uz/leaderboard',
      'ru-RU': 'https://aidevix.uz/leaderboard',
      'en-US': 'https://aidevix.uz/leaderboard',
      'x-default': 'https://aidevix.uz/leaderboard',
    },
  },
  openGraph: {
    type: 'website',
    url: 'https://aidevix.uz/leaderboard',
    title: 'XP Leaderboard | Aidevix',
    description: "Eng faol o'zbek dasturchilar reytingi. AMATEUR'dan LEGEND'gacha.",
    siteName: 'Aidevix',
    locale: 'uz_UZ',
    images: [{ url: 'https://aidevix.uz/Logo.jpg', width: 1200, height: 630, alt: 'Aidevix Leaderboard' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'XP Leaderboard | Aidevix',
    description: "Top o'zbek dasturchilar. XP, streak, badge.",
    images: ['https://aidevix.uz/Logo.jpg'],
  },
};

export default function LeaderboardLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
