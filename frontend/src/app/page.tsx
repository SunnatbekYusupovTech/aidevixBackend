import { Metadata } from 'next';
import HomeClient from '@/components/home/HomeClient';
import { SSR_API_BASE_URL } from '@/utils/constants';

// Professional Metadata for SEO
export const metadata: Metadata = {
  title: 'Aidevix - Dasturlashni O\'zbek tilida o\'rganing',
  description: 'O\'zbek tilidagi eng yirik va zamonaviy dasturlash o\'quv platformasi. Frontend, Backend, Mobile va AI yo\'nalishlari bo\'yicha sifatli kurslar.',
  alternates: {
    canonical: 'https://aidevix.uz',
    languages: {
      'uz-UZ': 'https://aidevix.uz',
      'ru-RU': 'https://aidevix.uz',
      'en-US': 'https://aidevix.uz',
      'x-default': 'https://aidevix.uz',
    },
  },
  openGraph: {
    title: 'Aidevix - Kelajakni kodlashni boshlang',
    description: 'Dasturlashni O\'zbek tilida sifatli o\'rganing.',
    images: ['/Logo.jpg'],
  },
};

// Server functions to fetch data (SSR/ISR)
async function getTopCourses() {
  try {
    const res = await fetch(`${SSR_API_BASE_URL}courses/top?limit=8`, { next: { revalidate: 1800 } });
    if (!res.ok) return [];
    const data = await res.json();
    return data.data?.courses || [];
  } catch (e) {
    return [];
  }
}

async function getTopVideos() {
  try {
    const res = await fetch(`${SSR_API_BASE_URL}videos/top?limit=6`, { next: { revalidate: 1800 } });
    if (!res.ok) return [];
    const data = await res.json();
    return data.data?.videos || [];
  } catch (e) {
    return [];
  }
}

// Stats SSR — saves ~800ms client-side fetch + render hop on slow networks.
// Falls through to client fetch if backend is reachable from edge but slow.
async function getHomeStats() {
  try {
    const res = await fetch(`${SSR_API_BASE_URL}users/home-stats`, { next: { revalidate: 600 } });
    if (!res.ok) return null;
    const json = await res.json();
    const d = json?.data || {};
    return {
      students: Number(d.students || 0),
      videos: Number(d.videos || 0),
      mentors: Number(d.mentors || 0),
      rating: Number(d.rating || 0),
    };
  } catch {
    return null;
  }
}

export default async function HomePage() {
  // Fetch data on server in parallel for maximum performance
  const [initialCourses, initialVideos, initialStats] = await Promise.all([
    getTopCourses(),
    getTopVideos(),
    getHomeStats(),
  ]);

  return (
    <HomeClient
      initialCourses={initialCourses}
      initialVideos={initialVideos}
      initialStats={initialStats}
    />
  );
}
