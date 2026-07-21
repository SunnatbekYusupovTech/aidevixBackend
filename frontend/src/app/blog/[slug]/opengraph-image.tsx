import { ImageResponse } from 'next/og';
import { getArticle } from '@/data/blogArticles';

// SEO-2: Blog maqolasi uchun dinamik OpenGraph rasm (1200x630).
// Maqola sarlavhasi (data/blogArticles.ts) + Aidevix brendi dark navy fonda.
export const runtime = 'edge';
export const alt = 'Aidevix blog';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function BlogOpengraphImage({
  params,
}: {
  params: { slug: string };
}) {
  const article = getArticle(params.slug);
  const title = article?.title || 'Aidevix blog';
  const category = article?.category || 'Maqola';

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: 80,
          background:
            'radial-gradient(1200px 630px at 25% 15%, #141b3a 0%, #0A0E1A 55%)',
          fontFamily: 'sans-serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '10px 26px',
              borderRadius: 999,
              background: 'linear-gradient(90deg, #6366f1 0%, #8b5cf6 100%)',
              color: '#ffffff',
              fontSize: 26,
              fontWeight: 700,
              letterSpacing: 2,
            }}
          >
            AIDEVIX
          </div>
          <div
            style={{
              display: 'flex',
              padding: '10px 24px',
              borderRadius: 12,
              background: 'rgba(236, 72, 153, 0.14)',
              border: '1px solid rgba(244, 114, 182, 0.4)',
              color: '#f9a8d4',
              fontSize: 24,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: 1,
            }}
          >
            {category}
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            fontSize: title.length > 44 ? 62 : 84,
            fontWeight: 800,
            color: '#ffffff',
            letterSpacing: -2,
            lineHeight: 1.08,
            maxWidth: 1040,
          }}
        >
          {title}
        </div>

        <div
          style={{
            display: 'flex',
            fontSize: 30,
            fontWeight: 500,
            color: '#a5b4fc',
          }}
        >
          Blog — aidevix.uz
        </div>

        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            width: '100%',
            height: 10,
            background:
              'linear-gradient(90deg, #6366f1 0%, #8b5cf6 50%, #ec4899 100%)',
          }}
        />
      </div>
    ),
    { ...size },
  );
}
