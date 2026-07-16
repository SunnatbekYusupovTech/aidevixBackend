import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/courses', '/ru/courses', '/prompts', '/leaderboard', '/challenges', '/playground', '/blog', '/about', '/team', '/help', '/careers', '/pricing', '/contact', '/projects', '/u/'],
        disallow: [
          '/profile/',
          '/admin/',
          '/auth/',
          '/login',
          '/register',
          '/forgot-password',
          '/reset-password',
          '/verify-code',
          '/subscription/',
          '/referral',
          '/api/',
          '/level-up',
          '/offline',
        ],
      },
    ],
    sitemap: 'https://aidevix.uz/sitemap.xml',
  };
}
