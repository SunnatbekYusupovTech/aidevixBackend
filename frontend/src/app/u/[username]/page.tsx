import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import PublicProfileClient from './PublicProfileClient';
import { SSR_API_BASE_URL } from '@/utils/constants';
import { safeJsonLd } from '@/utils/jsonLd';

async function fetchProfile(username: string) {
  try {
    const res = await fetch(
      `${SSR_API_BASE_URL}users/${username}/public`,
      { next: { revalidate: 60 } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data?.data || null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: { params: { username: string } }): Promise<Metadata> {
  const profile = await fetchProfile(params.username);
  if (!profile) return { title: 'Foydalanuvchi topilmadi', robots: { index: false, follow: false } };
  const url = `https://aidevix.uz/u/${params.username}`;
  return {
    title: `${profile.user.username} — Aidevix`,
    description: profile.stats.bio || `${profile.user.username} — Level ${profile.stats.level}, ${profile.stats.xp.toLocaleString()} XP`,
    alternates: {
      canonical: url,
      languages: {
        'uz-UZ': url,
        'ru-RU': url,
        'en-US': url,
        'x-default': url,
      },
    },
    openGraph: {
      type: 'profile',
      url,
      title: `${profile.user.username} | Aidevix`,
      description: profile.stats.bio || `Level ${profile.stats.level} dasturchi`,
      siteName: 'Aidevix',
      images: profile.user.avatar
        ? [{ url: profile.user.avatar, width: 400, height: 400, alt: profile.user.username }]
        : [{ url: 'https://aidevix.uz/Logo.jpg', width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary',
      title: `${profile.user.username} | Aidevix`,
      description: profile.stats.bio || `Level ${profile.stats.level} dasturchi`,
      images: profile.user.avatar ? [profile.user.avatar] : ['https://aidevix.uz/Logo.jpg'],
    },
  };
}

export default async function PublicProfilePage({ params }: { params: { username: string } }) {
  const profile = await fetchProfile(params.username);
  if (!profile) notFound();

  const url = `https://aidevix.uz/u/${params.username}`;
  const fullName =
    profile.user.firstName
      ? `${profile.user.firstName}${profile.user.lastName ? ` ${profile.user.lastName}` : ''}`
      : profile.user.username;

  // Person schema — Google can surface this in knowledge panel and rich results
  // for the username query.
  const personSchema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: fullName,
    alternateName: profile.user.username,
    url,
    ...(profile.user.avatar && { image: profile.user.avatar }),
    ...(profile.stats?.bio && { description: profile.stats.bio }),
    jobTitle: `Level ${profile.stats.level}${profile.stats.title ? ` · ${profile.stats.title}` : ''}`,
    memberOf: {
      '@type': 'Organization',
      name: 'Aidevix',
      url: 'https://aidevix.uz',
    },
  };

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://aidevix.uz' },
      { '@type': 'ListItem', position: 2, name: 'Foydalanuvchilar', item: 'https://aidevix.uz/leaderboard' },
      { '@type': 'ListItem', position: 3, name: profile.user.username, item: url },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(personSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumbSchema) }}
      />
      <PublicProfileClient profile={profile} />
    </>
  );
}
