import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter, usePathname } from 'next/navigation'
import { useSelector } from 'react-redux'
import { selectIsAdmin } from '@/store/slices/authSlice'
import { useAuth } from '@hooks/useAuth'
import { useUserStats } from '@hooks/useUserStats'
import { ROUTES } from '@utils/constants'
import { getRankInfo } from '@utils/xpLevel'
import { useLang } from '@/context/LangContext'
import { useTheme } from '@/context/ThemeContext'
import { HiMenuAlt3, HiX, HiVolumeUp, HiVolumeOff } from 'react-icons/hi'
import SiteLogoMark from '@components/common/SiteLogoMark'
import { MdDarkMode, MdLightMode } from 'react-icons/md'
import { useSound } from '@/context/SoundContext'
import type { Lang } from '@utils/i18n'

const LANG_FLAGS: Record<Lang, string> = { uz: '🇺🇿', ru: '🇷🇺', en: '🇺🇸' }
const LANG_NAMES: Record<Lang, string> = { uz: 'UZ', ru: 'RUS', en: 'ENG' }

export default function Navbar() {
  const isAdmin = useSelector(selectIsAdmin)
  const { user, isLoggedIn, logout } = useAuth()
  const { avatar } = useUserStats()
  const router = useRouter()
  const pathname = usePathname()
  const { t, lang, setLang } = useLang()
  const { isDark, toggleTheme } = useTheme()
  const { playSound, isSoundEnabled, setIsSoundEnabled } = useSound()
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [langOpen, setLangOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const langRef = useRef<HTMLDivElement>(null)
  const moreRef = useRef<HTMLLIElement>(null)
  const navLocalText = {
    prompts: lang === 'en' ? 'Prompts' : lang === 'ru' ? 'Промпты' : 'Prompts',
    roadmap: lang === 'en' ? 'Roadmap' : lang === 'ru' ? 'Роадмап' : 'Roadmap',
    adminPanel: lang === 'en' ? 'Admin Panel' : lang === 'ru' ? 'Админ панель' : 'Admin Panel',
  }

  /** Chiptada gorizontal skrollsiz: asosiy 4 + qolganlari “Yana” menyusida. */
  const navPrimary: { label: string; to: string }[] = [
    { label: t('nav.courses'), to: ROUTES.COURSES },
    { label: `⚡ ${navLocalText.prompts}`, to: ROUTES.PROMPTS },
    { label: t('nav.challenges'), to: ROUTES.CHALLENGES },
    { label: t('nav.leaderboard'), to: ROUTES.LEADERBOARD },
  ]
  const navMore: { label: string; to: string }[] = [
    { label: t('nav.bugReport'), to: ROUTES.BUG_REPORT },
    { label: 'Mentorship', to: ROUTES.MENTORSHIP },
    { label: `🧠 ${t('nav.founders')}`, to: ROUTES.TEAM },
    { label: `🗺 ${navLocalText.roadmap}`, to: ROUTES.ROADMAP },
    { label: t('nav.careers'), to: ROUTES.CAREERS },
  ]
  const allNavMobile = [...navPrimary, ...navMore]
  const isMoreGroupActive = navMore.some((l) => l.to === pathname)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 1280) {
        setMenuOpen(false)
        setMoreOpen(false)
      }
    }

    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const playHoverSound = () => {
    playSound('/sounds/onlyclick.wav')
  }

  useEffect(() => {
    playSound('/sounds/navchange.wav', 0.25)
  }, [pathname])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) {
        setLangOpen(false)
      }
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreOpen(false)
      }
    }

    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMoreOpen(false)
        setLangOpen(false)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    setMoreOpen(false)
  }, [pathname])

  const handleLogout = async () => {
    await logout()
    setMenuOpen(false)
    router.replace(ROUTES.LOGIN)
  }

  const avatarLetter = user?.username?.[0]?.toUpperCase() ?? 'U'
  const avatarSrc = avatar || user?.avatar || null
  const xpValue = (user as any)?.xp || 0
  const rankInfo = getRankInfo(xpValue)

  const navBg = isDark
    ? scrolled ? 'bg-[#090b10]/82 shadow-[0_18px_60px_rgba(0,0,0,0.36)]' : 'bg-[#090b10]/56'
    : scrolled ? 'bg-white/88 shadow-[0_18px_50px_rgba(15,23,42,0.08)]' : 'bg-white/58'

  const borderColor = isDark ? 'rgba(255,255,255,0.09)' : 'rgba(15,23,42,0.08)'
  const logoTextColor = isDark ? 'text-white' : 'text-slate-950'
  const subText = isDark ? 'text-slate-400' : 'text-slate-500'
  const surface = isDark ? 'bg-white/[0.04] border-white/10' : 'bg-slate-950/[0.03] border-slate-900/10'
  const navLinkBase = isDark ? 'text-slate-400 hover:text-white hover:bg-white/[0.06]' : 'text-slate-600 hover:text-slate-950 hover:bg-slate-900/[0.05]'
  const activeNavLink = isDark ? 'text-white bg-white/[0.08]' : 'text-slate-950 bg-slate-900/[0.06]'
  const dropdownBg = isDark ? 'bg-[#0d1017] border-white/10 text-slate-200' : 'bg-white border-slate-900/10 text-slate-800'
  const dropdownItemColor = isDark ? 'text-slate-300 hover:text-white hover:bg-white/[0.06]' : 'text-slate-700 hover:text-slate-950 hover:bg-slate-900/[0.05]'
  const mobileMenuBg = isDark ? 'bg-[#090b10]/96' : 'bg-white/96'

  return (
    <>
      <nav
        className={`fixed inset-x-0 top-0 z-50 w-full min-w-0 max-w-full border-b transition-all duration-300 backdrop-blur-2xl ${navBg}`}
        style={{ borderBottomColor: borderColor }}
      >
        <div className="mx-auto w-full min-w-0 max-w-7xl px-2 sm:px-4 md:px-6 lg:px-8">
          <div className="flex h-14 sm:h-16 items-center justify-between gap-2">
            <Link href={ROUTES.HOME} className="group flex shrink-0 items-center gap-2">
              <SiteLogoMark
                size={36}
                priority
                className="shadow-[0_12px_30px_rgba(86,98,246,0.35)] transition-all duration-300 group-hover:-translate-y-0.5 ring-indigo-500/25"
              />
              <div className="hidden min-[340px]:block leading-none">
                <span className={`font-display text-lg font-semibold tracking-[-0.04em] ${logoTextColor}`}>Aidevix</span>
              </div>
            </Link>

            <div className="hidden min-w-0 flex-1 px-2 xl:flex xl:justify-center 2xl:px-4">
              <ul className={`flex max-w-full flex-nowrap items-center justify-center gap-0.5 rounded-full border px-1.5 py-1.5 sm:gap-1 sm:px-2 sm:py-2 ${surface}`}>
                {navPrimary.map((link) => (
                  <li key={link.to}>
                    <Link
                      href={link.to}
                      onMouseEnter={playHoverSound}
                      className={`rounded-full px-2.5 py-1.5 text-xs font-medium transition-all duration-200 sm:px-4 sm:py-2 sm:text-sm ${
                        pathname === link.to ? activeNavLink : navLinkBase
                      }`}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
                <li className="relative" ref={moreRef}>
                  <button
                    type="button"
                    onClick={() => {
                      setMoreOpen((o) => !o)
                    }}
                    onMouseEnter={playHoverSound}
                    aria-haspopup="menu"
                    aria-expanded={moreOpen}
                    aria-label={t('nav.moreAria')}
                    className={`flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-medium transition-all duration-200 sm:px-4 sm:py-2 sm:text-sm ${
                      isMoreGroupActive || moreOpen ? activeNavLink : navLinkBase
                    }`}
                  >
                    {t('nav.more')}
                    <svg
                      className={`h-3 w-3 shrink-0 transition-transform ${moreOpen ? 'rotate-180' : ''}`}
                      fill="currentColor"
                      viewBox="0 0 20 20"
                      aria-hidden
                    >
                      <path
                        fillRule="evenodd"
                        d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                  {moreOpen && (
                    <ul
                      role="menu"
                      className={`absolute left-0 right-0 z-[60] mt-2 min-w-[min(100vw-2rem,16rem)] rounded-[1.25rem] border p-1.5 shadow-2xl backdrop-blur-2xl sm:left-auto sm:right-0 ${dropdownBg}`}
                    >
                      {navMore.map((link) => (
                        <li key={link.to} role="none">
                          <Link
                            role="menuitem"
                            href={link.to}
                            onClick={() => setMoreOpen(false)}
                            onMouseEnter={playHoverSound}
                            className={`block rounded-xl px-3 py-2.5 text-sm font-medium ${
                              pathname === link.to
                                ? isDark
                                  ? 'bg-indigo-500/15 text-indigo-300'
                                  : 'bg-indigo-50 text-indigo-700'
                                : dropdownItemColor
                            }`}
                          >
                            {link.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              </ul>
            </div>

            <div className="hidden shrink-0 items-center gap-2 xl:flex">
              <button
                onClick={toggleTheme}
                onMouseEnter={playHoverSound}
                className={`rounded-full border p-3 transition-all duration-300 ${surface} ${isDark ? 'text-slate-400 hover:text-amber-300' : 'text-slate-500 hover:text-indigo-600'}`}
                title={isDark ? t('theme.light') : t('theme.dark')}
                aria-label={isDark ? t('theme.light') : t('theme.dark')}
              >
                {isDark ? <MdLightMode size={18} /> : <MdDarkMode size={18} />}
              </button>

              <button
                onClick={() => setIsSoundEnabled(!isSoundEnabled)}
                onMouseEnter={playHoverSound}
                className={`rounded-full border p-3 transition-all duration-300 ${surface} ${isDark ? 'text-slate-400 hover:text-indigo-400' : 'text-slate-500 hover:text-indigo-600'}`}
                title={isSoundEnabled ? t('nav.soundOff') : t('nav.soundOn')}
                aria-label={isSoundEnabled ? t('nav.soundOff') : t('nav.soundOn')}
              >
                {isSoundEnabled ? <HiVolumeUp size={18} /> : <HiVolumeOff size={18} />}
              </button>

              <div className="relative" ref={langRef}>
                <button
                  onClick={() => setLangOpen(!langOpen)}
                  onMouseEnter={playHoverSound}
                  className={`flex items-center gap-1.5 rounded-full border px-3 py-2 text-sm font-medium transition-all duration-300 ${surface} ${isDark ? 'text-slate-300 hover:text-white' : 'text-slate-700 hover:text-slate-950'}`}
                  aria-haspopup="menu"
                  aria-expanded={langOpen}
                  aria-label={t('nav.language')}
                >
                  <span aria-hidden>{LANG_FLAGS[lang]}</span>
                  <span>{t('nav.language')}</span>
                  <svg className={`h-3 w-3 transition-transform ${langOpen ? 'rotate-180' : ''}`} fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                  </svg>
                </button>

                {langOpen && (
                  <div className={`absolute right-0 mt-2 w-44 rounded-[1.25rem] border p-1.5 shadow-2xl backdrop-blur-2xl z-[60] ${dropdownBg}`}>
                    {(['uz', 'ru', 'en'] as Lang[]).map((l) => (
                      <button
                        key={l}
                        onMouseEnter={playHoverSound}
                        onClick={() => {
                          setLang(l)
                          setLangOpen(false)
                        }}
                        className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm transition-colors ${
                          lang === l ? (isDark ? 'bg-indigo-500/15 text-indigo-300' : 'bg-indigo-50 text-indigo-600') : dropdownItemColor
                        }`}
                      >
                        <span aria-hidden>{LANG_FLAGS[l]}</span>
                        <span className="font-medium">{LANG_NAMES[l]}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {isLoggedIn ? (
                <div className="flex items-center gap-2">
                  <div className={`hidden items-center gap-3 mr-1 rounded-full border px-4 py-2 md:flex ${surface}`}>
                    <div className="flex items-center gap-1.5" title={t('nav.xpLabel')}>
                      <span className="text-base text-amber-400">XP</span>
                      <span className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        {xpValue} <span className={`text-xs font-medium ${subText}`}>{t('nav.xpLabel')}</span>
                      </span>
                    </div>
                    <div className={`h-4 w-px ${isDark ? 'bg-white/10' : 'bg-slate-300'}`}></div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-base text-orange-500">Hot</span>
                      <span className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{(user as any)?.streak || 0}</span>
                    </div>
                  </div>

                  <div className="dropdown dropdown-end">
                    <label tabIndex={0} className="group flex min-w-0 cursor-pointer items-center gap-2">
                      {avatarSrc ? (
                        <div className="relative">
                          <Image
                            src={avatarSrc}
                            alt={user?.username ? `${user.username} avatar` : 'avatar'}
                            width={40}
                            height={40}
                            sizes="40px"
                            className="h-10 w-10 rounded-full border-2 border-indigo-500/30 object-cover transition-colors group-hover:border-indigo-400"
                          />
                          {(user as any)?.rankTitle && (
                            <span className="absolute -bottom-1 -right-1 rounded-md border border-black bg-amber-400 px-1 text-[10px] font-black uppercase text-black">
                              {(user as any)?.rankTitle.substring(0, 3)}
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-tr from-indigo-500 to-amber-400 text-sm font-bold text-white shadow-[0_12px_30px_rgba(86,98,246,0.35)]">
                          {avatarLetter}
                        </div>
                      )}
                      <div className="hidden min-w-0 max-w-[11rem] flex-col items-start leading-none sm:flex">
                        <span className={`block max-w-full truncate text-sm font-semibold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                          {user?.firstName || user?.username}
                        </span>
                        <span className="mt-1 block max-w-full truncate text-[10px] font-bold tracking-[0.24em] text-indigo-400">
                          {(user as any)?.rankTitle || 'AMATEUR'}
                        </span>
                      </div>
                    </label>

                    <ul tabIndex={0} className={`dropdown-content menu mt-3 w-72 rounded-[1.5rem] border p-2 shadow-2xl z-50 translate-y-2 ${dropdownBg}`}>
                      <div className={`relative mb-2 overflow-hidden rounded-[1.25rem] border p-4 ${isDark ? 'border-white/8 bg-white/[0.03]' : 'border-slate-900/10 bg-slate-950/[0.03]'}`}>
                        <div className="mb-2 flex items-end justify-between">
                          <div className={`text-xs font-semibold ${subText}`}>
                            {rankInfo.currentRank.title}
                            <span className="ml-1 text-amber-400">→ {rankInfo.isMaxRank ? 'MAX' : rankInfo.nextRank.title}</span>
                          </div>
                          <div className={`rounded-full px-2 py-1 text-[10px] font-bold ${isDark ? 'bg-white/5 text-slate-400' : 'bg-slate-900/[0.06] text-slate-500'}`}>
                            {xpValue} {t('nav.xpLabel')}
                          </div>
                        </div>
                        <div className={`relative h-2 w-full overflow-hidden rounded-full ${isDark ? 'bg-white/8' : 'bg-slate-900/10'}`}>
                          <div
                            className="absolute top-0 left-0 h-full rounded-full bg-gradient-to-r from-amber-400 to-indigo-400 transition-all duration-1000"
                            style={{ width: `${rankInfo.progressPercentage}%` }}
                          ></div>
                        </div>
                        {!rankInfo.isMaxRank && (
                          <div className={`mt-2 text-right text-[10px] ${subText}`}>
                            {t('nav.xpToNext')} {rankInfo.xpNeeded} {t('nav.xpNeeded')}
                          </div>
                        )}
                      </div>

                      {isAdmin && (
                        <li>
                          <Link href="/admin" className="rounded-xl px-3 py-2.5 text-sm font-semibold text-indigo-400 hover:bg-indigo-500/10 hover:text-indigo-300">
                            {navLocalText.adminPanel}
                          </Link>
                        </li>
                      )}
                      <li><Link href={ROUTES.PROFILE} className={`rounded-xl px-3 py-2.5 text-sm ${dropdownItemColor}`}>{t('nav.profile')}</Link></li>
                      <li>
                        <Link
                          href={ROUTES.BUG_REPORT}
                          className={`rounded-xl px-3 py-2.5 text-sm ${dropdownItemColor}`}
                        >
                          {t('nav.bugReport')}
                        </Link>
                      </li>
                      <li>
                        <Link href={ROUTES.REFERRAL} className="flex justify-between rounded-xl px-3 py-2.5 text-sm font-semibold text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300">
                          <span>{t('nav.referral')}</span>
                          <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] text-emerald-300">+1000 XP</span>
                        </Link>
                      </li>
                      <li><Link href={ROUTES.SUBSCRIPTION} className={`rounded-xl px-3 py-2.5 text-sm ${dropdownItemColor}`}>{t('nav.subscription')}</Link></li>
                      <div className={`my-1 h-px ${isDark ? 'bg-white/10' : 'bg-slate-900/10'}`} />
                      <li>
                        <button onClick={handleLogout} className="w-full rounded-xl px-3 py-2.5 text-left text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300">
                          {t('nav.logout')}
                        </button>
                      </li>
                    </ul>
                  </div>
                </div>
              ) : (
                <>
                  <Link href={ROUTES.LOGIN} onMouseEnter={playHoverSound} className={`rounded-full px-3 py-2 text-xs font-medium transition-colors sm:px-4 sm:text-sm ${navLinkBase}`}>
                    {t('nav.login')}
                  </Link>
                  <Link href={ROUTES.REGISTER} onMouseEnter={playHoverSound} className="rounded-full bg-indigo-500 px-3 py-2 text-xs font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-indigo-400 sm:px-5 sm:text-sm">
                    <span className="hidden min-[380px]:inline">{t('nav.register')} →</span>
                    <span className="min-[380px]:hidden">{t('nav.register')}</span>
                  </Link>
                </>
              )}
            </div>

            <div className="flex items-center gap-1.5 xl:hidden">
              <button
                onClick={toggleTheme}
                className={`rounded-full border p-2 ${surface} ${isDark ? 'text-slate-400' : 'text-slate-500'}`}
                aria-label={isDark ? t('theme.light') : t('theme.dark')}
              >
                {isDark ? <MdLightMode size={20} /> : <MdDarkMode size={20} />}
              </button>
              <button 
                className={`rounded-full border p-2 transition-colors ${surface} ${isDark ? 'text-slate-300 hover:text-white' : 'text-slate-700 hover:text-slate-950'}`}
                onClick={() => setMenuOpen(!menuOpen)}
                onMouseEnter={playHoverSound}
                aria-label="Menu"
              >
                {menuOpen ? <HiX size={22} /> : <HiMenuAlt3 size={22} />}
              </button>
            </div>
          </div>
        </div>

        <div
          className={`overflow-hidden transition-all duration-300 xl:hidden ${menuOpen ? 'max-h-[560px] opacity-100' : 'max-h-0 opacity-0'}`}
          style={{ borderTop: menuOpen ? `1px solid ${borderColor}` : 'none' }}
        >
          <div className={`${mobileMenuBg} space-y-2 px-3 py-3 backdrop-blur-2xl sm:px-4 sm:py-4`}>
            {allNavMobile.map((link) => (
              <Link
                key={link.to}
                href={link.to}
                onClick={() => setMenuOpen(false)}
                className={`block rounded-2xl px-4 py-3 text-sm font-medium transition-colors ${pathname === link.to ? activeNavLink : navLinkBase}`}
              >
                {link.label}
              </Link>
            ))}

            <div className={`mt-3 rounded-[1.5rem] border p-3 ${surface}`}>
              <div className={`mb-2 text-[10px] font-semibold uppercase tracking-[0.28em] ${subText}`}>{t('nav.language')}</div>
              <div className="flex gap-2">
                {(['uz', 'ru', 'en'] as Lang[]).map((l) => (
                  <button
                    key={l}
                    onMouseEnter={playHoverSound}
                    onClick={() => setLang(l)}
                    className={`flex-1 rounded-xl py-2 text-xs font-bold transition-colors ${lang === l ? 'bg-indigo-500 text-white' : isDark ? 'bg-white/5 text-slate-400 hover:bg-white/10' : 'bg-slate-900/[0.04] text-slate-500 hover:bg-slate-900/[0.08]'}`}
                  >
                    <span className="mr-1.5" aria-hidden>{LANG_FLAGS[l]}</span>
                    {LANG_NAMES[l]}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col min-[340px]:flex-row gap-2 pt-1">
              {isLoggedIn ? (
                <>
                  <Link 
                    href={ROUTES.PROFILE} 
                    onClick={() => setMenuOpen(false)} 
                    onMouseEnter={playHoverSound}
                    className={`flex-1 rounded-2xl py-3 text-center text-sm transition-colors ${surface} ${isDark ? 'text-slate-300 hover:bg-white/12' : 'text-slate-700 hover:bg-slate-100'}`}
                  >
                    {t('nav.profile')}
                  </Link>
                  <button 
                    onClick={handleLogout} 
                    onMouseEnter={playHoverSound}
                    className="flex-1 rounded-2xl bg-red-500/10 py-3 text-sm text-red-400 transition-colors hover:bg-red-500/20"
                  >
                    {t('nav.logout')}
                  </button>
                </>
              ) : (
                <>
                  <Link 
                    href={ROUTES.LOGIN} 
                    onClick={() => setMenuOpen(false)} 
                    onMouseEnter={playHoverSound}
                    className={`flex-1 rounded-2xl py-3 text-center text-sm transition-colors ${surface} ${isDark ? 'text-slate-300 hover:bg-white/12' : 'text-slate-700 hover:bg-slate-100'}`}
                  >
                    {t('nav.login')}
                  </Link>
                  <Link 
                    href={ROUTES.REGISTER} 
                    onClick={() => setMenuOpen(false)} 
                    onMouseEnter={playHoverSound}
                    className="flex-1 rounded-2xl bg-indigo-500 py-3 text-center text-sm font-medium text-white transition-colors hover:bg-indigo-400"
                  >
                    {t('nav.register')}
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      <div className="h-14 sm:h-16" />
    </>
  )
}
