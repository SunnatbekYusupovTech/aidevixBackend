'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { FaInstagram, FaTelegram, FaLinkedin } from 'react-icons/fa';
import { useLang } from '@/context/LangContext';

type TeamMember = {
  id: string;
  name: string;
  age: number;
  hideAge?: boolean;
  roleBadge: string;
  details: string;
  stack: string[];
  asset: string;
  cursorColor: string;
  textColor: string;
  telegram?: string;
  instagram?: string;
  linkedin?: string;
  portfolio?: string;
};

const TEAM_MEMBERS: TeamMember[] = [
  {
    id: 'sunnatbek',
    name: 'Sunnatbek Yusupov',
    age: 0,
    hideAge: true,
    roleBadge: 'CEO / FOUNDER',
    details: 'Aidevix strategiyasi, mahsulot yo‘nalishi va frontend arxitekturasi.',
    stack: ['React', 'TypeScript', 'Next.js', 'Tailwind CSS'],
    asset: '/team/sunnatbee.jpg',
    cursorColor: 'bg-yellow-500',
    textColor: 'text-yellow-400',
    telegram: 'https://t.me/SUNNATBEE',
    instagram: 'https://www.instagram.com/sunnatbee',
    linkedin: 'https://www.linkedin.com/in/sunnatbee/',
  },
  {
    id: 'sardor',
    name: 'SARDOR',
    age: 15,
    roleBadge: 'TEAM LEAD / QA',
    details: 'UI/UX dizayn tizimlari va kreativ g‘oyalar yaratuvchisi. Muammolarni tezkor bartaraf etuvchi faol bug fixer, JWT cookie auth, Mongoose sxemalari va CI/CD.',
    stack: ['UI/UX Design', 'Figma', 'Node.js', 'Mongoose', 'Swagger API'],
    asset: '/team/Sardor.jpg',
    cursorColor: 'bg-emerald-500',
    textColor: 'text-emerald-400',
  },
  {
    id: 'firdavs',
    name: 'FIRDAVS',
    age: 16,
    roleBadge: 'AUTH SPECIALIST',
    details: 'Autentifikatsiya tizimi, Cookie-based JWT sessiyasi, ProtectedRoute, email validation, kunlik mukofot modali.',
    stack: ['React 18', 'TypeScript', 'Next.js 14', 'Redux Toolkit'],
    asset: '/team/Firdavs.jpg',
    cursorColor: 'bg-blue-500',
    textColor: 'text-blue-400',
  },
  {
    id: 'abduvohid',
    name: 'ABDUVOHID',
    age: 15,
    roleBadge: 'HOME UI / FRONTEND',
    details: 'Bosh sahifa UI/UX, hero, metrikalar, kurs bloklari, Framer Motion va GSAP silliq animatsiyalari.',
    stack: ['Framer Motion', 'GSAP', 'CSS 3D', 'UI/UX'],
    asset: '/team/abduvohid.jpg',
    cursorColor: 'bg-purple-500',
    textColor: 'text-purple-400',
  },
  {
    id: 'abduvoris',
    name: 'ABDUVORIS',
    age: 16,
    roleBadge: 'VIDEO ENGINEER',
    details: 'Bunny.net Stream HLS video pleer, videolar ichidagi quiz tizimi, progress tracking va skeletonlar.',
    stack: ['Bunny.net', 'HLS.js', 'Video Stream', 'Skeleton CSS'],
    asset: '/team/Abduvoris.jpg',
    cursorColor: 'bg-cyan-500',
    textColor: 'text-cyan-400',
  },
  {
    id: 'doniyor',
    name: 'DONIYOR',
    age: 16,
    roleBadge: 'COURSE ARCHITECT',
    details: 'Kurslar tuzilishi, modullar tizimi va darslar ketma-ketligi arxitekturasi.',
    stack: ['React 18', 'TypeScript', 'Next.js 14', 'Redux Toolkit'],
    asset: '/team/Doniyor.jpg',
    cursorColor: 'bg-teal-500',
    textColor: 'text-teal-400',
  },
  {
    id: 'suhrob',
    name: 'SUHROB',
    age: 14,
    roleBadge: 'RANKING BUILDER',
    details: 'Reyting tizimi, XP (tajriba ballari) hisoblash logikasi va peshqadamlar jadvali (leaderboard).',
    stack: ['Leaderboards', 'Gamification', 'XP Logic', 'MongoDB'],
    asset: '/team/Suhrob.jpg',
    cursorColor: 'bg-pink-500',
    textColor: 'text-pink-400',
  },
  {
    id: 'qudrat',
    name: 'QUDRAT',
    age: 14,
    roleBadge: 'MOTION CREATOR',
    details: 'Foydalanuvchi tajribasini boyitish uchun interaktiv GSAP va Framer Motion animatsiyalari.',
    stack: ['GSAP 3', 'Three.js', 'Framer Motion'],
    asset: '/team/Qudrat.jpg',
    cursorColor: 'bg-violet-500',
    textColor: 'text-violet-400',
  },
  {
    id: 'mystery',
    name: 'WANTED_NODE',
    age: 0,
    hideAge: true,
    roleBadge: 'WANTED / ?????',
    details: '#WANTED #CREATIVE_MIND // Tizimda bo‘shliq aniqlandi. _Bizga kreativ va nostandart fikrlaydigan dev kerak!_ #JOIN_US // matrix_integrity: unstable.',
    stack: ['#CREATIVE', '#CODER', '#BUG_FIXER', 'YOU?'],
    asset: '/team/mystery.jpg',
    cursorColor: 'bg-red-500',
    textColor: 'text-red-400',
  },
];

