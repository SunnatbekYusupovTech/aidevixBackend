'use client'

import React from 'react'
import Link from 'next/link'
import { HiArrowRight, HiCheckCircle, HiLightningBolt } from 'react-icons/hi'
import { useLang } from '@/context/LangContext'
import { useTheme } from '@/context/ThemeContext'
import { useSound } from '@/context/SoundContext'

const ProBanner = () => {
  const { t } = useLang()
  const { isDark } = useTheme()
  const { playSound } = useSound()

  const benefits = [
    t('pro.benefit1'),
    t('pro.benefit2'),
    t('pro.benefit3'),
  ]

  return (
    <div className="relative mx-auto w-full min-w-0 max-w-7xl overflow-hidden rounded-none px-3 sm:px-4">
      <div className={`absolute inset-4 rounded-none ${isDark ? 'bg-[linear-gradient(135deg,#0a0c10_0%,#141720_55%,#0a0c10_100%)]' : 'bg-[linear-gradient(135deg,#f1f2f4_0%,#e2e6e9_55%,#f1f2f4_100%)]'}`}></div>
      <div className={`absolute inset-y-4 left-4 w-1/2 rounded-none ${isDark ? 'bg-[radial-gradient(circle_at_top_left,rgba(111,127,144,0.22),transparent_58%)]' : 'bg-[radial-gradient(circle_at_top_left,rgba(111,127,144,0.12),transparent_56%)]'}`}></div>
      <div className="absolute right-10 bottom-4 h-48 w-48 rounded-none bg-platinum-500/10 blur-[100px]"></div>

      <div className={`relative z-10 m-3 flex flex-col gap-8 rounded-none border p-5 sm:m-4 sm:gap-12 sm:p-8 md:p-12 lg:p-14 lg:flex-row lg:items-end lg:justify-between ${isDark ? 'border-zinc-800 text-white' : 'border-slate-900/10 text-slate-950'}`}>
        <div className="flex-1 text-center md:text-left">
          <div className={`mb-6 inline-flex items-center gap-2 rounded-none border px-4 py-2 text-sm font-semibold ${isDark ? 'border-platinum-500/20 bg-platinum-500/10 text-platinum-200' : 'border-platinum-500/20 bg-platinum-100 text-platinum-700'}`}>
            <HiLightningBolt className="h-4 w-4" />
            <span>{t('pro.badge')}</span>
          </div>

          <h2 className={`mb-5 max-w-full text-balance font-display text-2xl font-semibold leading-tight sm:mb-6 sm:text-3xl md:text-4xl lg:text-5xl ${isDark ? 'text-white' : 'text-slate-950'}`}>
            {t('pro.title1')} <br />
            <span className={`bg-clip-text text-transparent bg-gradient-to-r ${isDark ? 'from-white via-platinum-200 to-platinum-400' : 'from-platinum-700 via-platinum-500 to-platinum-800'}`}>
              {t('pro.title2')}
            </span>
          </h2>

          <p className={`mb-10 max-w-xl text-lg leading-8 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
            {t('pro.subtitle')}
          </p>

          <ul className={`mb-10 grid gap-4 md:grid-cols-2 ${isDark ? 'text-white/90' : 'text-slate-700'}`}>
            {benefits.map((text, i) => (
              <li 
                key={i} 
                onMouseEnter={() => playSound('/sounds/onlyclick.wav')}
                className={`group flex items-center gap-4 rounded-none border px-5 py-4 transition-all duration-300 hover:-translate-y-1 ${
                  isDark 
                    ? 'border-zinc-800 bg-white/[0.03] hover:border-platinum-500/40 hover:bg-white/[0.06] hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.4)]' 
                    : 'border-slate-900/10 bg-white/70 hover:border-platinum-500/30 hover:bg-white hover:shadow-[0_15px_35px_-10px_rgba(111,127,144,0.15)]'
                }`}
              >
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-none transition-colors duration-300 ${
                  isDark ? 'bg-platinum-500/10 group-hover:bg-platinum-500/20' : 'bg-platinum-100 group-hover:bg-platinum-200'
                }`}>
                  <HiCheckCircle className="h-6 w-6 text-emerald-400" />
                </div>
                <span className="font-medium">{text}</span>
              </li>
            ))}
          </ul>

          <div className="flex flex-col gap-4 sm:flex-row">
            <Link 
              href="/subscription" 
              onMouseEnter={() => playSound('/sounds/onlyclick.wav')}
              className="group inline-flex h-14 items-center justify-center rounded-none bg-gradient-to-r from-platinum-700 to-platinum-600 hover:from-platinum-600 hover:to-platinum-500 px-8 text-sm font-semibold text-white transition-all duration-300 hover:-translate-y-0.5"
            >
              {t('pro.cta1')}
              <HiArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link 
              href="/courses" 
              onMouseEnter={() => playSound('/sounds/onlyclick.wav')}
              className={`inline-flex h-14 items-center justify-center rounded-none border px-8 text-sm font-semibold transition-all duration-300 hover:-translate-y-0.5 ${isDark ? 'border-zinc-800 text-white hover:bg-white/5' : 'border-slate-900/10 text-slate-900 hover:bg-slate-950/5'}`}
            >
              {t('pro.cta2')}
            </Link>
          </div>
        </div>

        <div className="hidden w-full max-w-md lg:block">
          <div className={`rounded-none border p-6 ${isDark ? 'border-zinc-800 bg-white/[0.03]' : 'border-slate-900/10 bg-white/80'}`}>
            <div className={`text-[10px] font-semibold uppercase tracking-[0.28em] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{t('pro.membership')}</div>
            <div className={`mt-4 rounded-none border p-5 ${isDark ? 'border-zinc-800 bg-[#0b0f18]' : 'border-slate-900/10 bg-slate-50'}`}>
              <div className="flex items-start justify-between">
                <div>
                  <div className={`${isDark ? 'text-slate-400' : 'text-slate-500'} text-sm`}>{t('pro.planStatus')}</div>
                  <div className={`mt-2 font-display text-3xl font-semibold ${isDark ? 'text-white' : 'text-slate-950'}`}>{t('pro.planName')}</div>
                </div>
                <div className="rounded-none bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-400">{t('pro.active')}</div>
              </div>
              <div className="mt-6 space-y-4">
                {benefits.map((text, i) => (
                  <div key={i} className={`flex items-center justify-between border-b pb-3 last:border-b-0 ${isDark ? 'border-zinc-800' : 'border-slate-900/8'}`}>
                    <span className={`text-sm ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{text}</span>
                    <span className="text-platinum-400">+</span>
                  </div>
                ))}
              </div>
              <div className={`mt-6 rounded-none border px-4 py-3 ${isDark ? 'border-platinum-500/20 bg-platinum-500/10 text-platinum-200' : 'border-platinum-500/20 bg-platinum-100 text-platinum-700'}`}>
                <div className="text-xs uppercase tracking-[0.24em]">{t('pro.priorityTitle')}</div>
                <div className="mt-1 text-sm">{t('pro.priorityDesc')}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProBanner
