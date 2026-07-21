import { ImageResponse } from 'next/og';

// SEO-2: Brendlangan default OpenGraph rasm (1200x630).
// Next.js bu faylni avtomatik aniqlaydi va root layout'dagi statik /Logo.jpg
// o'rniga barcha sahifalar uchun OG rasm sifatida ishlatadi (route-level takes precedence).
export const runtime = 'edge';
export const alt = 'Aidevix — AI va Dasturlash';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          // Kanonik dark navy background (#0A0E1A) + nozik gradient.
          background:
            'radial-gradient(1200px 630px at 30% 20%, #141b3a 0%, #0A0E1A 55%)',
          fontFamily: 'sans-serif',
        }}
      >
        {/* Gradient brand pill */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '14px 32px',
            borderRadius: 999,
            background: 'linear-gradient(90deg, #6366f1 0%, #8b5cf6 100%)',
            color: '#ffffff',
            fontSize: 30,
            fontWeight: 700,
            letterSpacing: 2,
            marginBottom: 44,
          }}
        >
          AIDEVIX
        </div>

        <div
          style={{
            display: 'flex',
            fontSize: 132,
            fontWeight: 800,
            color: '#ffffff',
            letterSpacing: -4,
            lineHeight: 1,
          }}
        >
          Aidevix
        </div>

        <div
          style={{
            display: 'flex',
            marginTop: 28,
            fontSize: 40,
            fontWeight: 500,
            color: '#a5b4fc',
          }}
        >
          AI va Dasturlash — O&apos;zbek tilida
        </div>

        {/* Pastki gradient accent strip */}
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
