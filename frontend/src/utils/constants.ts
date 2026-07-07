/** Barcha UI va metadata (favicon / OG fallback) uchun yagona logotip. `frontend/public/Logo.jpg` */
export const SITE_LOGO_PATH = '/Logo.jpg' as const

const normalizeOrigin = (raw: string) => {
  let u = raw.replace(/\/+$/, '');
  if (u.toLowerCase().endsWith('/api')) u = u.slice(0, -4);
  return u;
}

const normalizeTelegramLink = (raw?: string) => {
  const value = (raw || '').trim()
  if (!value) return 'https://t.me/aidevix'
  if (value.startsWith('http://') || value.startsWith('https://')) return value
  if (value.startsWith('@')) return `https://t.me/${value.slice(1)}`
  return `https://t.me/${value}`
}

/** Brauzerda admin havolalari uchun (Swagger / admin-docs). Localda NEXT_PUBLIC_BACKEND_URL qo‘ying. */
export const BACKEND_ORIGIN = normalizeOrigin(
  process.env.NEXT_PUBLIC_BACKEND_URL ||
    process.env.NEXT_PUBLIC_API_ORIGIN ||
    'https://aidevix-backend-production.up.railway.app',
)

// Brauzerda odatda `/api/proxy/` — `next.config` rewrite orqali Express backendga proxylanadi.
// Vercel'da `NEXT_PUBLIC_API_BASE_URL` ni `/api` qilib qo'ymang (auth so'rovlari Next 404 beradi);
// ishlatmasangiz yoki to'g'ri to'liq origin qo'ying, yoddan `/api/proxy/`.
const base = process.env.NEXT_PUBLIC_API_BASE_URL || '/api/proxy'
const withLeading = (base.startsWith('/') || base.startsWith('http')) ? base : `/${base}`
export const API_BASE_URL = withLeading.endsWith('/') ? withLeading : `${withLeading}/`

// SSR / generateMetadata / sitemap uchun: Node fetch'i relative URL'ni qabul qilmaydi.
// `API_BASE_URL` brauzer rewrite'iga moslangan (`/api/proxy/...`). Server runtime'da
// shu URL bilan fetch chaqirilsa `TypeError: Invalid URL` beradi va try/catch xatoni
// soqov yutadi → SEO metadata bo'sh qoladi. Bu yerda doim absolut backend URL'ni
// qaytaramiz, brauzer va Node ikkalasida ham ishonchli.
export const SSR_API_BASE_URL = `${BACKEND_ORIGIN}/api/`


export const CATEGORIES = [
  { id: 'all',        label: 'Barchasi',   icon: '🌐', color: '#6366f1' },
  { id: 'ai',         label: 'AI va Agentlar', icon: 'AI', color: '#06b6d4' },
  { id: 'html',       label: 'HTML',       icon: '🟠', color: '#f97316' },
  { id: 'css',        label: 'CSS',        icon: '🔵', color: '#3b82f6' },
  { id: 'javascript', label: 'JavaScript', icon: '🟡', color: '#eab308' },
  { id: 'react',      label: 'React',      icon: '⚛️',  color: '#06b6d4' },
  { id: 'typescript', label: 'TypeScript', icon: '🔷', color: '#2563eb' },
  { id: 'nodejs',     label: 'Node.js',    icon: '🟢', color: '#22c55e' },
  { id: 'telegram',   label: 'Telegram TMA', icon: '✈️', color: '#0ea5e9' },
  { id: 'security',   label: 'Kiberxavfsizlik', icon: '🛡️', color: '#ef4444' },
  { id: 'career',     label: 'Karyera/Freelance', icon: '💼', color: '#10b981' },
  { id: 'nocode',     label: 'No-Code',    icon: '⚡', color: '#f59e0b' },
  { id: 'web3',       label: 'Web3/Kripto', icon: '💎', color: '#8b5cf6' },
  { id: 'general',    label: 'Boshqalar',  icon: '📚', color: '#94a3b8' },
]


export const SORT_OPTIONS = [
  { value: 'newest',    label: 'Yangi kurslar' },
  { value: 'popular',   label: 'Eng ommabop' },
  { value: 'rating',    label: 'Yuqori reyting' },
  { value: 'views',     label: 'Ko\'p ko\'rilgan' },
]


export const SOCIAL_LINKS = {
  telegram:  normalizeTelegramLink(process.env.NEXT_PUBLIC_TELEGRAM_CHANNEL),
  instagram: process.env.NEXT_PUBLIC_INSTAGRAM_URL    || 'https://instagram.com/aidevix',
  bot:       process.env.NEXT_PUBLIC_TELEGRAM_BOT     || 'https://t.me/aidevix_bot',
}


export const REQUIRED_SUBSCRIPTIONS = ['telegram', 'instagram']


export const PAGE_SIZE = 12


export const MAX_RATING = 5


// Tokenlar faqat HttpOnly cookie orqali saqlanadi (CLAUDE.md). Bu yerda token kalitlari yo'q.
export const STORAGE_KEYS = {
  USER:  'aidevix_user',
  THEME: 'aidevix_theme',
}


export const ROUTES = {
  HOME:           '/',
  COURSES:        '/courses',
  COURSE:         (id: string) => `/courses/${id}`,
  VIDEO:          (id: string) => `/videos/${id}`,
  TOP:            '/top',
  LOGIN:          '/login',
  REGISTER:       '/register',
  PROFILE:        '/profile',
  SETTINGS_SECURITY: '/settings/security',
  SUBSCRIPTION:   '/subscription',
  CAREERS:        '/careers',
  CHALLENGES:     '/challenges',
  LEADERBOARD:    '/leaderboard',
  REFERRAL:       '/referral',
  MENTORSHIP:     '/mentorship',
  PROMPTS:        '/prompts',
  TEAM:           '/team',
  ROADMAP:        '/roadmap',
  PROJECTS:       '/projects',
  PUBLIC_PROFILE: (username: string) => `/u/${username}`,
  BUG_REPORT:     '/bug-report',
  ABOUT:          '/about',
  BLOG:           '/blog',
  CONTACT:        '/contact',
  HELP:           '/help',
  PRICING:        '/pricing',
  PRIVACY:        '/privacy',
  TERMS:          '/terms',
  SITEMAP_XML:    '/sitemap.xml',
}
