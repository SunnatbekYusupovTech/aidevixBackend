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
      <div className="max-w-none text-base-content/70 space-y-4 text-sm sm:text-base">
        <h2 className="text-2xl sm:text-3xl font-black text-base-content mb-4">
          O'zbek tilida dasturlash va IT kurslari
        </h2>
        <p className="leading-relaxed">
          Aidevix — O'zbekistonda AI davri uchun mo'ljallangan onlayn dasturlash va
          IT ta'lim platformasi. Bu yerda <strong>React, JavaScript, TypeScript, Node.js,
          Python</strong> va <strong>sun'iy intellekt</strong> bo'yicha professional
          kurslarni o'zbek tilida o'rganasiz. Har bir kurs amaliy loyihalar,
          topshiriqlar va real misollar bilan tuzilgan — nazariyani emas, ish
          beradigan ko'nikmani o'rgatadi.
        </p>
        <p className="leading-relaxed">
          <strong>IT kurslari</strong> keng qamrovli: veb-dasturlash (frontend va
          backend), mobil dasturlash, kiberxavfsizlik, ma'lumotlar bilan ishlash va
          zamonaviy sun'iy intellekt vositalari. Qaysi IT yo'nalishini tanlashni
          bilmasangiz, roadmap va kategoriya sahifalari orqali o'zingizga mos yo'lni
          topasiz — noldan boshlab karyerangizgacha.
        </p>
        <p className="leading-relaxed">
          Kurslar boshlang'ich darajadan senior darajagacha bosqichma-bosqich
          tuzilgan. Dasturlashni noldan boshlayotgan bo'lsangiz ham, malakangizni
          oshirmoqchi bo'lgan mutaxassis bo'lsangiz ham — o'zingizga mos yo'nalishni
          tanlaysiz. Aidevix'ning asosiy farqi: an'anaviy dasturlash bilan birga
          <strong> Claude Code, Cursor va GitHub Copilot</strong> kabi zamonaviy AI
          vositalari bilan ishlashni ham o'rgatadi.
        </p>
      </div>

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
