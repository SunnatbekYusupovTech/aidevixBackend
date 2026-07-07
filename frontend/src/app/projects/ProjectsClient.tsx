'use client';

import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import {
  IoCheckmarkCircle, IoOpenOutline, IoRocket, IoArrowForward, IoWater, IoConstruct,
} from 'react-icons/io5';
import { useTheme } from '@/context/ThemeContext';
import { useLang } from '@/context/LangContext';

type ProjectCopy = {
  category: string;
  description: string;
  features: string[];
};

type PageCopy = {
  kicker: string;
  title1: string;
  title2: string;
  intro: string;
  live: string;
  visit: string;
  projects: Record<'econur' | 'autokran', ProjectCopy>;
  cta: { title: string; subtitle: string; contact: string; courses: string };
};

const CONTENT: Record<'uz' | 'ru' | 'en', PageCopy> = {
  uz: {
    kicker: 'AIDEVIX STUDIO',
    title1: 'Biz qurgan ',
    title2: 'loyihalar',
    intro:
      "Aidevix — nafaqat ta'lim platformasi. Jamoamiz real bizneslar uchun production darajadagi saytlar ishlab chiqadi: dizayn, frontend, SEO va texnik qo'llab-quvvatlash — hammasi bir joyda.",
    live: 'Production • Jonli',
    visit: 'Saytga o‘tish',
    projects: {
      econur: {
        category: 'Xizmat ko‘rsatish sayti',
        description:
          "Toshkentdagi professional gilam yuvish xizmati uchun to'liq sayt: buyurtma oqimi, bepul olib ketish va yetkazish haqida ma'lumot, 24/7 aloqa.",
        features: [
          'Buyurtma va qo‘ng‘iroq CTA oqimi',
          'Local SEO — "gilam yuvish Toshkent" kabi so‘rovlar uchun optimallashtirilgan',
          'Mobil-birinchi dizayn va tezkor yuklanish',
        ],
      },
      autokran: {
        category: 'Texnika ijarasi sayti',
        description:
          "O'zbekiston bo'ylab 30–130 tonnalik avtokran ijarasi xizmati sayti: texnika katalogi, narx so'rovi va 24/7 buyurtma.",
        features: [
          'Texnika katalogi (30–130 tonna)',
          'SEO — respublika bo‘ylab avtokran ijarasi so‘rovlari uchun',
          'Tezkor murojaat va telefon orqali buyurtma',
        ],
      },
    },
    cta: {
      title: 'Biznesingizga sayt kerakmi?',
      subtitle:
        "G'oyangizni production darajadagi saytga aylantiramiz — dizayn, ishlab chiqish, SEO va texnik qo'llab-quvvatlash bilan.",
      contact: 'Bog‘lanish',
      courses: 'Kurslarni ko‘rish',
    },
  },
  ru: {
    kicker: 'AIDEVIX STUDIO',
    title1: 'Наши ',
    title2: 'проекты',
    intro:
      'Aidevix — не только образовательная платформа. Наша команда разрабатывает production-сайты для реального бизнеса: дизайн, frontend, SEO и техническая поддержка — всё в одном месте.',
    live: 'Production • Онлайн',
    visit: 'Открыть сайт',
    projects: {
      econur: {
        category: 'Сайт услуг',
        description:
          'Полноценный сайт для профессиональной чистки ковров в Ташкенте: поток заказов, бесплатный вывоз и доставка, связь 24/7.',
        features: [
          'CTA-поток заказа и звонка',
          'Local SEO — оптимизация под запросы вида «стирка ковров Ташкент»',
          'Mobile-first дизайн и быстрая загрузка',
        ],
      },
      autokran: {
        category: 'Сайт аренды техники',
        description:
          'Сайт аренды автокранов 30–130 тонн по всему Узбекистану: каталог техники, запрос цены и заказ 24/7.',
        features: [
          'Каталог техники (30–130 тонн)',
          'SEO — запросы аренды автокрана по всей республике',
          'Быстрая заявка и заказ по телефону',
        ],
      },
    },
    cta: {
      title: 'Нужен сайт для вашего бизнеса?',
      subtitle:
        'Превратим вашу идею в production-сайт — с дизайном, разработкой, SEO и технической поддержкой.',
      contact: 'Связаться',
      courses: 'Смотреть курсы',
    },
  },
  en: {
    kicker: 'AIDEVIX STUDIO',
    title1: 'Projects we ',
    title2: 'built',
    intro:
      'Aidevix is more than an education platform. Our team ships production-grade websites for real businesses: design, frontend, SEO and ongoing support — all in one place.',
    live: 'Production • Live',
    visit: 'Visit site',
    projects: {
      econur: {
        category: 'Service website',
        description:
          'A complete website for a professional carpet-cleaning service in Tashkent: order flow, free pickup & delivery info, 24/7 contact.',
        features: [
          'Order and call-to-action flow',
          'Local SEO — optimized for queries like “carpet cleaning Tashkent”',
          'Mobile-first design and fast loading',
        ],
      },
      autokran: {
        category: 'Equipment rental website',
        description:
          'A 30–130 ton mobile-crane rental website serving all of Uzbekistan: equipment catalog, price requests and 24/7 ordering.',
        features: [
          'Equipment catalog (30–130 tons)',
          'SEO — crane-rental queries across the country',
          'Quick inquiry and phone ordering',
        ],
      },
    },
    cta: {
      title: 'Need a website for your business?',
      subtitle:
        'We turn your idea into a production-grade website — design, development, SEO and support included.',
      contact: 'Contact us',
      courses: 'Browse courses',
    },
  },
};

