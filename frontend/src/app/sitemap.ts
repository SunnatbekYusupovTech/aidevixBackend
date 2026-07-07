import { MetadataRoute } from 'next'
import { SSR_API_BASE_URL } from '@/utils/constants'
import { BLOG_ARTICLES } from '@/data/blogArticles'
import { COURSE_CATEGORIES } from '@/data/courseCategories'

const BASE = 'https://aidevix.uz'

// SEO-007: slug maydoni qo'shildi — sitemap'da endi slug URL'lar ishlatiladi
type Course  = { _id: string; slug?: string; updatedAt?: string };
type RankedUser = { user?: { username?: string; createdAt?: string }; xp?: number };

// Profil sahifalari SEO sifatini ushlab turish uchun filtrlanadi. /ranking/users
// limit=500 bilan XP=0 va test/throwaway akkauntlarni ham qaytaradi — ularni
// sitemap'ga kiritish thin-content sifatida butun domen reytingini pasaytiradi.
// 2026-07-07: 50→200 — XP=50-150 profillar sitemap'ning ~40%ini tashkil qilib,
// thin-content ulushini oshirayotgan edi. 200+ = kamida 4 video yoki quiz+video.
// Sitemap'dan chiqarish deindex qilmaydi — leaderboard'dan link saqlanadi.
const MIN_PROFILE_XP = 200;

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

// Barqaror sana: oxirgi real kontent yangilanish sanasi (2026-06-24 deploy).
// `new Date()` o'rniga qo'yiladi — haqiqatan o'zgarmaydigan statik sahifalar uchun.
const STATIC_LAST_MODIFIED = new Date('2026-06-24');

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
  // Bonus-14: /courses/sitemap endpoint'i 50-limit clamp'dan xoli (max 5000)
  // va slug ma'lumotini qaytaradi. Fallback: eski /courses?limit=500 (deploy oldin).
  const [rawCourses, rankedUsers] = await Promise.all([
    fetchJson<Course>(`${SSR_API_BASE_URL}courses/sitemap`, 'courses'),
    fetchJson<RankedUser>(`${SSR_API_BASE_URL}ranking/users?limit=500`, 'users'),
  ]);

  // Yangi endpoint ishlasa uni ishlat, aks holda eski fallback
  const courses: Course[] = rawCourses.length > 0
    ? rawCourses
    : await fetchJson<Course>(`${SSR_API_BASE_URL}courses?limit=500`, 'courses');

  const now = new Date();

  // SEO-007: slug mavjud bo'lsa slug URL, aks holda _id URL
  const courseUrls = courses.map((c) => ({
    url: `${BASE}/courses/${c.slug || c._id}`,
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
    .filter((entry) => Boolean(entry.user?.username) && !isJunkUsername(entry.user?.username ?? ''))
    .map((entry) => ({
      // encodeURIComponent — non-ASCII username'lar (ğ, ō...) sitemap spec bo'yicha
      // <loc>da percent-encoded bo'lishi shart
      url: `${BASE}/u/${encodeURIComponent(entry.user!.username!)}`,
      // createdAt mavjud bo'lsa ishlatiladi, aks holda lastModified tashlab yuboriladi
      ...(entry.user?.createdAt ? { lastModified: new Date(entry.user.createdAt) } : {}),
      changeFrequency: 'weekly' as const,
      priority: 0.5,
    }));

  return [
    { url: BASE,                  lastModified: now,                    changeFrequency: 'daily',   priority: 1   },
    { url: `${BASE}/courses`,     lastModified: now,                    changeFrequency: 'daily',   priority: 0.9 },
    { url: `${BASE}/leaderboard`, lastModified: now,                    changeFrequency: 'daily',   priority: 0.7 },
    { url: `${BASE}/challenges`,  lastModified: now,                    changeFrequency: 'daily',   priority: 0.7 },
    { url: `${BASE}/prompts`,     lastModified: now,                    changeFrequency: 'daily',   priority: 0.8 },
    { url: `${BASE}/playground`,  lastModified: STATIC_LAST_MODIFIED,   changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE}/roadmap`,     lastModified: STATIC_LAST_MODIFIED,   changeFrequency: 'weekly',  priority: 0.6 },
    { url: `${BASE}/projects`,    lastModified: new Date('2026-07-07'), changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE}/mentorship`,  lastModified: STATIC_LAST_MODIFIED,   changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE}/careers`,     lastModified: now,                    changeFrequency: 'daily',   priority: 0.6 },
    { url: `${BASE}/pricing`,     lastModified: STATIC_LAST_MODIFIED,   changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE}/about`,       lastModified: STATIC_LAST_MODIFIED,   changeFrequency: 'monthly', priority: 0.4 },
    { url: `${BASE}/team`,        lastModified: STATIC_LAST_MODIFIED,   changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE}/blog`,        lastModified: now,                    changeFrequency: 'weekly',  priority: 0.5 },
    { url: `${BASE}/help`,        lastModified: STATIC_LAST_MODIFIED,   changeFrequency: 'monthly', priority: 0.4 },
    { url: `${BASE}/contact`,     lastModified: STATIC_LAST_MODIFIED,   changeFrequency: 'monthly', priority: 0.4 },
    { url: `${BASE}/privacy`,     lastModified: STATIC_LAST_MODIFIED,   changeFrequency: 'yearly',  priority: 0.3 },
    { url: `${BASE}/terms`,       lastModified: STATIC_LAST_MODIFIED,   changeFrequency: 'yearly',  priority: 0.3 },
    ...categoryUrls,
    ...blogUrls,
    ...courseUrls,
    ...profileUrls,
  ];
}
