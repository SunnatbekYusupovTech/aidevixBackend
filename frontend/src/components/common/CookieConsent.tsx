'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX } from 'react-icons/fi';
import { useLang } from '@/context/LangContext';

const STORAGE_KEY = 'aidevix_cookie_consent';

type ConsentValue = 'accepted' | 'rejected';

const safeRead = (): ConsentValue | null => {
  try {
    if (typeof window === 'undefined') return null;
    const v = window.localStorage.getItem(STORAGE_KEY);
    return v === 'accepted' || v === 'rejected' ? v : null;
  } catch {
    return null;
  }
};

const safeWrite = (value: ConsentValue) => {
  try {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_KEY, value);
  } catch {
    /* private mode / quota — ignore */
  }
};

export default function CookieConsent() {
  const { lang } = useLang();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const existing = safeRead();
    if (!existing) {
      const id = window.setTimeout(() => setVisible(true), 600);
      return () => window.clearTimeout(id);
    }
  }, []);

  const handle = (value: ConsentValue) => {
    safeWrite(value);
    setVisible(false);
  };

  const text = {
    title:
      lang === 'en' ? 'We use cookies'
      : lang === 'ru' ? 'Мы используем cookie'
      : 'Cookie fayllaridan foydalanamiz',
    body:
      lang === 'en'
        ? 'We use cookies to keep you signed in, remember your preferences, and improve the experience. You can accept all or reject non-essential cookies.'
        : lang === 'ru'
          ? 'Мы используем cookie, чтобы держать вас в системе, запоминать настройки и улучшать сервис. Вы можете принять все или отказаться от необязательных.'
          : 'Tizimda qolishingiz, sozlamalaringizni eslab qolish va sayt sifatini yaxshilash uchun cookie ishlatamiz. Hammasini qabul qilishingiz yoki majburiy bo\'lmaganlarini rad etishingiz mumkin.',
    accept:
      lang === 'en' ? 'Accept All'
      : lang === 'ru' ? 'Принять все'
      : 'Hammasini qabul qilish',
    reject:
      lang === 'en' ? 'Reject'
      : lang === 'ru' ? 'Отклонить'
      : 'Rad etish',
    close:
      lang === 'en' ? 'Close'
      : lang === 'ru' ? 'Закрыть'
      : 'Yopish',
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          role="dialog"
          aria-live="polite"
          aria-label={text.title}
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 320, damping: 28 }}
          className="fixed inset-x-3 sm:inset-x-auto sm:right-6 bottom-3 sm:bottom-6 z-[1100] w-auto sm:max-w-md"
        >
          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#0d101a]/95 backdrop-blur-xl shadow-[0_20px_60px_-15px_rgba(79,70,229,0.45)]">
            <div className="pointer-events-none absolute -top-20 -right-16 w-56 h-56 rounded-full bg-indigo-500/20 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-24 -left-20 w-56 h-56 rounded-full bg-purple-500/20 blur-3xl" />

            <button
              type="button"
              onClick={() => handle('rejected')}
              aria-label={text.close}
              className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
            >
              <FiX size={14} />
            </button>

            <div className="relative p-6 sm:p-7">
              <div className="flex items-start gap-4 mb-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 flex items-center justify-center text-2xl shadow-inner">
                  🍪
                </div>
                <div className="flex-1 min-w-0 pr-6">
                  <h3 className="text-base font-bold text-white tracking-tight">
                    {text.title}
                  </h3>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-slate-400">
                    {text.body}
                  </p>
                </div>
              </div>

              <div className="flex flex-col-reverse sm:flex-row gap-2.5 mt-5">
                <button
                  type="button"
                  onClick={() => handle('rejected')}
                  className="flex-1 py-3 px-4 rounded-2xl text-sm font-bold text-slate-300 bg-white/5 hover:bg-white/10 border border-white/10 transition-all active:scale-[0.98]"
                >
                  {text.reject}
                </button>
                <button
                  type="button"
                  onClick={() => handle('accepted')}
                  className="flex-1 py-3 px-4 rounded-2xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/30 transition-all active:scale-[0.98]"
                >
                  {text.accept}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
