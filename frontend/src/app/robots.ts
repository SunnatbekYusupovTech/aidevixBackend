import { MetadataRoute } from 'next';

const ALLOW = ['/', '/courses', '/prompts', '/leaderboard', '/challenges', '/playground', '/blog', '/team', '/projects', '/u/', '/llms.txt', '/llms-full.txt'];

const DISALLOW = [
  '/profile/',
  '/admin/',
  '/auth/',
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/verify-code',
  '/subscription',
  '/referral',
  '/api/',
  '/level-up',
  '/offline',
];

// GEO: AI qidiruv/javob tizimlari crawlerlariga aniq ruxsat. `*` qoidasi ham ularni
// qamraydi, lekin ba'zi botlar faqat o'z nomi bilan yozilgan guruhga qaraydi —
// aniq ro'yxat AI javoblarida (ChatGPT, Claude, Perplexity, Gemini, Copilot)
// Aidevix sahifalari iqtibos qilinishi ehtimolini oshiradi.
const AI_BOTS = [
  'GPTBot',
  'OAI-SearchBot',
  'ChatGPT-User',
  'ClaudeBot',
  'Claude-User',
  'Claude-SearchBot',
  'anthropic-ai',
  'PerplexityBot',
  'Perplexity-User',
  'Google-Extended',
  'Applebot-Extended',
  'Bingbot',
  'DuckAssistBot',
  'meta-externalagent',
  'MistralAI-User',
  'YandexBot',
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*', allow: ALLOW, disallow: DISALLOW },
      { userAgent: AI_BOTS, allow: ALLOW, disallow: DISALLOW },
    ],
    sitemap: 'https://aidevix.uz/sitemap.xml',
  };
}
