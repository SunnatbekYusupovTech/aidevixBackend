'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { IoPlayCircle, IoTimeOutline } from 'react-icons/io5';
import { userApi } from '@/api/userApi';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/hooks/useAuth';

type ContinueData = {
  course: { _id: string; title: string; thumbnail?: string; category?: string };
  nextVideo: { _id: string; title: string; duration?: number; thumbnail?: string };
  progressPercent: number;
  watchedCount: number;
};

const formatDuration = (s = 0) => {
  if (!s) return '';
  const m = Math.floor(s / 60);
  const sec = Math.round(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
};

export default function ContinueWatching() {
  const { isLoggedIn } = useAuth();
  const { isDark } = useTheme();
  const [data, setData] = useState<ContinueData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isLoggedIn) return;
    let active = true;
    setLoading(true);
    userApi
      .getContinueLearning()
      .then((res: any) => {
        if (active) setData(res.data?.data || null);
      })
      .catch(() => {
        if (active) setData(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [isLoggedIn]);

  if (!isLoggedIn || loading || !data || !data.course || !data.nextVideo) return null;

  const { course, nextVideo, progressPercent } = data;

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto max-w-7xl px-4 py-8"
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className={`text-lg sm:text-xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
          🎬 O'qishni davom ettiring
        </h2>
        <Link
          href="/profile"
          className="text-xs font-bold text-indigo-400 hover:text-indigo-300 uppercase tracking-wider"
        >
          Barchasi →
        </Link>
      </div>

      <Link
        href={`/videos/${nextVideo._id}`}
        className={`group block rounded-3xl overflow-hidden border transition-all hover:-translate-y-0.5 ${
          isDark
            ? 'bg-gradient-to-r from-indigo-500/10 via-[#0d1224]/80 to-cyan-500/5 border-white/5 hover:border-indigo-400/40'
            : 'bg-gradient-to-r from-indigo-50 via-white to-cyan-50 border-slate-200 hover:border-indigo-400/60'
        }`}
      >
        <div className="flex flex-col sm:flex-row">
          <div className="relative w-full sm:w-72 h-48 sm:h-44 flex-shrink-0 bg-slate-900">
            {(nextVideo.thumbnail || course.thumbnail) ? (
              <Image
                src={(nextVideo.thumbnail || course.thumbnail) as string}
                alt={nextVideo.title}
                fill
                sizes="(max-width: 640px) 100vw, 288px"
                className="object-cover group-hover:scale-105 transition-transform duration-500"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-4xl text-indigo-400/40">📚</div>
            )}
            <div className="absolute inset-0 bg-gradient-to-tr from-black/60 to-transparent" />
            <div className="absolute inset-0 flex items-center justify-center">
              <IoPlayCircle className="text-white/90 text-5xl drop-shadow-lg group-hover:scale-110 transition-transform" />
            </div>
            {nextVideo.duration ? (
              <div className="absolute bottom-2 right-2 bg-black/80 px-2 py-0.5 rounded-md text-[10px] font-bold text-white flex items-center gap-1">
                <IoTimeOutline />
                {formatDuration(nextVideo.duration)}
              </div>
            ) : null}
          </div>

          <div className="flex-1 p-5 sm:p-6">
            <div className="text-[10px] font-bold uppercase tracking-widest text-indigo-400 mb-2">
              {course.category || 'KURS'}
            </div>
            <h3 className={`text-base sm:text-lg font-black mb-1 line-clamp-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {course.title}
            </h3>
            <p className={`text-sm line-clamp-2 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
              ⏭️ {nextVideo.title}
            </p>

            <div className="mt-4">
              <div className="flex justify-between text-[11px] font-bold mb-1">
                <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Progress</span>
                <span className="text-indigo-400">{progressPercent}%</span>
              </div>
              <div className={`h-2 rounded-full overflow-hidden ${isDark ? 'bg-white/5' : 'bg-slate-200'}`}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.max(progressPercent, 4)}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  className="h-full bg-gradient-to-r from-indigo-500 via-cyan-400 to-emerald-400"
                />
              </div>
            </div>
          </div>
        </div>
      </Link>
    </motion.section>
  );
}
