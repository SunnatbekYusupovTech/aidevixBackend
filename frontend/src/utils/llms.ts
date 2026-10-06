// GEO (Generative Engine Optimization): /llms.txt va /llms-full.txt uchun matn
// generatori. AI qidiruv tizimlari (ChatGPT search, Claude, Perplexity, Gemini)
// sahifalarni JS'siz, toza Markdown ko'rinishida o'qiy olishi uchun. Ma'lumot
// blogArticles/courseCategories va jonli kurslar API'sidan olinadi — qo'lda
// yangilanadigan statik fayl kabi eskirib qolmaydi.

import { SSR_API_BASE_URL } from '@/utils/constants';
import { BLOG_ARTICLES, type BlogArticle } from '@/data/blogArticles';
import { COURSE_CATEGORIES } from '@/data/courseCategories';

const BASE = 'https://aidevix.uz';

type LlmsCourse = {
  title?: string;
  slug?: string;
  _id: string;
  description?: string;
  category?: string;
  level?: string;
  isFree?: boolean;
  price?: number | string;
  totalDuration?: number;
};

const LEVELS: Record<string, string> = {
  beginner: "boshlang'ich",
  intermediate: "o'rta",
  advanced: 'yuqori',
};

async function fetchCourses(): Promise<LlmsCourse[]> {
  if (!SSR_API_BASE_URL.startsWith('http')) return [];
  try {
    const res = await fetch(`${SSR_API_BASE_URL}courses?limit=50&sort=newest`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data?.data?.courses || []) as LlmsCourse[];
  } catch {
    return [];
  }
}

const oneLine = (s: string) => s.replace(/\s+/g, ' ').trim();

function courseLine(c: LlmsCourse): string {
  const facts = [
    c.level && LEVELS[c.level] ? `daraja: ${LEVELS[c.level]}` : null,
    c.totalDuration ? `davomiyligi: ~${Math.max(1, Math.round(c.totalDuration / 60))} daqiqa` : null,
    c.isFree ? 'bepul' : c.price ? `narxi: ${Number(c.price).toLocaleString('ru-RU')} so'm` : null,
  ].filter(Boolean);
  const desc = c.description ? `: ${oneLine(c.description)}` : '';
  const meta = facts.length ? ` (${facts.join(', ')})` : '';
  return `- [${c.title || 'Kurs'}](${BASE}/courses/${c.slug || c._id})${desc}${meta}`;
}

const INTRO = `# Aidevix

> Aidevix (aidevix.uz) — o'zbek tilidagi onlayn dasturlash va sun'iy intellekt (AI) ta'lim platformasi. Frontend, Backend, AI vositalari (Claude Code, Cursor, GitHub Copilot, ChatGPT), Telegram botlar, kiberxavfsizlik va IT karyera bo'yicha video kurslar, amaliy topshiriqlar, promptlar kutubxonasi va XP reyting tizimi.

- Til: o'zbek (asosiy); interfeys rus va ingliz tillarida ham mavjud
- Joylashuv: Toshkent, O'zbekiston
- Asoschi: Sunnatbek Yusupov, Founder & CEO (${BASE}/team)
- Aloqa: https://t.me/aidevix, support@aidevix.uz
- Kimlar uchun: dasturlashni noldan boshlovchilar, AI vositalari bilan tezroq ishlashni istagan dasturchilar, IT karyera va freelance'ga o'tmoqchi bo'lganlar`;

const MAIN_PAGES = `## Asosiy sahifalar

- [Barcha kurslar](${BASE}/courses): dasturlash kurslari katalogi
- [Blog](${BASE}/blog): dasturlash va AI bo'yicha o'zbek tilidagi qo'llanmalar
- [Challenges](${BASE}/challenges): kunlik amaliy kod topshiriqlari
- [Prompts](${BASE}/prompts): AI promptlar kutubxonasi (Claude, Cursor, Copilot)
- [Playground](${BASE}/playground): brauzerda kod yozish va AI Coach tahlili
- [Loyihalar](${BASE}/projects): Aidevix jamoasi qurgan production saytlar
- [Reyting](${BASE}/leaderboard): o'quvchilar XP reytingi
- [Jamoa](${BASE}/team): Aidevix asoschilari va dasturchilari`;

const categoriesSection = () =>
  `## Kurs yo'nalishlari\n\n${COURSE_CATEGORIES.map(
    (c) => `- [${c.title}](${BASE}/courses/category/${c.slug}): ${oneLine(c.description)}`,
  ).join('\n')}`;

const blogIndexSection = () =>
  `## Qo'llanmalar (blog)\n\n${BLOG_ARTICLES.map(
    (a) => `- [${a.title}](${BASE}/blog/${a.slug}): ${oneLine(a.excerpt)}`,
  ).join('\n')}`;

const coursesSection = (courses: LlmsCourse[]) =>
  courses.length ? `## Kurslar\n\n${courses.map(courseLine).join('\n')}` : '';

export async function buildLlmsTxt(): Promise<string> {
  const courses = await fetchCourses();
  return [
    INTRO,
    MAIN_PAGES,
    coursesSection(courses),
    categoriesSection(),
    blogIndexSection(),
    `## Optional\n\n- [To'liq matn (llms-full.txt)](${BASE}/llms-full.txt): barcha qo'llanmalarning to'liq matni bitta faylda`,
  ].filter(Boolean).join('\n\n') + '\n';
}

function articleMarkdown(a: BlogArticle): string {
  const body = a.blocks
    .map((b) => {
      switch (b.type) {
        case 'p': return b.text;
        case 'h2': return `### ${b.text}`;
        case 'ul': return b.items.map((i) => `- ${i}`).join('\n');
        case 'cta': return `${b.text}: ${BASE}${b.href}`;
        default: return '';
      }
    })
    .filter(Boolean)
    .join('\n\n');
  const faq = a.faq?.length
    ? `\n\n### Ko'p beriladigan savollar\n\n${a.faq.map((f) => `**${f.q}**\n${f.a}`).join('\n\n')}`
    : '';
  return `## ${a.title}\n\nURL: ${BASE}/blog/${a.slug}\nYangilangan: ${a.updated || a.date}\n\n${body}${faq}`;
}

export async function buildLlmsFullTxt(): Promise<string> {
  const courses = await fetchCourses();
  return [
    INTRO,
    MAIN_PAGES,
    coursesSection(courses),
    categoriesSection(),
    `# Qo'llanmalar — to'liq matn\n\n${BLOG_ARTICLES.map(articleMarkdown).join('\n\n---\n\n')}`,
  ].filter(Boolean).join('\n\n') + '\n';
}

export const llmsResponse = (body: string) =>
  new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      'X-Robots-Tag': 'noindex',
    },
  });
