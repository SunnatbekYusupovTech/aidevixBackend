'use client';

/**
 * Telegram Mini App bridge — Telegram WebApp ichida ochilganda:
 *   1. Telegram WebApp SDK ni yuklaydi (telegram-web-app.js)
 *   2. `initData` ni backend'ga yuborib auto-login qiladi
 *   3. Viewport va tema'ni Telegram'ga moslashtiradi (CSS variables)
 *
 * Aniqlash usuli: `window.Telegram?.WebApp` ob'ekti mavjudligi.
 * Auth holatini Redux orqali tekshiramiz (allaqachon login bo'lgan user'ga qayta tegmaslik).
 */

import { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { selectIsLoggedIn, checkAuthStatus } from '@/store/slices/authSlice';
import { authApi } from '@/api/authApi';

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        initData: string;
        initDataUnsafe?: { user?: { id: number; username?: string; first_name?: string } };
        ready: () => void;
        expand: () => void;
        themeParams?: Record<string, string>;
        colorScheme?: 'light' | 'dark';
        platform?: string;
        version?: string;
        isExpanded?: boolean;
      };
    };
  }
}

const SDK_SRC = 'https://telegram.org/js/telegram-web-app.js?56';

function loadTelegramSdk(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') return resolve();
    if (window.Telegram?.WebApp) return resolve();
    // Faqat Telegram useragent bo'lsa yuklaymiz (bekorga skript yuklamaslik)
    const isTg =
      navigator.userAgent.includes('Telegram') ||
      window.location.search.includes('tgWebAppData');
    if (!isTg) return resolve();

    const existing = document.querySelector(`script[src="${SDK_SRC}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => resolve(), { once: true });
      return;
    }
    const s = document.createElement('script');
    s.src = SDK_SRC;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => resolve();
    document.head.appendChild(s);
  });
}

export default function TelegramMiniAppBridge() {
  const dispatch = useDispatch<any>();
  const isLoggedIn = useSelector(selectIsLoggedIn);
  const triedRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (triedRef.current) return;

    let cancelled = false;

    (async () => {
      await loadTelegramSdk();
      const wa = window.Telegram?.WebApp;
      if (cancelled || !wa || !wa.initData) return;

      // Telegram'ga "ready" signali — splash o'chadi
      try {
        wa.ready();
        wa.expand?.();
      } catch (_) {}

      // Tema'ni body'ga uzatish
      if (wa.themeParams) {
        const t = wa.themeParams;
        const root = document.documentElement;
        if (t.bg_color) root.style.setProperty('--tg-bg-color', t.bg_color);
        if (t.text_color) root.style.setProperty('--tg-text-color', t.text_color);
        if (t.button_color) root.style.setProperty('--tg-button-color', t.button_color);
      }
      document.documentElement.dataset.tgPlatform = wa.platform || 'unknown';

      // Allaqachon login — qayta urinmaymiz
      if (isLoggedIn || triedRef.current) return;
      triedRef.current = true;

      try {
        await authApi.telegramMiniAppAuth({ initData: wa.initData });
        await dispatch(checkAuthStatus());
      } catch (err) {
        // Sokin xato — user oddiy login ekraniga tushadi
        if (process.env.NODE_ENV !== 'production') {
          console.warn('[TMA] auto-login failed', err);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [dispatch, isLoggedIn]);

  return null;
}