const LOCALIZED_CONTENT = {
  uz: {
    title: 'OUR_HUMAN_INTELLIGENCE',
    subtitle: 'AIDEVIX RIVOJLANISH JAMOASI',
    heroDesc: 'Zamonaviy sun\'iy intellekt va dasturlash o\'quv platformasi - Aidevix asoschilari va ishlab chiquvchilari.',
    status: 'HOLAT: FAOL_RIVOJLANISH_TIZIMI',
    agents: 'BARCHA AGENTLAR',
    tech: 'TEXNOLOGIYALAR',
    years: 'YOSH',
    stack: 'TEXNOLOGIYALAR RO\'YHATI',
    experience: 'JAMOADAGI VAZIFASI',
    socials: 'ALOQA KANALLARI',
    portfolio: 'PORTFOLIO ULANISHI',
    systemLogs: 'TIZIM TINGLOVCHISI: INSON NODE ULANIROVCHI FAOL...',
  },
  en: {
    title: 'OUR_HUMAN_INTELLIGENCE',
    subtitle: 'AIDEVIX DEVELOPMENT TEAM',
    heroDesc: 'The founders and builders of the modern artificial intelligence and coding platform - Aidevix.',
    status: 'STATUS: ACTIVE_DEVELOPMENT_CYCLE',
    agents: 'TOTAL AGENTS',
    tech: 'TECHNOLOGIES',
    years: 'Y.O',
    stack: 'TECH STACK',
    experience: 'PLATFORM CONTRIBUTION',
    socials: 'COMMUNICATION NODES',
    portfolio: 'PORTFOLIO INTERCONNECT',
    systemLogs: 'SYSTEM LISTENER: HUMAN NODE INTERCONNECT ACTIVE...',
  },
  ru: {
    title: 'OUR_HUMAN_INTELLIGENCE',
    subtitle: 'КОМАНДА РАЗРАБОТКИ AIDEVIX',
    heroDesc: 'Основатели и разработчики современной платформы обучения искусственному интеллекту и программированию - Aidevix.',
    status: 'СТАТУС: АКТИВНЫЙ_ЦИКЛ_РАЗРАБОТКИ',
    agents: 'ВСЕГО АГЕНТОВ',
    tech: 'ТЕХНОЛОГИИ',
    years: 'ЛЕТ',
    stack: 'СТЕК ТЕХНОЛОГИЙ',
    experience: 'ВКЛАД В ПЛАТФОРМУ',
    socials: 'УЗЛЫ СВЯЗИ',
    portfolio: 'ПОРТФОЛИО СВЯЗЬ',
    systemLogs: 'СИСТЕМНЫЙ СЛУШАТЕЛЬ: ИНТЕРКОННЕКТ ЧЕЛОВЕЧЕСКИХ НОД АКТИВЕН...',
  }
};