const PROJECTS = [
  {
    key: 'econur' as const,
    name: 'Eco Nur',
    domain: 'econur.uz',
    url: 'https://econur.uz',
    image: '/projects/econur.jpg',
    icon: <IoWater />,
    accent: 'from-emerald-500 to-teal-500',
    glow: 'from-emerald-500/10 via-transparent to-teal-500/10',
  },
  {
    key: 'autokran' as const,
    name: 'AUTOKRAN.UZ',
    domain: 'autokran.uz',
    url: 'https://autokran.uz',
    image: '/projects/autokran.jpg',
    icon: <IoConstruct />,
    accent: 'from-amber-500 to-orange-500',
    glow: 'from-amber-500/10 via-transparent to-orange-500/10',
  },
];

export default function ProjectsClient() {
  const { isDark } = useTheme();
  const { lang } = useLang();
  const copy = CONTENT[lang as 'uz' | 'ru' | 'en'] || CONTENT.uz;

  const bgClass = isDark ? 'bg-[#0A0E1A] text-white' : 'bg-slate-50 text-slate-900';
  const cardBg = isDark ? 'bg-[#111726]/70 border-white/5' : 'bg-white border-slate-200';
  const muted = isDark ? 'text-slate-400' : 'text-slate-600';

  return (
    <div className={`min-h-screen pt-24 pb-20 ${bgClass}`}>
      <div className="mx-auto max-w-6xl px-4">
        {/* Hero */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16 max-w-3xl mx-auto"
        >
          <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-indigo-400 mb-3">
            {copy.kicker}
          </div>
          <h1 className="font-display text-3xl sm:text-5xl font-black tracking-[-0.04em] mb-5">
            {copy.title1}
            <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              {copy.title2}
            </span>
          </h1>
          <p className={`text-base sm:text-lg leading-relaxed ${muted}`}>{copy.intro}</p>
        </motion.section>

        {/* Project cards */}
        <section className="grid md:grid-cols-2 gap-5 mb-16">
          {PROJECTS.map((p, i) => {
            const pc = copy.projects[p.key];
            return (
              <motion.article
                key={p.key}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{ delay: i * 0.08 }}
                className={`relative overflow-hidden rounded-3xl border p-6 sm:p-8 flex flex-col ${cardBg}`}
              >
                <div className={`absolute inset-0 bg-gradient-to-br pointer-events-none ${p.glow}`} />

                {/* Sayt screenshot — bosilganda jonli saytga o'tadi */}
                <a
                  href={p.url}
                  target="_blank"
                  rel="noopener"
                  className={`group relative block mb-5 overflow-hidden rounded-2xl border ${
                    isDark ? 'border-white/10' : 'border-slate-200'
                  }`}
                >
                  <Image
                    src={p.image}
                    alt={`${p.name} — ${pc.category}`}
                    width={1280}
                    height={800}
                    sizes="(max-width: 768px) 100vw, 50vw"
                    className="w-full h-auto transition-transform duration-500 group-hover:scale-[1.03]"
                    priority={i === 0}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                </a>

                <div className="relative flex items-start justify-between gap-3 mb-5">
                  <div className={`inline-flex items-center justify-center w-12 h-12 rounded-2xl text-white bg-gradient-to-br ${p.accent} text-2xl`}>
                    {p.icon}
                  </div>
                  <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${
                    isDark ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300' : 'border-emerald-500/30 bg-emerald-50 text-emerald-700'
                  }`}>
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
                    </span>
                    {copy.live}
                  </span>
                </div>

                <div className="relative">
                  <div className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${muted}`}>
                    {pc.category}
                  </div>
                  <h2 className="font-display text-2xl font-black tracking-tight mb-1">{p.name}</h2>
                  <div className="text-sm font-mono text-indigo-400 mb-4">{p.domain}</div>
                  <p className={`text-sm leading-relaxed mb-5 ${muted}`}>{pc.description}</p>

                  <ul className="space-y-2 mb-6">
                    {pc.features.map((f, fi) => (
                      <li key={fi} className={`flex items-start gap-2 text-sm ${muted}`}>
                        <IoCheckmarkCircle className="mt-0.5 shrink-0 text-emerald-400" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="relative mt-auto">
                  <a
                    href={p.url}
                    target="_blank"
                    rel="noopener"
                    className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm text-white bg-gradient-to-r ${p.accent} hover:opacity-90 transition-opacity`}
                  >
                    {copy.visit} <IoOpenOutline />
                  </a>
                </div>
              </motion.article>
            );
          })}
        </section>

        {/* CTA */}
        <section className={`rounded-3xl border p-8 sm:p-12 text-center ${cardBg} relative overflow-hidden`}>
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-transparent to-pink-500/10 pointer-events-none" />
          <div className="relative">
            <IoRocket className="text-5xl mx-auto text-indigo-400 mb-4" />
            <h2 className="font-display text-2xl sm:text-3xl font-black tracking-tight mb-3">
              {copy.cta.title}
            </h2>
            <p className={`max-w-xl mx-auto text-base mb-6 ${muted}`}>{copy.cta.subtitle}</p>
            <div className="flex flex-wrap gap-3 justify-center">
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-bold text-sm hover:shadow-lg hover:shadow-indigo-500/30 transition-shadow"
              >
                {copy.cta.contact} <IoArrowForward />
              </Link>
              <Link
                href="/courses"
                className={`inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm border transition-colors ${
                  isDark ? 'bg-white/5 border-white/10 hover:bg-white/10' : 'bg-white border-slate-200 hover:bg-slate-100'
                }`}
              >
                {copy.cta.courses}
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
