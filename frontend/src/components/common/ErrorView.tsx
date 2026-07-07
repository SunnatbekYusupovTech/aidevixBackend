'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { IoHomeOutline, IoRefreshOutline, IoWarningOutline } from 'react-icons/io5';
import { useLang } from '@/context/LangContext';
import SiteLogoMark from '@components/common/SiteLogoMark';

interface ErrorViewProps {
  /** The error thrown in the segment (passed from a Next.js error.tsx boundary). */
  error: Error & { digest?: string };
  /** Re-renders the segment to attempt recovery. */
  reset: () => void;
  /** Optional scope label for logging (e.g. "courses/[id]"). */
  scope?: string;
}

/**
 * Shared error boundary UI for App Router `error.tsx` files.
 * Matches the not-found.tsx brand style (dark, ambient glows, gradient CTA).
 */
export default function ErrorView({ error, reset, scope }: ErrorViewProps) {
  const { t } = useLang();

  useEffect(() => {
    // Surface the error to the console / monitoring. Never render raw error
    // details to the user — only the opaque digest is shown below.
    console.error(`[ErrorBoundary${scope ? `:${scope}` : ''}]`, error);
  }, [error, scope]);

  return (
    <div className="relative flex min-h-screen w-full min-w-0 max-w-full flex-col items-center justify-center overflow-x-clip bg-[#0A0E1A] p-4 text-center font-sans selection:bg-primary-500/30 sm:p-6">
      {/* Ambient background glows */}
      <div className="absolute top-1/4 left-1/4 w-[35vw] h-[35vw] rounded-full bg-rose-500/10 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[30vw] h-[30vw] rounded-full bg-primary-500/10 blur-[100px] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.05),transparent_60%)]" />

      {/* Main card container */}
      <div className="relative z-10 w-full max-w-lg rounded-[2.5rem] border border-white/5 bg-[#111726]/60 p-8 backdrop-blur-2xl shadow-2xl shadow-black/80 animate-fade-in-up md:p-12">

        {/* Large decorative warning glyph behind the content */}
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 select-none pointer-events-none">
          <IoWarningOutline className="text-[9rem] sm:text-[12rem] text-white/[0.02] leading-none" />
        </div>

        {/* Logo/Icon Area */}
        <div className="relative mb-6 flex justify-center">
          <div className="absolute inset-0 m-auto h-20 w-20 bg-rose-500/20 rounded-3xl blur-xl" />
          <SiteLogoMark size={76} className="relative z-10 rounded-3xl border border-rose-500/20 shadow-[0_10px_30px_rgba(244,63,94,0.15)]" />
        </div>

        {/* Title & Description */}
        <div className="relative z-10 mb-8">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mb-3">
            {t('error.title')}
          </h2>
          <p className="text-slate-400 max-w-sm mx-auto text-sm leading-relaxed sm:text-base">
            {t('error.desc')}
          </p>
          {error?.digest && (
            <p className="mt-4 text-[11px] font-mono uppercase tracking-[0.2em] text-slate-600">
              {t('error.digest')}: {error.digest}
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex w-full flex-col justify-center gap-3 sm:flex-row sm:gap-4">
          <button
            type="button"
            onClick={reset}
            className="group relative flex h-12 sm:h-14 items-center justify-center gap-2.5 rounded-full bg-gradient-to-r from-primary-500 to-primary-600 px-8 text-sm sm:text-base font-bold text-white shadow-[0_4px_20px_rgba(99,102,241,0.35)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_8px_30px_rgba(99,102,241,0.5)] active:translate-y-0 cursor-pointer"
          >
            <IoRefreshOutline size={18} className="transition-transform duration-500 group-hover:rotate-180" />
            {t('error.retry')}
          </button>
          <Link
            href="/"
            className="flex h-12 sm:h-14 items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-8 text-sm sm:text-base font-bold text-white transition-all duration-300 hover:bg-white/10 hover:border-white/20 active:scale-98 cursor-pointer"
          >
            <IoHomeOutline size={18} />
            {t('error.home')}
          </Link>
        </div>

        {/* Branding Footer inside Card */}
        <div className="mt-8 border-t border-white/5 pt-6 opacity-35 hover:opacity-75 transition-opacity duration-300">
          <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.25em]">
            {t('error.brand')}
          </p>
        </div>
      </div>
    </div>
  );
}
