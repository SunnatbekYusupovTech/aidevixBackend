'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { LazyMotion, domAnimation, m } from 'framer-motion';

import CourseCard from '@/components/courses/CourseCard';
import VideoCard from '@/components/videos/VideoCard';
import ProBanner from '@/components/home/ProBanner';
// Below-the-fold home widgets — split out of the initial bundle to cut
// mobile main-thread/JS parse cost (LCP). ContinueWatching & RecommendedForYou
// render null for anonymous users, so ssr:false removes them entirely from the
// (Google-measured) logged-out visitor's bundle with zero layout shift.
const ContinueWatching = dynamic(() => import('@/components/home/ContinueWatching'), { ssr: false });
const RecommendedForYou = dynamic(() => import('@/components/home/RecommendedForYou'), { ssr: false });
// AiNewsTabs fetches its news client-side anyway; ssr:false + a height-matched
// placeholder keeps CLS unchanged while deferring its framer-motion weight.
const AiNewsTabs = dynamic(() => import('@/components/home/AiNewsTabs'), {
  ssr: false,
  loading: () => (
    <section
      aria-hidden="true"
      className="relative w-full border-t border-b border-platinum-200/40 py-20 dark:border-platinum-800/40 sm:py-24"
    >
      <div className="mx-auto max-w-7xl px-6">
        <div className="h-[26rem] w-full animate-pulse rounded-none bg-white/5" />
      </div>
    </section>
  ),
});
// Recharts alohida chunk'ga ajratildi — boshlang'ich home bundle'iga tushmaydi.
const WeeklyXpChart = dynamic(() => import('@/components/home/WeeklyXpChart'), {
  ssr: false,
  loading: () => <div className="animate-pulse bg-white/5 rounded-none w-full h-full" />,
});
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
import StartNow from './StartNow';

const ThreeHero = dynamic(() => import('@/components/home/ThreeHero'), {
  ssr: false,
  loading: () => (
    <div
      aria-hidden="true"
      className="absolute inset-0 bg-gradient-to-b from-platinum-950/40 via-platinum-900/30 to-platinum-950/40 animate-pulse rounded-none"
    />
  ),
});

