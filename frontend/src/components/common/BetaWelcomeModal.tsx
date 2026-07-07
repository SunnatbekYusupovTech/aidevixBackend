'use client';

import { useEffect, useState, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { IoClose, IoSparkles } from 'react-icons/io5';
import { useLang } from '@/context/LangContext';

const STORAGE_KEY = 'aidevix_beta_welcome_dismissed';
const OPEN_DELAY_MS = 850;

function isExcludedPath(path: string | null): boolean {
  if (!path) return true;
  if (path.startsWith('/admin')) return true;
  if (path.includes('/playground')) return true;
  const authPaths = ['/login', '/register', '/forgot-password', '/verify-code', '/reset-password'];
  if (authPaths.includes(path)) return true;
  if (path.startsWith('/auth/')) return true;
  return false;
}

export default function BetaWelcomeModal() {
  const { t } = useLang();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (localStorage.getItem(STORAGE_KEY)) return;
    if (isExcludedPath(pathname)) return;

    const id = window.setTimeout(() => setOpen(true), OPEN_DELAY_MS);
    return () => window.clearTimeout(id);
  }, [pathname]);

  const dismiss = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, '1');
    } catch {
      /* ignore quota / private mode */
    }
    setOpen(false);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dismiss();
    };
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, dismiss]);

  return (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-[1001] flex items-center justify-center p-4 sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="beta-welcome-title"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={dismiss}
            role="presentation"
            className="absolute inset-0 cursor-pointer bg-black/75 backdrop-blur-md"
          />

          <motion.div
            initial={{ scale: 0.92, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.94, opacity: 0, y: 16 }}
            transition={{ type: 'spring', stiffness: 320, damping: 26 }}
            onClick={(e) => e.stopPropagation()}
            className="relative z-[1] w-full max-w-lg overflow-hidden rounded-[2rem] border border-white/12 bg-[#0A0E1A] p-8 sm:p-10 shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_25px_80px_-12px_rgba(0,0,0,0.65)]"
          >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_120%_80%_at_50%_-20%,rgba(99,102,241,0.35),transparent_55%)]" />
            <div className="pointer-events-none absolute -right-24 top-1/2 h-64 w-64 -translate-y-1/2 rounded-full bg-violet-500/15 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-16 left-8 h-40 w-40 rounded-full bg-amber-400/10 blur-3xl" />

            <button
              type="button"
              onClick={dismiss}
              className="absolute right-4 top-4 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-white/5 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
              aria-label={t('betaWelcome.closeAria')}
            >
              <IoClose size={20} />
            </button>

            <div className="relative z-10">
              <div className="mb-6 flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-400/30 bg-indigo-500/15 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-indigo-200">
                  <IoSparkles className="text-amber-300" size={14} aria-hidden />
                  {t('betaWelcome.badge')}
                </span>
              </div>

              <h2
                id="beta-welcome-title"
                className="mb-3 font-black tracking-tight text-white text-2xl sm:text-[1.65rem] leading-tight"
              >
                {t('betaWelcome.title')}
              </h2>

              <p className="mb-5 text-[15px] leading-relaxed text-slate-300">
                {t('betaWelcome.lead')}
              </p>

              <ul className="mb-8 space-y-3 text-sm leading-relaxed text-slate-400">
                <li className="flex gap-3">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-emerald-500/20 text-[10px] font-black text-emerald-300">
                    ✓
                  </span>
                  <span>{t('betaWelcome.point1')}</span>
                </li>
                <li className="flex gap-3">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-emerald-500/20 text-[10px] font-black text-emerald-300">
                    ✓
                  </span>
                  <span>{t('betaWelcome.point2')}</span>
                </li>
                <li className="flex gap-3">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-emerald-500/20 text-[10px] font-black text-emerald-300">
                    ✓
                  </span>
                  <span>{t('betaWelcome.point3')}</span>
                </li>
              </ul>

              <button
                type="button"
                onClick={dismiss}
                className="w-full rounded-2xl bg-gradient-to-r from-indigo-500 to-violet-600 py-4 text-center text-[15px] font-bold text-white shadow-lg shadow-indigo-500/30 transition-transform hover:brightness-110 active:scale-[0.99]"
              >
                {t('betaWelcome.cta')}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
