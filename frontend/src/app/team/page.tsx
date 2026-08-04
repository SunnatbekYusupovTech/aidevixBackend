'use client';

import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import Image from 'next/image';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { FaInstagram, FaTelegram, FaLinkedin, FaGithub, FaFacebook } from 'react-icons/fa';
import { useLang } from '@/context/LangContext';
import { useTheme } from '@/context/ThemeContext';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

// ─── Types & data ────────────────────────────────────────────────────────────

type LocalizedString = { uz: string; en: string; ru: string };

type TeamMember = {
  id: string;
  name: string;
  age: number;
  hideAge?: boolean;
  roleBadge: LocalizedString;
  details: LocalizedString;
  stack: string[];
  asset: string;
  telegram?: string;
  instagram?: string;
  linkedin?: string;
  github?: string;
  facebook?: string;
};

const TEAM_MEMBERS: TeamMember[] = [
  {
    id: 'sunnatbek',
    name: 'Sunnatbek Yusupov',
    age: 0,
    hideAge: true,
    roleBadge: { uz: 'CEO / ASOSCHI', en: 'CEO / FOUNDER', ru: 'CEO / ОСНОВАТЕЛЬ' },
    details: {
      uz: 'Aidevix strategiyasi, mahsulot yo\'nalishi va frontend arxitekturasi.',
      en: 'Aidevix strategy, product direction, and frontend architecture.',
      ru: 'Стратегия Aidevix, направление продукта и архитектура фронтенда.'
    },
    stack: ['React', 'TypeScript', 'Next.js', 'Tailwind CSS'],
    asset: '/team/sunnatbee.jpg',
    telegram: 'https://t.me/SUNNATBEE',
    instagram: 'https://www.instagram.com/sunnatbekyusupov.tech',
    linkedin: 'https://www.linkedin.com/in/sunnatbekyusupov/',
    github: 'https://github.com/SunnatbekYusupovTech',
    facebook: 'https://www.facebook.com/sunnatbek.yusupov.7',
  },
  {
    id: 'sardor',
    name: 'SARDOR',
    age: 15,
    roleBadge: { uz: 'TEAM LEAD / QA', en: 'TEAM LEAD / QA', ru: 'ТИМЛИД / QA' },
    details: {
      uz: 'UI/UX dizayn tizimlari va kreativ g\'oyalar yaratuvchisi. Muammolarni tezkor bartaraf etuvchi faol bug fixer, JWT cookie auth, Mongoose sxemalari va CI/CD.',
      en: 'UI/UX design systems and creative ideas generator. Active bug fixer, JWT cookie auth, Mongoose schemas, and CI/CD.',
      ru: 'Создатель систем UI/UX дизайна и креативных идей. Активный баг фиксер, JWT cookie auth, схемы Mongoose и CI/CD.'
    },
    stack: ['UI/UX Design', 'Figma', 'Node.js', 'Mongoose', 'Swagger API'],
    asset: '/team/Sardor.jpg',
  },
  {
    id: 'firdavs',
    name: 'FIRDAVS',
    age: 16,
    roleBadge: { uz: 'AVTORIZATSIYA', en: 'AUTH SPECIALIST', ru: 'АВТОРИЗАЦИЯ' },
    details: {
      uz: 'Autentifikatsiya tizimi, Cookie-based JWT sessiyasi, ProtectedRoute, email validation, kunlik mukofot modali.',
      en: 'Authentication system, Cookie-based JWT session, ProtectedRoute, email validation, daily reward modal.',
      ru: 'Система аутентификации, JWT сессии на основе cookie, ProtectedRoute, проверка email, модальное окно ежедневных наград.'
    },
    stack: ['React 18', 'TypeScript', 'Next.js 14', 'Redux Toolkit'],
    asset: '/team/Firdavs.jpg',
  },
  {
    id: 'numton',
    name: 'NUMTON',
    age: 16,
    hideAge: true,
    roleBadge: { uz: 'HOME UI / FRONTEND', en: 'HOME UI / FRONTEND', ru: 'HOME UI / ФРОНТЕНД' },
    details: {
      uz: 'Bosh sahifa UI/UX, hero, metrikalar, kurs bloklari, Framer Motion va GSAP silliq animatsiyalari.',
      en: 'Home UI/UX, hero section, metrics, course blocks, smooth Framer Motion and GSAP animations.',
      ru: 'UI/UX главной страницы, секция hero, метрики, блоки курсов, плавные анимации Framer Motion и GSAP.'
    },
    stack: ['Framer Motion', 'GSAP', 'CSS 3D', 'UI/UX'],
    asset: '/team/numton.jpg',
  },
  {
    id: 'kamton',
    name: 'KAMTON',
    age: 16,
    hideAge: true,
    roleBadge: { uz: 'XAVFSIZLIK & UPDATER', en: 'SECURITY & UPDATER', ru: 'БЕЗОПАСНОСТЬ И ОБНОВЛЕНИЯ' },
    details: {
      uz: 'Sayt xavfsizligini ta\'minlovchi, texnik qo\'llab-quvvatlash, tizimni yangilash (updater) va buglarni tezkor bartaraf etuvchi mutaxassis.',
      en: 'Ensuring site security, tech support, system updating (updater), and rapid bug fixing specialist.',
      ru: 'Обеспечение безопасности сайта, техническая поддержка, обновление системы (updater) и специалист по быстрому исправлению багов.'
    },
    stack: ['Cyber Security', 'Bug Fixing', 'Tech Support', 'Updater'],
    asset: '/team/kamton.jpg',
  },
  {
    id: 'abduvoris',
    name: 'ABDUVORIS',
    age: 16,
    roleBadge: { uz: 'VIDEO MUHANDISI', en: 'VIDEO ENGINEER', ru: 'ВИДЕОИНЖЕНЕР' },
    details: {
      uz: 'Bunny.net Stream HLS video pleer, videolar ichidagi quiz tizimi, progress tracking va skeletonlar.',
      en: 'Bunny.net Stream HLS video player, in-video quiz system, progress tracking, and skeletons.',
      ru: 'Видео плеер Bunny.net Stream HLS, система тестов внутри видео, отслеживание прогресса и скелетоны.'
    },
    stack: ['Bunny.net', 'HLS.js', 'Video Stream', 'Skeleton CSS'],
    asset: '/team/Abduvoris.jpg',
  },
  {
    id: 'doniyor',
    name: 'DONIYOR',
    age: 16,
    roleBadge: { uz: 'KURS ARXITEKTORI', en: 'COURSE ARCHITECT', ru: 'АРХИТЕКТОР КУРСОВ' },
    details: {
      uz: 'Kurslar tuzilishi, modullar tizimi va darslar ketma-ketligi arxitekturasi.',
      en: 'Course structure, module system, and lesson sequence architecture.',
      ru: 'Структура курсов, система модулей и архитектура последовательности уроков.'
    },
    stack: ['React 18', 'TypeScript', 'Next.js 14', 'Redux Toolkit'],
    asset: '/team/Doniyor.jpg',
  },
  {
    id: 'suhrob',
    name: 'SUHROB',
    age: 14,
    roleBadge: { uz: 'REYTING YARATUVCHI', en: 'RANKING BUILDER', ru: 'РАЗРАБОТЧИК РЕЙТИНГА' },
    details: {
      uz: 'Reyting tizimi, XP (tajriba ballari) hisoblash logikasi va peshqadamlar jadvali (leaderboard).',
      en: 'Ranking system, XP (experience points) calculation logic, and leaderboard implementation.',
      ru: 'Система рейтинга, логика вычисления XP (очков опыта) и таблица лидеров (leaderboard).'
    },
    stack: ['Leaderboards', 'Gamification', 'XP Logic', 'MongoDB'],
    asset: '/team/Suhrob.jpg',
  },
  {
    id: 'qudrat',
    name: 'QUDRAT',
    age: 14,
    roleBadge: { uz: 'MOTION YARATUVCHI', en: 'MOTION CREATOR', ru: 'СОЗДАТЕЛЬ АНИМАЦИЙ' },
    details: {
      uz: 'Foydalanuvchi tajribasini boyitish uchun interaktiv GSAP va Framer Motion animatsiyalari.',
      en: 'Interactive GSAP and Framer Motion animations to enrich user experience.',
      ru: 'Интерактивные анимации GSAP и Framer Motion для обогащения пользовательского опыта.'
    },
    stack: ['GSAP 3', 'Three.js', 'Framer Motion'],
    asset: '/team/Qudrat.jpg',
  },
  {
    id: 'mystery',
    name: 'WANTED_NODE',
    age: 0,
    hideAge: true,
    roleBadge: { uz: 'QIDIRUVDA / ?????', en: 'WANTED / ?????', ru: 'РАЗЫСКИВАЕТСЯ / ?????' },
    details: {
      uz: '#WANTED #CREATIVE_MIND // Tizimda bo\'shliq aniqlandi. _Bizga kreativ va nostandart fikrlaydigan dev kerak!_ #JOIN_US // matrix_integrity: unstable.',
      en: '#WANTED #CREATIVE_MIND // System void detected. _We need a creative and unconventional dev!_ #JOIN_US // matrix_integrity: unstable.',
      ru: '#WANTED #CREATIVE_MIND // В системе обнаружена пустота. _Нам нужен креативный дев с нестандартным мышлением!_ #JOIN_US // matrix_integrity: unstable.'
    },
    stack: ['#CREATIVE', '#CODER', '#BUG_FIXER', 'YOU?'],
    asset: '/team/mystery.jpg',
  },
];

