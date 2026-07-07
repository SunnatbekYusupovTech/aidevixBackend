'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { useSelector, useDispatch } from 'react-redux';
import { authApi } from '@api/authApi';
import {
  selectIsLoggedIn,
  selectAuthLoading,
  selectUser,
  checkAuthStatus,
} from '@store/slices/authSlice';

type Step = 'loading' | 'qr' | 'backup';

export default function TwoFactorSetupPage() {
  const router = useRouter();
  const search = useSearchParams();
  const dispatch = useDispatch();
  const user = useSelector(selectUser);
  const isLoggedIn = useSelector(selectIsLoggedIn);
  const authLoading = useSelector(selectAuthLoading);

  const [step, setStep] = useState<Step>('loading');
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const next = search.get('next') || (user?.role === 'admin' ? '/admin' : '/profile');

  useEffect(() => {
    if (authLoading) return;
    if (!isLoggedIn) {
      router.replace(`/login?next=${encodeURIComponent('/auth/2fa-setup')}`);
      return;
    }
    if (user?.totpEnabled) {
      router.replace(next);
      return;
    }
    if (step === 'loading') {
      authApi.setup2FA()
        .then(({ data }) => {
          setQrDataUrl(data.data.qrCodeDataUrl);
          setSecret(data.data.secret);
          setStep('qr');
        })
        .catch((err: any) => {
          const status = err.response?.status;
          const msg = err.response?.data?.message;
          if (status === 404) {
            toast.error(
              '2FA 404: Vercel envda NEXT_PUBLIC_BACKEND_URL oxirida /api bo‘lmasin; Railway /health tekshiring; so‘ng redeploy.',
            );
          } else {
            toast.error(msg || '2FA setup ochilmadi');
          }
          router.replace('/profile');
        });
    }
  }, [authLoading, isLoggedIn, user, step, router, next]);

  const onVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(code)) {
      toast.error('6 raqamli kod kiriting');
      return;
    }
    setSubmitting(true);
    try {
      const { data } = await authApi.enable2FA({ code });
      setBackupCodes(data.data.backupCodes);
      setStep('backup');
      // Refresh user state so totpEnabled is reflected
      dispatch(checkAuthStatus() as any);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Kod noto\'g\'ri');
    } finally {
      setSubmitting(false);
    }
  };

  const copySecret = () => {
    if (!secret) return;
    navigator.clipboard.writeText(secret).then(() => toast.success('Secret nusxalandi'));
  };

  const copyBackupCodes = () => {
    if (!backupCodes) return;
    navigator.clipboard.writeText(backupCodes.join('\n')).then(() => toast.success('Backup kodlar nusxalandi'));
  };

  const downloadBackupCodes = () => {
    if (!backupCodes) return;
    const blob = new Blob([
      `Aidevix — 2FA Backup Codes\n`,
      `User: ${user?.email}\n`,
      `Generated: ${new Date().toISOString()}\n\n`,
      `Har bir kod faqat BIR MARTA ishlatiladi.\n\n`,
      backupCodes.join('\n'),
    ], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'aidevix-backup-codes.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-[#0A0E1A] text-white flex items-center justify-center p-4">
      <div className="w-full max-w-[480px] bg-[#111726]/40 border border-white/5 rounded-3xl p-6 sm:p-10">
        {step === 'loading' && (
          <div className="flex flex-col items-center gap-3 py-12">
            <span className="loading loading-spinner loading-lg text-indigo-500" />
            <p className="text-slate-400 text-sm">Tayyorlanmoqda...</p>
          </div>
        )}

        {step === 'qr' && qrDataUrl && secret && (
          <>
            <div className="text-center mb-6">
              <div className="inline-flex w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/30 items-center justify-center mb-4">
                <span className="text-2xl">🔐</span>
              </div>
              <h1 className="text-2xl font-bold mb-2">Ikki bosqichli himoya</h1>
              <p className="text-slate-400 text-sm leading-relaxed">
                Telefoningizdagi <strong>Google Authenticator</strong>, <strong>Authy</strong> yoki shunga o&apos;xshash ilovada QR kodni skanerlang.
              </p>
            </div>

            <div className="bg-white p-4 rounded-2xl flex justify-center mb-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrDataUrl} alt="QR" width={220} height={220} />
            </div>

            <div className="mb-6">
              <p className="text-xs text-slate-500 mb-2">Yoki qo&apos;lda kiriting:</p>
              <button
                onClick={copySecret}
                className="w-full text-left bg-white/5 border border-white/10 rounded-xl p-3 font-mono text-sm break-all hover:bg-white/10 transition-colors"
              >
                {secret}
                <span className="text-indigo-400 text-xs ml-2">📋 Nusxa</span>
              </button>
            </div>

            <form onSubmit={onVerify} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Ilova bergan 6-raqamli kodni kiriting
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  className="w-full bg-[#0A0E1A]/50 border border-white/10 rounded-xl px-5 py-3.5 text-center text-2xl font-bold tracking-[8px] outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50"
                />
              </div>

              <button
                type="submit"
                disabled={submitting || code.length !== 6}
                className="w-full py-3.5 bg-indigo-500 hover:bg-indigo-600 text-white font-medium rounded-xl transition-all disabled:opacity-50"
              >
                {submitting ? 'Tekshirilmoqda...' : '2FA ni yoqish'}
              </button>

              <Link
                href={user?.role === 'admin' ? '/login' : '/profile'}
                className="block text-center text-sm text-slate-400 hover:text-white py-2"
              >
                Bekor qilish
              </Link>
            </form>
          </>
        )}

        {step === 'backup' && backupCodes && (
          <>
            <div className="text-center mb-6">
              <div className="inline-flex w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 items-center justify-center mb-4">
                <span className="text-2xl">🔑</span>
              </div>
              <h1 className="text-2xl font-bold mb-2">Backup kodlar</h1>
              <p className="text-amber-300/90 text-sm leading-relaxed">
                Bularni xavfsiz joyda saqlang. <strong>Har biri faqat bir marta</strong> ishlaydi va bu sahifa qayta ko&apos;rsatilmaydi.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 bg-white/5 border border-white/10 rounded-xl p-4 mb-4 font-mono">
              {backupCodes.map((c) => (
                <div key={c} className="text-center text-sm py-1.5 bg-white/5 rounded">{c}</div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <button
                onClick={copyBackupCodes}
                className="py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm"
              >
                📋 Nusxa olish
              </button>
              <button
                onClick={downloadBackupCodes}
                className="py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm"
              >
                💾 .txt yuklab olish
              </button>
            </div>

            <button
              onClick={() => router.replace(next)}
              className="w-full py-3.5 bg-indigo-500 hover:bg-indigo-600 text-white font-medium rounded-xl transition-all"
            >
              Saqladim, davom etish
            </button>
          </>
        )}
      </div>
    </div>
  );
}
