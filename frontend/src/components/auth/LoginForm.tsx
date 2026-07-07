'use client';

import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FiEye, FiEyeOff } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import { login, selectAuthError, clearError } from '@store/slices/authSlice';
import { forgotPasswordFlow } from '@utils/forgotPasswordFlow';
import { useLang } from '@/context/LangContext';
import { useTheme } from '@/context/ThemeContext';
import GoogleAuthButton from './GoogleAuthButton';
import TurnstileWidget from '@/components/common/TurnstileWidget';

export default function LoginForm() {
  const [showPass, setShowPass] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const { register, handleSubmit, formState: { errors } } = useForm();
  const { t } = useLang();
  const { isDark } = useTheme();

  const dispatch = useDispatch();
  const router = useRouter();
  const authError = useSelector(selectAuthError);
  const captchaSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const captchaRequired = Boolean(captchaSiteKey);

  useEffect(() => {
    dispatch(clearError());
  }, [dispatch]);

  const onSubmit = async (data: any) => {
    if (captchaRequired && !captchaToken) {
      toast.error(t('auth.captcha.required'));
      return;
    }
    setIsSubmitting(true);
    dispatch(clearError());

    try {
      const result = await (dispatch as any)(login({
        email: data.email,
        password: data.password,
        ...(captchaToken ? { captchaToken } : {}),
      }));

      if (result && login.fulfilled.match(result)) {
        forgotPasswordFlow.rememberEmail(data.email);
        const payload: any = result?.payload;
        if (payload?.requires2FA) {
          router.push('/auth/2fa-verify');
          return;
        }
        if (payload?.requiresEmailVerification) {
          router.push(`/auth/verify-email?email=${encodeURIComponent(payload.email || data.email)}`);
          return;
        }
        toast.success(t('auth.login.success'));
        router.push('/');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Theme-aware classes
  const labelCls = isDark ? 'text-slate-300' : 'text-slate-700';
  const inputCls = isDark
    ? 'bg-white/5 text-white placeholder-slate-500 border border-white/10 focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/30'
    : 'bg-slate-50 text-slate-900 placeholder-slate-400 border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20';
  const eyeBtnCls = isDark
    ? 'text-slate-400 hover:text-slate-200'
    : 'text-slate-500 hover:text-slate-700';
  const dividerLineCls = isDark ? 'bg-white/10' : 'bg-slate-200';
  const dividerTextCls = isDark ? 'text-slate-500' : 'text-slate-400';
  const noAccountCls = isDark ? 'text-slate-400' : 'text-slate-600';

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 w-full">
      {authError && (
        <div className="alert alert-error text-sm rounded-lg p-3 text-red-500 bg-red-500/10 border border-red-500/20">
          {authError}
        </div>
      )}

      {/* Email input */}
      <div className="form-control w-full">
        <label htmlFor="login-email" className="label pt-0 pb-1 px-1">
          <span className={`label-text font-medium text-sm ${labelCls}`}>{t('auth.login.email')}</span>
        </label>
        <div className="relative">
          <input
            id="login-email"
            type="email"
            autoComplete="email"
            placeholder={t('auth.login.emailPlaceholder')}
            className={`w-full px-5 py-3.5 rounded-full outline-none transition-all ${inputCls} ${errors.email ? '!ring-2 !ring-red-500/50' : ''}`}
            {...register('email', {
              required: t('auth.validation.emailRequired'),
              pattern: {
                value: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
                message: t('auth.validation.emailFormat'),
              },
            })}
          />
        </div>
        {errors.email && <p className="text-red-500 text-xs mt-1 ml-4">{(errors.email as any).message}</p>}
      </div>

      {/* Parol input */}
      <div className="form-control w-full">
        <div className="flex justify-between items-center pb-1 px-1">
          <label htmlFor="login-password" className="label pt-0 pb-0">
            <span className={`label-text font-medium text-sm ${labelCls}`}>{t('auth.login.password')}</span>
          </label>
          <Link href="/forgot-password" className="text-indigo-500 hover:text-indigo-400 text-xs hover:underline">
            {t('auth.login.forgot')}
          </Link>
        </div>
        <div className="relative flex items-center">
          <input
            id="login-password"
            type={showPass ? 'text' : 'password'}
            placeholder={t('auth.login.passwordPlaceholder')}
            autoComplete="current-password"
            className={`w-full px-5 py-3.5 rounded-full outline-none transition-all pr-12 ${inputCls} ${errors.password ? '!ring-2 !ring-red-500/50' : ''}`}
            {...register('password', {
              required: t('auth.validation.passwordRequired'),
              minLength: {
                value: 6,
                message: t('auth.login.passwordMinLength'),
              },
            })}
          />
          <button
            type="button"
            onClick={() => setShowPass(!showPass)}
            className={`absolute right-5 focus:outline-none ${eyeBtnCls}`}
            data-testid="login-toggle-password"
            aria-label={showPass ? 'Hide password' : 'Show password'}
            aria-pressed={showPass}
          >
            {showPass ? <FiEyeOff size={18} /> : <FiEye size={18} />}
          </button>
        </div>
        {errors.password && <p className="text-red-500 text-xs mt-1 ml-4">{(errors.password as any).message}</p>}
      </div>

      {captchaRequired && (
        <div className="flex justify-center pt-1">
          <TurnstileWidget
            siteKey={captchaSiteKey}
            onToken={setCaptchaToken}
            onError={() => setCaptchaToken(null)}
            theme={isDark ? 'dark' : 'light'}
          />
        </div>
      )}

      <div className="pt-4">
        <button
          type="submit"
          disabled={isSubmitting || (captchaRequired && !captchaToken)}
          className="btn btn-primary bg-indigo-500 hover:bg-indigo-600 border-none w-full rounded-full normal-case text-base font-medium h-12 flex justify-center items-center text-white disabled:opacity-60"
        >
          {isSubmitting ? (
            <span className="loading loading-spinner loading-md"></span>
          ) : (
            <>
              {t('auth.login.submit')} <span className="ml-2 font-bold">→</span>
            </>
          )}
        </button>
      </div>

      {/* Divider */}
      <div className="flex items-center gap-3 pt-2">
        <div className={`flex-1 h-px ${dividerLineCls}`} />
        <span className={`text-xs ${dividerTextCls}`}>{t('auth.divider.or')}</span>
        <div className={`flex-1 h-px ${dividerLineCls}`} />
      </div>

      {/* Google OAuth */}
      <GoogleAuthButton mode="login" />

      <div className="text-center pt-2">
        <span className={`text-sm ${noAccountCls}`}>{t('auth.login.noAccount')} </span>
        <Link href="/register" className="text-indigo-500 hover:text-indigo-400 hover:underline text-sm font-medium transition-colors">
          {t('auth.login.register')}
        </Link>
      </div>
    </form>
  );
}