const LOCALIZED_CONTENT = {
  uz: {
    years: 'YOSH',
    stack: "TEXNOLOGIYALAR RO'YHATI",
    experience: 'JAMOADAGI VAZIFASI',
    socials: 'ALOQA KANALLARI',
    portfolio: 'PORTFOLIO ULANISHI',
    dragHint: "SICHQONCHA BILAN AYLANTIRING YOKI G'ILDIRAKNI AYLANTIRING",
  },
  en: {
    years: 'Y.O',
    stack: 'TECH STACK',
    experience: 'PLATFORM CONTRIBUTION',
    socials: 'COMMUNICATION NODES',
    portfolio: 'PORTFOLIO INTERCONNECT',
    dragHint: 'DRAG OR SCROLL TO DRIFT THE GRID',
  },
  ru: {
    years: 'ЛЕТ',
    stack: 'СТЕК ТЕХНОЛОГИЙ',
    experience: 'ВКЛАД В ПЛАТФОРМУ',
    socials: 'УЗЛЫ СВЯЗИ',
    portfolio: 'ПОРТФОЛИО СВЯЗЬ',
    dragHint: 'ПЕРЕТАЩИТЕ ИЛИ ПРОКРУТИТЕ КОЛЕСО',
  },
} as const;

type Lang = keyof typeof LOCALIZED_CONTENT;
type Content = (typeof LOCALIZED_CONTENT)['en'];