export default function TeamPage() {
  const { lang } = useLang();
  const c = LOCALIZED_CONTENT[lang as keyof typeof LOCALIZED_CONTENT] || LOCALIZED_CONTENT.uz;

  const avgAge = (TEAM_MEMBERS.filter(m => !m.hideAge).reduce((sum, m) => sum + m.age, 0) / TEAM_MEMBERS.filter(m => !m.hideAge).length).toFixed(1);
  const totalTech = Array.from(new Set(TEAM_MEMBERS.flatMap(m => m.stack))).length;

  return (
    <main className="relative min-h-screen w-full bg-black text-[#e2e6e9] overflow-hidden rounded-none select-none font-mono">
      {/* 1. Tactical Green Matrix Grid Overlay */}
      <div 
        className="absolute inset-0 z-0 pointer-events-none opacity-[0.03]" 
        style={{
          backgroundImage: `
            linear-gradient(to right, #10b981 1px, transparent 1px),
            linear-gradient(to bottom, #10b981 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px'
        }}
      />
      
      {/* 2. CRT Scanline Overlay */}
      <div 
        className="absolute inset-0 z-0 pointer-events-none opacity-[0.015] bg-[linear-gradient(to_bottom,rgba(16,185,129,0.3)_50%,rgba(0,0,0,0)_50%)] bg-[size:100%_4px]"
      />

      {/* 3. High-End Background Ambient Glows */}
      <div className="absolute inset-x-0 top-0 h-[45rem] pointer-events-none z-0">
        <div className="absolute left-[10%] top-[-10%] w-[35%] h-[25rem] rounded-none blur-[150px] opacity-[0.07] bg-emerald-500" />
        <div className="absolute right-[10%] top-[5%] w-[30%] h-[20rem] rounded-none blur-[150px] opacity-[0.04] bg-emerald-600" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
        
        {/* Header Terminal Console Block */}
        <div className="border border-emerald-500/20 bg-emerald-950/5 p-4 sm:p-5 rounded-none mb-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs text-emerald-400 font-bold">
              <span className="h-2 w-2 animate-ping bg-emerald-500 rounded-none" />
              <span>{c.status}</span>
            </div>
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest leading-none">
              {c.systemLogs}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-[10px] font-bold">
            <span className="border border-emerald-500/35 px-2.5 py-1 text-emerald-400 bg-emerald-950/20 rounded-none">
              GRID: COMPRESSED
            </span>
            <span className="border border-zinc-800 px-2.5 py-1 text-zinc-400 bg-zinc-900/40 rounded-none">
              ENCRYPTION: AES-256
            </span>
          </div>
        </div>

        {/* Title & Description */}
        <div className="mb-14 border-b border-emerald-500/10 pb-8">
          <h1 className="text-3xl sm:text-5xl lg:text-7xl font-extrabold italic uppercase tracking-wider text-white">
            {c.title}
          </h1>
          <p className="mt-3 text-xs sm:text-sm text-emerald-500/70 font-semibold tracking-wider uppercase">
            {"// "}{c.subtitle}
          </p>
          <p className="mt-4 max-w-2xl text-xs sm:text-sm text-zinc-400 leading-relaxed font-sans font-light">
            {c.heroDesc}
          </p>
        </div>

        {/* Tactical Metrics Dashboard */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16">
          {[
            { label: c.agents, value: `[0${TEAM_MEMBERS.length}]`, desc: 'Active human nodes' },
            { label: 'AVERAGE_AGE', value: `[${avgAge}]`, desc: 'Mean crew age' },
            { label: c.tech, value: `[${totalTech}+]`, desc: 'Direct stack elements' },
            { label: 'NODE_INTEGRITY', value: '[100%]', desc: 'No latency detected' },
          ].map((m, idx) => (
            <div 
              key={idx} 
              className="border border-zinc-800 bg-zinc-950/60 p-4 sm:p-5 rounded-none flex flex-col justify-between hover:border-emerald-500/30 transition-colors duration-300"
            >
              <span className="text-[9px] sm:text-[10px] font-bold text-zinc-500 tracking-wider uppercase">{m.label}</span>
              <span className="text-xl sm:text-2xl font-black text-emerald-400 mt-2 font-mono">{m.value}</span>
              <span className="text-[9px] text-zinc-600 mt-1 font-sans">{m.desc}</span>
            </div>
          ))}
        </div>

        {/* Staggered Asymmetric Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {TEAM_MEMBERS.map((member, index) => {
            const isCEO = member.id === 'sunnatbek';
            const isMystery = member.id === 'mystery';
            return (
              <div
                key={member.id}
                className={`group relative border bg-zinc-950/40 transition-all duration-300 rounded-none flex flex-col justify-between col-span-1 ${
                  isCEO 
                    ? 'border-yellow-500/20 hover:border-yellow-500/70 shadow-[0_0_15px_rgba(234,179,8,0.02)] hover:shadow-[0_0_25px_rgba(234,179,8,0.05)]' 
                    : isMystery
                      ? 'border-red-500/20 hover:border-red-500/70 shadow-[0_0_15px_rgba(239,68,68,0.02)] hover:shadow-[0_0_25px_rgba(239,68,68,0.05)]'
                      : 'border-zinc-850 hover:border-emerald-500/60'
                }`}
              >
                {/* 4 Corner Minimalist Neon Bracket Lines */}
                <div className={`absolute top-0 left-0 w-3.5 h-3.5 border-t border-l z-20 pointer-events-none group-hover:border-t-2 group-hover:border-l-2 transition-all duration-200 ${
                  isCEO ? 'border-yellow-500' : isMystery ? 'border-red-500' : 'border-emerald-500'
                }`} />
                <div className={`absolute top-0 right-0 w-3.5 h-3.5 border-t border-r z-20 pointer-events-none group-hover:border-t-2 group-hover:border-r-2 transition-all duration-200 ${
                  isCEO ? 'border-yellow-500' : isMystery ? 'border-red-500' : 'border-emerald-500'
                }`} />
                <div className={`absolute bottom-0 left-0 w-3.5 h-3.5 border-b border-l z-20 pointer-events-none group-hover:border-b-2 group-hover:border-l-2 transition-all duration-200 ${
                  isCEO ? 'border-yellow-500' : isMystery ? 'border-red-500' : 'border-emerald-500'
                }`} />
                <div className={`absolute bottom-0 right-0 w-3.5 h-3.5 border-b border-r z-20 pointer-events-none group-hover:border-b-2 group-hover:border-r-2 transition-all duration-200 ${
                  isCEO ? 'border-yellow-500' : isMystery ? 'border-red-500' : 'border-emerald-500'
                }`} />

                {/* Corner-locked Glowing Mock Cursors (Slide in on Hover) */}
                {/* Top-Left Cursor */}
                <div className="absolute top-3 left-3 z-30 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-300 transform -translate-x-3 pointer-events-none select-none">
                  <svg className={`w-3.5 h-3.5 fill-current ${
                    isCEO 
                      ? 'text-yellow-400 drop-shadow-[0_0_8px_rgba(234,179,8,0.8)]' 
                      : isMystery
                        ? 'text-red-400 drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]'
                        : 'text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.8)]'
                  }`} viewBox="0 0 24 24">
                    <path d="M4.5 3v15.25l4.5-4.25h6.25L4.5 3z" />
                  </svg>
                  <span className={`text-black text-[8px] font-bold px-1.5 py-0.5 tracking-wider rounded-none uppercase ${
                    isCEO ? 'bg-yellow-500' : isMystery ? 'bg-red-500' : 'bg-emerald-500'
                  }`}>
                    NODE_{member.name.split(/[ _]/)[0]}
                  </span>
                </div>

                {/* Bottom-Right Cursor */}
                <div className="absolute bottom-3 right-3 z-30 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-3 pointer-events-none select-none">
                  <span className="bg-purple-600 text-white text-[8px] font-bold px-1.5 py-0.5 tracking-wider rounded-none uppercase">
                    SYS_CONN
                  </span>
                  <svg className="w-3.5 h-3.5 text-purple-400 fill-current transform rotate-180 drop-shadow-[0_0_8px_rgba(168,85,247,0.8)]" viewBox="0 0 24 24">
                    <path d="M4.5 3v15.25l4.5-4.25h6.25L4.5 3z" />
                  </svg>
                </div>

                {/* Card Top: Image / Portrait Box */}
                <div className="relative overflow-hidden bg-zinc-950/80 aspect-[4/5] w-full border-b border-zinc-900 flex items-center justify-center">
                  {isMystery ? (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-black/75 relative select-none overflow-hidden group-hover:bg-black/60 transition-colors duration-500">
                      {/* Cyber scanline & noise textures */}
                      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(239,68,68,0.08)_50%,rgba(0,0,0,0)_50%)] bg-[size:100%_8px] pointer-events-none" />
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_30%,rgba(0,0,0,0.85)_100%)] pointer-events-none" />
                      
                      {/* Glitchy Matrix Grid Lines */}
                      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(239,68,68,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(239,68,68,0.03)_1px,transparent_1px)] bg-[size:15px_15px] pointer-events-none" />

                      {/* WANTED Cyber Stamp Banner */}
                      <div className="absolute top-1/4 w-[120%] text-center transform -rotate-12 bg-red-600/90 border-y-2 border-red-500 py-2 shadow-[0_0_25px_rgba(220,38,38,0.6)] z-10 transition-transform group-hover:scale-105 duration-500 select-none">
                        <span className="text-xl font-black text-black tracking-[0.3em] font-mono animate-pulse">
                          WANTED
                        </span>
                      </div>

                      {/* Glitchy Question Mark */}
                      <span className="text-8xl font-black text-red-950/40 group-hover:text-red-500/80 transition-all duration-500 font-mono tracking-tighter drop-shadow-[0_0_20px_rgba(239,68,68,0.3)] animate-pulse mt-8">
                        ?
                      </span>

                      <div className="absolute bottom-6 text-center z-10 px-4">
                        <span className="text-[10px] tracking-[0.25em] font-mono text-red-500/40 group-hover:text-red-400 font-bold uppercase animate-pulse block">
                          {"// SEEKING_CREATIVE_NODE"}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <Image
                      src={member.asset}
                      alt={member.name}
                      width={400}
                      height={500}
                      className="w-full h-full object-cover object-top origin-top filter grayscale opacity-60 contrast-125 group-hover:grayscale-0 group-hover:opacity-100 group-hover:scale-[1.03] transition-all duration-500 ease-out rounded-none"
                    />
                  )}
                  {/* Grid Lines Pattern Inside Photo */}
                  <div className={`absolute inset-0 bg-[linear-gradient(to_right,rgba(16,185,129,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(16,185,129,0.02)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none ${
                    isMystery ? 'opacity-0' : ''
                  }`} />
                  
                  {/* Tactical gradient fade to bottom */}
                  <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-zinc-950 to-transparent pointer-events-none" />
                  
                  {/* Console Style Top Badges */}
                  <div className="absolute top-4 right-4 flex gap-1.5 z-20 font-bold">
                    <span className={`px-2 py-0.5 text-[9px] tracking-wider uppercase rounded-none ${
                      isCEO 
                        ? 'bg-yellow-950/85 border border-yellow-500/40 text-yellow-400' 
                        : isMystery
                          ? 'bg-red-950/90 border border-red-500/50 text-red-400 shadow-[0_0_8px_rgba(239,68,68,0.3)] animate-pulse'
                          : 'bg-emerald-950/85 border border-emerald-500/40 text-emerald-400'
                    }`}>
                      [{member.roleBadge}]
                    </span>
                    {!member.hideAge && (
                      <span className="bg-zinc-900/85 border border-zinc-700 text-zinc-400 px-2 py-0.5 text-[9px] tracking-wider uppercase rounded-none">
                        [{member.age} {c.years}]
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Bottom: Member Specifications */}
                <div className="p-5 sm:p-6 space-y-4 flex-1 flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <h3 className={`text-lg font-black tracking-wider uppercase text-white transition-colors duration-300 ${
                        isCEO 
                          ? 'group-hover:text-yellow-400' 
                          : isMystery
                            ? 'group-hover:text-red-400 animate-pulse text-red-500/90'
                            : 'group-hover:text-emerald-400'
                      }`}>
                        {member.name}
                      </h3>
                      <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono">
                        {isMystery ? '// ID: ANOMALY_NODE' : `// ID: DEV_NODE_0${index + 1}`}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <span className="text-[9px] font-bold text-zinc-500 tracking-wider uppercase block">{"// "}{c.experience}</span>
                      {isMystery ? (
                        <div className="space-y-2 font-mono text-xs">
                          {/* Red Neon Hashtags */}
                          <div className="flex flex-wrap gap-1.5">
                            <span className="px-1.5 py-0.5 text-[9px] font-black bg-red-950/50 border border-red-500/40 text-red-400 shadow-[0_0_6px_rgba(239,68,68,0.2)]">
                              #WANTED
                            </span>
                            <span className="px-1.5 py-0.5 text-[9px] font-black bg-red-950/30 border border-red-500/30 text-red-400">
                              #CREATIVE_MIND
                            </span>
                            <span className="px-1.5 py-0.5 text-[9px] font-black bg-red-950/30 border border-red-500/30 text-red-400">
                              #JOIN_US
                            </span>
                          </div>
                          
                          {/* Slanted, highly styled italic details */}
                          <p className="text-xs text-zinc-200 leading-relaxed italic border-l-2 border-red-500/40 pl-2.5 py-1 bg-red-950/10 font-serif">
                            Bizga kreativ va nostandart fikrlaydigan dev kerak!
                          </p>

                          <div className="text-[9px] text-red-500/50 leading-tight">
                            {"// Tizimda bo‘shliq aniqlandi. matrix_integrity: unstable."}
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-zinc-300 leading-relaxed font-sans font-light font-italic italic">
                          {member.details}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2 pt-2">
                      <span className="text-[9px] font-bold text-zinc-500 tracking-wider uppercase block">{"// "}{c.stack}</span>
                      <div className="flex flex-wrap gap-1.5">
                        {member.stack.map(tech => (
                          <span 
                            key={tech} 
                            className={`px-2 py-0.5 border text-[9px] font-bold bg-zinc-900/20 rounded-none transition-colors duration-300 ${
                              isCEO 
                                ? 'border-zinc-800 text-zinc-400 group-hover:border-yellow-500/35 group-hover:text-yellow-300' 
                                : isMystery
                                  ? 'border-red-500/30 text-red-400/90 shadow-[0_0_4px_rgba(239,68,68,0.15)] group-hover:border-red-500/60 group-hover:text-red-300 font-bold italic'
                                  : 'border-zinc-800 text-zinc-400 group-hover:border-emerald-500/20 group-hover:text-emerald-300'
                            }`}
                          >
                            {tech}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Social Handles / Call to Action */}
                  {isMystery ? (
                    <div className="pt-3 border-t border-zinc-900/80">
                      <a
                        href="https://t.me/SUNNATBEE"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full py-2 border border-red-500/35 hover:border-red-500 bg-red-950/20 hover:bg-red-500/10 text-[10px] font-bold text-red-400 hover:text-red-300 transition-all duration-300 rounded-none flex items-center justify-center gap-2 tracking-widest uppercase shadow-[0_0_10px_rgba(239,68,68,0.05)] hover:shadow-[0_0_15px_rgba(239,68,68,0.25)]"
                      >
                        <span className="w-1.5 h-1.5 bg-red-500 animate-ping rounded-none" />
                        <span>JOIN_US_NODE // CONNECT</span>
                      </a>
                    </div>
                  ) : (member.telegram || member.instagram || member.linkedin) ? (
                    <div className="flex gap-2 pt-2 border-t border-zinc-900">
                      {member.linkedin && (
                        <a
                          href={member.linkedin}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`${member.name} LinkedIn`}
                          className={`p-1.5 border bg-zinc-900/10 transition-all duration-300 rounded-none flex items-center justify-center ${
                            isCEO
                              ? 'border-zinc-800 text-zinc-400 hover:border-yellow-500/40 hover:text-yellow-400 hover:bg-yellow-500/5'
                              : 'border-zinc-800 text-zinc-400 hover:border-emerald-500/40 hover:text-emerald-400 hover:bg-emerald-500/5'
                          }`}
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
                          className={`p-1.5 border bg-zinc-900/10 transition-all duration-300 rounded-none flex items-center justify-center ${
                            isCEO
                              ? 'border-zinc-800 text-zinc-400 hover:border-yellow-500/40 hover:text-yellow-400 hover:bg-yellow-500/5'
                              : 'border-zinc-800 text-zinc-400 hover:border-emerald-500/40 hover:text-emerald-400 hover:bg-emerald-500/5'
                          }`}
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
                          className={`p-1.5 border bg-zinc-900/10 transition-all duration-300 rounded-none flex items-center justify-center ${
                            isCEO
                              ? 'border-zinc-800 text-zinc-400 hover:border-yellow-500/40 hover:text-yellow-400 hover:bg-yellow-500/5'
                              : 'border-zinc-800 text-zinc-400 hover:border-emerald-500/40 hover:text-emerald-400 hover:bg-emerald-500/5'
                          }`}
                        >
                          <FaInstagram size={13} />
                        </a>
                      )}
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer System Console Printout */}
        <div className="mt-20 border-t border-emerald-500/10 pt-8 text-center text-[10px] text-zinc-600 space-y-2">
          <p className="font-mono">
            {"// END_OF_FILE // SYSTEM_ACTIVE // ALL_NODES_OPERATIONAL: TRUE"}
          </p>
          <p className="font-mono text-emerald-500/40 animate-pulse">
            AIDEVIX PLATFORM CORE HUMAN ASSETS V2.06
          </p>
        </div>
      </div>
    </main>
  );
}
