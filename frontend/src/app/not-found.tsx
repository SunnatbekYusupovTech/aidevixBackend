'use client';

import React from 'react';
import Link from 'next/link';
import { IoHomeOutline, IoSearchOutline } from 'react-icons/io5';
import { useLang } from '@/context/LangContext';
import SiteLogoMark from '@components/common/SiteLogoMark';

export default function NotFound() {
  const { t } = useLang();

  return (
    <div className="relative flex min-h-screen w-full min-w-0 max-w-full flex-col items-center justify-center overflow-x-clip bg-[#0A0E1A] p-4 text-center font-sans selection:bg-[#efa243]/30 sm:p-6">
      {/* Ambient background glows */}
      <div className="absolute top-1/4 left-1/4 w-[35vw] h-[35vw] rounded-full bg-indigo-500/10 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[30vw] h-[30vw] rounded-full bg-[#efa243]/10 blur-[100px] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(235,138,20,0.05),transparent_60%)]" />

      {/* Main card container */}
      <div className="relative z-10 w-full max-w-lg rounded-[2.5rem] border border-white/5 bg-slate-950/45 p-8 backdrop-blur-2xl shadow-2xl shadow-black/80 animate-fade-in-up md:p-12">
        
        {/* Large decorative 404 behind the content */}
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 select-none pointer-events-none">
          <h1 className="text-[9rem] sm:text-[12rem] font-black italic tracking-tighter text-white/[0.02] leading-none">
            404
          </h1>
        </div>

        {/* Logo/Icon Area */}
        <div className="relative mb-6 flex justify-center">
          <div className="absolute inset-0 m-auto h-20 w-20 bg-[#efa243]/20 rounded-3xl blur-xl" />
          <SiteLogoMark size={76} className="relative z-10 rounded-3xl border border-[#efa243]/20 shadow-[0_10px_30px_rgba(235,138,20,0.15)]" />
        </div>

        {/* Title & Description */}
        <div className="relative z-10 mb-8">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mb-3">
            {t('notFound.title')}
          </h2>
          <p className="text-slate-400 max-w-sm mx-auto text-sm leading-relaxed sm:text-base">
            {t('notFound.desc')}
          </p>
        </div>

        {/* Navigation Buttons */}
        <div className="flex w-full flex-col justify-center gap-3 sm:flex-row sm:gap-4">
          <Link 
            href="/" 
            className="group relative flex h-12 sm:h-14 items-center justify-center gap-2.5 rounded-full bg-gradient-to-r from-[#efa243] to-[#eb8a14] px-8 text-sm sm:text-base font-bold text-white shadow-[0_4px_20px_rgba(235,138,20,0.3)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_8px_30px_rgba(235,138,20,0.5)] active:translate-y-0 cursor-pointer"
          >
            <IoHomeOutline size={18} className="transition-transform duration-300 group-hover:-translate-x-0.5" />
            {t('notFound.home')}
          </Link>
          <Link 
            href="/courses" 
            className="flex h-12 sm:h-14 items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-8 text-sm sm:text-base font-bold text-white transition-all duration-300 hover:bg-white/10 hover:border-white/20 active:scale-98 cursor-pointer"
          >
            <IoSearchOutline size={18} />
            {t('notFound.courses')}
          </Link>
        </div>

        {/* Branding Footer inside Card */}
        <div className="mt-8 border-t border-white/5 pt-6 opacity-35 hover:opacity-75 transition-opacity duration-300">
          <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.25em]">
            {t('notFound.brand')}
          </p>
        </div>
      </div>
    </div>
  );
}