// ─── TeamCard ───────────────────────────────────────────────────────────────

function TeamCard({
  member,
  index,
  c,
  lang,
  flippedId,
  onFlip,
}: {
  member: TeamMember;
  index: number;
  c: Content;
  lang: Lang;
  flippedId: string | null;
  onFlip: (id: string | null) => void;
}) {
  const flipped = flippedId === member.id;
  const isCEO = member.id === 'sunnatbek';
  const isMystery = member.id === 'mystery';
  const { isDark } = useTheme();

  const cardBg = isDark ? 'bg-zinc-950/40' : 'bg-white/80';
  const textLayerBg = isDark ? 'bg-zinc-950/95' : 'bg-white/95';
  const gradientFrom = isDark ? 'from-zinc-950' : 'from-white';
  const chipBg = isDark ? 'bg-zinc-900/20' : 'bg-slate-100';
  const socialBg = isDark ? 'bg-zinc-900/10' : 'bg-slate-100';
  const dividerBorder = isDark ? 'border-zinc-900' : 'border-slate-200';
  const mutedText = isDark ? 'text-zinc-500' : 'text-slate-500';
  const faintText = isDark ? 'text-zinc-600' : 'text-slate-400';
  const bodyText = isDark ? 'text-zinc-300' : 'text-slate-700';
  const quoteText = isDark ? 'text-zinc-200' : 'text-slate-800';
  const mysteryImgBg = isDark ? 'bg-black/75' : 'bg-slate-100';
  const neutralBorder = isDark ? 'border-zinc-800' : 'border-slate-300';

  const borderBase = isCEO
    ? 'border-yellow-500/20 hover:border-yellow-500/70'
    : isMystery
    ? 'border-red-500/20 hover:border-red-500/70'
    : `${neutralBorder} hover:border-blue-500/60`;

  const cornerColor = isCEO ? 'border-yellow-500' : isMystery ? 'border-red-500' : 'border-blue-500';

  const nameColor = isCEO
    ? isDark
      ? 'text-yellow-400'
      : 'text-yellow-600'
    : isMystery
    ? isDark
      ? 'text-red-400'
      : 'text-red-600'
    : isDark
    ? 'text-blue-400'
    : 'text-blue-600';

  const badgeClass = isCEO
    ? isDark
      ? 'bg-yellow-950/85 border border-yellow-500/40 text-yellow-400'
      : 'bg-yellow-50 border border-yellow-500/40 text-yellow-700'
    : isMystery
    ? isDark
      ? 'bg-red-950/90 border border-red-500/50 text-red-400 animate-pulse'
      : 'bg-red-50 border border-red-500/50 text-red-600 animate-pulse'
    : isDark
    ? 'bg-blue-950/85 border border-blue-500/40 text-blue-400'
    : 'bg-blue-50 border border-blue-500/40 text-blue-700';

  const techClass = isCEO
    ? isDark
      ? 'border-zinc-800 text-zinc-400 hover:border-yellow-500/35 hover:text-yellow-300'
      : 'border-slate-300 text-slate-600 hover:border-yellow-500/50 hover:text-yellow-600'
    : isMystery
    ? 'border-red-500/30 text-red-400/90 font-bold italic'
    : isDark
    ? 'border-zinc-800 text-zinc-400 hover:border-blue-500/35 hover:text-blue-300'
    : 'border-slate-300 text-slate-600 hover:border-blue-500/50 hover:text-blue-600';

  const socialClass = isCEO
    ? isDark
      ? 'border-zinc-800 text-zinc-400 hover:border-yellow-500/40 hover:text-yellow-400 hover:bg-yellow-500/5'
      : 'border-slate-300 text-slate-600 hover:border-yellow-500/40 hover:text-yellow-600 hover:bg-yellow-500/5'
    : isDark
    ? 'border-zinc-800 text-zinc-400 hover:border-blue-500/40 hover:text-blue-400 hover:bg-blue-500/5'
    : 'border-slate-300 text-slate-600 hover:border-blue-500/40 hover:text-blue-600 hover:bg-blue-500/5';

  return (
    <div
      className={`group relative border ${cardBg} transition-all duration-300 rounded-none w-full h-full overflow-hidden cursor-pointer ${borderBase}`}
      style={{ pointerEvents: 'auto' }}
      onClick={() => onFlip(flipped ? null : member.id)}
    >
      {(['tl', 'tr', 'bl', 'br'] as const).map((pos) => (
        <div
          key={pos}
          className={`absolute w-3.5 h-3.5 z-20 pointer-events-none transition-all duration-200 ${cornerColor}
            ${pos === 'tl' ? 'top-0 left-0 border-t border-l group-hover:border-t-2 group-hover:border-l-2' : ''}
            ${pos === 'tr' ? 'top-0 right-0 border-t border-r group-hover:border-t-2 group-hover:border-r-2' : ''}
            ${pos === 'bl' ? 'bottom-0 left-0 border-b border-l group-hover:border-b-2 group-hover:border-l-2' : ''}
            ${pos === 'br' ? 'bottom-0 right-0 border-b border-r group-hover:border-b-2 group-hover:border-r-2' : ''}
          `}
        />
      ))}

      <div className="absolute top-2 right-2 z-30 pointer-events-none">
        <span className={`text-[7px] font-bold tracking-widest uppercase opacity-40 ${nameColor}`}>
          {flipped ? '← IMG' : 'INFO →'}
        </span>
      </div>

      {/* ── IMAGE LAYER ── */}
      <div
        className="absolute inset-0 transition-opacity duration-300"
        style={{ opacity: flipped ? 0 : 1, pointerEvents: flipped ? 'none' : 'auto' }}
      >
        {isMystery ? (
          <div className={`w-full h-full flex flex-col items-center justify-center ${mysteryImgBg} relative overflow-hidden`}>
            <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(239,68,68,0.08)_50%,rgba(0,0,0,0)_50%)] bg-[size:100%_8px] pointer-events-none" />
            <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(239,68,68,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(239,68,68,0.03)_1px,transparent_1px)] bg-[size:15px_15px] pointer-events-none" />
            <div className="absolute top-1/4 w-[120%] text-center transform -rotate-12 bg-red-600/90 border-y-2 border-red-500 py-2 z-10">
              <span className="text-xl font-black text-black tracking-[0.3em] font-mono animate-pulse">WANTED</span>
            </div>
            <span className="text-8xl font-black text-red-500/80 font-mono tracking-tighter animate-pulse mt-8">?</span>
            <div className="absolute bottom-14 text-center z-10 px-4">
              <span className="text-[9px] tracking-[0.2em] font-mono text-red-500/50 font-bold uppercase animate-pulse block">
                {'// SEEKING_CREATIVE_NODE'}
              </span>
            </div>
          </div>
        ) : (
          <Image
            src={member.asset}
            alt={`${member.name} — Aidevix jamoasi`}
            fill
            sizes="280px"
            priority={index === 0}
            className="object-cover object-top filter grayscale opacity-60 contrast-125 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-500"
          />
        )}

        <div className={`absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t ${gradientFrom} to-transparent pointer-events-none`} />
        <div className="absolute bottom-0 inset-x-0 p-3 z-10">
          <div className="mb-1">
            <span className={`px-2 py-0.5 text-[9px] tracking-wider uppercase font-bold rounded-none ${badgeClass}`}>
              [{member.roleBadge[lang] || member.roleBadge.uz}]
            </span>
          </div>
          <h3 className={`text-sm font-black tracking-wider uppercase ${nameColor}`}>{member.name}</h3>
          <p className={`text-[9px] ${mutedText} font-mono mt-0.5`}>
            {isMystery ? '// ID: ANOMALY_NODE' : `// ID: DEV_NODE_0${index + 1}`}
          </p>
        </div>
      </div>

      {/* ── TEXT LAYER ── */}
      <div
        className={`absolute inset-0 ${textLayerBg} transition-opacity duration-300 p-4 flex flex-col justify-between`}
        style={{ opacity: flipped ? 1 : 0, pointerEvents: flipped ? 'auto' : 'none' }}
      >
        <div className="space-y-3">
          <div>
            <span className={`px-2 py-0.5 text-[9px] tracking-wider uppercase font-bold rounded-none ${badgeClass}`}>
              [{member.roleBadge[lang] || member.roleBadge.uz}]
            </span>
            <div className="flex items-baseline gap-2 mt-1.5">
              <h3 className={`text-sm font-black tracking-wider uppercase ${nameColor}`}>{member.name}</h3>
              {!member.hideAge && (
                <span className={`text-[9px] ${mutedText} font-mono`}>
                  [{member.age} {c.years}]
                </span>
              )}
            </div>
            <p className={`text-[9px] ${faintText} font-mono`}>
              {isMystery ? '// ID: ANOMALY_NODE' : `// ID: DEV_NODE_0${index + 1}`}
            </p>
          </div>

          <div className="space-y-1">
            <span className={`text-[9px] font-bold ${mutedText} tracking-wider uppercase block`}>
              {'// '}
              {c.experience}
            </span>
            {isMystery ? (
              <div className="space-y-1.5">
                <div className="flex flex-wrap gap-1">
                  {['#WANTED', '#CREATIVE_MIND', '#JOIN_US'].map((tag) => (
                    <span key={tag} className="px-1.5 py-0.5 text-[9px] font-black bg-red-950/50 border border-red-500/40 text-red-400">
                      {tag}
                    </span>
                  ))}
                </div>
                <p
                  className={`text-[10px] ${quoteText} leading-relaxed italic border-l-2 border-red-500/40 pl-2 py-0.5 ${
                    isDark ? 'bg-red-950/10' : 'bg-red-50'
                  } font-serif`}
                >
                  {lang === 'uz' ? 'Bizga kreativ va nostandart fikrlaydigan dev kerak!' :
                   lang === 'en' ? 'We need a creative and unconventional dev!' :
                   'Нам нужен креативный дев с нестандартным мышлением!'}
                </p>
                <p className="text-[9px] text-red-500/40 font-mono">{'// matrix_integrity: unstable'}</p>
              </div>
            ) : (
              <p className={`text-[10px] ${bodyText} leading-relaxed font-sans font-light italic`}>{member.details[lang] || member.details.uz}</p>
            )}
          </div>

          <div className="space-y-1">
            <span className={`text-[9px] font-bold ${mutedText} tracking-wider uppercase block`}>
              {'// '}
              {c.stack}
            </span>
            <div className="flex flex-wrap gap-1">
              {member.stack.map((tech) => (
                <span
                  key={tech}
                  className={`px-1.5 py-0.5 border text-[9px] font-bold ${chipBg} rounded-none transition-colors duration-300 ${techClass}`}
                >
                  {tech}
                </span>
              ))}
            </div>
          </div>
        </div>

        {isMystery ? (
          <a
            href="https://t.me/aidevix"
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="w-full py-1.5 border border-red-500/35 hover:border-red-500 bg-red-950/20 hover:bg-red-500/10 text-[9px] font-bold text-red-400 hover:text-red-300 transition-all duration-300 rounded-none flex items-center justify-center gap-2 tracking-widest uppercase"
          >
            <span className="w-1.5 h-1.5 bg-red-500 animate-ping rounded-none" />
            JOIN_US_NODE // CONNECT
          </a>
        ) : member.telegram || member.instagram || member.linkedin || member.github || member.facebook ? (
          <div className={`flex gap-2 pt-2 border-t ${dividerBorder}`}>
            {member.linkedin && (
              <a
                href={member.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${member.name} LinkedIn`}
                onClick={(e) => e.stopPropagation()}
                className={`p-1.5 border ${socialBg} transition-all duration-300 rounded-none flex items-center justify-center ${socialClass}`}
              >
                <FaLinkedin size={13} />
              </a>
            )}
            {member.telegram && (
              <a
                href={member.telegram}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${member.name} Telegram`}
                onClick={(e) => e.stopPropagation()}
                className={`p-1.5 border ${socialBg} transition-all duration-300 rounded-none flex items-center justify-center ${socialClass}`}
              >
                <FaTelegram size={13} />
              </a>
            )}
            {member.instagram && (
              <a
                href={member.instagram}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${member.name} Instagram`}
                onClick={(e) => e.stopPropagation()}
                className={`p-1.5 border ${socialBg} transition-all duration-300 rounded-none flex items-center justify-center ${socialClass}`}
              >
                <FaInstagram size={13} />
              </a>
            )}
            {member.github && (
              <a
                href={member.github}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${member.name} GitHub`}
                onClick={(e) => e.stopPropagation()}
                className={`p-1.5 border ${socialBg} transition-all duration-300 rounded-none flex items-center justify-center ${socialClass}`}
              >
                <FaGithub size={13} />
              </a>
            )}
            {member.facebook && (
              <a
                href={member.facebook}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${member.name} Facebook`}
                onClick={(e) => e.stopPropagation()}
                className={`p-1.5 border ${socialBg} transition-all duration-300 rounded-none flex items-center justify-center ${socialClass}`}
              >
                <FaFacebook size={13} />
              </a>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

// ─── Drift gallery physics ──────────────────────────────────────────────────

const CARD_W = 260;
const CARD_H = 360;
const DEPTH_RANGE = 2200;
const FOCAL = 480;
const MAX_OFFSET = 620;
const MAX_VELOCITY = 11;
const PIN_DISTANCE = 4800;
const HEADER_OFFSET_FALLBACK = 88;

type GalleryItem = {
  id: string;
  member: TeamMember;
  index: number;
  x: number;
  y: number;
  baseZ: number;
};

type ItemVisual = { x: number; y: number; scale: number; opacity: number; z: number };

// ─── TeamPage ────────────────────────────────────────────────────────────────

export default function TeamPage() {
  const { lang } = useLang();
  const { isDark } = useTheme();
  const c: Content = LOCALIZED_CONTENT[(lang as Lang)] || LOCALIZED_CONTENT.uz;

  const pageBg = isDark ? 'bg-black text-[#e2e6e9]' : 'bg-slate-50 text-slate-800';
  const mutedText = isDark ? 'text-zinc-500' : 'text-slate-500';
  const hrLine = isDark ? 'bg-zinc-700' : 'bg-slate-300';
  const edgeFrom = isDark ? 'from-black' : 'from-slate-50';

  const [flippedId, setFlippedId] = useState<string | null>(null);
  const flippedIdRef = useRef<string | null>(null);
  useEffect(() => {
    flippedIdRef.current = flippedId;
  }, [flippedId]);

  // ── Drag guard: distinguishes a click from a drag so orbiting doesn't accidentally flip a card ──
  const dragRef = useRef({ dragging: false, lastX: 0, moved: false, totalMove: 0 });

  const handleFlip = useCallback((id: string | null) => {
    if (dragRef.current.moved) {
      dragRef.current.moved = false;
      return;
    }
    setFlippedId(id);
  }, []);

  // ── Gallery items (static scatter positions, computed once) ──
  const items: GalleryItem[] = useMemo(() => {
    return TEAM_MEMBERS.map((member, i) => {
      const angle = (i * 2.618) % (Math.PI * 2);
      const radius = 0.55 + ((i % 4) + 1) * 0.14;
      return {
        id: member.id,
        member,
        index: i,
        x: Math.sin(angle) * radius * MAX_OFFSET,
        y: Math.cos(angle) * radius * MAX_OFFSET * 0.62,
        baseZ: (DEPTH_RANGE / TEAM_MEMBERS.length) * i,
      };
    });
  }, []);

  const physicsRef = useRef({
    zOffset: 0,
    velocity: 0,
    isAutoPlay: true,
    lastInteraction: Date.now(),
  });
  const visualRef = useRef<Record<string, ItemVisual>>({});
  const nodeRefs = useRef<Map<string, HTMLDivElement | null>>(new Map());
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);

  const setNodeRef = useCallback(
    (id: string) => (el: HTMLDivElement | null) => {
      nodeRefs.current.set(id, el);
    },
    []
  );

  // ── Pointer / wheel interaction ──
  const handleWheel = useCallback((e: React.WheelEvent) => {
    const phys = physicsRef.current;
    const delta = Math.sign(e.deltaY) * Math.min(Math.abs(e.deltaY), 40);
    phys.velocity = Math.max(-MAX_VELOCITY, Math.min(MAX_VELOCITY, phys.velocity + delta * 0.06));
    phys.isAutoPlay = false;
    phys.lastInteraction = Date.now();
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    dragRef.current = { dragging: true, lastX: e.clientX, moved: false, totalMove: 0 };
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag.dragging) return;
    const dx = e.clientX - drag.lastX;
    drag.lastX = e.clientX;
    drag.totalMove += Math.abs(dx);
    if (drag.totalMove > 4) drag.moved = true;

    const phys = physicsRef.current;
    phys.velocity = Math.max(-MAX_VELOCITY, Math.min(MAX_VELOCITY, phys.velocity + dx * 0.26));
    phys.isAutoPlay = false;
    phys.lastInteraction = Date.now();
  }, []);

  const handlePointerUp = useCallback(() => {
    dragRef.current.dragging = false;
  }, []);

  // ── Pin the gallery during scroll; scroll velocity feeds the drift ──
  // If your app shell has a fixed/sticky header, "top top" pins the gallery
  // flush against the very top of the viewport — right under (or behind) that
  // header. Give your fixed header `id="site-header"` and its real height is
  // read automatically; otherwise HEADER_OFFSET_FALLBACK is used.
  useEffect(() => {
    if (!containerRef.current) return;

    const ctx = gsap.context(() => {
      const headerEl = document.getElementById('site-header');
      const headerOffset = headerEl?.offsetHeight || HEADER_OFFSET_FALLBACK;

      const trigger = ScrollTrigger.create({
        trigger: containerRef.current,
        start: `top ${headerOffset}px`,
        end: `+=${PIN_DISTANCE}`,
        pin: true,
        pinSpacing: true,
        anticipatePin: 1,
        scrub: true,
        onUpdate: (self) => {
          const scrollVel = self.getVelocity();
          const clamped = Math.max(-3, Math.min(3, scrollVel * 0.0007));
          const phys = physicsRef.current;
          phys.velocity = Math.max(-MAX_VELOCITY, Math.min(MAX_VELOCITY, phys.velocity + clamped));
          phys.isAutoPlay = false;
          phys.lastInteraction = Date.now();
        },
      });

      const handleResize = () => trigger.refresh();
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }, containerRef);

    return () => ctx.revert();
  }, []);

  // ── Animation loop ──
  useEffect(() => {
    const reduceMotion =
      typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function tick() {
      const phys = physicsRef.current;
      const now = Date.now();
      const focused = flippedIdRef.current;

      if (!phys.isAutoPlay && !focused && now - phys.lastInteraction > 3000) {
        phys.isAutoPlay = true;
      }
      if (phys.isAutoPlay && !focused && !reduceMotion) {
        phys.velocity += 0.09;
      }
      phys.velocity = Math.max(-MAX_VELOCITY, Math.min(MAX_VELOCITY, phys.velocity));
      phys.velocity *= 0.92;
      if (!focused) phys.zOffset += phys.velocity;

      items.forEach((item) => {
        let z = (item.baseZ + phys.zOffset) % DEPTH_RANGE;
        if (z < 0) z += DEPTH_RANGE;
        const perspective = FOCAL / (z + 140);

        let targetX = item.x * perspective;
        let targetY = item.y * perspective;
        let targetScale = perspective;

        const normalizedZ = z / DEPTH_RANGE;
        let targetOpacity = 1;
        if (normalizedZ < 0.18) targetOpacity = normalizedZ / 0.18;
        else if (normalizedZ > 0.68) targetOpacity = 1 - (normalizedZ - 0.68) / 0.32;
        targetOpacity = Math.max(0, Math.min(1, targetOpacity));

        const isFocused = focused === item.id;
        if (isFocused) {
          targetX = 0;
          targetY = -20;
          targetScale = 1.2;
          targetOpacity = 1;
        }

        let visual = visualRef.current[item.id];
        if (!visual) {
          visual = { x: targetX, y: targetY, scale: targetScale, opacity: targetOpacity, z };
          visualRef.current[item.id] = visual;
        }
        visual.x += (targetX - visual.x) * 0.05;
        visual.y += (targetY - visual.y) * 0.05;
        visual.scale += (targetScale - visual.scale) * 0.05;
        visual.opacity += (targetOpacity - visual.opacity) * 0.07;
        visual.z = z;

        const node = nodeRefs.current.get(item.id);
        if (node) {
          node.style.transform = `translate3d(${visual.x.toFixed(1)}px, ${visual.y.toFixed(1)}px, 0) scale(${visual.scale.toFixed(3)})`;
          node.style.opacity = visual.opacity.toFixed(3);
          node.style.zIndex = String(isFocused ? 9999 : Math.round(2000 - visual.z));
          node.style.pointerEvents = visual.opacity < 0.06 ? 'none' : 'auto';
        }
      });

      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [items]);

  return (
    <main className={`relative min-h-screen w-full ${pageBg} overflow-hidden rounded-none select-none font-mono`}>
      {/* Matrix Grid */}
      <div
        className="absolute inset-0 z-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage:
            'linear-gradient(to right, #3b82f6 1px, transparent 1px), linear-gradient(to bottom, #3b82f6 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      {/* CRT Scanlines */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-[0.015] bg-[linear-gradient(to_bottom,rgba(59,130,246,0.3)_50%,rgba(0,0,0,0)_50%)] bg-[size:100%_4px]" />

      {/* Ambient Glows */}
      <div className="absolute inset-x-0 top-0 h-[45rem] pointer-events-none z-0">
        <div className="absolute left-[10%] top-[-10%] w-[35%] h-[25rem] rounded-none blur-[150px] opacity-[0.08] bg-blue-500" />
        <div className="absolute right-[10%] top-[5%] w-[30%] h-[20rem] rounded-none blur-[150px] opacity-[0.05] bg-blue-700" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
        {/* Drag hint */}
        <div className={`mb-6 flex items-center justify-center gap-3 text-[10px] ${mutedText} font-bold tracking-widest uppercase`}>
          <span className={`w-8 h-px ${hrLine}`} />
          <span>{c.dragHint}</span>
          <span className={`w-8 h-px ${hrLine}`} />
        </div>

        {/* Drift gallery viewport */}
        <div
          ref={containerRef}
          className="relative w-full overflow-hidden cursor-grab active:cursor-grabbing touch-pan-y"
          style={{ height: `${CARD_H + 380}px` }}
          onWheel={handleWheel}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        >
          {flippedId && (
            <div
              className="absolute inset-0"
              style={{ zIndex: 20 }}
              onClick={() => handleFlip(null)}
            />
          )}

          {items.map((item) => (
            <div
              key={item.id}
              ref={setNodeRef(item.id)}
              className="absolute will-change-transform"
              style={{
                left: '50%',
                top: '50%',
                width: CARD_W,
                height: CARD_H,
                marginLeft: -CARD_W / 2,
                marginTop: -CARD_H / 2,
              }}
            >
              <TeamCard member={item.member} index={item.index} c={c} lang={lang as Lang} flippedId={flippedId} onFlip={handleFlip} />
            </div>
          ))}

          {/* Edge fades */}
          <div className={`absolute inset-y-0 left-0 w-24 bg-gradient-to-r ${edgeFrom} to-transparent pointer-events-none z-30`} />
          <div className={`absolute inset-y-0 right-0 w-24 bg-gradient-to-l ${edgeFrom} to-transparent pointer-events-none z-30`} />
          <div className={`absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t ${edgeFrom} to-transparent pointer-events-none z-30`} />
        </div>

        {/* Footer */}
        <div className={`mt-30 border-t border-blue-500/10 pt-8 text-center text-[10px] ${isDark ? 'text-zinc-600' : 'text-slate-400'} space-y-2`}>
          <p className="font-mono">{'// END_OF_FILE // SYSTEM_ACTIVE // ALL_NODES_OPERATIONAL: TRUE'}</p>
          <p className="font-mono text-blue-500/40 animate-pulse">AIDEVIX PLATFORM CORE HUMAN ASSETS V3.0</p>
        </div>
      </div>
    </main>
  );
}