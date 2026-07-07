'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  IoNewspaperOutline, IoSearch, IoOpenOutline,
  IoSparkles, IoLogoInstagram,
} from 'react-icons/io5';
import { FaTelegramPlane } from 'react-icons/fa';
import { useTheme } from '@/context/ThemeContext';
import { useLang } from '@/context/LangContext';
import { API_BASE_URL } from '@/utils/constants';

type NewsItem = {
  _id: string;
  title: string;
  summary: string;
  imageUrl?: string | null;
  platform: 'telegram' | 'instagram';
  href: string;
  cta?: string;
  createdAt: string;
};

const formatDate = (iso: string) => {
  try {
    return new Date(iso).toLocaleDateString('uz-UZ', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
};

const PlatformBadge = ({ platform }: { platform: NewsItem['platform'] }) => {
  if (platform === 'instagram') {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-pink-500/10 text-pink-400 border border-pink-500/20">
        <IoLogoInstagram /> Instagram
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-sky-500/10 text-sky-400 border border-sky-500/20">
      <FaTelegramPlane /> Telegram
    </span>
  );
};

export default function BlogClient({ initialNews }: { initialNews: NewsItem[] }) {
  const { isDark } = useTheme();
  const { t } = useLang();
  const [news] = useState<NewsItem[]>(initialNews);
  const [search, setSearch] = useState('');
  const [platform, setPlatform] = useState<'all' | 'telegram' | 'instagram'>('all');

  const filtered = useMemo(() => {
    return news.filter((n) => {
      if (platform !== 'all' && n.platform !== platform) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return n.title.toLowerCase().includes(q) || n.summary.toLowerCase().includes(q);
    });
  }, [news, search, platform]);

  const handleClick = async (item: NewsItem) => {
    try {
      await fetch(`${API_BASE_URL}public/ai-news/${item._id}/click`, {
        method: 'POST',
        keepalive: true,
      });
    } catch {}
  };

  const bgClass = isDark ? 'bg-[#0A0E1A] text-white' : 'bg-slate-50 text-slate-900';
  const cardBg = isDark ? 'bg-[#111726]/70 border-white/5' : 'bg-white border-slate-200';
  const muted = isDark ? 'text-slate-400' : 'text-slate-600';

  return (
    <div className={`min-h-screen pt-24 pb-20 ${bgClass}`}>
      <div className="mx-auto max-w-7xl px-4">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10 max-w-2xl mx-auto"
        >
          <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-indigo-400 mb-3">
            {t('blog.kicker')}
          </div>
          <h1 className="font-display text-3xl sm:text-5xl font-black tracking-[-0.04em] mb-4 flex items-center justify-center gap-3">
            <IoSparkles className="text-indigo-400" /> {t('blog.title')}
          </h1>
          <p className={`text-sm sm:text-base ${muted}`}>{t('blog.subtitle')}</p>
        </motion.div>

        {/* Filter bar */}
        <div className={`flex flex-col sm:flex-row gap-3 mb-8 p-2 rounded-2xl border ${cardBg}`}>
          <div className="flex-1 flex items-center gap-2 px-3">
            <IoSearch className="text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value.slice(0, 80))}
              placeholder={t('blog.search')}
              className={`flex-1 bg-transparent outline-none text-sm py-2 ${
                isDark ? 'placeholder:text-slate-500' : 'placeholder:text-slate-400'
              }`}
            />
          </div>
          <div className="flex gap-1 p-1 rounded-xl bg-black/10 dark:bg-white/5">
            {(['all', 'telegram', 'instagram'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPlatform(p)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-colors ${
                  platform === p
                    ? 'bg-indigo-500 text-white'
                    : muted + ' hover:bg-white/10'
                }`}
              >
                {p === 'all' ? t('blog.filter.all') : p}
              </button>
            ))}
          </div>
        </div>

        {/* Empty state */}
        {filtered.length === 0 && (
          <div className={`rounded-3xl border p-12 text-center ${cardBg}`}>
            <IoNewspaperOutline className="text-5xl mx-auto text-slate-500 mb-3" />
            <h3 className="font-bold text-lg mb-1">
              {news.length === 0 ? t('blog.empty.title') : t('blog.empty.search')}
            </h3>
            <p className={`text-sm ${muted}`}>
              {news.length === 0 ? t('blog.empty.text') : t('blog.empty.changeFilter')}
            </p>
            {news.length === 0 && (
              <Link
                href="https://t.me/aidevix"
                target="_blank"
                className="inline-flex items-center gap-2 mt-4 px-5 py-2.5 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 font-bold text-sm hover:bg-sky-500/20"
              >
                <FaTelegramPlane /> {t('blog.tg.cta')}
              </Link>
            )}
          </div>
        )}

        {/* Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((item, i) => (
            <motion.a
              key={item._id}
              href={item.href}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => handleClick(item)}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className={`group rounded-3xl border overflow-hidden flex flex-col hover:-translate-y-1 transition-all hover:shadow-xl hover:shadow-indigo-500/10 ${cardBg}`}
            >
              {item.imageUrl ? (
                <div className="relative aspect-[16/9] bg-slate-900 overflow-hidden">
                  <Image
                    src={item.imageUrl}
                    alt={item.title}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                  <div className="absolute top-3 left-3">
                    <PlatformBadge platform={item.platform} />
                  </div>
                </div>
              ) : (
                <div className="relative aspect-[16/9] bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-pink-500/10 flex items-center justify-center">
                  <IoSparkles className="text-5xl text-indigo-400/40" />
                  <div className="absolute top-3 left-3">
                    <PlatformBadge platform={item.platform} />
                  </div>
                </div>
              )}

              <div className="p-5 flex-1 flex flex-col">
                <div className={`text-[10px] font-bold uppercase tracking-widest mb-2 ${muted}`}>
                  {formatDate(item.createdAt)}
                </div>
                <h2 className="font-bold text-base sm:text-lg mb-2 line-clamp-2 group-hover:text-indigo-400 transition-colors">
                  {item.title}
                </h2>
                <p className={`text-sm leading-relaxed line-clamp-3 mb-4 flex-1 ${muted}`}>
                  {item.summary}
                </p>
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-indigo-400 inline-flex items-center gap-1">
                    {item.cta || t('blog.cta.view')} <IoOpenOutline />
                  </span>
                </div>
              </div>
            </motion.a>
          ))}
        </div>

        {/* CTA */}
        <div className={`mt-16 rounded-3xl border p-8 sm:p-10 text-center ${cardBg}`}>
          <h3 className="font-display text-xl sm:text-2xl font-black mb-2">
            {t('blog.cta.title')}
          </h3>
          <p className={`text-sm mb-5 max-w-md mx-auto ${muted}`}>
            {t('blog.cta.subtitle')}
          </p>
          <Link
            href="https://t.me/aidevix"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-sky-500 to-blue-500 text-white font-bold text-sm hover:shadow-lg hover:shadow-sky-500/30 transition-shadow"
          >
            <FaTelegramPlane /> {t('blog.cta.subscribe')}
          </Link>
        </div>
      </div>
    </div>
  );
}
