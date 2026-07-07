'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { FaInstagram, FaTelegram, FaYoutube } from 'react-icons/fa'
import { HiArrowRight, HiLightningBolt } from 'react-icons/hi'
import SiteLogoMark from '@components/common/SiteLogoMark'
import { COURSE_CATEGORIES } from '@/data/courseCategories'
import { ROUTES, SOCIAL_LINKS } from '@utils/constants'
import { useLang } from '@/context/LangContext'
import { useTheme } from '@/context/ThemeContext'
import { useSound } from '@/context/SoundContext'

const SOCIAL = [
  { icon: <FaTelegram size={16} />, href: SOCIAL_LINKS.telegram, label: 'Telegram' },
  { icon: <FaInstagram size={16} />, href: SOCIAL_LINKS.instagram, label: 'Instagram' },
  { icon: <FaYoutube size={16} />, href: 'https://youtube.com/@aidevix', label: 'YouTube' },
]

type FooterLinkItem = { label: string; to: string }

export default function Footer() {
  const { t, lang } = useLang()
  const { isDark } = useTheme()
  const { playSound } = useSound()
  const pathname = usePathname()

  const isHomePage = pathname === '/'

  const FOOTER_LINKS: { title: string; links: FooterLinkItem[] }[] = [
    {
      title: t('footer.platform'),
      links: [
        { label: t('footer.fCourses'), to: ROUTES.COURSES },
        { label: t('footer.fMentors'), to: ROUTES.TEAM },
        { label: t('footer.fPricing'), to: ROUTES.PRICING },
        { label: t('footer.fEnterprise'), to: ROUTES.CONTACT },
      ],
    },
    {
      title: t('footer.company'),
      links: [
        { label: t('footer.fAbout'), to: ROUTES.ABOUT },
        { label: lang === 'ru' ? 'Проекты' : lang === 'en' ? 'Projects' : 'Loyihalar', to: ROUTES.PROJECTS },
        { label: t('footer.fBlog'), to: ROUTES.BLOG },
        { label: t('footer.fCareers'), to: ROUTES.CAREERS },
        { label: t('footer.fContact'), to: ROUTES.CONTACT },
      ],
    },
    {
      title: t('footer.resources'),
      links: [
        { label: t('footer.fHelp'), to: ROUTES.HELP },
        { label: t('footer.fPrivacy'), to: ROUTES.PRIVACY },
        { label: t('footer.fTerms'), to: ROUTES.TERMS },
        { label: t('footer.sitemap'), to: ROUTES.SITEMAP_XML },
      ],
    },
  ]

  const shell = isDark 
    ? 'bg-gradient-to-br from-[#0A0E1A] via-[#111726] to-[#0A0E1A] text-slate-100 shadow-[0_-20px_50px_-20px_rgba(0,0,0,0.7)]' 
    : 'bg-gradient-to-br from-platinum-50 via-platinum-100 to-platinum-200/50 text-[#1e293b] shadow-[0_-20px_50px_-20px_rgba(111,127,144,0.05)]'
  
  const borderClr = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'
  const brandText = isDark ? 'text-platinum-100' : 'text-slate-900'
  const descText = isDark ? 'text-slate-400' : 'text-slate-600'
  const headingText = isDark ? 'text-slate-200' : 'text-slate-800'
  const linkText = isDark ? 'text-slate-400 hover:text-platinum-300' : 'text-slate-600 hover:text-platinum-600'
  const socialText = isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-platinum-600'
  const copyText = isDark ? 'text-slate-500' : 'text-slate-500'

  return (
    <div className="w-full relative px-4 sm:px-6 lg:px-8 pb-12 pt-8 overflow-hidden">
      <footer 
        className={`relative mx-auto max-w-7xl overflow-hidden rounded-none border transition-all duration-300 ${shell}`} 
        style={{ borderColor: borderClr }}
      >
        {/* Ambient premium lights */}
        <div className={`absolute top-0 left-0 w-[40%] h-[40%] blur-[120px] rounded-none pointer-events-none transition-opacity duration-300 ${isDark ? 'bg-platinum-500/10' : 'bg-platinum-500/5'}`} />
        <div className={`absolute bottom-0 right-0 w-[30%] h-[30%] blur-[120px] rounded-none pointer-events-none transition-opacity duration-300 ${isDark ? 'bg-platinum-500/10' : 'bg-platinum-500/5'}`} />
        
        {/* Grid pattern overlay */}
        <div 
          className={`absolute inset-0 pointer-events-none transition-all duration-300 ${isDark ? 'opacity-[0.03] bg-[linear-gradient(to_right,rgba(255,255,255,0.2)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.2)_1px,transparent_1px)]' : 'opacity-[0.02] bg-[linear-gradient(to_right,rgba(0,0,0,0.1)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.1)_1px,transparent_1px)]'} bg-[size:28px_28px]`} 
        />

        {/* 1. Pro Banner CTA (Visible on inner pages, hidden on home page) */}
        {!isHomePage && (
          <div className="relative border-b overflow-hidden" style={{ borderColor: borderClr }}>
            {/* CTA Background Highlight */}
            <div className={`absolute inset-0 opacity-40 ${isDark ? 'bg-[radial-gradient(circle_at_30%_20%,rgba(111,127,144,0.15),transparent_40%)]' : 'bg-[radial-gradient(circle_at_30%_20%,rgba(111,127,144,0.08),transparent_40%)]'}`} />
            
            <div className="relative z-10 mx-auto max-w-7xl px-6 py-12 sm:px-12 sm:py-16 md:px-16 flex flex-col lg:flex-row items-center justify-between gap-8">
              <div className="max-w-2xl text-center lg:text-left">
                <div className={`inline-flex items-center gap-2 rounded-none border px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider ${isDark ? 'border-platinum-500/30 bg-platinum-500/10 text-platinum-300' : 'border-platinum-500/20 bg-platinum-100 text-platinum-700'}`}>
                  <HiLightningBolt className="h-3.5 w-3.5 animate-bounce" />
                  <span>{t('pro.badge') || 'AIDEVIX PRO'}</span>
                </div>
                <h3 className={`mt-4 text-2xl sm:text-3xl md:text-4xl font-display font-extrabold tracking-tight leading-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {t('cta.title1')}{' '}
                  <span className={`bg-clip-text text-transparent bg-gradient-to-r ${isDark ? 'from-white via-platinum-200 to-platinum-400' : 'from-platinum-700 via-platinum-500 to-platinum-800'}`}>
                    {t('cta.titleHighlight')}
                  </span>
                </h3>
                <p className={`mt-3 text-sm sm:text-base leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                  {t('cta.subtitle')}
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto shrink-0">
                <Link
                  href="/register"
                  onMouseEnter={() => playSound('/sounds/onlyclick.wav')}
                  className="group flex h-12 sm:h-14 items-center justify-center gap-2 rounded-none bg-gradient-to-r from-platinum-700 to-platinum-600 hover:from-platinum-600 hover:to-platinum-500 px-8 text-sm font-semibold text-white shadow-lg shadow-platinum-600/20 hover:shadow-platinum-500/30 transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0 text-center"
                >
                  <span>{t('cta.start')}</span>
                  <HiArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                </Link>
                <Link
                  href="/courses"
                  onMouseEnter={() => playSound('/sounds/onlyclick.wav')}
                  className={`flex h-12 sm:h-14 items-center justify-center rounded-none border px-8 text-sm font-semibold transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0 text-center ${
                    isDark ? 'border-slate-800 text-white bg-white/5 hover:bg-white/10 hover:border-slate-700' : 'border-slate-200 text-slate-800 bg-slate-50 hover:bg-slate-100 hover:border-slate-300'
                  }`}
                >
                  {t('cta.allCourses')}
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* 2. Main Directory Links */}
        <div className="mx-auto max-w-7xl px-6 py-12 sm:px-12 sm:py-16 md:px-16">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1.3fr_0.9fr_0.9fr_0.9fr] lg:gap-8">
            <div className="flex flex-col items-start">
              <Link href={ROUTES.HOME} className="group flex items-center gap-3">
                <div className="relative">
                  <div className="absolute -inset-1 rounded-none bg-gradient-to-r from-platinum-500 to-platinum-300 opacity-20 blur-sm group-hover:opacity-55 transition-opacity duration-300" />
                  <SiteLogoMark
                    size={42}
                    className="relative shadow-[0_12px_30px_rgba(111,127,144,0.2)] transition-all duration-300 group-hover:-translate-y-0.5 ring-platinum-500/25"
                  />
                </div>
                <span className={`font-display text-2xl font-bold tracking-tight ${brandText}`}>
                  Aidevix
                </span>
              </Link>
              <p className={`mt-5 max-w-sm text-sm leading-relaxed ${descText}`}>
                {t('footer.desc')}
              </p>
              
              {/* Social links */}
              <div className="mt-6 flex items-center gap-3">
                {SOCIAL.map((s) => (
                  <a
                    key={s.label}
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={s.label}
                    onMouseEnter={() => playSound('/sounds/onlyclick.wav')}
                    className={`flex h-10 w-10 items-center justify-center rounded-none border transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${
                      isDark
                        ? 'border-white/5 bg-white/[0.03] text-slate-400 hover:border-platinum-500/30 hover:bg-platinum-500/10 hover:text-white hover:shadow-platinum-500/10'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-platinum-500/20 hover:bg-platinum-100 text-platinum-600 hover:shadow-platinum-500/5'
                    }`}
                  >
                    {s.icon}
                  </a>
                ))}
              </div>
            </div>

            {FOOTER_LINKS.map((group) => (
              <div key={group.title} className="flex flex-col">
                <h4 className={`text-xs font-bold uppercase tracking-[0.2em] mb-5 ${headingText}`}>
                  {group.title}
                </h4>
                <ul className="space-y-3.5">
                  {group.links.map((link) => (
                    <li key={link.to + link.label}>
                      <Link
                        href={link.to}
                        onMouseEnter={() => playSound('/sounds/onlyclick.wav')}
                        className={`inline-flex items-center text-sm font-medium transition-all duration-300 hover:translate-x-1 ${linkText}`}
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* 2b. Kurs yo'nalishlari — har kategoriya alohida SEO landing sahifasi */}
        <div
          className="mx-auto max-w-7xl px-6 pb-10 sm:px-12 md:px-16"
          style={{ borderTop: `1px solid ${borderClr}` }}
        >
          <h4 className={`text-xs font-bold uppercase tracking-[0.2em] mb-4 mt-10 ${headingText}`}>
            {t('footer.directions') || 'Kurs yo\'nalishlari'}
          </h4>
          <div className="flex flex-wrap gap-2">
            {COURSE_CATEGORIES.map((c) => (
              <Link
                key={c.slug}
                href={`/courses/category/${c.slug}`}
                onMouseEnter={() => playSound('/sounds/onlyclick.wav')}
                className={`px-3 py-1.5 rounded-none border text-xs font-medium transition-all duration-300 hover:-translate-y-0.5 ${
                  isDark
                    ? 'border-white/5 bg-white/[0.03] text-slate-400 hover:border-platinum-500/30 hover:text-white'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-platinum-500/20 hover:text-platinum-600'
                }`}
              >
                {c.label}
              </Link>
            ))}
          </div>
        </div>

        {/* 3. Bottom Bar */}
        <div
          className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-6 sm:px-12 sm:py-8 md:px-16 text-center sm:text-left bg-black/[0.02] dark:bg-white/[0.01]"
          style={{ borderTop: `1px solid ${borderClr}` }}
        >
          <p className={`text-xs font-medium ${copyText}`}>
            {t('footer.copyright')}
          </p>
          <div className={`flex flex-wrap items-center justify-center gap-3 text-xs font-medium ${copyText}`}>
            <span>{t('footer.location')}</span>
            <span className={isDark ? 'text-slate-800' : 'text-slate-300'}>|</span>
            <span className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-none bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-none h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>{t('footer.status')}</span>
            </span>
          </div>
        </div>
      </footer>
    </div>
  )
}
