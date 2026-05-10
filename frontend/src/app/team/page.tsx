'use client';

import { useState, useRef, useCallback } from 'react';
import { motion, useScroll, useTransform, useSpring, useReducedMotion } from 'framer-motion';
import { FaInstagram, FaTelegram } from 'react-icons/fa';
import { useLang } from '@/context/LangContext';

type TeamMember = {
  id: string;
  name: string;
  age: number;
  stack: string[];
  contribution: string;
  imageFile: string;
  badge: string;
  color: string;
  accentBg: string;
  emoji: string;
  roadmapRole: string;
  objectPos?: string;
  portfolioUrl?: string;
  instagramUrl?: string;
  telegramUrl?: string;
  /** Rahbariyat kartasida yoshni ko‘rsatmaslik */
  hideAge?: boolean;
};

function getFounderLead(t: (key: string) => string): TeamMember {
  return {
    id: 'sunnatbee',
    name: 'Sunnatbek Yusupov',
    age: 0,
    hideAge: true,
    stack: ['React', 'TypeScript', 'Next.js', 'Tailwind CSS', 'Product vision', 'Team leadership'],
    contribution: t('team.member.sunnatbee.contribution'),
    imageFile: 'sunnatbee.jpg',
    badge: t('team.member.sunnatbee.badge'),
    color: '#eab308',
    accentBg: 'rgba(234,179,8,0.18)',
    emoji: '👑',
    roadmapRole: t('team.member.sunnatbee.roadmapRole'),
    objectPos: '50% 22%',
    instagramUrl: 'https://www.instagram.com/sunnatbee?igsh=ZGNxdjd2ajVpc20w',
    telegramUrl: 'https://t.me/SUNNATBEE',
  };
}

function getLeadershipRoles(t: (key: string) => string) {
  return [
    t('team.role.ceo'),
    t('team.role.generalDirector'),
    t('team.role.founder'),
    t('team.role.frontendDeveloper'),
  ];
}

function getMembers(t: (key: string) => string): TeamMember[] {
  return [
    {
      id: 'sardor',
      name: 'Sardor',
      age: 15,
      stack: ['Next.js 14', 'TypeScript', 'Node.js', 'Express.js', 'MongoDB', 'React Native', 'Tailwind CSS', 'Railway', 'Vercel'],
      contribution: t('team.member.sardor.contribution'),
      imageFile: 'Sardor.jpg',
      badge: t('team.member.sardor.badge'),
      color: '#f59e0b',
      accentBg: 'rgba(245,158,11,0.15)',
      emoji: '🚀',
      roadmapRole: t('team.member.sardor.roadmapRole'),
      objectPos: '50% 20%',
      portfolioUrl: 'https://sardoruz.vercel.app',
    },
    {
      id: 'firdavs',
      name: 'Firdavs',
      age: 16,
      stack: ['React 18', 'TypeScript', 'Next.js 14', 'Redux Toolkit', 'Axios', 'Tailwind CSS'],
      contribution: t('team.member.firdavs.contribution'),
      imageFile: 'Firdavs.jpg',
      badge: t('team.member.firdavs.badge'),
      color: '#6366f1',
      accentBg: 'rgba(99,102,241,0.15)',
      emoji: '🔐',
      roadmapRole: t('team.member.firdavs.roadmapRole'),
      objectPos: '50% 15%',
    },
    {
      id: 'abduvohid',
      name: 'Abduvohid',
      age: 15,
      stack: ['React 18', 'TypeScript', 'Next.js 14', 'Tailwind CSS', 'Framer Motion', 'GSAP', 'Home UX'],
      contribution: t('team.member.abduvohid.contribution'),
      imageFile: 'abduvohid.jpg',
      badge: t('team.member.abduvohid.badge'),
      color: '#14b8a6',
      accentBg: 'rgba(20,184,166,0.15)',
      emoji: '🏠',
      roadmapRole: t('team.member.abduvohid.roadmapRole'),
      objectPos: '50% 20%',
    },
    {
      id: 'abduvoris',
      name: 'Abduvoris',
      age: 16,
      stack: ['React 18', 'TypeScript', 'Next.js 14', 'Bunny.net SDK', 'HLS.js', 'Redux Toolkit'],
      contribution: t('team.member.abduvoris.contribution'),
      imageFile: 'Abduvoris.jpg',
      badge: t('team.member.abduvoris.badge'),
      color: '#06b6d4',
      accentBg: 'rgba(6,182,212,0.15)',
      emoji: '🎬',
      roadmapRole: t('team.member.abduvoris.roadmapRole'),
      objectPos: '50% 20%',
    },
    {
      id: 'doniyor',
      name: 'Doniyor',
      age: 16,
      stack: ['React 18', 'TypeScript', 'Next.js 14', 'Node.js', 'React Native', 'Redux Toolkit', 'Tailwind CSS'],
      contribution: t('team.member.doniyor.contribution'),
      imageFile: 'Doniyor.jpg',
      badge: t('team.member.doniyor.badge'),
      color: '#10b981',
      accentBg: 'rgba(16,185,129,0.15)',
      emoji: '📚',
      roadmapRole: t('team.member.doniyor.roadmapRole'),
      objectPos: '50% 20%',
    },
    {
      id: 'suhrob',
      name: 'Suhrob',
      age: 14,
      stack: ['React 18', 'TypeScript', 'Next.js 14', 'Node.js', 'React Native', 'Redux Toolkit'],
      contribution: t('team.member.suhrob.contribution'),
      imageFile: 'Suhrob.jpg',
      badge: t('team.member.suhrob.badge'),
      color: '#ec4899',
      accentBg: 'rgba(236,72,153,0.15)',
      emoji: '🏆',
      roadmapRole: t('team.member.suhrob.roadmapRole'),
      objectPos: '50% 20%',
    },
    {
      id: 'qudrat',
      name: 'Qudrat',
      age: 14,
      stack: ['React 18', 'TypeScript', 'Next.js 14', 'GSAP 3', 'Three.js', 'Framer Motion', 'Node.js'],
      contribution: t('team.member.qudrat.contribution'),
      imageFile: 'Qudrat.jpg',
      badge: t('team.member.qudrat.badge'),
      color: '#a855f7',
      accentBg: 'rgba(168,85,247,0.15)',
      emoji: '✨',
      roadmapRole: t('team.member.qudrat.roadmapRole'),
      objectPos: '50% 20%',
    },
  ];
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2 && parts[0][0] && parts[parts.length - 1][0]) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function LeadershipCard({ member }: { member: TeamMember }) {
  const { t } = useLang();
  const leadershipRoles = getLeadershipRoles(t);
  const [imgError, setImgError] = useState(false);

  return (
    <motion.article
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
      className="relative mx-auto mb-14 max-w-7xl"
    >
      <div className="pointer-events-none absolute -inset-px rounded-[34px] bg-gradient-to-br from-amber-400/70 via-indigo-500/55 to-cyan-400/45 opacity-90 blur-[1px]" />
      <div className="relative overflow-hidden rounded-[32px] border border-amber-500/25 bg-[#070a10] shadow-[0_0_0_1px_rgba(234,179,8,0.12),0_24px_80px_rgba(0,0,0,0.55)]">
        <div className="absolute right-6 top-6 z-20 hidden text-4xl sm:block">{member.emoji}</div>

        <div className="flex flex-col lg:flex-row lg:items-stretch">
          <div className="relative flex w-full min-h-[280px] items-center justify-center bg-[#080b10] sm:min-h-[320px] lg:w-[44%] lg:min-h-[min(100%,440px)] lg:max-w-none">
            {!imgError ? (
              <img
                src={`/team/${member.imageFile}`}
                alt={member.name}
              loading="lazy"
              decoding="async"
                className="max-h-[min(72vh,520px)] w-full object-contain object-center p-4 sm:max-h-[560px] sm:p-5 lg:h-full lg:max-h-none lg:min-h-[400px] lg:object-contain lg:p-6"
                style={{ objectPosition: member.objectPos ?? '50% center' }}
                onError={() => setImgError(true)}
              />
            ) : (
              <div
                className="flex min-h-[280px] w-full items-center justify-center lg:min-h-[400px]"
                style={{ background: `radial-gradient(circle at 40% 30%, ${member.color}30, #070a10 72%)` }}
              >
                <span className="select-none text-5xl font-black text-amber-500/35 sm:text-6xl md:text-7xl">{getInitials(member.name)}</span>
              </div>
            )}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#070a10] to-transparent lg:inset-y-0 lg:left-auto lg:right-0 lg:h-auto lg:w-24 lg:bg-gradient-to-l" />
            <div className="absolute left-4 top-4 z-10 sm:left-6 sm:top-6">
              <span className="inline-flex items-center gap-2 rounded-full border border-amber-400/35 bg-amber-500/15 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-amber-200 backdrop-blur-md">
                {member.badge}
              </span>
            </div>
          </div>

          <div className="relative flex flex-1 flex-col justify-center px-5 py-8 sm:px-8 sm:py-10 lg:max-w-none lg:py-12 lg:pl-10 lg:pr-12">
            <div className="mb-4 flex flex-wrap gap-1.5 sm:gap-2">
              {leadershipRoles.map((role) => (
                <span
                  key={role}
                  className="rounded-full border border-amber-500/25 bg-amber-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-100/95 sm:px-3 sm:py-1 sm:text-[11px]"
                >
                  {role}
                </span>
              ))}
            </div>

            <h2 className="text-balance font-display text-2xl font-black tracking-tight text-white sm:text-4xl lg:text-[2.35rem] lg:leading-[1.12] xl:text-[2.55rem]">
              {member.name}
            </h2>

            <p className="mt-5 max-w-2xl text-sm leading-[1.75] text-slate-400 sm:text-[15px]">{member.contribution}</p>

            <div className="mt-6 flex flex-wrap gap-2">
              {member.stack.map((tech) => (
                <span
                  key={tech}
                  className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.06em] text-slate-300"
                >
                  {tech}
                </span>
              ))}
            </div>

            {(member.instagramUrl || member.telegramUrl) && (
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">{t('team.social')}</span>
                {member.instagramUrl && (
                  <a
                    href={member.instagramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Sunnatbek Instagram"
                    className="flex h-11 w-11 items-center justify-center rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-200 transition-colors hover:border-amber-400/60 hover:bg-amber-500/20"
                  >
                    <FaInstagram className="text-lg" />
                  </a>
                )}
                {member.telegramUrl && (
                  <a
                    href={member.telegramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Sunnatbek Telegram"
                    className="flex h-11 w-11 items-center justify-center rounded-full border border-sky-500/30 bg-sky-500/10 text-sky-200 transition-colors hover:border-sky-400/60 hover:bg-sky-500/20"
                  >
                    <FaTelegram className="text-lg" />
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.article>
  );
}

function TiltCard({ member, index, reduceMotion = false }: { member: TeamMember; index: number; reduceMotion?: boolean }) {
  const { t } = useLang();
  const [imgError, setImgError] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [hovered, setHovered] = useState(false);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (reduceMotion) return;
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ x: y * 12, y: -x * 12 });
  }, [reduceMotion]);

  const handleMouseLeave = useCallback(() => {
    setTilt({ x: 0, y: 0 });
    setHovered(false);
  }, []);

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.6, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => {
        if (!reduceMotion) setHovered(true);
      }}
      onMouseLeave={handleMouseLeave}
      style={{
        transform: reduceMotion
          ? 'none'
          : `perspective(900px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) translateZ(${hovered ? 6 : 0}px) scale(${hovered ? 1.02 : 1})`,
        transition: hovered ? 'transform 0.12s ease-out' : 'transform 0.5s cubic-bezier(0.22,1,0.36,1)',
        transformStyle: 'preserve-3d',
      }}
      className="relative cursor-default overflow-hidden rounded-[28px] border border-white/[0.07] bg-[#0c1018]"
    >
      {/* hover glow */}
      <div
        className="pointer-events-none absolute inset-0 rounded-[28px] transition-opacity duration-400"
        style={{
          opacity: hovered ? 1 : 0,
          background: `radial-gradient(ellipse at 50% -10%, ${member.accentBg}, transparent 65%)`,
          boxShadow: `inset 0 1px 0 ${member.color}30`,
        }}
      />
      {/* hover border */}
      <div
        className="pointer-events-none absolute inset-0 rounded-[28px] transition-opacity duration-400"
        style={{ opacity: hovered ? 1 : 0, border: `1px solid ${member.color}40` }}
      />

      {/* Photo */}
      <div className="relative h-72 overflow-hidden">
        <div
          className="absolute inset-0 transition-transform duration-700 ease-out"
          style={{ transform: hovered ? 'scale(1.06)' : 'scale(1)' }}
        >
          {!imgError ? (
            <img
              src={`/team/${member.imageFile}`}
              alt={member.name}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover"
              style={{ objectPosition: member.objectPos ?? '50% 20%' }}
              onError={() => setImgError(true)}
            />
          ) : (
            <div
              className="flex h-full w-full items-center justify-center"
              style={{ background: `radial-gradient(circle at 40% 30%, ${member.color}25, #0c1018 70%)` }}
            >
                <span
                className="select-none text-5xl font-black tracking-tight sm:text-7xl md:text-8xl"
                style={{ color: `${member.color}50` }}
              >
                {getInitials(member.name)}
              </span>
            </div>
          )}
        </div>

        {/* bottom gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0c1018] via-[#0c1018]/30 to-transparent" />

        {/* badge */}
        <div className="absolute left-4 top-4">
          <span
            className="rounded-full px-3 py-1.5 text-[11px] font-bold tracking-[0.06em]"
            style={{
              background: `${member.color}20`,
              color: member.color,
              border: `1px solid ${member.color}35`,
              backdropFilter: 'blur(8px)',
            }}
          >
            {member.badge}
          </span>
        </div>

        {/* emoji */}
        <div className="absolute right-4 top-4 text-2xl drop-shadow-lg">{member.emoji}</div>
      </div>

      {/* Body */}
      <div className="p-5 pt-4">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-[22px] font-black tracking-tight text-white">{member.name}</h2>
          {!member.hideAge && (
            <span className="mt-0.5 shrink-0 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-semibold text-slate-400">
              {member.age} yosh
            </span>
          )}
        </div>

        <p className="mt-3 text-sm leading-[1.7] text-slate-400">{member.contribution}</p>

        {member.portfolioUrl && (
          <motion.a
            href={member.portfolioUrl}
            target="_blank"
            rel="noopener noreferrer"
            whileHover={{ y: -3, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            animate={{
              boxShadow: [
                `0 0 0 ${member.color}00`,
                `0 0 0 6px ${member.color}18`,
                `0 0 0 ${member.color}00`,
              ],
            }}
            transition={{
              boxShadow: { duration: 2.1, repeat: Infinity, ease: 'easeInOut' },
              y: { duration: 0.2 },
              scale: { duration: 0.2 },
            }}
            className="group relative mt-4 inline-flex items-center gap-2 overflow-hidden rounded-xl border px-3.5 py-2 text-xs font-bold uppercase tracking-[0.08em]"
            style={{
              borderColor: `${member.color}60`,
              color: '#fff',
              background: `linear-gradient(90deg, ${member.color}cc, ${member.color}88)`,
            }}
          >
            <span className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" style={{ background: 'linear-gradient(120deg, transparent, rgba(255,255,255,0.22), transparent)' }} />
            <span className="relative">{t('team.portfolio')}</span>
            <motion.span
              aria-hidden
              className="relative"
              animate={{ x: [0, 3, 0] }}
              transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
            >
              ↗
            </motion.span>
          </motion.a>
        )}

        {/* Stack pills */}
        <div className="mt-4 flex flex-wrap gap-1.5">
          {member.stack.map((tech) => (
            <span
              key={tech}
              className="rounded-full px-2.5 py-[3px] text-[10px] font-bold uppercase tracking-[0.08em]"
              style={{
                background: `${member.color}14`,
                color: member.color,
                border: `1px solid ${member.color}28`,
              }}
            >
              {tech}
            </span>
          ))}
        </div>
      </div>

      {/* dot grid depth layer */}
      <div
        className="pointer-events-none absolute inset-0 rounded-[28px] opacity-[0.03]"
        style={{
          backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)',
          backgroundSize: '22px 22px',
        }}
      />
    </motion.div>
  );
}

