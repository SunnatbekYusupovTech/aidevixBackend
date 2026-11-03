import Link from 'next/link';
import { SERVICES } from '@/data/services';

// Bosh sahifadagi "Biznes uchun AI" bloki — server-render, statik matn.
// Maqsad: bosh sahifadan /xizmatlar sahifalariga crawlable ichki havolalar
// ("AI integratsiya / avtomatlashtirish / AI agent / trening" intentlari uchun).
export default function AiServicesStrip() {
  return (
    <section
      aria-labelledby="ai-services-heading"
      className="mx-auto max-w-7xl px-4 py-16 sm:px-6"
    >
      <div className="rounded-3xl border border-indigo-500/20 bg-indigo-500/5 p-6 sm:p-10">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-400 mb-3">Biznes uchun AI</p>
        <h2 id="ai-services-heading" className="font-display text-2xl sm:text-3xl font-black tracking-[-0.02em] mb-3">
          O&apos;zbekistonda sun&apos;iy intellektni joriy qilamiz
        </h2>
        <p className="max-w-2xl text-sm sm:text-base opacity-80 leading-relaxed mb-6">
          Aidevix nafaqat o&apos;qitadi: kompaniyalar uchun AI integratsiya, jarayonlarni avtomatlashtirish,
          AI agentlar va korporativ treninglar — pilotdan production&apos;gacha, o&apos;zbek, rus va ingliz tillarida.
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {SERVICES.map((s) => (
            <Link
              key={s.slug}
              href={`/xizmatlar/${s.slug}`}
              className="group rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition-colors hover:border-indigo-400/50"
            >
              <span className="block font-bold group-hover:text-indigo-400">{s.shortTitle}</span>
              <span className="mt-1 block text-xs opacity-70 leading-relaxed line-clamp-3">{s.description}</span>
            </Link>
          ))}
        </div>
        <div className="mt-6">
          <Link
            href="/xizmatlar"
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-indigo-500 transition-colors"
          >
            Barcha AI xizmatlari →
          </Link>
          <Link href="/keyslar/ai-coach" className="ml-4 inline-flex items-center text-sm font-semibold text-indigo-400 hover:underline">
            Keys: Aidevix AI Coach qanday qurilgan →
          </Link>
        </div>
      </div>
    </section>
  );
}
