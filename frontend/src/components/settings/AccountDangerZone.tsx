'use client';

import { useState } from 'react';
import { useSelector } from 'react-redux';
import { authApi } from '@/api/authApi';
import { selectUser } from '@store/slices/authSlice';
import { toast } from 'react-hot-toast';
import ReauthModal from '@/components/auth/ReauthModal';
import { useLang } from '@/context/LangContext';

type UserShape = {
  hasLocalPassword?: boolean;
  googleLinked?: boolean;
} | null;

export default function AccountDangerZone() {
  const { t } = useLang();
  const user = useSelector(selectUser) as UserShape;
  const [step, setStep] = useState<'idle' | 'confirm'>( 'idle' );
  const [reauthOpen, setReauthOpen] = useState(false);

  const isGoogleOnly = Boolean(user?.googleLinked) && user?.hasLocalPassword === false;

  const onVerified = async (reauthToken: string) => {
    setReauthOpen(false);
    setStep('idle');
    try {
      await authApi.deleteMyAccount(reauthToken);
      toast.success(t('security.danger.toast.deleted'));
      window.location.replace('/');
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      toast.error(msg || t('security.danger.toast.deleteFailed'));
    }
  };

  return (
    <section className="border border-rose-500/25 rounded-2xl p-6 bg-rose-500/[0.06]">
      <h2 className="text-lg font-semibold text-rose-200 mb-1">{t('security.danger.title')}</h2>
      <p className="text-sm text-slate-400 mb-4 leading-relaxed">
        {t('security.danger.subtitle')}
      </p>
      {step === 'idle' && (
        <button
          type="button"
          onClick={() => setStep('confirm')}
          className="text-sm px-4 py-2.5 rounded-xl bg-rose-500/20 text-rose-200 border border-rose-500/30 hover:bg-rose-500/30 transition"
        >
          {t('security.danger.deleteAction')}
        </button>
      )}
      {step === 'confirm' && (
        <div className="space-y-3">
          <p className="text-sm text-amber-200/90">{t('security.danger.confirmText')}</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setStep('idle')}
              className="text-sm px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10"
            >
              {t('security.danger.back')}
            </button>
            <button
              type="button"
              onClick={() => setReauthOpen(true)}
              className="text-sm px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-medium"
            >
              {t('security.danger.confirmDelete')}
            </button>
          </div>
        </div>
      )}

      <ReauthModal
        open={reauthOpen}
        onClose={() => { setReauthOpen(false); setStep('confirm'); }}
        onVerified={onVerified}
        reason={t('security.danger.reauthReason')}
        isGoogleOnly={isGoogleOnly}
      />
    </section>
  );
}