function RoadmapNode({ member, index }: { member: TeamMember; index: number }) {
  const { t } = useLang();
  const isLeft = index % 2 === 0;
  const isLead = member.id === 'sunnatbee';

  return (
    <motion.div
      initial={{ opacity: 0, x: isLeft ? -40 : 40 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, margin: '-30px' }}
      transition={{ duration: 0.55, delay: index * 0.07, ease: [0.22, 1, 0.36, 1] }}
      className={`relative flex items-center gap-3 sm:gap-5 flex-col sm:${isLeft ? 'flex-row' : 'flex-row-reverse'}`}
    >
      {/* Content */}
      <div
        className={`w-full sm:flex-1 rounded-2xl border p-3 sm:p-4 text-left sm:${isLeft ? 'text-right' : 'text-left'} ${
          isLead ? 'border-amber-500/35 shadow-[0_0_40px_rgba(234,179,8,0.12)]' : 'border-white/[0.07]'
        }`}
        style={{ background: `linear-gradient(135deg, ${member.accentBg}, rgba(12,16,24,0.96))` }}
      >
        <div className={`flex items-center gap-2 justify-start sm:${isLeft ? 'justify-end' : 'justify-start'}`}>
          <span className="text-lg">{member.emoji}</span>
          <span className="font-bold text-white">{member.name}</span>
          {!member.hideAge && member.age > 0 && (
            <span className="text-xs text-slate-500">· {member.age} {t('team.ageYears')}</span>
          )}
        </div>
        <p
          className="mt-0.5 text-[11px] font-bold uppercase tracking-[0.14em]"
          style={{ color: member.color }}
        >
          {member.roadmapRole}
        </p>
        <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-slate-500">
          {member.contribution}
        </p>
      </div>

      {/* Node circle */}
      <div className="relative z-10 shrink-0">
        <div
          className={`flex items-center justify-center rounded-full text-xl ${isLead ? 'h-14 w-14 ring-2 ring-amber-400/50 ring-offset-2 ring-offset-[#060a12]' : 'h-12 w-12'}`}
          style={{
            background: `radial-gradient(circle at 35% 30%, ${member.color}ee, ${member.color}77)`,
            boxShadow: `0 0 28px ${member.color}55, 0 0 8px ${member.color}33`,
          }}
        >
          {member.emoji}
        </div>
        <span
          className="absolute inset-0 rounded-full animate-ping opacity-[0.15]"
          style={{ background: member.color }}
        />
      </div>

      <div className="hidden sm:block flex-1" />
    </motion.div>
  );
}

