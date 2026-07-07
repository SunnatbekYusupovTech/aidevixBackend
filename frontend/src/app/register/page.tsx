'use client';

import React, { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import RegisterForm from '@components/auth/RegisterForm';
import { useAuth } from '@hooks/useAuth';
import { useLang } from '@/context/LangContext';
import { useTheme } from '@/context/ThemeContext';
import gsap from 'gsap';
import { FiUserPlus, FiSend, FiInstagram, FiPlayCircle } from 'react-icons/fi';
import type { Lang } from '@utils/i18n';
import SiteLogoMark from '@components/common/SiteLogoMark';

const LANG_BADGES: Record<Lang, string> = { uz: 'UZ', ru: 'RU', en: 'EN' };

export default function RegisterPage() {
  const { isLoggedIn } = useAuth();
  const router = useRouter();
  const cardRef = useRef<HTMLDivElement>(null);
  const { t, lang, setLang } = useLang();
  const { isDark, toggleTheme } = useTheme();

  useEffect(() => {
    if (isLoggedIn) router.push('/profile');
  }, [isLoggedIn, router]);

  useEffect(() => {
    if (cardRef.current) {
      gsap.fromTo(cardRef.current, { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, ease: 'power3.out' });
    }
  }, []);

  const bg = isDark ? 'bg-[#0A0E1A]' : 'bg-slate-50';
  const panelBg = isDark ? 'bg-[#0A0E1A]' : 'bg-indigo-600';
  const cardBg = isDark ? 'bg-[#111726]/60 border-white/5' : 'bg-white border-slate-200 shadow-xl';
  const textMain = isDark ? 'text-white' : 'text-slate-900';
  const textMuted = isDark ? 'text-slate-400' : 'text-slate-500';

  const steps = [
    { id: 1, title: t('auth.register.title'), description: t('auth.register.subtitle'), icon: <FiUserPlus className="w-5 h-5" />, active: true },
    { id: 2, title: 'Telegram', description: t('footer.fContact'), icon: <FiSend className="w-5 h-5" />, active: false },
    { id: 3, title: 'Instagram', description: t('footer.fBlog'), icon: <FiInstagram className="w-5 h-5" />, active: false },
    { id: 4, title: t('hero.cta1'), description: t('cta.start'), icon: <FiPlayCircle className="w-5 h-5" />, active: false },
  ];

  return (
    <div className={`flex min-h-screen w-full min-w-0 max-w-full overflow-x-clip font-sans selection:bg-indigo-500/30 ${bg} ${textMain}`}>
      <div className={`hidden lg:flex lg:w-1/2 flex-col justify-center p-12 relative ${panelBg}`}>
        <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] ${isDark ? 'bg-indigo-600/10' : 'bg-white/10'} rounded-full blur-[120px] pointer-events-none`}></div>
        <div className="z-10 max-w-lg mx-auto w-full">
          <div className="flex items-center gap-3 mb-16">
            <SiteLogoMark size={32} className="rounded-lg ring-white/20" />
            <span className="text-xl font-bold tracking-wide text-white">Aidevix</span>
          </div>
          <h1 className="mb-3 max-w-full text-balance text-2xl font-extrabold leading-tight tracking-tight text-white sm:mb-4 sm:text-4xl md:text-5xl">
            {t('auth.login.welcome')}
          </h1>
          <p className={`text-lg mb-12 ${isDark ? 'text-slate-400' : 'text-white/70'}`}>{t('auth.register.subtitle')}</p>

          <div className="space-y-8 relative">
            <div className={`absolute left-6 top-6 bottom-6 w-px ${isDark ? 'bg-white/10' : 'bg-white/30'} z-0`}></div>
            {steps.map((step) => (
              <div key={step.id} className="flex items-start gap-4 relative z-10">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 border transition-all duration-300 ${
                  step.active
                    ? isDark ? 'bg-indigo-600 border-indigo-500 text-white shadow-[0_0_20px_rgba(79,70,229,0.4)]' : 'bg-white border-white text-indigo-600 shadow-lg'
                    : isDark ? 'bg-[#161D31] border-white/10 text-slate-400' : 'bg-white/20 border-white/30 text-white/60'
                }`}>
                  {step.icon}
                </div>
                <div className="pt-2">
                  <h3 className={`font-semibold text-lg ${step.active ? (isDark ? 'text-indigo-400' : 'text-white') : (isDark ? 'text-slate-300' : 'text-white/70')}`}>{step.title}</h3>
                  <p className={`text-sm mt-1 ${isDark ? 'text-slate-500' : 'text-white/50'}`}>{step.description}</p>
                </div>
              </div>
            ))}
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

        <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] ${isDark ? 'bg-indigo-600/5' : 'bg-indigo-100/50'} rounded-full blur-[100px] pointer-events-none`}></div>

        <div ref={cardRef} className={`z-10 w-full max-w-[min(480px,calc(100vw-1.5rem))] rounded-2xl border p-4 opacity-0 backdrop-blur-xl sm:rounded-3xl sm:p-10 ${cardBg}`}>
          <RegisterForm />
          <div className="mt-8 text-center">
            <p className={`text-sm ${textMuted}`}>
              {t('auth.register.hasAccount')}{' '}
              <Link href="/login" className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
                {t('auth.register.login')}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
