import { ImageResponse } from 'next/og';
import { SSR_API_BASE_URL } from '@utils/constants';

// SEO-2: Kurs sahifasi uchun dinamik OpenGraph rasm (1200x630).
// Kurs sarlavhasi + kategoriyasi + Aidevix brendi dark navy fonda.
// Kurs topilmasa yoki fetch muvaffaqiyatsiz bo'lsa — generic "Kurs" kartochkasi.
export const runtime = 'edge';
export const alt = 'Aidevix kursi';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

async function fetchCourse(id: string): Promise<{ title: string; category?: string } | null> {
  try {
    const res = await fetch(`${SSR_API_BASE_URL}courses/${id}`, { next: { revalidate: 3600 } });
    if (!res.ok) return null;
    const data = await res.json();
    const course = data?.data?.course;
    if (!course?.title) return null;
    return { title: course.title, category: course.category };
  } catch {
    return null;
  }
}

export default async function CourseOpengraphImage({
  params,
}: {
  params: { id: string };
}) {
  const course = await fetchCourse(params.id);
  const title = course?.title || 'Dasturlash kursi';
  const label = course?.category || 'Kurs';

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
        {/* Top row: brand + category */}
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
              background: 'rgba(139, 92, 246, 0.16)',
              border: '1px solid rgba(165, 180, 252, 0.4)',
              color: '#c7d2fe',
              fontSize: 24,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: 1,
            }}
          >
            {label}
          </div>
        </div>

        {/* Course title */}
        <div
          style={{
            display: 'flex',
            fontSize: title.length > 40 ? 68 : 92,
            fontWeight: 800,
            color: '#ffffff',
            letterSpacing: -2,
            lineHeight: 1.05,
            maxWidth: 1040,
          }}
        >
          {title}
        </div>

        {/* Footer tagline */}
        <div
          style={{
            display: 'flex',
            fontSize: 30,
            fontWeight: 500,
            color: '#a5b4fc',
          }}
        >
          O&apos;zbek tilida — aidevix.uz
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