export default function TeamPage() {
  const { t } = useLang();
  const reduceMotion = useReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);
  const founderLead = getFounderLead(t);
  const members = getMembers(t);
  const allMembers = [founderLead, ...members];
  const { scrollYProgress } = useScroll({ target: containerRef, offset: ['start end', 'end start'] });
  const lineHeight = useTransform(scrollYProgress, [0.35, 0.92], ['0%', '100%']);
  const smoothLine = useSpring(lineHeight as any, { stiffness: 55, damping: 18 });

  const ageSample = allMembers.filter((m) => !m.hideAge && m.age > 0);
  const avgAge = (ageSample.reduce((s, m) => s + m.age, 0) / Math.max(1, ageSample.length)).toFixed(1);
  const techCount = new Set(allMembers.flatMap((m) => m.stack)).size;

  return (
    <main ref={containerRef} className="relative min-h-screen w-full min-w-0 max-w-full overflow-x-clip bg-[#060a12] text-white">
      {/* fixed ambient bg */}
      <div className="pointer-events-none fixed inset-0 -z-0">
        <div className="absolute left-[-18%] top-[-8%] h-[560px] w-[560px] rounded-full bg-indigo-600/10 blur-[130px]" />
        <div className="absolute right-[-12%] top-[18%] h-[480px] w-[480px] rounded-full bg-cyan-500/7 blur-[110px]" />
        <div className="absolute bottom-[8%] left-[28%] h-[420px] w-[420px] rounded-full bg-amber-500/6 blur-[100px]" />
      </div>

      {/* ── HERO ── */}
      <section className="relative z-10 overflow-hidden">
        {/* hero bg overlay */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(99,102,241,0.22),transparent)]" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent" />

        <div className="mx-auto max-w-7xl px-3 pb-12 pt-14 sm:px-4 sm:pb-14 sm:pt-16 md:px-6 lg:px-8">
          {/* badge */}
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 sm:px-4 py-1.5 text-[11px] sm:text-xs font-bold uppercase tracking-[0.14em] sm:tracking-[0.2em] text-indigo-300">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-indigo-400" />
              {t('team.heroBadge')}
            </span>
          </div>

          {/* heading — 2 clear lines */}
          <h1 className="mt-4 max-w-full text-balance font-black leading-[1.08] tracking-[-0.03em] sm:mt-5"
              style={{ fontSize: 'clamp(1.45rem, 7.5vw, 4rem)' }}>
            <span className="text-white">{t('team.heroH1a')}</span>
            <br />
            <span
              style={{
                background: 'linear-gradient(90deg, #a5b4fc 0%, #67e8f9 45%, #fcd34d 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              {t('team.heroH1b')}
            </span>
          </h1>

          {/* description */}
          <p className="mt-4 max-w-xl text-sm sm:text-[15px] leading-relaxed text-slate-400">
            {t('team.heroDesc', { avgAge: String(avgAge) })}
          </p>

          {/* stats grid */}
          <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: t('team.stat.participants'), value: `${allMembers.length}`, icon: '👥' },
              { label: t('team.stat.avgAge'), value: avgAge, icon: '🎂' },
              { label: t('team.stat.tech'), value: `${techCount}+`, icon: '⚡' },
              { label: t('team.stat.status'), value: t('team.stat.production'), icon: '🚀' },
            ].map((s) => (
              <div
                key={s.label}
                className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-3 backdrop-blur-sm sm:px-4 sm:py-4"
              >
                <div className="flex items-center gap-2">
                  <span className="text-base">{s.icon}</span>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{s.label}</p>
                </div>
                <p className="mt-2 text-[1.35rem] sm:text-[1.75rem] font-black leading-none text-white">{s.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* bottom divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      </section>

      {/* ── CEO / RAHBARIYAT (alohida) ── */}
      <section className="relative z-10 mx-auto max-w-7xl px-3 pt-10 sm:px-4 sm:pt-12 md:px-6 lg:px-8">
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mb-5 text-[11px] font-semibold uppercase tracking-[0.28em] text-amber-500/90"
        >
          {t('team.leadSection')}
        </motion.p>
        <LeadershipCard member={founderLead} />
      </section>

      {/* ── CARDS ── */}
      <section className="relative z-10 mx-auto max-w-7xl px-3 pb-20 pt-2 sm:px-4 sm:pb-24 md:px-6 lg:px-8">
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mb-8 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-600"
        >
          {t('team.coreTeam', { count: String(members.length) })}
        </motion.p>
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {members.map((m, i) => (
            <TiltCard key={m.id} member={m} index={i} reduceMotion={Boolean(reduceMotion)} />
          ))}
        </div>
      </section>

      {/* ── 3D ROADMAP ── */}
      <section className="relative z-10 mx-auto max-w-3xl px-3 pb-24 sm:px-4 sm:pb-32 md:px-6 lg:px-8">
        {/* section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55 }}
          className="mb-14 text-center"
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-amber-400/20 bg-amber-400/[0.07] px-3 sm:px-4 py-2 text-[11px] sm:text-xs font-bold uppercase tracking-[0.14em] sm:tracking-[0.2em] text-amber-300">
            🗺 {t('team.roadmapBadge')}
          </span>
          <h2 className="mt-5 text-2xl sm:text-3xl font-black tracking-tight sm:text-[2.4rem]">
            {t('team.roadmapTitle1')}
            <span className="block bg-gradient-to-r from-amber-300 to-orange-200 bg-clip-text text-transparent">
              {t('team.roadmapTitle2')}
            </span>
          </h2>
          <p className="mx-auto mt-3 max-w-sm text-sm text-slate-500">
            {t('team.roadmapSub')}
          </p>
        </motion.div>

        {/* road container */}
        <div className="relative" style={{ perspective: '1000px' }}>
          {/* vertical line */}
          <div className="absolute bottom-0 left-1/2 top-0 w-px -translate-x-1/2 hidden sm:block">
            <div className="absolute inset-0 bg-white/[0.06]" />
            <motion.div
              className="absolute inset-x-0 top-0 origin-top"
              style={{
                height: smoothLine,
                background: 'linear-gradient(to bottom, #6366f1, #06b6d4 45%, #10b981 70%, #f59e0b)',
                boxShadow: '0 0 10px rgba(99,102,241,0.5)',
              }}
            />
          </div>

          <div className="relative flex flex-col gap-7 py-2">
            {allMembers.map((m, i) => (
              <RoadmapNode key={m.id} member={m} index={i} />
            ))}
          </div>
        </div>

        {/* finish */}
        <motion.div
          initial={{ opacity: 0, scale: 0.75 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="mt-10 flex flex-col items-center gap-2"
        >
          <div
            className="flex h-16 w-16 items-center justify-center rounded-full text-2xl"
            style={{ background: 'linear-gradient(135deg, #6366f1, #06b6d4)', boxShadow: '0 0 40px rgba(99,102,241,0.45)' }}
          >
            🌐
          </div>
          <p className="mt-1 text-sm font-bold text-white tracking-tight">{t('team.footerUrl')}</p>
          <p className="text-xs text-slate-500">{t('team.footerTag')}</p>
        </motion.div>
      </section>
    </main>
  );
}
