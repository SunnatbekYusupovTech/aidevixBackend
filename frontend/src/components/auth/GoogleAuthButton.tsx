'use client';

import { useGoogleLogin } from '@react-oauth/google';
import { useDispatch } from 'react-redux';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import clsx from 'clsx';
import { googleAuth, clearError } from '@store/slices/authSlice';
import { useTheme } from '@/context/ThemeContext';
import { useLang } from '@/context/LangContext';
import { FcGoogle } from 'react-icons/fc';
import { FiShield, FiLoader } from 'react-icons/fi';
import { useState } from 'react';

interface Props {
  mode?: 'login' | 'register';
  className?: string;
}

export default function GoogleAuthButton({ mode = 'login', className }: Props) {
  const dispatch = useDispatch();
  const router = useRouter();
  const { isDark } = useTheme();
  const { t } = useLang();
  const [loading, setLoading] = useState(false);

  const isRegister = mode === 'register';
  const hint = isRegister ? t('auth.oauth.hintRegister') : t('auth.oauth.hintLogin');

  const handleSuccess = async (accessToken: string) => {
    setLoading(true);
    try {
      dispatch(clearError());
      const result = await (dispatch as any)(googleAuth({ accessToken }));
      if (result && googleAuth.fulfilled.match(result)) {
        const payload: any = result?.payload;
        if (payload?.requires2FA) {
          router.push('/auth/2fa-verify');
          return;
        }
        if (payload?.requiresEmailVerification) {
          const email = encodeURIComponent(payload.email || '');
          router.push(`/auth/verify-email?email=${email}`);
          return;
        }
        toast.success(
          isRegister
            ? "Google orqali ro'yxatdan o'tdingiz!"
            : 'Google orqali muvaffaqiyatli kirdingiz!',
        );
        router.push('/');
      }
    } finally {
      setLoading(false);
    }
  };

  // useGoogleLogin — popup ni asosiy oynadan ochadi (iframe emas).
  // Bu window.opener null bo'lishini oldini oladi.
  //
  // `scope` MAJBURIY: implicit flow access token faqat so'ralgan scope'larga ruxsat oladi.
  // Backend `https://www.googleapis.com/oauth2/v3/userinfo` dan email/profil o'qiydi —
  // bu uchun `openid email profile` scope kerak. Aks holda userinfo 401 qaytaradi va
  // backend "Google access token tekshirilmadi" (401) bilan rad etadi.
  const login = useGoogleLogin({
    onSuccess: (tokenResponse) => {
      void handleSuccess(tokenResponse.access_token);
    },
    onError: () => {
      setLoading(false);
      toast.error('Google orqali amalga oshmadi');
    },
    flow: 'implicit',
    scope: 'openid email profile',
  });

  const handleClick = () => {
    if (loading) return;
    login();
  };

  return (
    <div className={clsx('w-full', className)}>
      <div
        className={clsx(
          'relative overflow-hidden rounded-2xl p-[1px] transition duration-300',
          'hover:scale-[1.01] active:scale-[0.99]',
          isDark
            ? 'bg-gradient-to-br from-indigo-500/40 via-slate-500/25 to-amber-400/25 shadow-[0_20px_50px_rgba(0,0,0,0.45)] hover:shadow-[0_24px_60px_rgba(79,70,229,0.12)]'
            : 'bg-gradient-to-br from-slate-200 via-white to-indigo-100/80 shadow-lg shadow-slate-300/40 hover:shadow-xl hover:shadow-indigo-200/30',
        )}
      >
        <div
          className={clsx(
            'rounded-[15px] px-3 py-3 sm:px-4 sm:py-4',
            isDark ? 'bg-[#080b12]/[0.97]' : 'bg-white',
            'ring-1 ring-inset',
            isDark ? 'ring-white/[0.06]' : 'ring-slate-200/80',
          )}
        >
          <div className="mb-3 flex items-center justify-between gap-2.5 sm:mb-3.5">
            <div className="flex min-w-0 flex-1 items-center gap-2.5">
              <span
                className={clsx(
                  'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
                  isDark
                    ? 'bg-white/[0.06] ring-1 ring-white/10'
                    : 'bg-slate-50 ring-1 ring-slate-200/80',
                )}
              >
                <FcGoogle className="text-[26px]" aria-hidden />
              </span>
              <div className="min-w-0 text-left">
                <p
                  className={clsx(
                    'text-[10px] font-bold uppercase tracking-[0.2em]',
                    isDark ? 'text-indigo-300/90' : 'text-indigo-600/90',
                  )}
                >
                  Google
                </p>
                <p
                  className={clsx(
                    'truncate text-sm font-semibold leading-tight',
                    isDark ? 'text-slate-100' : 'text-slate-800',
                  )}
                >
                  {isRegister ? t('auth.oauth.titleRegister') : t('auth.oauth.titleLogin')}
                </p>
              </div>
            </div>
            <FiShield
              className={clsx(
                'hidden h-5 w-5 shrink-0 sm:block',
                isDark ? 'text-emerald-400/80' : 'text-emerald-600/70',
              )}
              aria-hidden
            />
          </div>

          <p
            className={clsx(
              'mb-3 text-center text-[12px] leading-relaxed',
              isDark ? 'text-slate-500' : 'text-slate-500',
            )}
          >
            {hint}
          </p>

          <button
            onClick={handleClick}
            disabled={loading}
            className={clsx(
              'flex w-full items-center justify-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all',
              'border',
              isDark
                ? 'border-white/10 bg-white/5 text-white hover:bg-white/10 active:bg-white/5'
                : 'border-slate-200 bg-slate-50 text-slate-800 hover:bg-slate-100 active:bg-slate-50',
              loading && 'cursor-not-allowed opacity-60',
            )}
          >
            {loading ? (
              <FiLoader className="h-5 w-5 animate-spin text-indigo-400" />
            ) : (
              <FcGoogle className="h-5 w-5 shrink-0" />
            )}
            <span>
              {loading
                ? 'Yuklanmoqda...'
                : isRegister
                ? t('auth.oauth.titleRegister')
                : t('auth.oauth.titleLogin')}
            </span>
          </button>

          <p
            className={clsx(
              'mt-3 text-center text-[10px] tracking-wider',
              isDark ? 'text-slate-600' : 'text-slate-400',
            )}
          >
            {t('auth.oauth.badge')}
          </p>
        </div>
      </div>
    </div>
  );
}
