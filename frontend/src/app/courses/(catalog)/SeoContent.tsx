import Link from 'next/link';
import { COURSE_CATEGORIES } from '@/data/courseCategories';
import { COURSES_FAQ } from '@/data/coursesFaq';

// Server-rendered SEO kontenti — initial HTML ichida bo'ladi (crawlable). Bu bo'lim
// "dasturlash kurslari" landing sahifasiga matn chuqurligini beradi: kirish matni,
// yo'nalishlar bo'yicha ichki linklar va FAQ. Google shu matn asosida sahifani
// mavzuga (topical relevance) bog'laydi.
export default function SeoContent() {
  return (
    <section className="mx-auto max-w-4xl px-4 mt-20 pt-12 border-t border-base-content/10">

      {/* Yo'nalishlar bo'yicha ichki linklar — internal linking + long-tail */}
      <div className="mt-10">
        <h3 className="text-lg font-bold text-base-content mb-4">Yo'nalishlar bo'yicha kurslar</h3>
        <div className="flex flex-wrap gap-2">
          {COURSE_CATEGORIES.map((c) => (
            <Link
              key={c.slug}
              href={`/courses/category/${c.slug}`}
              className="px-4 py-2 rounded-xl border border-base-content/10 bg-base-200/40 text-sm font-medium hover:border-primary/30 hover:text-primary transition-colors"
            >
              {c.label}
            </Link>
          ))}
        </div>
      </div>

      {/* FAQ — FAQPage schema layout'da beriladi */}
      <div className="mt-12">
        <h2 className="text-2xl font-black text-base-content mb-6">Ko'p so'raladigan savollar</h2>
        <div className="space-y-4">
          {COURSES_FAQ.map((item, i) => (
            <details
              key={i}
              className="group rounded-2xl border border-base-content/10 bg-base-200/40 p-5"
            >
              <summary className="cursor-pointer font-bold text-base-content list-none flex items-center justify-between gap-4">
                {item.q}
                <span className="text-primary transition-transform group-open:rotate-45 text-xl leading-none">+</span>
              </summary>
              <p className="mt-3 text-base-content/65 text-sm leading-relaxed">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
