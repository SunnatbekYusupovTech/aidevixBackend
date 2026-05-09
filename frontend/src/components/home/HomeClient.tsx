'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/dist/ScrollTrigger';

import CourseCard from '@/components/courses/CourseCard';
import VideoCard from '@/components/videos/VideoCard';
import ProBanner from '@/components/home/ProBanner';
import { useLang } from '@/context/LangContext';
import { useTheme } from '@/context/ThemeContext';
import { useSound } from '@/context/SoundContext';
import { useSelector } from 'react-redux';
import { selectIsLoggedIn } from '@/store/slices/authSlice';
import { userApi } from '@/api/userApi';
import { IoPlay, IoArrowForward, IoSchool } from 'react-icons/io5';
import { HiArrowRight, HiOutlineDesktopComputer, HiOutlineServer, HiOutlineDeviceMobile, HiOutlineDatabase } from 'react-icons/hi';
import { SiPython, SiFigma } from 'react-icons/si';
import SiteLogoMark from '@components/common/SiteLogoMark';
import { SOCIAL_LINKS } from '@utils/constants';
import { localizeNewsItem } from '@utils/newsTextFallback';

const ThreeHero = dynamic(() => import('@/components/home/ThreeHero'), {
  ssr: false,
  loading: () => (
    <div
      aria-hidden="true"
      className="absolute inset-0 bg-gradient-to-b from-indigo-950/40 via-slate-900/30 to-slate-950/40 animate-pulse rounded-2xl"
    />
  ),
});

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

