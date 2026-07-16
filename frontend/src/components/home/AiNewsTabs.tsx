'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { HiOutlineGlobeAlt, HiOutlineKey, HiOutlineUserGroup } from 'react-icons/hi';
import { IoArrowForward } from 'react-icons/io5';
import { SOCIAL_LINKS } from '@utils/constants';

interface TabData {
  id: number;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
}

export default function AiNewsTabs({ 
  isDark, 
  mutedText, 
  t 
}: { 
  isDark: boolean; 
  mutedText: string; 
  t: (key: string) => string;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  // Autoplay and progress bar fill logic (strictly chronological loop order: 0 -> 1 -> 2 -> 0)
  useEffect(() => {
    if (isHovered) return;

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          setActiveIndex((current) => (current + 1) % 3);
          return 0;
        }
        return prev + 1; // 1% increment every 50ms = 5000ms cycle
      });
    }, 50);

    return () => clearInterval(interval);
  }, [isHovered]);

  const handleTabClick = (index: number) => {
    setActiveIndex(index);
    setProgress(0);
  };

  const tabs: TabData[] = [
    {
      id: 0,
      title: "Maxsus domenlar",
      subtitle: "Loyiha uchun shaxsiy domen",
      icon: <HiOutlineGlobeAlt className="w-5 h-5" />,
    },
    {
      id: 1,
      title: "Parol bilan himoya",
      subtitle: "Havolalarni maxfiy saqlash",
      icon: <HiOutlineKey className="w-5 h-5" />,
    },
    {
      id: 2,
      title: "Jamoaviy ishlash",
      subtitle: "Birgalikda loyihalar yaratish",
      icon: <HiOutlineUserGroup className="w-5 h-5" />,
    },
  ];

  return (
    <section 
      className={`relative w-full border-t border-b overflow-hidden rounded-none py-20 sm:py-24 transition-all duration-500 z-10 ${
        isDark 
          ? 'border-white/10 bg-slate-950 text-white shadow-2xl' 
          : 'border-slate-200 bg-white text-slate-900 shadow-xl'
      }`}
    >
      {/* Dynamic Background Image from public/fordesign/ */}
      <div 
        className="absolute inset-0 bg-cover bg-center transition-all duration-700 ease-in-out pointer-events-none rounded-none"
        style={{ 
          backgroundImage: `url(${
            activeIndex === 0 
              ? '/fordesign/1.png' 
              : activeIndex === 1 
              ? '/fordesign/2.png' 
              : '/fordesign/3.png'
          })`,
          opacity: isDark ? 0.08 : 0.04
        }}
      />
      {/* High-end Dark Linear Gradient Overlay */}
      <div 
        className={`absolute inset-0 transition-all duration-500 pointer-events-none rounded-none ${
          isDark 
            ? 'bg-gradient-to-b from-slate-950 via-slate-950/90 to-slate-950' 
            : 'bg-gradient-to-b from-white via-white/95 to-white'
        }`}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-6 flex flex-col justify-between h-full">
        {/* Top Part: Animated content area (Hover-pause triggers ONLY when mouse is over the active card container) */}
        <div 
          className="relative h-[26rem] w-full cursor-default"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <AnimatePresence mode="wait">
            {activeIndex === 0 && (
              <motion.div
                key="content-0"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
                className="flex flex-col justify-between h-full"
              >
                <div>
                  <div className="flex items-center gap-3">
                    <span className={`text-[10px] font-bold uppercase tracking-[0.25em] px-3 py-1 rounded-none border ${isDark ? 'border-platinum-500/20 text-platinum-200 bg-platinum-500/5' : 'border-platinum-300 text-platinum-700 bg-platinum-50'}`}>
                      AI YANGILIKLARI · Telegram
                    </span>
                  </div>
                  <h2 className="mt-6 font-title font-extrabold text-3xl sm:text-4xl md:text-5xl tracking-tight leading-tight max-w-4xl text-slate-900 dark:text-white">
                    AI Agentlar davri boshlandi: Cursor va Claude ish oqimlari real biznesga kirib keldi
                  </h2>
                  <p className={`mt-6 text-sm sm:text-base md:text-lg font-sans font-light leading-relaxed max-w-3xl ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                    Yangi trend: kichik jamoalar ham agentlar bilan katta product tezligiga chiqmoqda. Avtomatlashtirilgan kodlash va jarayonlar tezligi 10 barobargacha oshdi. Biznes jarayonlarini integratsiyalash orqali inson resurslarini yanada samarali yo'naltiring.
                  </p>
                </div>

                <div className="mt-8">
                  <Link
                    href={SOCIAL_LINKS.telegram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-base font-semibold text-platinum-400 hover:text-platinum-300 transition-colors group"
                  >
                    <span>To'liq yangilik uchun Telegram</span>
                    <IoArrowForward className="text-lg transition-transform group-hover:translate-x-1" />
                  </Link>
                </div>
              </motion.div>
            )}

            {activeIndex === 1 && (
              <motion.div
                key="content-1"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
                className="flex flex-col justify-between h-full"
              >
                <div>
                  <div className="flex items-center gap-3">
                    <span className={`text-[10px] font-bold uppercase tracking-[0.25em] px-3 py-1 rounded-none border ${isDark ? 'border-platinum-500/20 text-platinum-200 bg-platinum-500/5' : 'border-platinum-300 text-platinum-700 bg-platinum-50'}`}>
                      AI YANGILIKLARI · Instagram
                    </span>
                  </div>
                  <h2 className="mt-6 font-title font-extrabold text-3xl sm:text-4xl md:text-5xl tracking-tight leading-tight max-w-4xl text-slate-900 dark:text-white">
                    Prompt engineering endi alohida kasb: kompaniyalar aniq skill bilan mutaxassis qidirmoqda
                  </h2>
                  <p className={`mt-6 text-sm sm:text-base md:text-lg font-sans font-light leading-relaxed max-w-3xl ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                    Senior darajada prompt yozish orqali sifat, xavfsizlik va xarajat bir vaqtning o'zida optimallashtirilmoqda. AI bilan samarali muloqot tizimlarini yaratib, kelajak kasbini bugundan egallang.
                  </p>
                </div>

                <div className="mt-8">
                  <Link
                    href={SOCIAL_LINKS.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-base font-semibold text-platinum-400 hover:text-platinum-300 transition-colors group"
                  >
                    <span>Batafsil post Instagram'da</span>
                    <IoArrowForward className="text-lg transition-transform group-hover:translate-x-1" />
                  </Link>
                </div>
              </motion.div>
            )}

            {activeIndex === 2 && (
              <motion.div
                key="content-2"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
                className="flex flex-col justify-between h-full"
              >
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                  <div>
                    <div className="flex items-center gap-3">
                      <span className={`text-[10px] font-bold uppercase tracking-[0.25em] px-3 py-1 rounded-none border ${isDark ? 'border-emerald-500/20 text-emerald-400 bg-emerald-500/5' : 'border-emerald-300 text-emerald-700 bg-emerald-50'}`}>
                        JAMOAVIY DASHBOARD · Active
                      </span>
                    </div>
                    <h2 className="mt-6 font-title font-extrabold text-3xl sm:text-4xl md:text-5xl tracking-tight leading-tight text-slate-900 dark:text-white">
                      Haftalik jamoaviy faollik ko'rsatkichi
                    </h2>
                    <p className={`mt-6 text-sm sm:text-base md:text-lg font-sans font-light leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                      Jamoa a'zolari o'rtasida real vaqt rejimida hamkorlik tizimi. Kodlarni birgalikda yozish, review jarayoni va integratsiyalarni muvofiqlashtirish.
                    </p>
                  </div>

                  {/* Active team members lists */}
                  <div className="space-y-3 p-4 border rounded-none bg-slate-900/10 dark:bg-white/[0.02] border-slate-200/50 dark:border-white/5">
                    <div className="flex items-center justify-between p-3 rounded-none border border-slate-200/40 dark:border-white/5 bg-white/[0.01]">
                      <div className="flex items-center gap-4">
                        <div className="w-9 h-9 rounded-none bg-platinum-800 text-platinum-300 flex items-center justify-center font-bold text-sm">S</div>
                        <div>
                          <div className="text-sm font-bold text-slate-800 dark:text-white">Suhrob</div>
                          <div className="text-xs text-slate-400">Editing index.css</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-emerald-400">
                        <span className="w-2 h-2 rounded-none bg-emerald-400 animate-ping" />
                        <span>Active</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 rounded-none border border-slate-200/40 dark:border-white/5 bg-white/[0.01]">
                      <div className="flex items-center gap-4">
                        <div className="w-9 h-9 rounded-none bg-platinum-800/40 text-platinum-400 flex items-center justify-center font-bold text-sm">A</div>
                        <div>
                          <div className="text-sm font-bold text-slate-800 dark:text-white">Abduvoris</div>
                          <div className="text-xs text-slate-400">Testing api/auth</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-emerald-400">
                        <span className="w-2 h-2 rounded-none bg-emerald-400" />
                        <span>Syncing</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between border-t pt-2.5 border-slate-200/50 dark:border-white/5">
                  <span className={`text-xs font-mono ${mutedText}`}>Jamoaviy sync: 99.8%</span>
                  <Link
                    href="/team"
                    className="text-sm text-platinum-400 font-semibold flex items-center gap-1 hover:text-platinum-300 transition-colors group"
                  >
                    <span>Loyihani boshqarish</span> 
                    <IoArrowForward className="text-base transition-transform group-hover:translate-x-1" />
                  </Link>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Bottom Part: 3 Luxury Trigger Tabs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12 border-t pt-8 border-slate-200/50 dark:border-white/5">
          {tabs.map((tab) => {
            const isActive = activeIndex === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id)}
                className={`flex flex-col items-start p-6 rounded-none border text-left transition-all duration-300 relative ${
                  isActive
                    ? isDark
                      ? 'border-platinum-500/40 bg-platinum-500/[0.04] text-white shadow-lg'
                      : 'border-platinum-400 bg-platinum-50/50 text-slate-900 shadow-md'
                    : isDark
                      ? 'border-white/5 bg-white/[0.01] text-slate-400 hover:bg-white/[0.03] hover:border-white/10'
                      : 'border-slate-200 bg-slate-50/50 text-slate-600 hover:bg-slate-50 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={isActive ? 'text-platinum-400' : 'text-slate-400'}>
                    {tab.icon}
                  </span>
                  <span className="text-sm font-bold font-title uppercase tracking-wider">
                    {tab.title}
                  </span>
                </div>
                <span className={`text-xs font-sans mt-2 ${isActive ? 'opacity-90' : 'opacity-65'}`}>
                  {tab.subtitle}
                </span>

                {/* Progress Indicator line */}
                <div className={`w-full h-[3px] rounded-none overflow-hidden mt-4 ${isDark ? 'bg-white/5' : 'bg-slate-200'}`}>
                  <div 
                    className={`h-full ${isActive ? 'bg-platinum-500' : 'bg-transparent'}`}
                    style={{ 
                      width: isActive ? `${progress}%` : '0%',
                      transition: progress === 0 ? 'none' : 'width 50ms linear'
                    }}
                  />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
