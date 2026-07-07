'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { useDispatch, useSelector } from 'react-redux';
import { authApi } from '@api/authApi';
import {
  selectPendingEmailVerification,
  clearPendingEmailVerification,
  selectIsLoggedIn,
} from '@store/slices/authSlice';

const RESEND_COOLDOWN = 60; // seconds

export default function VerifyEmailPage() {
  const router = useRouter();
  const search = useSearchParams();
  const dispatch = useDispatch();
  const pending = useSelector(selectPendingEmailVerification);
  const isLoggedIn = useSelector(selectIsLoggedIn);

  const email = pending?.email || search.get('email') || '';
  const next = search.get('next') || '/login';

  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (!email) {
      router.replace('/login');
    }
  }, [email, router]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(code)) {
      toast.error('6 raqamli kod kiriting');
      return;
    }
    setSubmitting(true);
    try {
      // If user is already logged in (rare: re-entered after partial verify), use authed endpoint
      if (isLoggedIn) {
        await authApi.verifyEmail({ code });
      } else {
        await authApi.verifyEmailPublic({ email, code });
      }
      dispatch(clearPendingEmailVerification());
      toast.success('Email tasdiqlandi. Endi login qiling.');
      router.replace(isLoggedIn && next !== '/login' ? next : '/login');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Kod noto\'g\'ri');
    } finally {
      setSubmitting(false);
    }
  };

  const onResend = async () => {
    if (!email || cooldown > 0) return;
    try {
      await authApi.resendVerificationPublic({ email });
      toast.success('Yangi kod yuborildi (agar email mavjud bo\'lsa)');
      setCooldown(RESEND_COOLDOWN);
    } catch {
      toast.error('Yuborib bo\'lmadi');
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0E1A] text-white flex items-center justify-center p-4">
      <div className="w-full max-w-[420px] bg-[#111726]/40 border border-white/5 rounded-3xl p-6 sm:p-10">
        <div className="text-center mb-7">
          <div className="inline-flex w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 items-center justify-center mb-4">
            <span className="text-2xl">📧</span>
          </div>
          <h1 className="text-2xl font-bold mb-2">Emailni tasdiqlang</h1>
          <p className="text-slate-400 text-sm leading-relaxed">
            <strong className="text-white">{email}</strong> ga 6-raqamli kod yuborildi
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            placeholder="000000"
            autoFocus
            className="w-full bg-[#0A0E1A]/50 border border-white/10 rounded-xl px-5 py-3.5 text-center text-2xl font-bold tracking-[8px] outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50"
          />

          <button
            type="submit"
            disabled={submitting || code.length !== 6}
            className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-xl transition-all disabled:opacity-50"
          >
            {submitting ? 'Tekshirilmoqda...' : 'Tasdiqlash'}
          </button>

          <button
            type="button"
            onClick={onResend}
            disabled={cooldown > 0}
            className="w-full text-sm text-indigo-400 hover:text-indigo-300 py-2 disabled:opacity-50"
          >
            {cooldown > 0 ? `Qayta yuborish (${cooldown}s)` : 'Kodni qayta yuborish'}
          </button>

          <Link
            href="/login"
            className="block text-center text-sm text-slate-400 hover:text-white py-2"
          >
            Boshqa email bilan kirish
          </Link>
        </form>
      </div>
    </div>
  );
}
