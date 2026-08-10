'use client';

import { useRef } from 'react';
import HLS from 'hls.js';
import {
  MediaPlayer,
  MediaProvider,
  Poster,
  isHLSProvider,
  type MediaCanPlayDetail,
  type MediaPlayerInstance,
  type MediaProviderAdapter,
  type MediaTimeUpdateEventDetail,
} from '@vidstack/react';
import {
  DefaultVideoLayout,
  defaultLayoutIcons,
} from '@vidstack/react/player/layouts/default';

import '@vidstack/react/player/styles/default/theme.css';
import '@vidstack/react/player/styles/default/layouts/video.css';

export interface LessonPlayerProps {
  hlsUrl: string;
  poster?: string;
  /** Qaysi soniyadan davom etish kerak. 0 — boshidan. */
  startAt: number;
  /** Faqat o'ynayotganda va seek qilinmayotganda chaqiriladi. Throttle — chaqiruvchining ishi. */
  onPosition: (seconds: number) => void;
  onError: () => void;
  /** Resume seek haqiqatan sodir bo'lgandan keyin bir marta. */
  onResume?: (seconds: number) => void;
}

/** Bundan kichik pozitsiya "davom etish" emas, shovqin. */
const MIN_RESUME_SECONDS = 5;
/** Oxirgi bo'lakka qaytarilmaydi — dars amalda tugagan. */
const END_GUARD_SECONDS = 15;

export default function LessonPlayer({
  hlsUrl,
  poster,
  startAt,
  onPosition,
  onError,
  onResume,
}: LessonPlayerProps) {
  const playerRef = useRef<MediaPlayerInstance>(null);

  // Oxirgi marta qaysi `hlsUrl` uchun resume qilinganini saqlaydi. Shu
  // qiymat joriy `hlsUrl`ga teng bo'lmaguncha resume "hali qilinmagan"
  // hisoblanadi — token yangilanib `hlsUrl` almashganda ham, bitta manba
  // ichida qayta `can-play` kelganda ham to'g'ri ishlaydi.
  const resumedForRef = useRef<string | null>(null);

  const handleProviderChange = (provider: MediaProviderAdapter | null) => {
    if (isHLSProvider(provider)) {
      // Bundle qilingan hls.js. Aks holda Vidstack uni runtime'da CDN'dan yuklaydi,
      // ya'ni pullik darsning o'ynashi uchinchi tomonga bog'lanadi.
      provider.library = HLS;
    }
  };

  const handleCanPlay = (detail: MediaCanPlayDetail) => {
    if (resumedForRef.current === hlsUrl) return;
    resumedForRef.current = hlsUrl;

    const player = playerRef.current;
    if (!player) return;
    if (startAt <= MIN_RESUME_SECONDS) return;

    // Migratsiyadan oldingi `watchedSeconds` yozuvlari kumulyativ shartnoma ostida
    // yozilgan (10+20+30+…), ya'ni deyarli har doim darsdan uzunroq. Shu shart
    // ularni jimgina rad etadi — alohida migratsiya kerak emas.
    const { duration } = detail;
    if (!(duration > 0) || startAt >= duration - END_GUARD_SECONDS) return;

    player.currentTime = startAt;
    onResume?.(startAt);
  };

  const handleTimeUpdate = (detail: MediaTimeUpdateEventDetail) => {
    const player = playerRef.current;
    if (!player || player.state.paused || player.state.seeking) return;
    onPosition(detail.currentTime);
  };

  return (
    <MediaPlayer
      ref={playerRef}
      className="absolute inset-0 h-full w-full"
      src={{ src: hlsUrl, type: 'application/x-mpegurl' }}
      playsInline
      onProviderChange={handleProviderChange}
      onCanPlay={handleCanPlay}
      onTimeUpdate={handleTimeUpdate}
      onError={() => onError()}
    >
      <MediaProvider>
        {poster ? <Poster className="vds-poster" src={poster} alt="" /> : null}
      </MediaProvider>
      <DefaultVideoLayout icons={defaultLayoutIcons} />
    </MediaPlayer>
  );
}
