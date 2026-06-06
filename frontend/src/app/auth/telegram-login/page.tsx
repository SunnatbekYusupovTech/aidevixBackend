'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import SiteLogoMark from '@components/common/SiteLogoMark';
import { authApi } from '@api/authApi';

function TelegramLoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Tizimga kirilmoqda...');

  useEffect(() => {
    const code = searchParams.get('code');

    if (!code) {
      setStatus('error');
      setMessage('Kod topilmadi. Iltimos, botdan qayta /login buyrug\'ini yuboring.');
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        // Opaque kodni backendga yuboramiz — backend HttpOnly cookie sessiya o'rnatadi (CLAUDE.md).
        const { data } = await authApi.telegramMagicLogin(code);
        if (cancelled) return;
        if (data?.requires2FA) {
          setStatus('success');
          setMessage('2FA talab qilinadi. Yo\'naltirilmoqda...');
          setTimeout(() => router.replace('/login'), 1000);
          return;
        }
        setStatus('success');
        setMessage('Muvaffaqiyatli! Profilga yo\'naltirilmoqda...');
        setTimeout(() => router.replace('/profile'), 1000);
      } catch {
        if (cancelled) return;
        setStatus('error');
        setMessage('Kod yaroqsiz yoki muddati o\'tgan. Botdan qayta /login yuboring.');
      }
    })();
    return () => { cancelled = true; };
  }, [searchParams, router]);

  return (
    <div className="max-w-md w-full text-center space-y-8">
      <SiteLogoMark
        size={80}
        className="mx-auto rounded-2xl shadow-2xl shadow-blue-600/30 ring-blue-500/30"
      />

      {/* Status Card */}
      <div className="bg-[#0d1224]/60 border border-white/5 rounded-2xl p-8 space-y-6 backdrop-blur-sm">
        <h1 className="text-2xl font-bold text-white">Telegram orqali kirish</h1>

        {status === 'loading' && (
          <div className="space-y-4">
            <div className="w-12 h-12 mx-auto border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
            <p className="text-zinc-400 animate-pulse">{message}</p>
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-4">
            <div className="w-16 h-16 mx-auto bg-emerald-500/10 border border-emerald-500/30 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-emerald-400 font-semibold">{message}</p>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-4">
            <div className="w-16 h-16 mx-auto bg-red-500/10 border border-red-500/30 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <p className="text-red-400 font-medium">{message}</p>
            <a
              href="https://t.me/aidevix_bot"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all"
            >
              📱 Botga o&apos;tish
            </a>
          </div>
        )}
      </div>

      <p className="text-xs text-zinc-600">
        Aidevix IT-Ta&apos;lim Platformasi © {new Date().getFullYear()}
      </p>
    </div>
  );
}

export default function TelegramLoginPage() {
  return (
    <div className="min-h-screen bg-[#0A0E1A] flex items-center justify-center p-4">
      <Suspense
        fallback={
          <div className="text-center space-y-4">
            <div className="w-12 h-12 mx-auto border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
            <p className="text-zinc-400">Yuklanmoqda...</p>
          </div>
        }
      >
        <TelegramLoginContent />
      </Suspense>
    </div>
  );
}
