'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { useDispatch, useSelector } from 'react-redux';
import {
  verify2FALogin,
  selectPending2FA,
  clearPending2FA,
  selectIsLoggedIn,
  selectAuthLoading,
} from '@store/slices/authSlice';

export default function TwoFactorVerifyPage() {
  const router = useRouter();
  const search = useSearchParams();
  const dispatch = useDispatch();
  const pending = useSelector(selectPending2FA);
  const isLoggedIn = useSelector(selectIsLoggedIn);
  const authLoading = useSelector(selectAuthLoading);

  const [code, setCode] = useState('');
  const [useBackup, setUseBackup] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const next = search.get('next') || '/';

  useEffect(() => {
    if (authLoading) return;
    if (isLoggedIn) {
      router.replace(next);
      return;
    }
    if (!pending?.challengeId) {
      router.replace('/login');
    }
  }, [authLoading, isLoggedIn, pending, router, next]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pending?.challengeId) return;
    const cleaned = code.replace(/\s+/g, '');
    if (useBackup ? cleaned.length !== 10 : cleaned.length !== 6) {
      toast.error(useBackup ? 'Backup kod 10 belgi (HEX) bo\'lishi kerak' : '6 raqamli kod kiriting');
      return;
    }
    setSubmitting(true);
    try {
      const result = await (dispatch as any)(
        verify2FALogin({ challengeId: pending.challengeId, code: cleaned.toUpperCase() })
      );
      if (result && verify2FALogin.fulfilled.match(result)) {
        toast.success('Kirish muvaffaqiyatli');
        router.replace(next);
      } else {
        const errMsg = result ? ((result as { payload?: string }).payload as string | undefined) : undefined;
        toast.error(errMsg || 'Kod noto\'g\'ri');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const cancel = () => {
    dispatch(clearPending2FA());
    router.replace('/login');
  };

  return (
    <div className="min-h-screen bg-[#0A0E1A] text-white flex items-center justify-center p-4">
      <div className="w-full max-w-[420px] bg-[#111726]/40 border border-white/5 rounded-3xl p-6 sm:p-10">
        <div className="text-center mb-7">
          <div className="inline-flex w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/30 items-center justify-center mb-4">
            <span className="text-2xl">🔐</span>
          </div>
          <h1 className="text-2xl font-bold mb-2">Tasdiqlash kodi</h1>
          <p className="text-slate-400 text-sm leading-relaxed">
            {useBackup
              ? 'Backup kodlardan birini kiriting'
              : 'Authenticator ilovangizdagi 6-raqamli kodni kiriting'}
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <input
            type="text"
            inputMode={useBackup ? 'text' : 'numeric'}
            maxLength={useBackup ? 10 : 6}
            value={code}
            onChange={(e) =>
              setCode(useBackup ? e.target.value.toUpperCase() : e.target.value.replace(/\D/g, ''))
            }
            placeholder={useBackup ? 'XXXXXXXXXX' : '000000'}
            autoFocus
            className="w-full bg-[#0A0E1A]/50 border border-white/10 rounded-xl px-5 py-3.5 text-center text-2xl font-bold tracking-[6px] outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50"
          />

          <button
            type="submit"
            disabled={
              submitting ||
              !code ||
              (useBackup ? code.replace(/\s+/g, '').length !== 10 : code.length !== 6)
            }
            className="w-full py-3.5 bg-indigo-500 hover:bg-indigo-600 text-white font-medium rounded-xl transition-all disabled:opacity-50"
          >
            {submitting ? 'Tekshirilmoqda...' : 'Davom etish'}
          </button>

          <button
            type="button"
            onClick={() => {
              setUseBackup((v) => !v);
              setCode('');
            }}
            className="w-full text-sm text-indigo-400 hover:text-indigo-300 py-2"
          >
            {useBackup
              ? '← Authenticator kodidan foydalanish'
              : 'Backup kod ishlatish'}
          </button>

          <button
            type="button"
            onClick={cancel}
            className="w-full text-sm text-slate-400 hover:text-white py-2"
          >
            Bekor qilish
          </button>
        </form>
      </div>
    </div>
  );
}
