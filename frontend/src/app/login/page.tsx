'use client';

import React, { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import LoginForm from '@components/auth/LoginForm';
import { useAuth } from '@hooks/useAuth';
import { useLang } from '@/context/LangContext';
import { useTheme } from '@/context/ThemeContext';
import gsap from 'gsap';
import type { Lang } from '@utils/i18n';
import SiteLogoMark from '@components/common/SiteLogoMark';

const LANG_BADGES: Record<Lang, string> = { uz: 'UZ', ru: 'RU', en: 'EN' };

export default function LoginPage() {
  const { isLoggedIn, loading } = useAuth();
  const router = useRouter();
  const cardRef = useRef<HTMLDivElement>(null);
  const { t, lang, setLang } = useLang();
  const { isDark, toggleTheme } = useTheme();

  useEffect(() => {
    if (cardRef.current) {
      gsap.fromTo(cardRef.current, { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, ease: 'power3.out' });
    }
  }, []);

  useEffect(() => {
    if (!loading && isLoggedIn) router.replace('/profile');
  }, [isLoggedIn, loading, router]);

  const bg = isDark ? 'bg-[#0A0E1A]' : 'bg-slate-50';
  const cardBg = isDark ? 'bg-[#111726]/40 border-white/5' : 'bg-white border-slate-200 shadow-xl';
  const textMain = isDark ? 'text-white' : 'text-slate-900';
  const textMuted = isDark ? 'text-slate-400' : 'text-slate-500';

  return (
    <div className={`flex min-h-screen w-full min-w-0 max-w-full overflow-x-clip font-sans selection:bg-indigo-500/30 ${bg} ${textMain}`}>
      <div className={`hidden lg:flex lg:w-1/2 relative overflow-hidden ${isDark ? 'bg-[#0A0E1A]' : 'bg-indigo-600'} items-center`}>
        <div className="z-10 mx-auto w-full max-w-xl px-10 xl:px-16">
          <div className="mb-6">
            <SiteLogoMark
              size={56}
              className={`rounded-xl ${isDark ? 'ring-indigo-500/30' : 'ring-white/30'}`}
            />
          </div>
          <h1 className="text-[3.5rem] font-extrabold mb-4 leading-[1.1] tracking-tight text-white">
            {t('cta.title1')}<br /><span className={isDark ? 'text-indigo-400' : 'text-yellow-300'}>{t('cta.titleHighlight')}</span>
          </h1>
          <div className={`border-l-2 ${isDark ? 'border-indigo-500/70' : 'border-white/50'} pl-5 mt-8`}>
            <p className={`text-[1.1rem] leading-relaxed ${isDark ? 'text-slate-400/90' : 'text-white/70'}`}>
              {t('hero.subtitle')}
            </p>
          </div>
        </div>
      </div>

      <div className={`relative flex w-full min-w-0 flex-col items-center justify-start p-3 pt-16 sm:p-12 sm:pt-20 lg:w-1/2 lg:justify-center ${bg}`}>
        <div className="absolute top-4 right-3 z-20 sm:top-6 sm:right-6 flex items-center gap-1.5 sm:gap-2">
          <button onClick={toggleTheme} className={`p-2 rounded-lg ${isDark ? 'text-slate-400 hover:text-yellow-400' : 'text-slate-500 hover:text-indigo-600'}`}>
            {isDark ? '☀' : '☾'}
          </button>
          {(['uz', 'ru', 'en'] as Lang[]).map((l) => (
            <button
              key={l}
              onClick={() => setLang(l)}
              className={`px-2 py-1 rounded-lg text-xs font-bold transition-colors ${lang === l ? 'bg-indigo-600 text-white' : isDark ? 'bg-white/5 text-slate-400' : 'bg-slate-100 text-slate-500'}`}
            >
              {LANG_BADGES[l]}
            </button>
          ))}
        </div>

        <div ref={cardRef} className={`w-full max-w-[min(420px,calc(100vw-1.5rem))] rounded-2xl border p-4 opacity-0 sm:rounded-3xl sm:p-10 ${cardBg}`}>
          <div className="text-center mb-7 sm:mb-10">
            <h2 className={`text-[1.45rem] sm:text-[1.75rem] font-bold mb-3 ${textMain}`}>{t('auth.login.welcome')}</h2>
            <p className={`text-[0.95rem] px-2 leading-relaxed ${textMuted}`}>{t('auth.login.subtitle')}</p>
          </div>
          <LoginForm />
        </div>

        <div className={`mt-8 sm:mt-12 text-center text-[11px] sm:text-xs relative sm:absolute sm:bottom-8 ${isDark ? 'text-slate-500/70' : 'text-slate-400'}`}>
          {t('footer.copyright')}
        </div>
      </div>
    </div>
  );
}
