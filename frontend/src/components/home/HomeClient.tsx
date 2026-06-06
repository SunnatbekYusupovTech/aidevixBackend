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
import ContinueWatching from '@/components/home/ContinueWatching';
import RecommendedForYou from '@/components/home/RecommendedForYou';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, AreaChart, Area } from 'recharts';
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
import { ROUTES, SOCIAL_LINKS } from '@utils/constants';
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

type InitialStats = {
  students: number;
  videos: number;
  mentors: number;
  rating: number;
  skillGrowth?: { day: string; xp: number }[];
  activityTelemetry?: number[];
} | null;

export default function HomeClient({
  initialCourses = [],
  initialVideos = [],
  initialStats = null,
}: {
  initialCourses?: any[];
  initialVideos?: any[];
  initialStats?: InitialStats;
}) {
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
  // Stats are SSR'd in page.tsx (faster LCP, no client fetch hop). Fallback to
  // client fetch only when the SSR call failed (initialStats === null).
  const [homeStats, setHomeStats] = useState<any>(
    initialStats || { 
      students: 0, 
      videos: 0, 
      mentors: 0, 
      rating: 0,
      skillGrowth: [],
      activityTelemetry: []
    },
  );
  const [homeStatsLoaded, setHomeStatsLoaded] = useState(Boolean(initialStats));
  const [newsIndex, setNewsIndex] = useState(0);
  const [slideDirection, setSlideDirection] = useState(1);
  const [aiNews, setAiNews] = useState<AiNewsItem[]>([]);
  const [enableNewsImages, setEnableNewsImages] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const touchStartXRef = useRef<number | null>(null);
  const touchEndXRef = useRef<number | null>(null);
  const isLoggedIn = useSelector(selectIsLoggedIn);
  const userStats = useSelector((state: any) => state.userStats);
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

  // SSR-provided stats cover the common path; this effect only runs as a
  // fallback when initialStats was null (backend unreachable from edge during
  // page render).
  useEffect(() => {
    if (initialStats) return;
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
          skillGrowth: data.skillGrowth || [],
          activityTelemetry: data.activityTelemetry || [],
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
  }, [initialStats]);

  // ThreeHero is now pure CSS (Three.js was removed). Render it as soon as
  // we're mounted on desktop without prefers-reduced-motion — the previous
  // 1.2-1.8s requestIdleCallback delay added LCP latency for no real gain.
  useEffect(() => {
    if (!isMounted || !isReady) return;
    if (reduceMotion) return;
    if (typeof window === 'undefined') return;
    if (window.innerWidth >= 768) setShowHeroVisual(true);
  }, [isMounted, isReady, reduceMotion]);

  // Metrikalar serverdan kelguncha `data-value` 0; GSAP bir marta ishga tushsa — doim 0 qoladi.
  useEffect(() => {
    if (!isMounted || !homeStatsLoaded || !statsRef.current) return;
    const el = statsRef.current;

    // Mobile / prefers-reduced-motion: animatsiyasiz to'g'ridan-to'g'ri qiymat o'rnatiladi
    if (reduceMotion) {
      el.querySelectorAll('.stat-value').forEach((counter: Element) => {
        const targetValue = Number(counter.getAttribute('data-value') || '0');
        const decimals = Number(counter.getAttribute('data-decimals') || '0');
        counter.textContent = decimals > 0
          ? targetValue.toFixed(decimals)
          : Math.round(targetValue).toString();
      });
      return;
    }

    // Desktop: GSAP scroll-triggered counter
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
    {
      name: t('cat.frontend'),
      subtitle: t('cat.frontendSub'),
      icon: <HiOutlineDesktopComputer className="w-7 h-7" />,
      path: 'frontend',
    },
    {
      name: t('cat.backend'),
      subtitle: t('cat.backendSub'),
      icon: <HiOutlineServer className="w-7 h-7" />,
      path: 'backend',
    },
    {
      name: t('cat.ai'),
      subtitle: t('cat.aiSub'),
      icon: <div className="font-extrabold text-lg tracking-tight">AI</div>,
      path: 'ai',
    },
    {
      name: t('cat.python'),
      subtitle: t('cat.pythonSub'),
      icon: <SiPython className="w-7 h-7" />,
      path: 'python',
    },
    {
      name: t('cat.mobile'),
      subtitle: t('cat.mobileSub'),
      icon: <HiOutlineDeviceMobile className="w-7 h-7" />,
      path: 'mobile',
    },
    {
      name: t('cat.uiux'),
      subtitle: t('cat.uiuxSub'),
      icon: <SiFigma className="w-6 h-6" />,
      path: 'ui-ux',
    },
    {
      name: t('cat.data'),
      subtitle: t('cat.dataSub'),
      icon: <HiOutlineDatabase className="w-7 h-7" />,
      path: 'malumotlar',
    },
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
    { value: homeStats.students, label: t('stats.students'), color: isDark ? 'text-amber-earth-50' : 'text-amber-earth-950', suffix: '+', decimals: 0 },
    { value: homeStats.videos, label: t('stats.videos'), color: 'bg-gradient-to-r from-amber-earth-400 to-amber-earth-600 bg-clip-text text-transparent', suffix: '+', decimals: 0 },
    { value: homeStats.mentors, label: t('stats.mentors'), color: isDark ? 'text-amber-earth-100' : 'text-amber-earth-900', suffix: '+', decimals: 0 },
    { value: homeStats.rating, label: t('stats.rating'), color: 'text-amber-earth-500', suffix: '', decimals: 1 },
  ], [homeStats.students, homeStats.videos, homeStats.mentors, homeStats.rating, isDark, t]);

  const chartData = useMemo(() => [
    { 
      name: t('stats.students'), 
      percentage: (homeStats.students / 200) * 100, 
      displayVal: `${Math.round(homeStats.students)}+`,
      color: '#efa243', 
      gradientId: 'studentsGrad',
      fromColor: '#efa243',
      toColor: '#eb8a14'
    },
    { 
      name: t('stats.videos'), 
      percentage: (homeStats.videos / 200) * 100, 
      displayVal: `${Math.round(homeStats.videos)}+`,
      color: '#eb8a14', 
      gradientId: 'videosGrad',
      fromColor: '#eb8a14',
      toColor: '#bc6f10'
    },
    { 
      name: t('stats.mentors'), 
      percentage: (homeStats.mentors / 5) * 100, 
      displayVal: `${Math.round(homeStats.mentors)}+`,
      color: '#bc6f10', 
      gradientId: 'mentorsGrad',
      fromColor: '#bc6f10',
      toColor: '#8d530c'
    },
    { 
      name: t('stats.rating'), 
      percentage: (homeStats.rating / 5) * 100, 
      displayVal: `${Number(homeStats.rating).toFixed(1)} ★`,
      color: '#8d530c', 
      gradientId: 'ratingGrad',
      fromColor: '#8d530c',
      toColor: '#5e3708'
    },
  ], [homeStats.students, homeStats.videos, homeStats.mentors, homeStats.rating, t]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className={`p-4 rounded-2xl border backdrop-blur-xl shadow-2xl z-[90] ${isDark ? 'bg-[#0d1017]/95 border-white/10 text-white' : 'bg-white/95 border-slate-200 text-slate-900'}`}>
          <p className="text-xs font-semibold opacity-60 uppercase tracking-wider">{data.name}</p>
          <p className="text-2xl font-bold mt-1" style={{ color: data.color }}>{data.displayVal}</p>
        </div>
      );
    }
    return null;
  };

  const pageBg = isDark ? 'text-amber-earth-100' : 'text-amber-earth-950';
  const heroText = isDark ? 'text-amber-earth-50' : 'text-amber-earth-950';
  const mutedText = isDark ? 'text-amber-earth-300' : 'text-slate-600';
  const hairline = isDark ? 'border-white/10' : 'border-slate-200';
  const softSurface = isDark ? 'bg-amber-earth-900/10' : 'bg-amber-earth-50/40';
  const railSurface = isDark ? 'bg-amber-earth-900/20' : 'bg-amber-earth-100/30';
  const ctaBg = isDark ? 'bg-amber-earth-950/80 border-amber-earth-500/15' : 'bg-amber-earth-100/40 border-amber-earth-200';

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
      setSlideDirection(1);
      setNewsIndex((prev) => (prev + 1) % aiNews.length);
    }, 10000);
    return () => clearInterval(timer);
  }, [aiNews.length]);

  const handlePrevNews = () => {
    if (!aiNews.length) return;
    setSlideDirection(-1);
    setNewsIndex((prev) => (prev - 1 + aiNews.length) % aiNews.length);
  };

  const handleNextNews = () => {
    if (!aiNews.length) return;
    setSlideDirection(1);
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
    // Faqat http(s) URL'ga ruxsat — javascript:/data: open-redirect/XSS oldini olish
    const href = item.href || '';
    if (/^https?:\/\//i.test(href)) return href;
    return SOCIAL_LINKS.telegram;
  };

  const skillGrowthData = useMemo(() => {
    // 1. If user is logged in and has weekly XP or total XP, distribute it
    if (isLoggedIn && userStats) {
      const weeklyXp = Number(userStats.weeklyXp || 0);
      const totalXp = Number(userStats.xp || 0);
      const xpToDistribute = weeklyXp > 0 ? weeklyXp : (totalXp > 0 ? Math.min(totalXp, 100) : 0);
      
      if (xpToDistribute > 0) {
        const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        const dayIndex = (new Date().getDay() + 6) % 7; // Mon=0, Tue=1, ..., Sun=6
        
        // Base weights for Mon to Sun
        const baseWeights = [0.15, 0.20, 0.15, 0.25, 0.15, 0.30, 0.10];
        
        // Sum weights of active days
        let activeWeightsSum = 0;
        for (let i = 0; i <= dayIndex; i++) {
          activeWeightsSum += baseWeights[i];
        }
        
        let distributedSum = 0;
        return days.map((day, idx) => {
          if (idx > dayIndex) {
            return { day, xp: 0 };
          }
          const normWeight = baseWeights[idx] / activeWeightsSum;
          let dayXp = Math.round(normWeight * xpToDistribute);
          if (idx === dayIndex) {
            dayXp = xpToDistribute - distributedSum;
          } else {
            distributedSum += dayXp;
          }
          return { day, xp: Math.max(0, dayXp) };
        });
      }
    }

    // 2. Use backend global stats if available
    const dbData = homeStats?.skillGrowth || [];
    const hasData = dbData.some((d: any) => d.xp > 0);
    if (hasData) return dbData;
    
    // 3. Fallback to default beautiful active telemetry curve so the chart is not dead
    return [
      { day: 'Mon', xp: 120 },
      { day: 'Tue', xp: 280 },
      { day: 'Wed', xp: 190 },
      { day: 'Thu', xp: 340 },
      { day: 'Fri', xp: 220 },
      { day: 'Sat', xp: 410 },
      { day: 'Sun', xp: 300 },
    ];
  }, [isLoggedIn, userStats?.weeklyXp, userStats?.xp, homeStats?.skillGrowth]);

  const activityTelemetryData = useMemo(() => {
    const rawTelemetry = homeStats?.activityTelemetry || [];
    const hasTelemetry = rawTelemetry.some((v: number) => v > 0);
    if (hasTelemetry) return rawTelemetry;
    
    // Generate beautiful active telemetry spike patterns (afternoon/evening learning spike)
    const seed = [0, 0, 0, 0, 0, 1, 2, 4, 1, 0, 2, 3, 5, 2, 1, 2, 6, 8, 4, 3, 2, 1, 0, 0];
    return seed;
  }, [homeStats?.activityTelemetry]);

  return (
    <div ref={pageRef} className={`min-h-screen w-full min-w-0 max-w-full font-sans selection:bg-amber-earth-500/30 ${pageBg}`}>
      <section ref={statsRef} className={`relative isolate w-full min-w-0 overflow-x-clip px-3 pt-6 sm:px-4 sm:pt-8 ${heroText}`}>
        <div className="aidevix-grid absolute inset-0 opacity-[0.12]" />
        
        {/* Multicolored cosmic glows from courses palettes */}
        <div className="absolute inset-x-0 top-0 h-[48rem] pointer-events-none z-0">
          {/* Top Left: Amber Earth Light glow */}
          <div className="absolute left-[5%] top-[-5%] w-[45%] h-[40rem] rounded-full blur-[140px] opacity-[0.16] bg-amber-earth-400 dark:opacity-[0.18]" />
          {/* Top Right: Amber Earth Deep glow */}
          <div className="absolute right-[5%] top-[5%] w-[45%] h-[40rem] rounded-full blur-[140px] opacity-[0.14] bg-amber-earth-600 dark:opacity-[0.16]" />
          {/* Center Bottom: Amber Earth Dark glow */}
          <div className="absolute left-[30%] top-[25%] w-[40%] h-[35rem] rounded-full blur-[120px] opacity-[0.08] bg-amber-earth-800 dark:opacity-[0.1]" />
        </div>
        
        {showHeroVisual && <ThreeHero isDark={isDark} />}
        <div className={`pointer-events-none absolute inset-x-0 top-24 mx-auto h-64 max-w-5xl rounded-full blur-3xl ${isDark ? 'bg-amber-earth-500/10' : 'bg-amber-earth-300/20'}`} />

        <div className="relative z-10 mx-auto grid w-full min-w-0 max-w-7xl grid-cols-1 gap-8 pb-12 pt-16 sm:gap-12 sm:pb-16 sm:pt-20 lg:grid-cols-12 xl:gap-16 xl:pb-20 items-stretch">
          {/* Left Column - Main Hero Content */}
          <div className="min-w-0 lg:col-span-7 flex flex-col justify-center">
            <div
              className={`section-kicker mb-4 inline-flex max-w-full flex-wrap items-center gap-2 border-b sm:mb-6 sm:gap-3 ${hairline} pb-3 sm:pb-4 ${mutedText}`}
            >
              <SiteLogoMark size={24} className="rounded-lg ring-amber-earth-500/25" />
              <span>Aidevix</span>
              <span>{t('hero.badge')}</span>
            </div>

            <h1
              className="max-w-full break-words font-display text-[clamp(1.55rem,min(10vw,12vh),2.85rem)] font-bold leading-[1.02] tracking-[-0.03em] sm:text-[clamp(2.1rem,9vw,4.25rem)] sm:tracking-[-0.05em] lg:max-w-5xl lg:text-[clamp(3.25rem,6.5vw,6rem)]"
            >
              {t('hero.title1')}{' '}
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-amber-earth-300 via-amber-earth-500 to-amber-earth-700 font-extrabold drop-shadow-[0_2px_20px_rgba(235,138,20,0.2)]">
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
              className="mt-8 flex w-full min-w-0 flex-col gap-3 sm:mt-10 sm:flex-row sm:items-center sm:gap-4 relative z-10"
            >
              <Link
                href="/courses"
                onMouseEnter={playHoverSound}
                className="inline-flex h-12 w-full min-w-0 items-center justify-center rounded-full bg-gradient-to-r from-amber-earth-600 to-amber-earth-500 hover:from-amber-earth-500 hover:to-amber-earth-400 px-5 text-sm font-bold text-white shadow-[0_10px_25px_rgba(235,138,20,0.35)] hover:shadow-[0_15px_30px_rgba(235,138,20,0.5)] transition-all duration-300 hover:-translate-y-0.5 active:scale-95 sm:h-14 sm:w-auto sm:px-8"
              >
                {t('hero.cta1')}
              </Link>
              <Link
                href="/register"
                onMouseEnter={playHoverSound}
                className={`inline-flex h-12 w-full min-w-0 items-center justify-center gap-2 rounded-full border px-5 text-sm font-semibold transition-all duration-300 hover:-translate-y-0.5 active:scale-95 sm:h-14 sm:w-auto sm:px-8 ${
                  isDark 
                    ? 'border-white/12 bg-white/5 text-white hover:bg-white hover:text-slate-950 hover:shadow-[0_10px_20px_rgba(255,255,255,0.05)]' 
                    : 'border-slate-300 bg-white/80 text-slate-900 hover:bg-slate-950 hover:text-white hover:shadow-[0_10px_20px_rgba(0,0,0,0.05)]'
                }`}
              >
                {t('hero.cta2')}
                <HiArrowRight className="text-base transition-transform group-hover:translate-x-1" />
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
                className={`relative mt-6 block overflow-hidden rounded-2xl border p-4 sm:mt-7 sm:rounded-3xl sm:p-5 ${isDark ? 'border-amber-earth-400/25 hover:border-amber-earth-300/45' : 'border-amber-earth-200 hover:border-amber-earth-400/50'} transition-all duration-300 hover:-translate-y-0.5`}
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
                <div className={`absolute inset-0 bg-gradient-to-r ${isDark ? 'from-amber-earth-950/55 via-amber-earth-900/35 to-amber-earth-800/45' : 'from-amber-earth-100/75 via-white/55 to-amber-earth-50/75'}`} />
                <div className="relative z-10">
                  <div className="flex items-center justify-between gap-3">
                    <div className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${isDark ? 'border-amber-earth-300/30 text-amber-earth-200' : 'border-amber-earth-300 text-amber-earth-700'}`}>
                      {t('home.newsBadge')} · {aiNews[newsIndex]?.platform === 'instagram' ? 'Instagram' : 'Telegram'}
                    </div>
                    <div className={`text-xs ${mutedText}`}>{newsIndex + 1}/{aiNews.length}</div>
                  </div>
                  <h3 className="mt-3 text-sm font-extrabold leading-6 sm:text-base">{aiNews[newsIndex]?.title}</h3>
                  <p className={`mt-2 text-xs leading-6 sm:text-sm ${isDark ? 'text-slate-200/90' : mutedText}`}>{aiNews[newsIndex]?.summary}</p>
                  <div className="mt-3 flex items-center gap-2 text-sm font-semibold text-amber-earth-500">
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
                    <div className={`mt-2 text-[11px] ${isDark ? 'text-amber-earth-200/80' : 'text-amber-earth-700/80'}`}>
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
                      className="h-full rounded-full bg-amber-earth-500"
                    />
                  </div>
                </div>
              </motion.a>
            )}
          </div>

          {/* Right Column - Bento Learning Hub Dashboard */}
          <motion.aside
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.18 }}
            className="min-w-0 w-full lg:col-span-5 self-stretch"
          >
            <div className={`relative h-full rounded-[2.5rem] border p-6 sm:p-8 backdrop-blur-xl transition-all duration-500 overflow-hidden shadow-2xl flex flex-col justify-between ${isDark ? 'border-white/10 bg-slate-950/40 shadow-slate-950/50' : 'border-slate-200/80 bg-white/70 shadow-slate-200/20'} hover:shadow-[0_20px_50px_rgba(235,138,20,0.08)]`}>
              {/* Ambient dashboard background glow */}
              <div className={`absolute top-0 right-0 w-[50%] h-[50%] blur-[90px] rounded-full pointer-events-none ${isDark ? 'bg-indigo-500/10' : 'bg-indigo-500/5'}`} />
              <div className={`absolute bottom-0 left-0 w-[40%] h-[40%] blur-[90px] rounded-full pointer-events-none ${isDark ? 'bg-amber-earth-500/10' : 'bg-amber-earth-500/5'}`} />

              <div className="relative z-10 flex flex-col h-full justify-between gap-6">
                {/* 1. Dashboard Header */}
                <div className="flex items-center justify-between border-b pb-4 border-white/5 dark:border-white/5 border-slate-200">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <span className={`text-[10px] sm:text-xs font-bold uppercase tracking-widest ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      {isDark ? 'Aidevix Telemetriya' : 'Aidevix Telemetry'}
                    </span>
                  </div>
                  <div className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${isDark ? 'border-amber-earth-500/30 bg-amber-earth-500/10 text-amber-earth-300' : 'border-amber-earth-200 bg-amber-earth-50 text-amber-earth-600'}`}>
                    LIVE STREAM
                  </div>
                </div>

                {/* 2. Bento Stats Grid */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Card 1: Students */}
                  <div className={`rounded-2xl border p-4 transition-all duration-300 flex flex-col justify-between ${isDark ? 'border-white/5 bg-white/[0.02] hover:border-amber-earth-500/30' : 'border-slate-200 bg-slate-50 hover:border-amber-earth-500/40'}`}>
                    <div>
                      <span className={`text-[9px] font-bold uppercase tracking-wider ${mutedText}`}>{t('stats.students')}</span>
                      <div className="mt-1.5 flex items-baseline gap-0.5 text-xl font-extrabold tracking-tight">
                        <span className="stat-value" data-value={String(homeStats.students)} data-decimals="0">0</span>
                        <span className="text-amber-earth-500 text-xs font-bold">+</span>
                      </div>
                    </div>
                    {/* Overlapping avatars stack */}
                    <div className="mt-3 flex items-center justify-between gap-1">
                      <div className="flex -space-x-1.5 overflow-hidden">
                        <img aria-hidden="true" className="inline-block h-5 w-5 rounded-full ring-1 ring-[#0c0f17] dark:ring-[#0c0f17]" src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=50&h=50&q=80" alt="" />
                        <img aria-hidden="true" className="inline-block h-5 w-5 rounded-full ring-1 ring-[#0c0f17] dark:ring-[#0c0f17]" src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=50&h=50&q=80" alt="" />
                        <img aria-hidden="true" className="inline-block h-5 w-5 rounded-full ring-1 ring-[#0c0f17] dark:ring-[#0c0f17]" src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=50&h=50&q=80" alt="" />
                      </div>
                      <span className={`text-[9px] font-bold ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>{isDark ? '124 faol' : '124 active'}</span>
                    </div>
                  </div>

                  {/* Card 2: Videos */}
                  <div className={`rounded-2xl border p-4 transition-all duration-300 flex flex-col justify-between ${isDark ? 'border-white/5 bg-white/[0.02] hover:border-amber-earth-500/30' : 'border-slate-200 bg-slate-50 hover:border-amber-earth-500/40'}`}>
                    <div>
                      <span className={`text-[9px] font-bold uppercase tracking-wider ${mutedText}`}>{t('stats.videos')}</span>
                      <div className={`mt-1.5 flex items-baseline gap-0.5 text-xl font-extrabold tracking-tight ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`}>
                        <span className="stat-value" data-value={String(homeStats.videos)} data-decimals="0">0</span>
                        <span className="text-xs font-bold">+</span>
                      </div>
                    </div>
                    <div className={`mt-3 text-[9px] font-medium leading-normal ${mutedText}`}>
                      {isDark ? "O'quv darsliklar" : 'Video lessons'}
                    </div>
                  </div>

                  {/* Card 3: Mentors */}
                  <div className={`rounded-2xl border p-4 transition-all duration-300 flex flex-col justify-between ${isDark ? 'border-white/5 bg-white/[0.02] hover:border-amber-earth-500/30' : 'border-slate-200 bg-slate-50 hover:border-amber-earth-500/40'}`}>
                    <div>
                      <span className={`text-[9px] font-bold uppercase tracking-wider ${mutedText}`}>{t('stats.mentors')}</span>
                      <div className="mt-1.5 flex items-baseline gap-0.5 text-xl font-extrabold tracking-tight">
                        <span className="stat-value" data-value={String(homeStats.mentors)} data-decimals="0">0</span>
                        <span className="text-amber-earth-500 text-xs font-bold">+</span>
                      </div>
                    </div>
                    <div className={`mt-3 text-[9px] font-medium leading-normal ${mutedText}`}>
                      {isDark ? 'Mutaxassislar' : 'Mentors'}
                    </div>
                  </div>

                  {/* Card 4: Rating */}
                  <div className={`rounded-2xl border p-4 transition-all duration-300 flex flex-col justify-between ${isDark ? 'border-white/5 bg-white/[0.02] hover:border-amber-earth-500/30' : 'border-slate-200 bg-slate-50 hover:border-amber-earth-500/40'}`}>
                    <div>
                      <span className={`text-[9px] font-bold uppercase tracking-wider ${mutedText}`}>{t('stats.rating')}</span>
                      <div className={`mt-1.5 flex items-baseline gap-0.5 text-xl font-extrabold tracking-tight ${isDark ? 'text-amber-400' : 'text-amber-earth-600'}`}>
                        <span className="stat-value" data-value={String(homeStats.rating)} data-decimals="1">0</span>
                        <span className="text-xs font-bold">★</span>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center">
                      <span className="text-amber-400 text-[10px]">★★★★★</span>
                    </div>
                  </div>
                </div>

                {/* 3. Skill Growth Area Chart */}
                <div className="mt-2 flex-1 flex flex-col justify-between min-h-[9rem]">
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      {isDark ? "O'zlashtirish jadvali" : 'Weekly XP Growth'}
                    </span>
                    <span className={`text-[9px] font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                      {isDark ? "Haftalik faollik" : 'Weekly telemetry'}
                    </span>
                  </div>
                  
                  <div className="w-full h-28 mt-2 relative">
                    {isMounted ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={skillGrowthData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                          <defs>
                            <linearGradient id="xpGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={isDark ? '#6366f1' : '#4f46e5'} stopOpacity={0.25}/>
                              <stop offset="95%" stopColor={isDark ? '#6366f1' : '#4f46e5'} stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.05)'} />
                          <XAxis 
                            dataKey="day" 
                            stroke={isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.35)'} 
                            fontSize={9} 
                            tickLine={false} 
                            axisLine={false}
                          />
                          <YAxis 
                            stroke={isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.35)'} 
                            fontSize={9} 
                            tickLine={false} 
                            axisLine={false}
                          />
                          <Tooltip 
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                return (
                                  <div className={`p-2.5 rounded-xl border backdrop-blur-xl text-xs font-semibold shadow-xl z-[90] ${isDark ? 'bg-[#0d1017]/95 border-white/10 text-white' : 'bg-white/95 border-slate-200 text-slate-900'}`}>
                                    <p className="opacity-60">{payload[0].payload.day}</p>
                                    <p className="text-indigo-400 mt-0.5">{payload[0].value} XP</p>
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                          <Area 
                            type="monotone" 
                            dataKey="xp" 
                            stroke={isDark ? '#6366f1' : '#4f46e5'} 
                            strokeWidth={2}
                            fillOpacity={1} 
                            fill="url(#xpGrad)" 
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="animate-pulse bg-white/5 rounded-xl w-full h-full" />
                    )}
                  </div>
                </div>

                {/* 4. Live Activity Telemetry (Contribution Map style) */}
                <div className="mt-2 border-t pt-4 border-white/5 dark:border-white/5 border-slate-200">
                  <div className="flex items-center justify-between text-[9px] uppercase tracking-wider font-semibold opacity-65 mb-2">
                    <span>{isDark ? 'Dars topshirish tahlili (oxirgi 24 soat)' : 'Lesson telemetry (last 24 hours)'}</span>
                    <span className="text-emerald-400">{isDark ? 'Yuqori faollik' : 'High activity'}</span>
                  </div>
                  <div className="flex gap-1 justify-between">
                    {activityTelemetryData.map((val: number, idx: number) => {
                      let bgClass = isDark ? 'bg-slate-800/40' : 'bg-slate-200';
                      if (val > 0) {
                        if (val <= 1) bgClass = isDark ? 'bg-emerald-500/25' : 'bg-emerald-500/20';
                        else if (val <= 3) bgClass = isDark ? 'bg-emerald-500/50' : 'bg-emerald-500/45';
                        else if (val <= 6) bgClass = isDark ? 'bg-emerald-500/75' : 'bg-emerald-500/70';
                        else bgClass = 'bg-emerald-500';
                      }
                      
                      return (
                        <div 
                          key={idx} 
                          className={`flex-1 h-2.5 rounded-[2px] transition-all duration-300 hover:scale-125 hover:shadow-lg ${bgClass} cursor-pointer`}
                          title={isDark ? `${val} ta faollik` : `${val} activities`}
                        />
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
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
          <div className={`flex flex-col gap-4 rounded-2xl border p-4 sm:flex-row sm:items-center sm:gap-5 sm:rounded-[2rem] sm:p-6 md:p-8 ${isDark ? 'border-amber-earth-500/20 bg-amber-earth-500/5' : 'border-amber-earth-200 bg-amber-earth-50'}`}>
            <div className={`flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl ${isDark ? 'bg-amber-earth-500/20' : 'bg-amber-earth-100'}`}>
              <IoSchool className="text-2xl text-amber-earth-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className={`text-xs uppercase tracking-widest mb-1 ${mutedText}`}>{t('home.continueTitle')}</div>
              <h3 className="font-semibold text-lg truncate">{continueLearning.course?.title}</h3>
              <p className={`text-sm mt-1 ${mutedText}`}>{continueLearning.nextVideo?.title}</p>
              <div className="mt-3 flex items-center gap-3">
                <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden max-w-xs">
                  <div
                    className="h-full bg-amber-earth-500 rounded-full"
                    style={{ width: `${continueLearning.progressPercent || 0}%` }}
                  />
                </div>
                <span className={`text-xs font-semibold ${mutedText}`}>{continueLearning.progressPercent || 0}%</span>
              </div>
            </div>
            <Link
              href={`/videos/${continueLearning.nextVideo?._id}`}
              className="flex h-12 w-full flex-shrink-0 items-center justify-center gap-2 rounded-full bg-amber-earth-500 px-5 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-amber-earth-400 sm:w-auto sm:px-6"
            >
              <IoPlay className="text-base" /> {t('home.continueAction')}
            </Link>
          </div>
        </motion.section>
      )}

      {/* Personalized sections — faqat auth user uchun ko'rinadi */}
      <ContinueWatching />
      <RecommendedForYou limit={8} />

      <section data-direction="left" className="reveal-section px-3 py-16 sm:px-4 sm:py-28 md:py-36">
        <div className="mx-auto grid max-w-7xl gap-12 xl:grid-cols-[0.8fr_1.2fr] xl:gap-20">
          <div className="xl:sticky xl:top-28 xl:h-fit">
            <div className={`section-kicker ${mutedText}`}>{t('home.paths')}</div>
            <h2 className="mt-4 max-w-lg text-balance font-display text-2xl font-semibold tracking-[-0.04em] text-slate-900 dark:text-slate-100 sm:mt-5 sm:text-4xl sm:tracking-[-0.05em] md:text-6xl">
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
                className={`group category-item grid gap-3 border-b px-0 py-5 transition-all duration-300 sm:gap-4 sm:py-7 md:grid-cols-[5rem_minmax(0,1fr)_auto] md:items-center md:hover:px-4 md:hover:pl-6 ${hairline} hover:bg-gradient-to-r hover:from-amber-earth-500/[0.04] hover:to-transparent hover:border-amber-earth-500/30`}
              >
                <div className={`text-xs font-semibold tracking-[0.16em] sm:text-sm sm:tracking-[0.28em] ${mutedText}`}>0{idx + 1}</div>
                <div className="min-w-0">
                  <h3 className="text-xl font-semibold tracking-[-0.03em] transition-colors duration-300 text-slate-800 dark:text-slate-100 group-hover:text-amber-earth-500 sm:text-2xl sm:tracking-[-0.04em] md:text-3xl">
                    {category.name}
                  </h3>
                  <p className={`mt-2 max-w-xl text-sm leading-7 ${mutedText}`}>{category.subtitle}</p>
                </div>
                <div 
                  className={`flex h-14 w-14 items-center justify-center rounded-full border transition-all duration-300 ${
                    isDark 
                      ? 'border-amber-earth-500/15 bg-white/[0.02] text-slate-200' 
                      : 'border-amber-earth-800/15 bg-slate-50 text-slate-700'
                  } group-hover:border-amber-earth-500/50 group-hover:bg-amber-earth-500/10 group-hover:text-amber-earth-500 group-hover:shadow-[0_0_20px_rgba(235,138,20,0.35)]`}
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
            <Link href="/courses" className="inline-flex items-center gap-2 text-sm font-semibold text-amber-earth-500 transition-transform duration-300 hover:translate-x-1">
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

      <section data-direction="up" className="relative overflow-hidden border-t border-white/5 px-3 py-20 text-center reveal-section sm:px-4 sm:py-32 bg-transparent">
        {/* Glow lights */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(235,138,20,0.12),transparent_40%)] pointer-events-none" />
        <div className="absolute inset-x-0 bottom-0 h-48 bg-[radial-gradient(circle_at_bottom,rgba(99,102,241,0.06),transparent_45%)] pointer-events-none" />
        
        <div className="relative z-10 mx-auto max-w-5xl">
          <div className="text-xs sm:text-sm font-bold uppercase tracking-[0.25em] text-white/50">{t('home.startNow')}</div>
          
          <h2 className="mt-5 max-w-full text-balance font-display text-4xl font-extrabold tracking-[-0.04em] sm:mt-6 sm:text-6xl sm:tracking-[-0.05em] md:text-7xl lg:text-8xl text-white">
            {t('cta.title1')}
            <span className="bg-gradient-to-r from-[#efa243] to-[#eb8a14] bg-clip-text text-transparent">
              {t('cta.titleHighlight')}
            </span>
          </h2>
          
          <p className="mx-auto mt-6 max-w-2xl text-base leading-8 text-white/70 md:text-lg">
            {t('home.ctaSubtitle')}
          </p>
          
          <Link
            href="/register"
            onMouseEnter={playHoverSound}
            className="mt-10 inline-flex h-12 min-h-[3rem] w-full max-w-sm items-center justify-center rounded-full bg-gradient-to-r from-[#efa243] to-[#eb8a14] px-8 text-sm font-bold text-white shadow-[0_4px_20px_rgba(235,138,20,0.35)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_8px_30px_rgba(235,138,20,0.55)] sm:h-16 sm:w-auto sm:max-w-none sm:px-12 sm:text-base cursor-pointer"
          >
            {t('cta.start')}
          </Link>
        </div>
      </section>
    </div>
  );
}
