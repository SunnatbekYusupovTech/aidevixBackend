import { MetadataRoute } from 'next'
import { SSR_API_BASE_URL } from '@/utils/constants'
import { BLOG_ARTICLES } from '@/data/blogArticles'
import { COURSE_CATEGORIES } from '@/data/courseCategories'

const BASE = 'https://aidevix.uz'

type Course  = { _id: string; updatedAt?: string };
type RankedUser = { user?: { username?: string; createdAt?: string }; xp?: number };

// Profil sahifalari SEO sifatini ushlab turish uchun filtrlanadi. /ranking/users
// limit=500 bilan XP=0 va test/throwaway akkauntlarni ham qaytaradi — ularni
// sitemap'ga kiritish thin-content sifatida butun domen reytingini pasaytiradi.
const MIN_PROFILE_XP = 50; // kamida bitta real faollik (1 video = +50 XP)

// Aniq test/throwaway username prefikslari (register/e2e smoke testlardan qolgan).
const JUNK_PREFIX = /^(test|debug|prod|final|accept|pro|playwright|emailtest|auth|qa|e2e|smoke|demo)([_\d]|$)/i;

const isJunkUsername = (u: string): boolean => {
  if (JUNK_PREFIX.test(u)) return true;       // test_user, prod_ready, auth1776...
  if (/\d{6,}$/.test(u)) return true;          // unix timestamp suffiks (c1776860411)
  if (/(.)\1{3,}/.test(u)) return true;        // 4+ takroriy belgi (firdavsssss, azizzzz)
  return false;
};

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
  //   - /ranking/users    — public leaderboard (data.users[].user.username)
  // Prompts are gated by auth + Telegram subscription, so they are deliberately
  // excluded — Google would only see 401s anyway.
  // Videolar (/videos/:id) ATAYIN chiqarib tashlandi — sahifa standalone ochilganda
  // "Video topilmadi" + noindex qaytaradi (soft-404). Ularni sitemap'ga qo'yish
  // sitemap sifatini buzadi va indekslashni sekinlashtiradi.
  const [courses, rankedUsers] = await Promise.all([
    fetchJson<Course>(`${SSR_API_BASE_URL}courses?limit=500`, 'courses'),
    fetchJson<RankedUser>(`${SSR_API_BASE_URL}ranking/users?limit=500`, 'users'),
  ]);

  const now = new Date();

  const courseUrls = courses.map((c) => ({
    url: `${BASE}/courses/${c._id}`,
    lastModified: new Date(c.updatedAt || now),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  // Statik SEO sahifalar — blog qo'llanmalari + kurs kategoriya landinglari.
  const blogUrls = BLOG_ARTICLES.map((a) => ({
    url: `${BASE}/blog/${a.slug}`,
    lastModified: new Date(a.updated || a.date),
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }));

  const categoryUrls = COURSE_CATEGORIES.map((c) => ({
    url: `${BASE}/courses/category/${c.slug}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));

  const profileUrls = rankedUsers
    .filter((entry) => (entry.xp ?? 0) >= MIN_PROFILE_XP)
    .map((entry) => entry.user?.username)
    .filter((u): u is string => Boolean(u) && !isJunkUsername(u))
    .map((username) => ({
      url: `${BASE}/u/${username}`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 0.5,
    }));

  return [
    { url: BASE,                  lastModified: now, changeFrequency: 'daily',  priority: 1   },
    { url: `${BASE}/courses`,     lastModified: now, changeFrequency: 'daily',  priority: 0.9 },
    { url: `${BASE}/leaderboard`, lastModified: now, changeFrequency: 'daily',  priority: 0.7 },
    { url: `${BASE}/challenges`,  lastModified: now, changeFrequency: 'daily',  priority: 0.7 },
    { url: `${BASE}/prompts`,     lastModified: now, changeFrequency: 'daily',  priority: 0.8 },
    { url: `${BASE}/playground`,  lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE}/roadmap`,     lastModified: now, changeFrequency: 'weekly', priority: 0.6 },
    { url: `${BASE}/mentorship`,  lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE}/careers`,     lastModified: now, changeFrequency: 'daily',  priority: 0.6 },
    { url: `${BASE}/pricing`,     lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE}/about`,       lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${BASE}/team`,        lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE}/blog`,        lastModified: now, changeFrequency: 'weekly', priority: 0.5 },
    { url: `${BASE}/help`,        lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${BASE}/contact`,     lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
    ...categoryUrls,
    ...blogUrls,
    ...courseUrls,
    ...profileUrls,
  ];
}
