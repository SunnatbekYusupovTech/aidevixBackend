import { Metadata } from 'next';
import AboutClient from './AboutClient';
import { SSR_API_BASE_URL } from '@/utils/constants';

export const metadata: Metadata = {
  title: 'Biz haqimizda - Aidevix | O\'zbekistonning Yetakchi IT va AI Platformasi',
  description: 'Aidevix loyihasi nima, missiyasi qanday va uning ortida kimlar turadi? Jamoamiz, maqsadlarimiz va O\'zbekistonda IT hamda Sun\'iy intellekt kelajagi haqida to\'liq ma\'lumot.',
  alternates: { canonical: '/about' },
  openGraph: {
    title: 'Biz haqimizda - Aidevix | IT loyihasi va Jamoa',
    description: 'Bizning hikoyamiz, qiymatlarimiz va missiyamiz.',
  },
};

async function getStats() {
  try {
    const res = await fetch(`${SSR_API_BASE_URL}users/home-stats`, { next: { revalidate: 3600 } });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.data || null;
  } catch {
    return null;
  }
}

export default async function AboutPage() {
  const stats = await getStats();
  return <AboutClient stats={stats} />;
}