// GSAP faqat scroll animatsiyalari uchun kerak (sahifaning pastki qismi) —
// boshlang'ich home bundle'iga (~70KB) tushmasligi uchun lazy yuklanadi.
// Mobil / reduceMotion'da umuman ishlatilmaydi, shuning uchun yuklanmaydi ham.
type GsapModule = {
  gsap: typeof import('gsap')['gsap'];
  ScrollTrigger: typeof import('gsap/dist/ScrollTrigger')['ScrollTrigger'];
};
let gsapPromise: Promise<GsapModule> | null = null;
const loadGsap = (): Promise<GsapModule> => {
  if (!gsapPromise) {
    gsapPromise = Promise.all([
      import('gsap'),
      import('gsap/dist/ScrollTrigger'),
    ]).then(([g, s]) => {
      const gsap = g.default ?? g.gsap;
      gsap.registerPlugin(s.ScrollTrigger);
      return { gsap, ScrollTrigger: s.ScrollTrigger };
    });
  }
  return gsapPromise;
};

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
  const [homeStats, setHomeStats] = useState<any>(() => {
    const base = initialStats || { students: 0, videos: 0, mentors: 0, rating: 0 };
    return {
      students: Number(base.students) || 1240,
      videos: Number(base.videos) || 180,
      mentors: Number(base.mentors) || 12,
      rating: Number(base.rating) || 4.9,
      skillGrowth: base.skillGrowth || [],
      activityTelemetry: base.activityTelemetry || []
    };
  });
  const [homeStatsLoaded, setHomeStatsLoaded] = useState(Boolean(initialStats));
  const [newsIndex, setNewsIndex] = useState(0);
  const [slideDirection, setSlideDirection] = useState(1);
  const [aiNews, setAiNews] = useState<AiNewsItem[]>([]);
  const [enableNewsImages, setEnableNewsImages] = useState(false);
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setIsDesktop(window.innerWidth >= 768);
    const handleResize = () => setIsDesktop(window.innerWidth >= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
          students: Number(data.students) || 1240,
          videos: Number(data.videos) || 180,
          mentors: Number(data.mentors) || 12,
          rating: Number(data.rating) || 4.9,
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

    // Desktop: GSAP scroll-triggered counter (gsap lazy yuklanadi)
    let ctx: ReturnType<GsapModule['gsap']['context']> | null = null;
    let cancelled = false;
    loadGsap().then(({ gsap, ScrollTrigger }) => {
      if (cancelled) return;
      ctx = gsap.context(() => {
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
    });
    return () => {
      cancelled = true;
      if (ctx) ctx.revert();
    };
  }, [isMounted, homeStatsLoaded, homeStats.students, homeStats.videos, homeStats.mentors, homeStats.rating, reduceMotion]);

  useEffect(() => {
    if (!isMounted || !pageRef.current || reduceMotion) return;

    let ctx: ReturnType<GsapModule['gsap']['context']> | null = null;
    let cancelled = false;
    loadGsap().then(({ gsap }) => {
      if (cancelled || !pageRef.current) return;
      ctx = gsap.context(() => {
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
    });

    return () => {
      cancelled = true;
      if (ctx) ctx.revert();
    };
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
    { value: homeStats.students, label: t('stats.students'), color: isDark ? 'text-white' : 'text-platinum-950', suffix: '+', decimals: 0 },
    { value: homeStats.videos, label: t('stats.videos'), color: isDark ? 'text-platinum-200' : 'text-platinum-800', suffix: '+', decimals: 0 },
    { value: homeStats.mentors, label: t('stats.mentors'), color: isDark ? 'text-platinum-100' : 'text-platinum-900', suffix: '+', decimals: 0 },
    { value: homeStats.rating, label: t('stats.rating'), color: 'text-platinum-400', suffix: '', decimals: 1 },
  ], [homeStats.students, homeStats.videos, homeStats.mentors, homeStats.rating, isDark, t]);

  const chartData = useMemo(() => [
    { 
      name: t('stats.students'), 
      percentage: (homeStats.students / 200) * 100, 
      displayVal: `${Math.round(homeStats.students)}+`,
      color: '#a9b3bc', 
      gradientId: 'studentsGrad',
      fromColor: '#a9b3bc',
      toColor: '#8c99a6'
    },
    { 
      name: t('stats.videos'), 
      percentage: (homeStats.videos / 200) * 100, 
      displayVal: `${Math.round(homeStats.videos)}+`,
      color: '#8c99a6', 
      gradientId: 'videosGrad',
      fromColor: '#8c99a6',
      toColor: '#6f7f90'
    },
    { 
      name: t('stats.mentors'), 
      percentage: (homeStats.mentors / 5) * 100, 
      displayVal: `${Math.round(homeStats.mentors)}+`,
      color: '#6f7f90', 
      gradientId: 'mentorsGrad',
      fromColor: '#6f7f90',
      toColor: '#596673'
    },
    { 
      name: t('stats.rating'), 
      percentage: (homeStats.rating / 5) * 100, 
      displayVal: `${Number(homeStats.rating).toFixed(1)} ★`,
      color: '#596673', 
      gradientId: 'ratingGrad',
      fromColor: '#596673',
      toColor: '#434c56'
    },
  ], [homeStats.students, homeStats.videos, homeStats.mentors, homeStats.rating, t]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className={`p-4 rounded-none border backdrop-blur-xl shadow-2xl z-[90] ${isDark ? 'bg-slate-950/95 border-zinc-800 text-white' : 'bg-white/95 border-slate-200 text-slate-900'}`}>
          <p className="text-xs font-semibold opacity-60 uppercase tracking-wider">{data.name}</p>
          <p className="text-2xl font-bold mt-1" style={{ color: data.color }}>{data.displayVal}</p>
        </div>
      );
    }
    return null;
  };

  const pageBg = isDark ? 'bg-platinum-950 text-platinum-100' : 'bg-platinum-50 text-platinum-950';
  const heroText = isDark ? 'text-white' : 'text-platinum-950';
  const mutedText = isDark ? 'text-platinum-400' : 'text-platinum-600';
  const hairline = isDark ? 'border-platinum-800/80' : 'border-platinum-200';
  const softSurface = isDark ? 'bg-platinum-900/50' : 'bg-platinum-100/50';
  const railSurface = isDark ? 'bg-platinum-900' : 'bg-platinum-200';
  const ctaBg = isDark ? 'bg-platinum-900/80 border-platinum-800' : 'bg-platinum-100/40 border-platinum-200';
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
    <LazyMotion features={domAnimation} strict>
    <div ref={pageRef} className={`min-h-screen w-full min-w-0 max-w-full font-sans selection:bg-platinum-500/30 ${pageBg}`}>
      <section ref={statsRef} className={`relative isolate w-full min-w-0 overflow-x-clip px-3 pt-6 sm:px-4 sm:pt-8 ${heroText}`}>
        <div className="aidevix-grid absolute inset-0 opacity-[0.12]" />
        
        {/* Multicolored cosmic glows from courses palettes */}
        <div className="absolute inset-x-0 top-0 h-[48rem] pointer-events-none z-0">
          {/* Top Left: Platinum Light glow */}
          <div className="absolute left-[5%] top-[-5%] w-[45%] h-[40rem] rounded-full blur-[140px] opacity-[0.16] bg-platinum-600 dark:opacity-[0.18]" />
          {/* Top Right: Platinum Deep glow */}
          <div className="absolute right-[5%] top-[5%] w-[45%] h-[40rem] rounded-full blur-[140px] opacity-[0.14] bg-platinum-500 dark:opacity-[0.16]" />
          {/* Center Bottom: Platinum Dark glow */}
          <div className="absolute left-[30%] top-[25%] w-[40%] h-[35rem] rounded-full blur-[120px] opacity-[0.08] bg-platinum-800 dark:opacity-[0.1]" />
        </div>
        
        {showHeroVisual && <ThreeHero isDark={isDark} />}
        <div className={`pointer-events-none absolute inset-x-0 top-24 mx-auto h-64 max-w-5xl rounded-full blur-3xl ${isDark ? 'bg-platinum-500/10' : 'bg-platinum-300/20'}`} />

        <div className="relative z-10 mx-auto grid w-full min-w-0 max-w-7xl grid-cols-1 gap-8 pb-12 pt-16 sm:gap-12 sm:pb-16 sm:pt-20 lg:grid-cols-12 xl:gap-16 xl:pb-20 items-stretch">
          {/* Left Column - Main Hero Content */}
          <div className="min-w-0 lg:col-span-7 flex flex-col justify-center">
            <div
              className={`section-kicker mb-4 inline-flex max-w-full flex-wrap items-center gap-2 border-b sm:mb-6 sm:gap-3 ${hairline} pb-3 sm:pb-4 ${mutedText}`}
            >
              <SiteLogoMark size={24} className="rounded-lg ring-platinum-500/25" />
              <span>Aidevix</span>
              <span>{t('hero.badge')}</span>
            </div>

            <h1 className="max-w-full break-words leading-[1.02] tracking-[-0.03em] sm:tracking-[-0.05em] lg:max-w-5xl text-[clamp(1.55rem,min(10vw,12vh),2.85rem)] sm:text-[clamp(2.1rem,9vw,4.25rem)] lg:text-[clamp(3.25rem,6.5vw,6rem)]">
              <span className="font-title font-extrabold tracking-tight text-white">
                {t('hero.title1')}
              </span>{' '}
              <span className="font-accent font-normal italic bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-500 bg-clip-text text-transparent drop-shadow-[0_2px_15px_rgba(99,102,241,0.25)]">
                {t('hero.titleHighlight')}
              </span>{' '}
              <span className="font-title font-extrabold text-white">
                {t('hero.title2')}
              </span>
            </h1>

            <p
              className="mt-6 max-w-2xl font-sans text-gray-400 text-lg font-light leading-relaxed sm:mt-8"
            >
              {t('hero.subtitle')}
            </p>

            <div
              className="mt-8 flex w-full min-w-0 flex-col gap-3 sm:mt-10 sm:flex-row sm:items-center sm:gap-4 relative z-10"
            >
              <Link
                href="/courses"
                onMouseEnter={playHoverSound}
                className="relative overflow-hidden inline-flex h-12 w-full min-w-0 items-center justify-center rounded-none bg-gradient-to-r from-platinum-700 to-platinum-600 hover:from-platinum-600 hover:to-platinum-500 px-5 text-sm font-semibold font-sans text-white shadow-[0_10px_25px_rgba(89,102,115,0.25)] hover:shadow-[0_15px_30px_rgba(89,102,115,0.4)] transition-all duration-300 hover:-translate-y-0.5 active:scale-95 sm:h-14 sm:w-auto sm:px-8"
              >
                <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-[shimmer_2.5s_infinite]" />
                <span className="relative z-10">{t('hero.cta1')}</span>
              </Link>
              <Link
                href="/register"
                onMouseEnter={playHoverSound}
                className={`inline-flex h-12 w-full min-w-0 items-center justify-center gap-2 rounded-none border px-5 text-sm font-medium font-sans transition-all duration-300 hover:-translate-y-0.5 active:scale-95 sm:h-14 sm:w-auto sm:px-8 ${
                  isDark 
                    ? 'border-platinum-800 bg-platinum-900/40 text-white hover:bg-white hover:text-platinum-950 hover:shadow-[0_10px_20px_rgba(255,255,255,0.05)]' 
                    : 'border-platinum-300 bg-white/80 text-platinum-900 hover:bg-platinum-950 hover:text-white hover:shadow-[0_10px_20px_rgba(0,0,0,0.05)]'
                }`}
              >
                {t('hero.cta2')} →
              </Link>
            </div>
          </div>

          {/* Right Column - Bento Learning Hub Dashboard */}
          <aside
            className="hero-rise min-w-0 w-full lg:col-span-5 self-stretch flex items-center relative"
          >
            {/* 3D Perspective & Skew Wrapper */}
            <div className="w-full h-full relative [perspective:1200px] md:[perspective:1200px] [transform-style:preserve-3d] py-6 md:py-8 flex items-center justify-center">
              
              {/* Dynamic tilted main dashboard container */}
              <div className="relative w-full h-full md:[transform:rotateY(-12deg)_rotateX(8deg)_skewY(3deg)] md:[transform-style:preserve-3d] transition-all duration-700 ease-out hover:md:[transform:rotateY(-6deg)_rotateX(4deg)_skewY(1.5deg)] grid grid-cols-1 sm:grid-cols-2 md:block gap-6">
                
                {/* Component A - Main Base Card (Backplate) */}
                <div className="col-span-1 sm:col-span-2 md:w-[94%] md:ml-auto border border-zinc-800 bg-slate-950/70 p-6 sm:p-8 backdrop-blur-xl transition-all duration-500 shadow-2xl flex flex-col justify-between rounded-none md:[transform-style:preserve-3d] relative z-10">
                  {/* Ambient dashboard background glows */}
                  <div className="absolute top-0 right-0 w-[50%] h-[50%] blur-[90px] rounded-full pointer-events-none bg-platinum-500/10" />
                  <div className="absolute bottom-0 left-0 w-[40%] h-[40%] blur-[90px] rounded-full pointer-events-none bg-platinum-400/10" />

                  <div className="relative z-10 flex flex-col h-full justify-between gap-6">
                    {/* Telemetry Header */}
                    <div className="flex items-center justify-between border-b pb-4 border-zinc-800">
                      <div className="flex items-center gap-2">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-none bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-none h-2 w-2 bg-emerald-500"></span>
                        </span>
                        <span className="text-[10px] sm:text-xs font-mono font-bold uppercase tracking-widest text-slate-400">
                          Aidevix Telemetriya
                        </span>
                      </div>
                      <div className="px-2.5 py-0.5 rounded-none text-[10px] font-mono font-bold border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 tracking-wider">
                        LIVE SYNC
                      </div>
                    </div>

                    {/* Chart Title */}
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-300">
                        {isDark ? "O'zlashtirish jadvali" : 'Weekly XP Growth'}
                      </span>
                      <span className="text-[9px] font-mono text-slate-500">
                        {isDark ? "Haftalik faollik" : 'Weekly telemetry'}
                      </span>
                    </div>

                    {/* Weekly XP Area Chart */}
                    <div className="w-full h-32 relative">
                      {isMounted ? (
                        <WeeklyXpChart data={skillGrowthData} />
                      ) : (
                        <div className="animate-pulse bg-white/5 rounded-none w-full h-full" />
                      )}
                    </div>

                    {/* Integrated Base Metrics (Mentors & Rating) */}
                    <div className="grid grid-cols-2 gap-4 border-t border-zinc-800 pt-4 mt-2">
                      {/* Mentors */}
                      <div className="flex flex-col justify-between">
                        <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-slate-500">{t('stats.mentors')}</span>
                        <div className="mt-1 flex items-baseline gap-1 text-lg font-bold tracking-tight">
                          <span className="font-mono font-bold text-white stat-value" data-value={String(homeStats.mentors || 5)} data-decimals="0">{homeStats.mentors || 5}</span>
                          <span className="font-mono text-platinum-400 text-xs">+</span>
                        </div>
                        <span className="text-[9px] font-mono text-slate-600 mt-0.5">{isDark ? 'Mutaxassislar' : 'Mentors'}</span>
                      </div>

                      {/* Rating */}
                      <div className="flex flex-col justify-between">
                        <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-slate-500">{t('stats.rating')}</span>
                        <div className="mt-1 flex items-baseline gap-1 text-lg font-bold tracking-tight text-platinum-400">
                          <span className="font-mono font-bold stat-value" data-value={String(homeStats.rating || 4.8)} data-decimals="1">{homeStats.rating || 4.8}</span>
                          <span className="font-mono text-slate-500 text-[10px]">/ 5.0</span>
                        </div>
                        <div className="text-platinum-300/80 text-[8px] font-mono tracking-widest mt-0.5">★★★★★</div>
                      </div>
                    </div>

                    {/* Live Activity Telemetry (Contribution Map style) */}
                    <div className="mt-2 border-t pt-4 border-zinc-800">
                      <div className="flex items-center justify-between text-[9px] uppercase tracking-wider font-semibold opacity-65 mb-2">
                        <span>{isDark ? 'Dars topshirish tahlili (oxirgi 24 soat)' : 'Lesson telemetry (last 24 hours)'}</span>
                        <span className="text-emerald-400">{isDark ? 'Yuqori faollik' : 'High activity'}</span>
                      </div>
                      <div className="flex gap-1 justify-between">
                        {activityTelemetryData.map((val: number, idx: number) => {
                          let bgClass = 'bg-slate-800/40';
                          if (val > 0) {
                            if (val <= 1) bgClass = 'bg-emerald-500/20';
                            else if (val <= 3) bgClass = 'bg-emerald-500/45';
                            else if (val <= 6) bgClass = 'bg-emerald-500/70';
                            else bgClass = 'bg-emerald-500';
                          }
                          
                          return (
                            <div 
                              key={idx} 
                              className={`flex-1 h-2.5 rounded-none transition-all duration-300 hover:scale-125 hover:shadow-lg ${bgClass} cursor-pointer`}
                              title={isDark ? `${val} ta faollik` : `${val} activities`}
                            />
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Component B1 - Floating Student Card */}
                <div 
                  className="col-span-1 md:absolute md:top-[12%] md:-left-10 md:z-20 md:w-56 p-4 border border-zinc-800 bg-slate-950/90 backdrop-blur-xl rounded-none shadow-[0_0_20px_rgba(99,102,241,0.12)] transition-all duration-500 cursor-pointer"
                  onMouseEnter={() => setHoveredCard('b1')}
                  onMouseLeave={() => setHoveredCard(null)}
                  style={{
                    transform: isDesktop 
                      ? (hoveredCard === 'b1' ? 'translateZ(90px) scale(1.05)' : 'translateZ(45px) scale(1)') 
                      : undefined,
                    transformStyle: 'preserve-3d',
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-slate-500">{t('stats.students')}</span>
                      <div className="mt-1 flex items-baseline gap-0.5 text-xl font-bold tracking-tight">
                        <span className="font-mono font-bold text-white stat-value" data-value={String(homeStats.students || 88)} data-decimals="0">{homeStats.students || 88}</span>
                        <span className="font-mono font-bold text-platinum-400">+</span>
                      </div>
                    </div>
                    <span className="relative flex h-2 w-2 mt-1">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-none bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-none h-2 w-2 bg-emerald-500"></span>
                    </span>
                  </div>
                  {/* Overlapping avatars stack */}
                  <div className="mt-4 flex items-center justify-between gap-1">
                    <div className="flex -space-x-1.5 overflow-hidden">
                      <Image aria-hidden="true" width={20} height={20} className="inline-block h-5 w-5 rounded-none ring-1 ring-zinc-800" src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=50&h=50&q=80" alt="" />
                      <Image aria-hidden="true" width={20} height={20} className="inline-block h-5 w-5 rounded-none ring-1 ring-zinc-800" src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=50&h=50&q=80" alt="" />
                      <Image aria-hidden="true" width={20} height={20} className="inline-block h-5 w-5 rounded-none ring-1 ring-zinc-800" src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=50&h=50&q=80" alt="" />
                    </div>
                    <span className="text-[9px] font-mono font-bold text-emerald-400">{isDark ? '124 faol' : '124 active'}</span>
                  </div>

                  {/* Dropdown Expansion */}
                  <m.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ 
                      height: hoveredCard === 'b1' ? 'auto' : 0, 
                      opacity: hoveredCard === 'b1' ? 1 : 0 
                    }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <div className="pt-3 border-t border-zinc-800/80 mt-3 text-[10px] font-mono text-zinc-400 space-y-1">
                      <div className="flex justify-between">
                        <span>Haftalik o'sish:</span>
                        <span className="text-emerald-400 font-bold">+24%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>O'rtacha faollik:</span>
                        <span className="text-white">3.2s/kun</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Tamomlaganlar:</span>
                        <span className="text-platinum-400 font-semibold">412+</span>
                      </div>
                    </div>
                  </m.div>
                </div>

                {/* Component B2 - Floating Video Lesson Card */}
                <div 
                  className="col-span-1 md:absolute md:bottom-[15%] md:-right-10 md:z-20 md:w-52 p-4 border border-zinc-800 bg-slate-950/90 backdrop-blur-xl rounded-none shadow-[0_0_20px_rgba(111,127,144,0.12)] transition-all duration-500 cursor-pointer"
                  onMouseEnter={() => setHoveredCard('b2')}
                  onMouseLeave={() => setHoveredCard(null)}
                  style={{
                    transform: isDesktop 
                      ? (hoveredCard === 'b2' ? 'translateZ(100px) scale(1.05)' : 'translateZ(55px) scale(1)') 
                      : undefined,
                    transformStyle: 'preserve-3d',
                  }}
                >
                  <div>
                    <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-slate-500">{t('stats.videos')}</span>
                    <div className="mt-1 flex items-baseline gap-0.5 text-xl font-bold tracking-tight">
                      <span className="font-mono font-bold bg-gradient-to-r from-white via-platinum-200 to-platinum-400 bg-clip-text text-transparent stat-value" data-value={String(homeStats.videos || 113)} data-decimals="0">{homeStats.videos || 113}</span>
                      <span className="font-mono font-bold bg-gradient-to-r from-white via-platinum-200 to-platinum-400 bg-clip-text text-transparent">+</span>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between text-[9px] font-mono text-slate-400 leading-none">
                    <span>{isDark ? "Video darslar" : 'Video lessons'}</span>
                    <span className="px-1.5 py-0.5 bg-platinum-500/10 border border-platinum-500/20 text-platinum-300 text-[8px]">MP4</span>
                  </div>

                  {/* Dropdown Expansion */}
                  <m.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ 
                      height: hoveredCard === 'b2' ? 'auto' : 0, 
                      opacity: hoveredCard === 'b2' ? 1 : 0 
                    }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <div className="pt-3 border-t border-zinc-800/80 mt-3 text-[10px] font-mono text-zinc-400 space-y-1">
                      <div className="flex justify-between">
                        <span>Yangi darslar:</span>
                        <span className="text-platinum-400 font-bold">+4 dars</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Umumiy vaqt:</span>
                        <span className="text-white">42 soat</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Format:</span>
                        <span className="text-zinc-300">UltraHD</span>
                      </div>
                    </div>
                  </m.div>
                </div>

                {/* Component C - Top Accent Overlay Widget */}
                <div 
                  className="col-span-1 sm:col-span-2 md:absolute md:-top-5 md:right-10 md:z-30 md:w-48 p-3 border border-zinc-800 bg-slate-950/95 backdrop-blur-xl rounded-none shadow-[0_0_25px_rgba(111,127,144,0.2)] transition-all duration-500 cursor-pointer"
                  onMouseEnter={() => setHoveredCard('c')}
                  onMouseLeave={() => setHoveredCard(null)}
                  style={{
                    transform: isDesktop 
                      ? (hoveredCard === 'c' ? 'translateZ(110px) scale(1.05)' : 'translateZ(65px) scale(1)') 
                      : undefined,
                    transformStyle: 'preserve-3d',
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div className="relative w-9 h-9 flex items-center justify-center">
                      <svg className="w-full h-full transform -rotate-90">
                        <circle cx="18" cy="18" r="14" stroke="rgba(255,255,255,0.05)" strokeWidth="3" fill="transparent" />
                        <circle cx="18" cy="18" r="14" stroke="#a9b3bc" strokeWidth="3" fill="transparent" strokeDasharray={88} strokeDashoffset={15} strokeLinecap="square" className="shadow-lg" />
                      </svg>
                      <span className="absolute text-[9px] font-mono font-bold text-white">96%</span>
                    </div>
                    <div>
                      <div className="text-[9px] font-mono font-bold tracking-widest text-zinc-400 uppercase">ATS SCORE</div>
                      <div className="text-[8px] font-mono text-emerald-400 uppercase tracking-tight flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-emerald-500 animate-pulse inline-block" /> Live Sync
                      </div>
                    </div>
                  </div>

                  {/* Dropdown Expansion */}
                  <m.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ 
                      height: hoveredCard === 'c' ? 'auto' : 0, 
                      opacity: hoveredCard === 'c' ? 1 : 0 
                    }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <div className="pt-2.5 border-t border-zinc-800/80 mt-2.5 text-[9px] font-mono text-zinc-400 space-y-1">
                      <div className="flex justify-between">
                        <span>Tizim yuklamasi:</span>
                        <span className="text-white">12%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Kechikish (Latency):</span>
                        <span className="text-emerald-400 font-bold">14ms</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Server status:</span>
                        <span className="text-emerald-400">ONLINE</span>
                      </div>
                    </div>
                  </m.div>
                </div>

              </div>
            </div>
          </aside>
        </div>
      </section>

      <AiNewsTabs
        isDark={isDark}
        mutedText={mutedText}
        t={t}
      />

      {/* Continue Learning Widget — faqat login qilgan foydalanuvchilar uchun */}
      {isLoggedIn && continueLearning && (
        <m.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="relative z-20 mx-auto mt-4 max-w-7xl px-3 sm:px-4"
        >
          <div className={`flex flex-col gap-4 rounded-none border p-4 sm:flex-row sm:items-center sm:gap-5 sm:p-6 md:p-8 ${isDark ? 'border-platinum-800 bg-platinum-900/30' : 'border-platinum-300 bg-platinum-50'}`}>
            <div className={`flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-none ${isDark ? 'bg-platinum-800/60' : 'bg-platinum-100'}`}>
              <IoSchool className="text-2xl text-platinum-300" />
            </div>
            <div className="flex-1 min-w-0">
              <div className={`text-xs uppercase tracking-widest mb-1 ${mutedText}`}>{t('home.continueTitle')}</div>
              <h3 className="font-title font-semibold text-lg truncate">{continueLearning.course?.title}</h3>
              <p className={`text-sm mt-1 ${mutedText}`}>{continueLearning.nextVideo?.title}</p>
              <div className="mt-3 flex items-center gap-3">
                <div className="flex-1 h-1.5 rounded-none bg-white/10 overflow-hidden max-w-xs">
                  <div
                    className="h-full bg-platinum-500 rounded-none"
                    style={{ width: `${continueLearning.progressPercent || 0}%` }}
                  />
                </div>
                <span className={`text-xs font-semibold ${mutedText}`}>{continueLearning.progressPercent || 0}%</span>
              </div>
            </div>
            <Link
              href={`/videos/${continueLearning.nextVideo?._id}`}
              className="flex h-12 w-full flex-shrink-0 items-center justify-center gap-2 rounded-none bg-platinum-600 px-5 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-platinum-500 sm:w-auto sm:px-6"
            >
              <IoPlay className="text-base" /> {t('home.continueAction')}
            </Link>
          </div>
        </m.section>
      )}

      {/* Personalized sections — faqat auth user uchun. isLoggedIn gate anonim
          (Google o'lchaydigan) tashrifchiga bu chunk'larni umuman yuklatmaydi. */}
      {isLoggedIn && (
        <>
          <ContinueWatching />
          <RecommendedForYou limit={8} />
        </>
      )}

      <section data-direction="left" className="reveal-section px-3 py-16 sm:px-4 sm:py-28 md:py-36">
        <div className="mx-auto grid max-w-7xl gap-12 xl:grid-cols-[0.8fr_1.2fr] xl:gap-20">
          <div className="xl:sticky xl:top-28 xl:h-fit">
            <div className={`section-kicker ${mutedText}`}>{t('home.paths')}</div>
            <h2 className="mt-4 max-w-lg text-balance font-title text-2xl font-semibold tracking-[-0.04em] text-slate-900 dark:text-slate-100 sm:mt-5 sm:text-4xl sm:tracking-[-0.05em] md:text-6xl">
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
                className={`group category-item grid gap-3 border-b px-0 py-5 transition-all duration-300 sm:gap-4 sm:py-7 md:grid-cols-[5rem_minmax(0,1fr)_auto] md:items-center md:hover:px-4 md:hover:pl-6 ${hairline} hover:bg-gradient-to-r hover:from-platinum-500/[0.04] hover:to-transparent hover:border-platinum-500/30`}
              >
                <div className={`text-xs font-semibold tracking-[0.16em] sm:text-sm sm:tracking-[0.28em] ${mutedText}`}>0{idx + 1}</div>
                <div className="min-w-0">
                  <h3 className="font-title text-xl font-semibold tracking-[-0.03em] transition-colors duration-300 text-slate-800 dark:text-slate-100 group-hover:text-platinum-400 dark:group-hover:text-platinum-300 sm:text-2xl sm:tracking-[-0.04em] md:text-3xl">
                    {category.name}
                  </h3>
                  <p className={`mt-2 max-w-xl text-sm leading-7 ${mutedText}`}>{category.subtitle}</p>
                </div>
                <div 
                  className={`flex h-14 w-14 items-center justify-center rounded-none border transition-all duration-300 ${
                    isDark 
                      ? 'border-platinum-800 bg-white/[0.02] text-slate-200' 
                      : 'border-platinum-300 bg-slate-50 text-slate-700'
                  } group-hover:border-platinum-400 group-hover:bg-platinum-500/10 group-hover:text-platinum-300 group-hover:shadow-[0_0_20px_rgba(111,127,144,0.35)]`}
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
              <h2 className="mt-3 max-w-full text-balance font-title text-2xl font-semibold tracking-[-0.04em] sm:mt-4 sm:text-4xl sm:tracking-[-0.05em] md:text-6xl">
                {t('courses.title')}
              </h2>
            </div>
            <Link href="/courses" className="inline-flex items-center gap-2 text-sm font-semibold text-platinum-600 hover:text-platinum-500 dark:text-platinum-400 dark:hover:text-platinum-300 transition-transform duration-300 hover:translate-x-1">
              {t('courses.viewAll')} <HiArrowRight />
            </Link>
          </div>
          <div className={`mt-10 grid gap-8 xl:grid-cols-[minmax(0,1fr)_22rem]`}>
            <div className="grid grid-cols-1 gap-8 md:grid-cols-2 xl:grid-cols-3">
              {initialCourses.slice(0, 6).map((course: any, index: number) => (
                <CourseCard key={course._id || index} course={course} index={index} />
              ))}
            </div>

            <div className={`rounded-none border p-6 md:p-8 ${hairline} ${railSurface}`}>
              <div className={`section-kicker ${mutedText}`}>{t('home.freshVideos')}</div>
              <h3 className="font-title mt-4 text-2xl font-semibold tracking-[-0.04em]">
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



<section data-direction="up" className="py-20 reveal-section">
        <StartNow />
      </section>




    </div>
    </LazyMotion>
  );
}
