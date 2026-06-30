'use client';

import React, { useEffect } from 'react';

/**
 * Root error boundary. Catches errors thrown in the root layout itself.
 *
 * Important: this component REPLACES the root layout, so neither the
 * LangProvider context nor the global Tailwind stylesheet are guaranteed to be
 * available here. Everything is therefore self-contained — its own <html>/<body>
 * and inline styles — so it renders even when the rest of the app failed to boot.
 */

type Lang = 'uz' | 'ru' | 'en';

const COPY: Record<Lang, { title: string; desc: string; retry: string; brand: string }> = {
  uz: {
    title: 'Tizimda jiddiy xatolik',
    desc: "Ilovani yuklab bo'lmadi. Sahifani qaytadan yuklang yoki keyinroq urinib ko'ring.",
    retry: 'Sahifani qayta yuklash',
    brand: 'Aidevix Professional Learning Platform',
  },
  ru: {
    title: 'Серьёзная ошибка системы',
    desc: 'Не удалось загрузить приложение. Перезагрузите страницу или попробуйте позже.',
    retry: 'Перезагрузить страницу',
    brand: 'Aidevix — профессиональная платформа обучения',
  },
  en: {
    title: 'A critical error occurred',
    desc: 'The application could not load. Reload the page or try again later.',
    retry: 'Reload page',
    brand: 'Aidevix Professional Learning Platform',
  },
};

const readLang = (): Lang => {
  if (typeof window === 'undefined') return 'uz';
  const saved = window.localStorage.getItem('aidevix_lang');
  return saved === 'ru' || saved === 'en' ? saved : 'uz';
};

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[GlobalErrorBoundary]', error);
  }, [error]);

  const c = COPY[readLang()];

  return (
    <html lang="uz">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem',
          background: '#03071e',
          color: '#fff',
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
          textAlign: 'center',
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: '32rem',
            borderRadius: '2rem',
            border: '1px solid rgba(255,255,255,0.06)',
            background: 'rgba(2,6,23,0.55)',
            padding: '2.5rem 2rem',
            boxShadow: '0 25px 60px rgba(0,0,0,0.8)',
          }}
        >
          <div
            aria-hidden
            style={{
              width: '64px',
              height: '64px',
              margin: '0 auto 1.5rem',
              borderRadius: '1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '2rem',
              background: 'linear-gradient(135deg, #efa243, #eb8a14)',
              boxShadow: '0 10px 30px rgba(235,138,20,0.3)',
            }}
          >
            ⚠️
          </div>

          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, margin: '0 0 0.75rem' }}>
            {c.title}
          </h1>
          <p
            style={{
              color: '#94a3b8',
              fontSize: '0.95rem',
              lineHeight: 1.6,
              margin: '0 auto 0.5rem',
              maxWidth: '24rem',
            }}
          >
            {c.desc}
          </p>

          {error?.digest && (
            <p
              style={{
                marginTop: '0.75rem',
                fontSize: '0.7rem',
                fontFamily: 'ui-monospace, monospace',
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                color: '#475569',
              }}
            >
              {error.digest}
            </p>
          )}

          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: '2rem',
              height: '3.25rem',
              padding: '0 2rem',
              border: 'none',
              borderRadius: '9999px',
              background: 'linear-gradient(90deg, #efa243, #eb8a14)',
              color: '#fff',
              fontSize: '1rem',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 4px 20px rgba(235,138,20,0.3)',
            }}
          >
            {c.retry}
          </button>

          <div
            style={{
              marginTop: '2rem',
              borderTop: '1px solid rgba(255,255,255,0.06)',
              paddingTop: '1.5rem',
              opacity: 0.4,
            }}
          >
            <p
              style={{
                fontSize: '0.625rem',
                fontWeight: 900,
                textTransform: 'uppercase',
                letterSpacing: '0.25em',
                color: '#94a3b8',
                margin: 0,
              }}
            >
              {c.brand}
            </p>
          </div>
        </div>
      </body>
    </html>
  );
}
