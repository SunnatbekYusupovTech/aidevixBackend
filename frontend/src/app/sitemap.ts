import { MetadataRoute } from 'next'
import { SSR_API_BASE_URL } from '@/utils/constants'

const BASE = 'https://aidevix.uz'

type Course  = { _id: string; updatedAt?: string };
type Video   = { _id: string; updatedAt?: string };
type RankedUser = { user?: { username?: string; createdAt?: string } };

async function fetchJson<T>(url: string, key: string): Promise<T[]> {
  if (!SSR_API_BASE_URL.startsWith('http')) return [];
  try {
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) return [];
    const data = await res.json();
    return (data?.data?.[key] || []) as T[];
  } catch (e) {
    console.error(`Sitemap fetch error (${key}):`, e);
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Fetch all dynamic content types in parallel — sitemap render must stay fast.
  // Only endpoints that are PUBLIC (no auth) are usable here:
  //   - /courses          — public list, default limit=12 so pass limit=500
  //   - /videos/top       — public top videos (no GET / list endpoint exists)
  //   - /ranking/users    — public leaderboard (data.users[].user.username)
  // Prompts are gated by auth + Telegram subscription, so they are deliberately
  // excluded — Google would only see 401s anyway.
  const [courses, videos, rankedUsers] = await Promise.all([
    fetchJson<Course>(`${SSR_API_BASE_URL}courses?limit=500`, 'courses'),
    fetchJson<Video>(`${SSR_API_BASE_URL}videos/top?limit=500`, 'videos'),
    fetchJson<RankedUser>(`${SSR_API_BASE_URL}ranking/users?limit=500`, 'users'),
  ]);

  const now = new Date();

  const courseUrls = courses.map((c) => ({
    url: `${BASE}/courses/${c._id}`,
    lastModified: new Date(c.updatedAt || now),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  const videoUrls = videos.map((v) => ({
    url: `${BASE}/videos/${v._id}`,
    lastModified: new Date(v.updatedAt || now),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));

  const profileUrls = rankedUsers
    .map((entry) => entry.user?.username)
    .filter((u): u is string => Boolean(u))
    .map((username) => ({
      url: `${BASE}/u/${username}`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 0.5,
    }));

  return [
    { url: BASE,                  lastModified: now, changeFrequency: 'daily',  priority: 1   },
    { url: `${BASE}/courses`,     lastModified: now, changeFrequency: 'daily',  priority: 0.9 },
    { url: `${BASE}/videos`,      lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${BASE}/leaderboard`, lastModified: now, changeFrequency: 'daily',  priority: 0.7 },
    { url: `${BASE}/challenges`,  lastModified: now, changeFrequency: 'daily',  priority: 0.7 },
    { url: `${BASE}/prompts`,     lastModified: now, changeFrequency: 'daily',  priority: 0.8 },
    { url: `${BASE}/playground`,  lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE}/careers`,     lastModified: now, changeFrequency: 'daily',  priority: 0.6 },
    { url: `${BASE}/pricing`,     lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE}/about`,       lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${BASE}/blog`,        lastModified: now, changeFrequency: 'weekly', priority: 0.5 },
    { url: `${BASE}/help`,        lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${BASE}/contact`,     lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
    ...courseUrls,
    ...videoUrls,
    ...profileUrls,
  ];
}
