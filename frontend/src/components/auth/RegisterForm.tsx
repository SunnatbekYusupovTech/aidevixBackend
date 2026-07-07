'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { useDispatch, useSelector } from 'react-redux';
import { register as registerUser, selectAuthLoading, selectAuthError, clearError } from '@store/slices/authSlice';
import { toast } from 'react-hot-toast';
import { IoPersonOutline, IoMailOutline, IoLockClosedOutline, IoEyeOutline, IoEyeOffOutline } from 'react-icons/io5';
import { FiRefreshCcw } from 'react-icons/fi';
import { forgotPasswordFlow } from '@utils/forgotPasswordFlow';
import { useLang } from '@/context/LangContext';
import { useTheme } from '@/context/ThemeContext';
import GoogleAuthButton from './GoogleAuthButton';
import TurnstileWidget from '@/components/common/TurnstileWidget';

export default function RegisterForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const { t } = useLang();
  const { isDark } = useTheme();

  const { register, handleSubmit, watch, formState: { errors }, setValue } = useForm();
  const router = useRouter();
  const [refCodeParam, setRefCodeParam] = useState('');
  const dispatch = useDispatch();
  const loading = useSelector(selectAuthLoading);
  const authError = useSelector(selectAuthError);
  const captchaSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const captchaRequired = Boolean(captchaSiteKey);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      const ref = searchParams.get('ref');
      if (ref) {
        setRefCodeParam(ref);
        setValue('referralCode', ref);
      }
    }
  }, [setValue]);

  useEffect(() => {
    dispatch(clearError());
  }, [dispatch]);

  const password = watch('password', '');

  const getPasswordStrength = (pass: string) => {
    let strength = 0;
    if (pass.length > 5) strength += 1;
    if (pass.length > 8) strength += 1;
    if (/[A-Z]/.test(pass)) strength += 1;
    if (/[0-9]/.test(pass)) strength += 1;
    if (/[^A-Za-z0-9]/.test(pass)) strength += 1;
    return strength;
  };

  const strength = getPasswordStrength(password);
  const isWeak = strength < 3;
  const strengthPercentage = password.length === 0 ? 0 : Math.min((strength / 5) * 100, 100);

  const onSubmit = async (data: any) => {
    dispatch(clearError());

    if (!data.terms) {
      toast.error(t('auth.register.toastTerms'));
      return;
    }

    if (data.password !== data.confirmPassword) {
      toast.error(t('auth.register.toastMismatch'));
      return;
    }

    if (captchaRequired && !captchaToken) {
      toast.error(t('auth.captcha.required'));
      return;
    }

    const nameParts = data.fullName.trim().split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';

    let username = data.fullName
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9._-]/g, '')
      .slice(0, 50);
    if (username.length < 3) {
      username = data.email.split('@')[0].toLowerCase().replace(/[^a-z0-9._-]/g, '').slice(0, 50);
    }
    const email = data.email.trim().toLowerCase();

    const result = await (dispatch as any)(registerUser({
      username,
      email,
      password: data.password,
      firstName,
      lastName,
      referralCode: data.referralCode || undefined,
      ...(captchaToken ? { captchaToken } : {}),
    }));

    if (registerUser.fulfilled.match(result)) {
      forgotPasswordFlow.rememberEmail(email);
      const payload: any = result.payload;
      if (payload?.requiresEmailVerification) {
        toast.success('Tasdiqlash kodi yuborildi. Email manzilingizni tekshiring.');
        router.push(`/auth/verify-email?email=${encodeURIComponent(payload.email || email)}`);
        return;
      }
      toast.success(t('auth.register.success'));
      router.push('/');
    }
  };

  // Theme-aware classes
  const labelCls = isDark ? 'text-slate-300' : 'text-slate-700';
  const subLabelCls = isDark ? 'text-slate-500' : 'text-slate-400';
  const iconCls = isDark ? 'text-slate-400' : 'text-slate-500';
  const inputBase = 'w-full pl-11 pr-4 py-3 rounded-xl outline-none transition-all';
  const inputCls = isDark
    ? 'bg-[#0A0E1A]/50 text-white placeholder-slate-500 border focus:ring-1'
    : 'bg-slate-50 text-slate-900 placeholder-slate-400 border focus:ring-1';
  const inputBorderOk = isDark ? 'border-white/10 focus:border-indigo-500/50 focus:ring-indigo-500/50' : 'border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/30';
  const inputBorderErr = isDark ? 'border-red-500/50' : 'border-red-400';
  const eyeBtnCls = isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-800';
  const dividerLineCls = isDark ? 'bg-white/10' : 'bg-slate-200';
  const dividerTextCls = isDark ? 'text-slate-500' : 'text-slate-400';
  const checkboxCls = isDark
    ? 'border-white/20 bg-[#0A0E1A]/50 text-indigo-500 focus:ring-indigo-500/50'
    : 'border-slate-300 bg-white text-indigo-500 focus:ring-indigo-500/30';
  const termsTextCls = isDark ? 'text-slate-400' : 'text-slate-600';
  const strengthBarBg = isDark ? 'bg-slate-700' : 'bg-slate-200';

  const inputCN = (hasErr: boolean) => `${inputBase} ${inputCls} ${hasErr ? inputBorderErr : inputBorderOk}`;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {authError && (
        <div className="alert alert-error text-sm rounded-lg p-3 text-red-500 bg-red-500/10 border border-red-500/20">
          {authError}
        </div>
      )}

      {/* Ism */}
      <div>
        <label htmlFor="register-fullName" className={`block text-sm font-medium mb-1.5 ${labelCls}`}>{t('auth.register.fullNameLabel')}</label>
        <div className="relative">
          <div className={`absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none ${iconCls}`}>
            <IoPersonOutline className="w-5 h-5" />
          </div>
          <input
            id="register-fullName"
            type="text"
            {...register('fullName', {
              required: t('auth.validation.fullNameRequired'),
              minLength: { value: 3, message: t('auth.validation.fullNameMin') },
              maxLength: { value: 40, message: t('auth.validation.fullNameMax') },
              validate: (v) => v.trim().length >= 3 || t('auth.validation.fullNameShort'),
            })}
            autoComplete="name"
            className={inputCN(Boolean(errors.fullName))}
            placeholder={t('auth.register.fullNamePlaceholder')}
          />
        </div>
        {errors.fullName && <span className="text-red-500 text-xs mt-1 block">{(errors.fullName as any).message}</span>}
      </div>

      {/* Email */}
      <div>
        <label htmlFor="register-email" className={`block text-sm font-medium mb-1.5 ${labelCls}`}>{t('auth.register.emailLabel')}</label>
        <div className="relative">
          <div className={`absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none ${iconCls}`}>
            <IoMailOutline className="w-5 h-5" />
          </div>
          <input
            id="register-email"
            type="email"
            {...register('email', {
              required: t('auth.validation.emailRequired'),
              pattern: {
                value: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[A-Za-z]{2,}$/,
                message: t('auth.validation.emailFormat'),
              },
            })}
            autoComplete="username"
            className={inputCN(Boolean(errors.email))}
            placeholder={t('auth.register.emailPlaceholder')}
          />
        </div>
        {errors.email && <span className="text-red-500 text-xs mt-1 block">{(errors.email as any).message}</span>}
      </div>

      {/* Parol */}
      <div>
        <label htmlFor="register-password" className={`block text-sm font-medium mb-1.5 ${labelCls}`}>{t('auth.register.passwordLabel')}</label>
        <div className="relative">
          <div className={`absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none ${iconCls}`}>
            <IoLockClosedOutline className="w-5 h-5" />
          </div>
          <input
            id="register-password"
            type={showPassword ? 'text' : 'password'}
            {...register('password', {
              required: t('auth.validation.passwordRequired'),
              minLength: { value: 8, message: t('auth.validation.passwordMin8') },
              validate: {
                hasUpper: v => /[A-Z]/.test(v) || t('auth.validation.passwordUpper'),
                hasLower: v => /[a-z]/.test(v) || t('auth.validation.passwordLower'),
                hasDigit: v => /\d/.test(v) || t('auth.validation.passwordDigit'),
                hasSpecial: v => /[^A-Za-z0-9]/.test(v) || t('auth.validation.passwordSpecial'),
              },
            })}
            autoComplete="new-password"
            className={`${inputCN(Boolean(errors.password))} pr-12`}
            placeholder={t('auth.register.passwordPlaceholder')}
          />
          <button
            type="button"
            className={`absolute inset-y-0 right-0 pr-4 flex items-center transition-colors ${eyeBtnCls}`}
            onClick={() => setShowPassword(!showPassword)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            aria-pressed={showPassword}
          >
            {showPassword ? <IoEyeOffOutline className="w-5 h-5" /> : <IoEyeOutline className="w-5 h-5" />}
          </button>
        </div>
        {errors.password && <span className="text-red-500 text-xs mt-1 block">{(errors.password as any).message}</span>}

        {password.length > 0 && (
          <div className="mt-2 flex items-center gap-3">
            <div className={`h-1 flex-1 rounded-full overflow-hidden ${strengthBarBg}`}>
              <div
                className={`h-full transition-all duration-300 ${isWeak ? 'bg-red-500' : 'bg-green-500'}`}
                style={{ width: `${isWeak ? Math.max(30, strengthPercentage) : 100}%` }}
              ></div>
            </div>
            <span className={`text-[11px] font-medium ${isWeak ? 'text-red-500' : 'text-green-500'}`}>
              {isWeak ? t('auth.register.passwordWeak') : t('auth.register.passwordStrong')}
            </span>
          </div>
        )}
      </div>

      {/* Parolni tasdiqlash */}
      <div>
        <label htmlFor="register-confirmPassword" className={`block text-sm font-medium mb-1.5 ${labelCls}`}>{t('auth.register.confirmLabel')}</label>
        <div className="relative">
          <div className={`absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none ${iconCls}`}>
            <FiRefreshCcw className="w-4 h-4" />
          </div>
          <input
            id="register-confirmPassword"
            type={showConfirmPassword ? 'text' : 'password'}
            {...register('confirmPassword', {
              required: t('auth.validation.confirmRequired'),
              validate: value => value === password || t('auth.validation.passwordMismatch'),
            })}
            autoComplete="new-password"
            className={`${inputCN(Boolean(errors.confirmPassword))} pr-12`}
            placeholder={t('auth.register.passwordPlaceholder')}
          />
          <button
            type="button"
            className={`absolute inset-y-0 right-0 pr-4 flex items-center transition-colors ${eyeBtnCls}`}
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
            aria-pressed={showConfirmPassword}
          >
            {showConfirmPassword ? <IoEyeOffOutline className="w-5 h-5" /> : <IoEyeOutline className="w-5 h-5" />}
          </button>
        </div>
        {errors.confirmPassword && <span className="text-red-500 text-xs mt-1 block">{(errors.confirmPassword as any).message || t('auth.validation.passwordMismatch')}</span>}
      </div>

      {/* Referral */}
      <div>
        <label htmlFor="register-referralCode" className={`flex justify-between text-sm font-medium mb-1.5 ${labelCls}`}>
          <span>{t('auth.register.ref')}</span>
          <span className={`text-xs font-normal ${subLabelCls}`}>{t('auth.register.refOptional')}</span>
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <span className="text-emerald-500 font-bold mb-1">🎁</span>
          </div>
          <input
            id="register-referralCode"
            type="text"
            defaultValue={refCodeParam}
            {...register('referralCode')}
            className={`${inputBase} ${inputCls} ${isDark ? 'border-white/10 focus:border-emerald-500/50 focus:ring-emerald-500/50' : 'border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/30'} uppercase`}
            placeholder={t('auth.register.refPlaceholder')}
          />
        </div>
        {refCodeParam && <span className="text-emerald-500 text-xs mt-1 block tracking-wide">{t('auth.register.refBonus')}</span>}
      </div>

      {/* Shartlar */}
      <div className="flex items-start gap-3 mt-4">
        <div className="flex items-center h-5 mt-1">
          <input
            id="terms-checkbox"
            type="checkbox"
            {...register('terms', { required: t('auth.validation.termsRequired') })}
            className={`w-4 h-4 rounded transition-all cursor-pointer focus:ring-offset-0 ${checkboxCls}`}
          />
        </div>
        <label
          htmlFor="terms-checkbox"
          className={`text-sm leading-relaxed cursor-pointer ${termsTextCls}`}
        >
          {t('auth.register.termsAgree')}{' '}
          <span className="text-indigo-500 hover:text-indigo-400 hover:underline">{t('auth.register.termsLink')}</span>{' '}
          {t('auth.register.termsAnd')}{' '}
          <span className="text-indigo-500 hover:text-indigo-400 hover:underline">{t('auth.register.privacyLink')}</span>{' '}
          {t('auth.register.termsAccept')}
        </label>
      </div>
      {errors.terms && <span className="text-red-500 text-xs -mt-2 block">{(errors.terms as any).message}</span>}

      {captchaRequired && (
        <div className="flex justify-center pt-2">
          <TurnstileWidget
            siteKey={captchaSiteKey}
            onToken={setCaptchaToken}
            onError={() => setCaptchaToken(null)}
            theme={isDark ? 'dark' : 'light'}
          />
        </div>
      )}

      <button
        type="submit"
        disabled={loading || (captchaRequired && !captchaToken)}
        className="w-full mt-6 py-3.5 bg-indigo-500 hover:bg-indigo-600 focus:bg-indigo-600 text-white font-medium rounded-xl transition-all shadow-[0_0_20px_rgba(99,102,241,0.2)] hover:shadow-[0_0_25px_rgba(99,102,241,0.4)] active:scale-[0.98] flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? t('auth.register.loading') : t('auth.register.submit')}
        {!loading && (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>

      {/* Divider */}
      <div className="flex items-center gap-3 mt-2">
        <div className={`flex-1 h-px ${dividerLineCls}`} />
        <span className={`text-xs ${dividerTextCls}`}>{t('auth.divider.or')}</span>
        <div className={`flex-1 h-px ${dividerLineCls}`} />
      </div>

      {/* Google OAuth */}
      <GoogleAuthButton mode="register" />
    </form>
  );
}
