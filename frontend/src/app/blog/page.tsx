import { Metadata } from 'next';
import BlogClient from './BlogClient';
import { SSR_API_BASE_URL } from '@/utils/constants';

export const metadata: Metadata = {
  title: 'Blog — Aidevix',
  description: 'AI dunyosi va dasturlash bo\'yicha yangiliklar, qo\'llanmalar va tahlillar — o\'zbek tilida.',
  openGraph: {
    title: 'Aidevix Blog — AI va dasturlash yangiliklari',
    description: 'Eng so\'nggi AI tools yangiliklari va amaliy qo\'llanmalar.',
  },
};

async function getNews() {
  try {
    const res = await fetch(`${SSR_API_BASE_URL}public/ai-news`, { next: { revalidate: 600 } });
    if (!res.ok) return [];
    const data = await res.json();
    return data?.data?.news || [];
  } catch {
    return [];
  }
}

export default async function BlogPage() {
  const news = await getNews();
  return <BlogClient initialNews={news} />;
}
