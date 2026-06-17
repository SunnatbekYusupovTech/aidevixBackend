'use client';

import React, { useRef, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay } from 'swiper/modules';
import { Swiper as SwiperType } from 'swiper';
import { IoArrowForward } from 'react-icons/io5';
import 'swiper/css';

export type AiNewsItem = {
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

interface Props {
  aiNews: AiNewsItem[];
  isDark: boolean;
  mutedText: string;
  t: (key: string) => string;
  playHoverSound: () => void;
  trackNewsClick: (id?: string) => void;
  getNewsHref: (item?: AiNewsItem) => string;
  enableNewsImages: boolean;
}

export default function AiNewsSwiper({
  aiNews,
  isDark,
  mutedText,
  t,
  playHoverSound,
  trackNewsClick,
  getNewsHref,
  enableNewsImages,
}: Props) {
  const swiperRef = useRef<SwiperType | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  if (!aiNews || aiNews.length === 0) return null;

  return (
    <div className="relative mt-6 w-full">
      <Swiper
        onBeforeInit={(swiper) => {
          swiperRef.current = swiper;
        }}
        onSlideChange={(swiper) => {
          setActiveIndex(swiper.activeIndex );
        }}
        modules={[Autoplay]}
        slidesPerView={1}
        spaceBetween={20}
        grabCursor={true}
        autoplay={{
          delay: 6000,
          disableOnInteraction: true,
          pauseOnMouseEnter: true,
        }}
        className="w-full"
      >
        {aiNews.map((item, index) => {
          const itemHref = getNewsHref(item);
          return (
            <SwiperSlide key={item._id || index}>
              <Link
                href={itemHref}
                target="_blank"
                rel="noopener noreferrer"
                onMouseEnter={playHoverSound}
                onClick={() => trackNewsClick(item._id)}
                className={`relative block overflow-hidden rounded-2xl border p-4 sm:rounded-3xl sm:p-5 transition-all duration-300 hover:-translate-y-0.5 cursor-pointer min-h-[16rem] ${
                  isDark
                    ? 'border-white/10 bg-slate-950/40 shadow-slate-950/50 shadow-2xl hover:border-amber-earth-500/30'
                    : 'border-slate-200/80 bg-white/70 shadow-slate-200/20 shadow-xl hover:border-amber-earth-500/40'
                }`}
              >
                {/* Background Image if enabled */}
                <div
                  className="absolute inset-0 bg-cover bg-center transition-opacity duration-700"
                  style={{
                    backgroundImage: enableNewsImages && item.imageUrl
                      ? `url("${item.imageUrl}")`
                      : 'none',
                    opacity: enableNewsImages && item.imageUrl ? 0.08 : 0,
                  }}
                />
                {/* Gradient overlay */}
                <div
                  className={`absolute inset-0 transition-all duration-300 ${
                    isDark
                      ? 'bg-gradient-to-r from-slate-950/90 via-slate-950/70 to-slate-950/80'
                      : 'bg-gradient-to-r from-white/95 via-white/80 to-white/90'
                  }`}
                />

                <div className="relative z-10 flex flex-col justify-between h-full min-h-[13.5rem]">
                  {/* Card Header: Badge & Slide Indicator */}
                  <div className="flex items-center justify-between gap-3">
                    <div
                      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${
                        isDark
                          ? 'border-amber-earth-500/30 text-amber-earth-200 bg-amber-earth-500/5'
                          : 'border-amber-earth-300 text-amber-earth-700 bg-amber-earth-50/50'
                      }`}
                    >
                      {t('home.newsBadge')} · {item.platform === 'instagram' ? 'Instagram' : 'Telegram'}
                    </div>
                    <div className={`text-xs font-mono font-medium ${mutedText}`}>
                      {index + 1}/{aiNews.length}
                    </div>
                  </div>

                  {/* Card Content: Title & Summary */}
                  <div className="mt-4 flex-1">
                    <h3 className="text-sm font-extrabold leading-6 sm:text-base font-title text-slate-900 dark:text-white">
                      {item.title}
                    </h3>
                    <p
                      className={`mt-2 text-xs leading-6 sm:text-sm font-sans ${
                        isDark ? 'text-slate-200/90' : 'text-slate-600'
                      }`}
                    >
                      {item.summary}
                    </p>
                  </div>

                  {/* Card CTA & Interactive Elements */}
                  <div className="mt-4 flex items-center justify-between border-t pt-3 border-slate-200/50 dark:border-white/5">
                    {/* CTA link */}
                    <div className="flex items-center gap-2 text-sm font-semibold text-amber-earth-500 font-sans">
                      <span>{item.cta}</span>
                      <IoArrowForward className="text-base" />
                    </div>

                    {/* Navigation buttons */}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          swiperRef.current?.slidePrev();
                        }}
                        className={`h-8 w-8 rounded-full border text-sm font-bold font-sans flex items-center justify-center transition-all ${
                          isDark
                            ? 'border-white/15 bg-white/5 text-slate-200 hover:bg-white/10'
                            : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
                        }`}
                        aria-label={t('home.newsPrevAria')}
                      >
                        ‹
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          swiperRef.current?.slideNext();
                        }}
                        className={`h-8 w-8 rounded-full border text-sm font-bold font-sans flex items-center justify-center transition-all ${
                          isDark
                            ? 'border-white/15 bg-white/5 text-slate-200 hover:bg-white/10'
                            : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
                        }`}
                        aria-label={t('home.newsNextAria')}
                      >
                        ›
                      </button>
                    </div>
                  </div>

                  {/* Dates / Timestamps if available */}
                  {(item.startsAt || item.endsAt) && (
                    <div
                      className={`mt-2 text-[11px] font-sans ${
                        isDark ? 'text-amber-earth-200/80' : 'text-amber-earth-700/80'
                      }`}
                    >
                      {item.startsAt
                        ? `${t('home.newsStartLabel')}: ${new Date(item.startsAt).toLocaleString()}`
                        : ''}
                      {item.startsAt && item.endsAt ? ' · ' : ''}
                      {item.endsAt
                        ? `${t('home.newsEndLabel')}: ${new Date(item.endsAt).toLocaleString()}`
                        : ''}
                    </div>
                  )}

                  {/* Auto-sliding progress indicator */}
                  <div
                    className={`mt-3 h-1 w-full overflow-hidden rounded-full ${
                      isDark ? 'bg-white/10' : 'bg-slate-300/40'
                    }`}
                  >
                    {index === activeIndex ? (
                      <motion.div
                        key={`news-progress-${activeIndex}`}
                        initial={{ width: '0%' }}
                        animate={{ width: '100%' }}
                        transition={{ duration: 6, ease: 'linear' }}
                        className="h-full rounded-full bg-amber-earth-500"
                      />
                    ) : (
                      <div className="h-full w-0 bg-amber-earth-500" />
                    )}
                  </div>
                </div>
              </Link>
            </SwiperSlide>
          );
        })}
      </Swiper>

      {/* Swipe helper/hint text */}
      <div className={`mt-2.5 flex items-center justify-center text-[11px] font-sans ${mutedText}`}>
        <span>{t('home.newsSwipeHint')}</span>
      </div>
    </div>
  );
}