export default function HomeClient({ initialCourses = [], initialVideos = [] }) {
  type AiNewsItem = {
    _id?: string;
    title: string;
    summary: string;
    cta: string;
    href: string;
    platform: 'telegram' | 'instagram' | string;
    imageUrl?: string | null;
    startsAt?: string | null;
    endsAt?: string | null;
    clicks?: number;
  };

  const [isMounted, setIsMounted] = useState(false);
  const [showHeroVisual, setShowHeroVisual] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const { t, lang } = useLang();
  const { isDark } = useTheme();
  const { playSound } = useSound();
  const [continueLearning, setContinueLearning] = useState<any>(null);
  const [homeStats, setHomeStats] = useState({
    students: 0,
    videos: 0,
    mentors: 0,
    rating: 0,
  });
  const [homeStatsLoaded, setHomeStatsLoaded] = useState(false);
  const [newsIndex, setNewsIndex] = useState(0);
  const [aiNews, setAiNews] = useState<AiNewsItem[]>([]);
  const [enableNewsImages, setEnableNewsImages] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const touchStartXRef = useRef<number | null>(null);
  const touchEndXRef = useRef<number | null>(null);
  const isLoggedIn = useSelector(selectIsLoggedIn);
  const statsRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsMounted(true);
    setIsReady(true);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const connection = (navigator as Navigator & {
      connection?: { saveData?: boolean };
    }).connection;

    const updatePreference = () => {
      const isSmallScreen = window.innerWidth < 768;
      setReduceMotion(Boolean(media.matches) || Boolean(connection?.saveData) || isSmallScreen);
    };

    updatePreference();
    media.addEventListener('change', updatePreference);
    return () => media.removeEventListener('change', updatePreference);
  }, []);

  useEffect(() => {
    if (!isLoggedIn) return;
    userApi.getContinueLearning()
      .then(({ data }) => setContinueLearning(data?.data || null))
      .catch(() => {});
  }, [isLoggedIn]);

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const r = await fetch('/api/proxy/users/home-stats', {
          credentials: 'include',
          signal: controller.signal,
        });
        if (!r.ok) throw new Error(`home-stats HTTP ${r.status}`);
        const json = await r.json();
        const data = json?.data || {};
        setHomeStats({
          students: Number(data.students || 0),
          videos: Number(data.videos || 0),
          mentors: Number(data.mentors || 0),
          rating: Number(data.rating || 0),
        });
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return;
        if (process.env.NODE_ENV !== 'production') {
          console.warn('home-stats:', err instanceof Error ? err.message : err);
        }
      } finally {
        if (!controller.signal.aborted) setHomeStatsLoaded(true);
      }
    })();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!isMounted || !isReady) return;

    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let idleId: number | null = null;

    const enable = () => {
      if (!reduceMotion && window.innerWidth >= 768) {
        setShowHeroVisual(true);
      }
    };

    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      idleId = window.requestIdleCallback(enable, { timeout: 1800 });
    } else {
      timeoutId = setTimeout(enable, 1200);
    }

    return () => {
      if (idleId !== null && typeof window !== 'undefined' && 'cancelIdleCallback' in window) {
        window.cancelIdleCallback(idleId);
      }
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [isMounted, reduceMotion]);

  // Metrikalar serverdan kelguncha `data-value` 0; GSAP bir marta ishga tushsa — doim 0 qoladi.
  useEffect(() => {
    if (!isMounted || !homeStatsLoaded || !statsRef.current || reduceMotion) return;
    const el = statsRef.current;
    const ctx = gsap.context(() => {
      const counters = el.querySelectorAll('.stat-value');
      counters.forEach((counter: Element) => {
        const targetValue = Number(counter.getAttribute('data-value') || '0');
        const decimals = Number(counter.getAttribute('data-decimals') || '0');
        const valueProxy = { value: 0 };
        gsap.fromTo(
          valueProxy,
          { value: 0 },
          {
            value: targetValue,
            duration: 1.8,
            ease: 'power2.out',
            onUpdate: () => {
              const current = valueProxy.value;
              counter.textContent = decimals > 0
                ? current.toFixed(decimals)
                : Math.round(current).toString();
            },
            scrollTrigger: {
              trigger: el,
              start: 'top 82%',
              once: true,
            },
          },
        );
      });
    }, el);
    requestAnimationFrame(() => ScrollTrigger.refresh());
    return () => ctx.revert();
  }, [isMounted, homeStatsLoaded, homeStats.students, homeStats.videos, homeStats.mentors, homeStats.rating, reduceMotion]);

  useEffect(() => {
    if (!isMounted || !pageRef.current || reduceMotion) return;

    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>('.reveal-section').forEach((section, index) => {
        const direction = section.getAttribute('data-direction') || 'up';
        let x = 0, y = 0;
        
        if (direction === 'up') y = 100;
        else if (direction === 'left') x = 100;
        else if (direction === 'right') x = -100;

        gsap.fromTo(
          section,
          { x, y, opacity: 0, scale: 0.95 },
          {
            x: 0,
            y: 0,
            scale: 1,
            opacity: 1,
            duration: 1.2,
            delay: Math.min(index * 0.05, 0.2),
            ease: 'power4.out',
            scrollTrigger: {
              trigger: section,
              start: 'top 88%',
              once: true,
            },
          },
        );
      });

      // Staggered animation for category items
      gsap.fromTo(
        '.category-item',
        { x: 100, opacity: 0 },
        {
          x: 0,
          opacity: 1,
          duration: 1.2,
          stagger: 0.1,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: '.category-item',
            start: 'top 90%',
            once: true,
          },
        }
      );
    }, pageRef);

    return () => ctx.revert();
  }, [isMounted, reduceMotion]);

  const categories = [
    { name: t('cat.frontend'), subtitle: t('cat.frontendSub'), icon: <HiOutlineDesktopComputer className="w-8 h-8 text-white" />, path: 'frontend' },
    { name: t('cat.backend'), subtitle: t('cat.backendSub'), icon: <HiOutlineServer className="w-8 h-8 text-emerald-400" />, path: 'backend' },
    { name: t('cat.ai'), subtitle: t('cat.aiSub'), icon: <div className="w-8 h-8 text-cyan-400 flex items-center justify-center font-bold text-xl">AI</div>, path: 'ai' },
    { name: t('cat.python'), subtitle: t('cat.pythonSub'), icon: <SiPython className="w-8 h-8 text-yellow-500" />, path: 'python' },
    { name: t('cat.mobile'), subtitle: t('cat.mobileSub'), icon: <HiOutlineDeviceMobile className="w-8 h-8 text-pink-400" />, path: 'mobile' },
    { name: t('cat.uiux'), subtitle: t('cat.uiuxSub'), icon: <SiFigma className="w-8 h-8 text-purple-400" />, path: 'ui-ux' },
    { name: t('cat.data'), subtitle: t('cat.dataSub'), icon: <HiOutlineDatabase className="w-8 h-8 text-blue-400" />, path: 'malumotlar' },
  ];

  const fallbackAiNews: AiNewsItem[] = [
    {
      title: t('home.news1.title'),
      summary: t('home.news1.summary'),
      cta: t('home.news1.cta'),
      href: SOCIAL_LINKS.telegram,
      platform: "telegram",
      imageUrl: 'https://picsum.photos/seed/aidevix-ai-news-1/1600/900',
    },
    {
      title: t('home.news2.title'),
      summary: t('home.news2.summary'),
      cta: t('home.news2.cta'),
      href: SOCIAL_LINKS.instagram,
      platform: "instagram",
      imageUrl: 'https://picsum.photos/seed/aidevix-ai-news-2/1600/900',
    },
    {
      title: t('home.news3.title'),
      summary: t('home.news3.summary'),
      cta: t('home.news3.cta'),
      href: SOCIAL_LINKS.telegram,
      platform: "telegram",
      imageUrl: 'https://picsum.photos/seed/aidevix-ai-news-3/1600/900',
    },
    {
      title: t('home.news4.title'),
      summary: t('home.news4.summary'),
      cta: t('home.news4.cta'),
      href: SOCIAL_LINKS.instagram,
      platform: "instagram",
      imageUrl: 'https://picsum.photos/seed/aidevix-ai-news-4/1600/900',
    },
  ];


  const stats = useMemo(() => [
    { value: homeStats.students, label: t('stats.students'), color: isDark ? 'text-white' : 'text-gray-900', suffix: '+', decimals: 0 },
    { value: homeStats.videos, label: t('stats.videos'), color: 'bg-gradient-to-r from-amber-400 to-indigo-400 bg-clip-text text-transparent', suffix: '+', decimals: 0 },
    { value: homeStats.mentors, label: t('stats.mentors'), color: isDark ? 'text-white' : 'text-gray-900', suffix: '+', decimals: 0 },
    { value: homeStats.rating, label: t('stats.rating'), color: 'text-orange-500', suffix: '', decimals: 1 },
  ], [homeStats.students, homeStats.videos, homeStats.mentors, homeStats.rating, isDark, t]);

  const pageBg = isDark ? 'text-slate-100' : 'text-slate-900';
  const heroText = isDark ? 'text-white' : 'text-slate-950';
  const mutedText = isDark ? 'text-slate-400' : 'text-slate-600';
  const hairline = isDark ? 'border-white/10' : 'border-slate-900/10';
  const softSurface = isDark ? 'bg-white/[0.03]' : 'bg-white/70';
  const railSurface = isDark ? 'bg-white/[0.02]' : 'bg-slate-950/[0.03]';
  const ctaBg = isDark ? 'bg-[#07080d] border-white/10' : 'bg-slate-50 border-slate-200';

  const playHoverSound = () => {
    playSound('/sounds/onlyclick.wav');
  };

  useEffect(() => {
    let mounted = true;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let idleId: number | null = null;

    const loadNews = () => {
      fetch('/api/proxy/public/ai-news')
        .then(async (r) => {
          if (!r.ok) throw new Error('ai-news fetch failed');
          return r.json();
        })
        .then((json) => {
          if (!mounted) return;
          const items = (json?.data?.news || []) as AiNewsItem[];
          if (items.length > 0) {
            setAiNews(items.map((item) => localizeNewsItem(lang, item)));
          } else {
            setAiNews(fallbackAiNews.map((item) => localizeNewsItem(lang, item)));
          }
        })
        .catch(() => {
          if (!mounted) return;
          setAiNews(fallbackAiNews.map((item) => localizeNewsItem(lang, item)));
        });
    };

    const enableImages = () => setEnableNewsImages(true);

    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      idleId = window.requestIdleCallback(loadNews, { timeout: 2500 });
    } else {
      timeoutId = setTimeout(loadNews, 1200);
    }

    const imageDelayId = setTimeout(enableImages, 3000);

    return () => {
      mounted = false;
      if (idleId !== null && typeof window !== 'undefined' && 'cancelIdleCallback' in window) {
        window.cancelIdleCallback(idleId);
      }
      if (timeoutId) clearTimeout(timeoutId);
      clearTimeout(imageDelayId);
    };
  }, [lang]);

  useEffect(() => {
    if (!aiNews.length) return;
    const timer = setInterval(() => {
      setNewsIndex((prev) => (prev + 1) % aiNews.length);
    }, 10000);
    return () => clearInterval(timer);
  }, [aiNews.length]);

  const handlePrevNews = () => {
    if (!aiNews.length) return;
    setNewsIndex((prev) => (prev - 1 + aiNews.length) % aiNews.length);
  };

  const handleNextNews = () => {
    if (!aiNews.length) return;
    setNewsIndex((prev) => (prev + 1) % aiNews.length);
  };

  const onNewsTouchStart = (e: React.TouchEvent<HTMLAnchorElement>) => {
    touchStartXRef.current = e.changedTouches[0]?.clientX ?? null;
    touchEndXRef.current = null;
  };

  const onNewsTouchEnd = (e: React.TouchEvent<HTMLAnchorElement>) => {
    touchEndXRef.current = e.changedTouches[0]?.clientX ?? null;
    const start = touchStartXRef.current;
    const end = touchEndXRef.current;
    if (start == null || end == null) return;
    const dx = end - start;
    const threshold = 45;
    if (dx > threshold) handlePrevNews();
    if (dx < -threshold) handleNextNews();
  };

  const trackNewsClick = (id?: string) => {
    if (!id) return;
    fetch(`/api/proxy/public/ai-news/${id}/click`, {
      method: 'POST',
      credentials: 'include',
      keepalive: true,
      headers: { 'Content-Type': 'application/json' },
    }).catch(() => {});
  };

  const getNewsHref = (item?: AiNewsItem) => {
    if (!item) return SOCIAL_LINKS.telegram;
    if (String(item.platform).toLowerCase() === 'telegram') return SOCIAL_LINKS.telegram;
    if (String(item.platform).toLowerCase() === 'instagram') return SOCIAL_LINKS.instagram;
    return item.href || SOCIAL_LINKS.telegram;
  };

  return (
    <div ref={pageRef} className={`min-h-screen w-full min-w-0 max-w-full font-sans selection:bg-indigo-500/30 ${pageBg}`}>
      <section className={`relative isolate w-full min-w-0 overflow-x-clip px-3 pt-6 sm:px-4 sm:pt-8 ${heroText}`}>
        <div className="aidevix-grid absolute inset-0 opacity-20" />
        <div className={`absolute inset-x-0 top-0 h-[42rem] ${isDark ? 'bg-[radial-gradient(circle_at_top,rgba(86,98,246,0.24),transparent_46%)]' : 'bg-[radial-gradient(circle_at_top,rgba(86,98,246,0.16),transparent_44%)]'}`} />
        {showHeroVisual && <ThreeHero isDark={isDark} />}
        <div className={`pointer-events-none absolute inset-x-0 top-24 mx-auto h-64 max-w-5xl rounded-full blur-3xl ${isDark ? 'bg-amber-400/10' : 'bg-amber-300/20'}`} />

        <div className="relative z-10 mx-auto grid w-full min-w-0 max-w-7xl grid-cols-1 min-h-[calc(100svh-5rem)] items-end gap-8 pb-12 pt-16 sm:gap-12 sm:pb-16 sm:pt-20 xl:grid-cols-[minmax(0,1.15fr)_22rem] xl:gap-16 xl:pb-20">
          <div className="min-w-0 max-w-4xl">
            <div
              className={`section-kicker mb-4 inline-flex max-w-full flex-wrap items-center gap-2 border-b sm:mb-6 sm:gap-3 ${hairline} pb-3 sm:pb-4 ${mutedText}`}
            >
              <SiteLogoMark size={24} className="rounded-lg ring-white/10" />
              <span>Aidevix</span>
              <span>{t('hero.badge')}</span>
            </div>

            <h1
              className="max-w-full break-words font-display text-[clamp(1.55rem,min(10vw,12vh),2.85rem)] font-bold leading-[1.02] tracking-[-0.03em] sm:text-[clamp(2.1rem,9vw,4.25rem)] sm:tracking-[-0.05em] lg:max-w-5xl lg:text-[clamp(3.25rem,6.5vw,7rem)]"
            >
              {t('hero.title1')}{' '}
              <span className={`bg-clip-text text-transparent bg-gradient-to-r ${
                isDark
                  ? 'from-indigo-300 via-purple-400 to-violet-400'
                  : 'from-indigo-600 via-purple-600 to-violet-700'
              }`}>
                {t('hero.titleHighlight')}
              </span>{' '}
              {t('hero.title2')}
            </h1>

            <p
              className={`mt-6 max-w-2xl text-[0.9375rem] leading-7 sm:mt-8 sm:text-base sm:leading-8 md:text-lg ${mutedText}`}
            >
              {t('hero.subtitle')}
            </p>

            <div
              className="mt-8 flex w-full min-w-0 flex-col gap-3 sm:mt-10 sm:flex-row sm:items-center sm:gap-4"
            >
              <Link
                href="/courses"
                onMouseEnter={playHoverSound}
                className="inline-flex h-12 w-full min-w-0 items-center justify-center rounded-full bg-indigo-500 px-5 text-sm font-semibold text-white shadow-[0_18px_60px_rgba(86,98,246,0.35)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-indigo-400 sm:h-14 sm:w-auto sm:px-8"
              >
                {t('hero.cta1')}
              </Link>
              <Link
                href="/register"
                onMouseEnter={playHoverSound}
                className={`inline-flex h-12 w-full min-w-0 items-center justify-center gap-2 rounded-full border px-5 text-sm font-semibold transition-all duration-300 hover:-translate-y-0.5 sm:h-14 sm:w-auto sm:px-8 ${isDark ? 'border-white/12 bg-white/5 text-white hover:bg-white hover:text-slate-950' : 'border-slate-300 bg-white/80 text-slate-900 hover:bg-slate-950 hover:text-white'}`}
              >
                {t('hero.cta2')}
                <HiArrowRight className="text-base" />
              </Link>
            </div>

            {aiNews.length > 0 && (
            <motion.a
              key={newsIndex}
              initial={reduceMotion ? false : { opacity: 0, y: 12 }}
              animate={reduceMotion ? { opacity: 1, y: 0 } : { opacity: 1, y: 0 }}
              transition={{ duration: 0.45, ease: 'easeOut' }}
              href={getNewsHref(aiNews[newsIndex])}
              target="_blank"
              rel="noopener noreferrer"
              onMouseEnter={playHoverSound}
              onClick={() => trackNewsClick(aiNews[newsIndex]?._id)}
              onTouchStart={onNewsTouchStart}
              onTouchEnd={onNewsTouchEnd}
              className={`relative mt-6 block overflow-hidden rounded-2xl border p-4 sm:mt-7 sm:rounded-3xl sm:p-5 ${isDark ? 'border-indigo-400/25 hover:border-indigo-300/45' : 'border-indigo-200 hover:border-indigo-400/50'} transition-all duration-300 hover:-translate-y-0.5`}
            >
              <div
                className="absolute inset-0 bg-cover bg-center"
                style={{
                  backgroundImage: enableNewsImages && aiNews[newsIndex]?.imageUrl
                    ? `url("${aiNews[newsIndex]?.imageUrl}")`
                    : 'none',
                }}
              />
              <div className={`absolute inset-0 ${isDark ? 'bg-slate-950/75' : 'bg-white/80'}`} />
              <div className={`absolute inset-0 bg-gradient-to-r ${isDark ? 'from-indigo-900/55 via-violet-900/35 to-cyan-900/45' : 'from-indigo-100/75 via-white/55 to-cyan-100/75'}`} />
              <div className="relative z-10">
              <div className="flex items-center justify-between gap-3">
                <div className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${isDark ? 'border-indigo-300/30 text-indigo-200' : 'border-indigo-300 text-indigo-700'}`}>
                  {t('home.newsBadge')} · {aiNews[newsIndex]?.platform === 'instagram' ? 'Instagram' : 'Telegram'}
                </div>
                <div className={`text-xs ${mutedText}`}>{newsIndex + 1}/{aiNews.length}</div>
              </div>
              <h3 className="mt-3 text-sm font-extrabold leading-6 sm:text-base">{aiNews[newsIndex]?.title}</h3>
              <p className={`mt-2 text-xs leading-6 sm:text-sm ${isDark ? 'text-slate-200/90' : mutedText}`}>{aiNews[newsIndex]?.summary}</p>
              <div className="mt-3 flex items-center gap-2 text-sm font-semibold text-indigo-400">
                <span>{aiNews[newsIndex]?.cta}</span>
                <IoArrowForward className="text-base" />
              </div>
              <div className="mt-4 flex items-center justify-between">
                <div className={`text-[11px] ${mutedText}`}>{t('home.newsSwipeHint')}</div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={(e) => { e.preventDefault(); handlePrevNews(); }}
                    className={`h-8 w-8 rounded-full border text-sm font-bold ${isDark ? 'border-white/15 bg-white/5 text-slate-200 hover:bg-white/10' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'}`}
                    aria-label={t('home.newsPrevAria')}
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.preventDefault(); handleNextNews(); }}
                    className={`h-8 w-8 rounded-full border text-sm font-bold ${isDark ? 'border-white/15 bg-white/5 text-slate-200 hover:bg-white/10' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'}`}
                    aria-label={t('home.newsNextAria')}
                  >
                    ›
                  </button>
                </div>
              </div>
              {(aiNews[newsIndex]?.startsAt || aiNews[newsIndex]?.endsAt) && (
                <div className={`mt-2 text-[11px] ${isDark ? 'text-indigo-200/80' : 'text-indigo-700/80'}`}>
                  {aiNews[newsIndex]?.startsAt ? `${t('home.newsStartLabel')}: ${new Date(aiNews[newsIndex]!.startsAt as string).toLocaleString()}` : ''}
                  {aiNews[newsIndex]?.startsAt && aiNews[newsIndex]?.endsAt ? ' · ' : ''}
                  {aiNews[newsIndex]?.endsAt ? `${t('home.newsEndLabel')}: ${new Date(aiNews[newsIndex]!.endsAt as string).toLocaleString()}` : ''}
                </div>
              )}
              <div className={`mt-3 h-1 w-full overflow-hidden rounded-full ${isDark ? 'bg-white/10' : 'bg-slate-300/40'}`}>
                <motion.div
                  key={`news-progress-${newsIndex}`}
                  initial={{ width: '0%' }}
                  animate={{ width: '100%' }}
                  transition={{ duration: 10, ease: 'linear' }}
                  className="h-full rounded-full bg-indigo-500"
                />
              </div>
              </div>
            </motion.a>
            )}
          </div>

          <motion.aside
            initial={{ opacity: 0, x: 18 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.18 }}
            className={`min-w-0 w-full self-end border-t pt-6 xl:border-l xl:border-t-0 xl:pl-8 xl:pt-0 ${hairline}`}
          >
            <div className={`section-kicker ${mutedText}`}>{t('home.learningSignal')}</div>
            <div className={`mt-6 space-y-6 border-y py-6 ${hairline}`}>
              {stats.slice(0, 3).map((stat, index) => (
                <div key={stat.label} className="flex min-w-0 items-end justify-between gap-2 sm:gap-4">
                  <div className="min-w-0">
                    <div className={`text-[10px] uppercase tracking-[0.18em] sm:text-xs sm:tracking-[0.26em] ${mutedText}`}>0{index + 1}</div>
                    <div className="mt-1 text-2xl font-semibold tracking-[-0.04em] tabular-nums sm:mt-2 sm:text-3xl sm:tracking-[-0.05em]">
                      {stat.decimals > 0
                        ? Number(stat.value).toFixed(stat.decimals)
                        : Math.round(Number(stat.value) || 0).toLocaleString()}
                      {stat.suffix}
                    </div>
                  </div>
                  <div className={`max-w-[min(11rem,42vw)] shrink text-right text-xs leading-5 sm:text-sm sm:leading-6 ${mutedText}`}>{stat.label}</div>
                </div>
              ))}
            </div>
            <p className={`mt-6 max-w-xs text-sm leading-7 ${mutedText}`}>{t('home.learningSignalSub')}</p>
          </motion.aside>
        </div>
      </section>

      {/* Continue Learning Widget — faqat login qilgan foydalanuvchilar uchun */}
      {isLoggedIn && continueLearning && (
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="relative z-20 mx-auto mt-4 max-w-7xl px-3 sm:px-4"
        >
          <div className={`flex flex-col gap-4 rounded-2xl border p-4 sm:flex-row sm:items-center sm:gap-5 sm:rounded-[2rem] sm:p-6 md:p-8 ${isDark ? 'border-indigo-500/20 bg-indigo-500/5' : 'border-indigo-200 bg-indigo-50'}`}>
            <div className={`flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl ${isDark ? 'bg-indigo-500/20' : 'bg-indigo-100'}`}>
              <IoSchool className="text-2xl text-indigo-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className={`text-xs uppercase tracking-widest mb-1 ${mutedText}`}>{t('home.continueTitle')}</div>
              <h3 className="font-semibold text-lg truncate">{continueLearning.course?.title}</h3>
              <p className={`text-sm mt-1 ${mutedText}`}>{continueLearning.nextVideo?.title}</p>
              <div className="mt-3 flex items-center gap-3">
                <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden max-w-xs">
                  <div
                    className="h-full bg-indigo-500 rounded-full"
                    style={{ width: `${continueLearning.progressPercent || 0}%` }}
                  />
                </div>
                <span className={`text-xs font-semibold ${mutedText}`}>{continueLearning.progressPercent || 0}%</span>
              </div>
            </div>
            <Link
              href={`/videos/${continueLearning.nextVideo?._id}`}
              className="flex h-12 w-full flex-shrink-0 items-center justify-center gap-2 rounded-full bg-indigo-500 px-5 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-indigo-400 sm:w-auto sm:px-6"
            >
              <IoPlay className="text-base" /> {t('home.continueAction')}
            </Link>
          </div>
        </motion.section>
      )}

      <section ref={statsRef} data-direction="up" className="relative z-20 mx-auto mt-2 max-w-7xl px-3 sm:px-4 reveal-section">
        <div className={`grid gap-px overflow-hidden rounded-2xl border sm:rounded-[2rem] ${hairline} ${softSurface} backdrop-blur-2xl md:grid-cols-4`}>
          {stats.map((stat, i) => (
            <div key={i} className={`min-w-0 px-4 py-6 sm:px-6 sm:py-8 md:px-8 md:py-10 ${i < stats.length - 1 ? 'md:border-r' : ''} ${hairline}`}>
              <div className={`text-[10px] uppercase tracking-[0.2em] sm:text-xs sm:tracking-[0.3em] ${mutedText}`}>{t('home.metricLabel', { n: `0${i + 1}` })}</div>
              <div className={`mt-3 flex min-w-0 items-end text-3xl font-black tracking-[-0.05em] sm:mt-4 sm:text-4xl sm:tracking-[-0.06em] md:text-5xl ${stat.color}`}>
                <span className="stat-value" data-value={String(stat.value)} data-decimals={String(stat.decimals)}>0</span>
                {stat.suffix}
              </div>
              <div className={`mt-3 text-sm leading-6 ${mutedText}`}>{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      <section data-direction="left" className="reveal-section px-3 py-16 sm:px-4 sm:py-28 md:py-36">
        <div className="mx-auto grid max-w-7xl gap-12 xl:grid-cols-[0.8fr_1.2fr] xl:gap-20">
          <div className="xl:sticky xl:top-28 xl:h-fit">
            <div className={`section-kicker ${mutedText}`}>{t('home.paths')}</div>
            <h2 className="mt-4 max-w-lg text-balance font-display text-2xl font-semibold tracking-[-0.04em] sm:mt-5 sm:text-4xl sm:tracking-[-0.05em] md:text-6xl">
              {t('cat.title')}
            </h2>
            <p className={`mt-6 max-w-md text-base leading-8 ${mutedText}`}>
              {t('cat.subtitle')}
            </p>
          </div>
          <div className={`border-t ${hairline} category-item-container`}>
            {categories.map((category, idx) => (
              <Link
                key={idx}
                href={`/courses?category=${category.path}`}
                onMouseEnter={playHoverSound}
                className={`group category-item grid gap-3 border-b px-0 py-5 transition-all duration-300 sm:gap-4 sm:py-7 md:grid-cols-[5rem_minmax(0,1fr)_auto] md:items-center md:hover:pl-5 ${hairline}`}
              >
                <div className={`text-xs font-semibold tracking-[0.16em] sm:text-sm sm:tracking-[0.28em] ${mutedText}`}>0{idx + 1}</div>
                <div className="min-w-0">
                  <h3 className="text-xl font-semibold tracking-[-0.03em] transition-colors duration-300 group-hover:text-indigo-400 sm:text-2xl sm:tracking-[-0.04em] md:text-3xl">
                    {category.name}
                  </h3>
                  <p className={`mt-2 max-w-xl text-sm leading-7 ${mutedText}`}>{category.subtitle}</p>
                </div>
                <div 
                  className="flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] transition-all duration-300 group-hover:border-indigo-400/30 group-hover:text-indigo-300"
                >
                  {category.icon}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section data-direction="right" className="reveal-section px-3 py-8 sm:px-4 sm:py-10 md:py-16">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <div className={`section-kicker ${mutedText}`}>{t('home.showcase')}</div>
              <h2 className="mt-3 max-w-full text-balance font-display text-2xl font-semibold tracking-[-0.04em] sm:mt-4 sm:text-4xl sm:tracking-[-0.05em] md:text-6xl">
                {t('courses.title')}
              </h2>
            </div>
            <Link href="/courses" className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-400 transition-transform duration-300 hover:translate-x-1">
              {t('courses.viewAll')} <HiArrowRight />
            </Link>
          </div>
          <div className={`mt-10 grid gap-8 xl:grid-cols-[minmax(0,1fr)_22rem]`}>
            <div className="grid grid-cols-1 gap-8 md:grid-cols-2 xl:grid-cols-3">
              {initialCourses.slice(0, 6).map((course: any, index: number) => (
                <CourseCard key={course._id || index} course={course} index={index} />
              ))}
            </div>

            <div className={`rounded-[2rem] border p-6 md:p-8 ${hairline} ${railSurface}`}>
              <div className={`section-kicker ${mutedText}`}>{t('home.freshVideos')}</div>
              <h3 className="mt-4 text-2xl font-semibold tracking-[-0.04em]">
                {t('home.videoRailTitle')}
              </h3>
              <p className={`mt-4 text-sm leading-7 ${mutedText}`}>{t('home.videoRailSubtitle')}</p>
              <div className="mt-8 space-y-4">
                {initialVideos.slice(0, 4).map((video: any, index: number) => (
                  <VideoCard key={video._id || index} video={video} index={index} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section data-direction="up" className="py-20 reveal-section">
        <ProBanner />
      </section>

      <section data-direction="up" className={`relative overflow-hidden border-y px-3 py-16 text-center reveal-section sm:px-4 sm:py-28 ${ctaBg}`}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(86,98,246,0.2),transparent_34%)]" />
        <div className="absolute inset-x-0 bottom-0 h-48 bg-[radial-gradient(circle_at_bottom,rgba(245,158,11,0.16),transparent_38%)]" />
        <div className="relative z-10 mx-auto max-w-5xl">
          <div className={`section-kicker ${mutedText}`}>{t('home.startNow')}</div>
          <h2 className={`mt-4 max-w-full text-balance font-display text-3xl font-semibold tracking-[-0.04em] sm:mt-6 sm:text-5xl sm:tracking-[-0.05em] md:text-7xl lg:text-8xl ${isDark ? 'text-white' : 'text-slate-950'}`}>
            {t('cta.title1')}
            <span className="text-indigo-500">
              {t('cta.titleHighlight')}
            </span>
          </h2>
          <p className={`mx-auto mt-6 max-w-2xl text-base leading-8 ${mutedText}`}>
            {t('home.ctaSubtitle')}
          </p>
          <Link
            href="/register"
            onMouseEnter={playHoverSound}
            className={`mt-8 inline-flex h-12 min-h-[3rem] w-full max-w-sm items-center justify-center rounded-full px-6 text-sm font-semibold transition-all duration-300 hover:-translate-y-0.5 sm:mt-10 sm:h-16 sm:w-auto sm:max-w-none sm:px-10 sm:text-base ${
              isDark ? 'bg-white text-slate-950 hover:bg-indigo-50' : 'bg-slate-950 text-white hover:bg-slate-800'
            }`}
          >
            {t('cta.start')}
          </Link>
        </div>
      </section>
    </div>
  );
}
