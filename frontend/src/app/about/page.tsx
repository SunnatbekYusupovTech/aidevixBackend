import { Metadata } from 'next';
import AboutClient from './AboutClient';
import { SSR_API_BASE_URL } from '@/utils/constants';

export const metadata: Metadata = {
  title: 'Biz haqimizda — Aidevix',
  description: 'Aidevix — O\'zbek tilidagi eng yirik AI va dasturlash o\'quv platformasi. Bizning missiya va jamoamiz haqida.',
  openGraph: {
    title: 'Aidevix — O\'zbek dasturchilarining yangi avlodini tarbiyalaymiz',
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
