import type { Metadata } from 'next';
import { SSR_API_BASE_URL } from '@utils/constants';
import { safeJsonLd } from '@utils/jsonLd';

interface Props {
  params: { id: string };
  children: React.ReactNode;
}

async function fetchVideo(id: string) {
  try {
    const res = await fetch(`${SSR_API_BASE_URL}videos/${id}`, { next: { revalidate: 3600 } });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.data?.video || null;
  } catch {
    return null;
  }
}

function isoDuration(seconds: number | undefined): string | null {
  if (!seconds || seconds <= 0) return null;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `PT${h ? `${h}H` : ''}${m ? `${m}M` : ''}${s ? `${s}S` : ''}` || 'PT0S';
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const video = await fetchVideo(params.id);
  if (!video) {
    return {
      title: 'Video topilmadi | Aidevix',
      robots: { index: false, follow: false },
    };
  }

  const title = `${video.title} | Aidevix`;
  const description =
    video.description?.slice(0, 160) ||
    `${video.title} — Aidevix platformasidagi video dars.`;
  const image = video.thumbnail || 'https://aidevix.uz/Logo.jpg';
  const url = `https://aidevix.uz/videos/${params.id}`;

  return {
    title,
    description,
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
      type: 'video.other',
      url,
      title,
      description,
      siteName: 'Aidevix',
      locale: 'uz_UZ',
      images: [{ url: image, width: 1280, height: 720, alt: video.title }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image],
    },
  };
}

export default async function VideoLayout({ params, children }: Props) {
  const video = await fetchVideo(params.id);

  // VideoObject schema unlocks rich preview in Google Videos tab.
  const videoSchema = video
    ? {
        '@context': 'https://schema.org',
        '@type': 'VideoObject',
        name: video.title,
        description: video.description?.slice(0, 500) || video.title,
        thumbnailUrl: video.thumbnail ? [video.thumbnail] : ['https://aidevix.uz/Logo.jpg'],
        uploadDate: video.createdAt || new Date().toISOString(),
        ...(isoDuration(video.duration) ? { duration: isoDuration(video.duration) } : {}),
        contentUrl: `https://aidevix.uz/videos/${params.id}`,
        embedUrl: `https://aidevix.uz/videos/${params.id}`,
        publisher: {
          '@type': 'Organization',
          name: 'Aidevix',
          logo: { '@type': 'ImageObject', url: 'https://aidevix.uz/Logo.jpg' },
        },
        inLanguage: 'uz',
      }
    : null;

  return (
    <>
      {videoSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: safeJsonLd(videoSchema) }}
        />
      )}
      {children}
    </>
  );
}
