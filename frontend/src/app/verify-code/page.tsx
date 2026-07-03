'use client';

import React, { useState, useRef, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import { forgotPasswordApi } from '@api/forgotPasswordApi';
import { forgotPasswordFlow } from '@utils/forgotPasswordFlow';
import { useLang } from '@/context/LangContext';
import { useTheme } from '@/context/ThemeContext';
import TurnstileWidget from '@/components/common/TurnstileWidget';
import gsap from 'gsap';

function VerifyCodeContent() {
  const { register, handleSubmit, formState: { errors } } = useForm();
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaKey, setCaptchaKey] = useState(0);

  const router = useRouter();
  const searchParams = useSearchParams();
  const cardRef = useRef(null);
  const { t } = useLang();
  const { isDark } = useTheme();
  const captchaSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const captchaRequired = Boolean(captchaSiteKey);

  const identifier = searchParams.get('identifier');
  const method = searchParams.get('method') || 'email';
  const isTelegram = method === 'telegram';

  useEffect(() => {
    if (!identifier) {
      router.push('/forgot-password');
      return;
    }
    if (cardRef.current) {
      gsap.fromTo(
        cardRef.current,
        { y: 30, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.8, ease: 'power3.out' }
      );
    }
  }, [identifier, router]);

  useEffect(() => {
    if (!identifier) return;
    setTimeLeft(forgotPasswordFlow.getRemainingSeconds(identifier));
    const timer = setInterval(() => {
      setTimeLeft(forgotPasswordFlow.getRemainingSeconds(identifier));
    }, 1000);
    return () => clearInterval(timer);
  }, [identifier]);

  const onSubmit = async (data: any) => {
    if (!identifier) return;
    try {
      setLoading(true);
      const res = await forgotPasswordApi.verifyCode({ identifier, method, code: data.code });
      const resetToken = res.data?.data?.resetToken;
      if (!resetToken) throw new Error(t('verify.resetTokenError'));
      toast.success(t('verify.confirmed'));
      router.push(`/reset-password?token=${encodeURIComponent(resetToken)}&identifier=${encodeURIComponent(identifier)}`);
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message || t('profile.toast.error');
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!identifier) return;
    if (captchaRequired && !captchaToken) {
      toast.error(t('forgot.captchaRequired'));
      return;
    }
    try {
      setResendLoading(true);
      await forgotPasswordApi.forgotPassword({
        identifier,
        method,
        ...(captchaToken ? { captchaToken } : {}),
      });
      forgotPasswordFlow.startTimer(identifier);
      setTimeLeft(forgotPasswordFlow.getRemainingSeconds(identifier));
      setCaptchaToken(null);
      setCaptchaKey((k) => k + 1);
      toast.success(t('verify.sent'));
    } catch (error: any) {
      setCaptchaToken(null);
      setCaptchaKey((k) => k + 1);
      const code = error.response?.data?.code;
      if (code === 'CAPTCHA_REQUIRED' || error.response?.status === 403) {
        toast.error(t('forgot.captchaFailed'));
        return;
      }
      if (!error.response && (error?.message === 'Network Error' || error?.code === 'ERR_NETWORK')) {
        toast.error(t('forgot.networkError'));
        return;
      }
      toast.error(error.response?.data?.message || t('profile.toast.error'));
    } finally {
      setResendLoading(false);
    }
  };

  const pageBg = isDark ? 'bg-[#0A0E1A]' : 'bg-slate-50';
  const cardBg = isDark
    ? 'bg-[#0A0E1A] lg:bg-[#0d1224]/40 border-0 lg:border lg:border-white/5'
    : 'bg-white border border-gray-200 shadow-xl';
  const headTextMain = isDark ? 'text-white' : 'text-gray-900';
  const headTextMuted = isDark ? 'text-gray-400' : 'text-gray-600';
  const labelCls = isDark ? 'text-gray-300' : 'text-gray-700';
  const inputCls = isDark
    ? 'bg-white/5 text-white placeholder-gray-500 border border-white/10 focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/30'
    : 'bg-gray-50 text-gray-900 placeholder-gray-400 border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20';
  const timerCls = isDark ? 'text-gray-400' : 'text-gray-500';
  const backLinkCls = isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900';

  return (
    <div className={`min-h-screen flex font-sans selection:bg-indigo-500/30 ${pageBg} ${headTextMain}`}>
      <div className={`w-full flex flex-col justify-center items-center p-3 sm:p-12 relative ${pageBg}`}>
        <div
          ref={cardRef}
          className={`w-full max-w-[420px] rounded-2xl sm:rounded-3xl p-5 sm:p-10 opacity-0 shadow-2xl shadow-indigo-500/5 ${cardBg}`}
        >
          <div className="text-center mb-7 sm:mb-10">
            <h2 className={`text-[1.45rem] sm:text-[1.75rem] font-bold mb-3 ${headTextMain}`}>{t('verify.title')}</h2>
            <p className={`text-[0.95rem] px-2 leading-relaxed ${headTextMuted}`}>
              <strong>{isTelegram ? '@' + identifier : identifier}</strong>{' '}
              {isTelegram ? t('verify.descTelegram') : t('verify.descEmail')}
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 w-full">
            <div className="form-control w-full">
              <label className="label pt-0 pb-1 px-1">
                <span className={`label-text font-medium text-sm ${labelCls}`}>{t('verify.label')}</span>
              </label>
              <input
                type="text"
                maxLength={6}
                placeholder="000000"
                style={{ letterSpacing: '6px', textAlign: 'center' }}
                className={`w-full px-5 py-3.5 rounded-full outline-none transition-all text-xl font-bold ${inputCls} ${errors.code ? '!ring-2 !ring-red-500/50' : ''}`}
                {...register('code', {
                  required: t('verify.codeRequired'),
                  pattern: {
                    value: /^[0-9]{6}$/,
                    message: t('verify.codePattern'),
                  },
                })}
              />
              {errors.code && <p className="text-red-500 text-xs mt-1 text-center">{(errors.code as any).message}</p>}
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary bg-indigo-500 hover:bg-indigo-600 border-none w-full rounded-full normal-case text-base font-medium h-12 flex justify-center items-center text-white"
              >
                {loading ? (
                  <span className="loading loading-spinner loading-md"></span>
                ) : (
                  <>{t('verify.submit')} <span className="ml-2 font-bold">→</span></>
                )}
              </button>
            </div>

            <div className="text-center pt-6">
              {timeLeft > 0 ? (
                <p className={`text-sm ${timerCls}`}>
                  {t('verify.resend')} ({timeLeft}s)
                </p>
              ) : (
                <>
                  {captchaRequired && (
                    <div className="flex justify-center pb-4">
                      <TurnstileWidget
                        key={captchaKey}
                        siteKey={captchaSiteKey}
                        onToken={setCaptchaToken}
                        onError={() => setCaptchaToken(null)}
                        theme={isDark ? 'dark' : 'light'}
                      />
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={resendLoading || (captchaRequired && !captchaToken)}
                    className="text-indigo-500 hover:text-indigo-400 hover:underline text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    {resendLoading ? t('verify.sending') : t('verify.resend')}
                  </button>
                </>
              )}
            </div>

            <div className="text-center pt-4">
              <Link href="/forgot-password" className={`hover:underline text-sm font-medium transition-colors ${backLinkCls}`}>
                {t('verify.useOther')}
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function VerifyCodePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-[#0A0E1A]"><span className="loading loading-spinner loading-lg text-primary"></span></div>}>
      <VerifyCodeContent />
    </Suspense>
  );
}
