'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ROUTES } from '@utils/constants';
import { toast } from 'react-hot-toast';
import { useDispatch, useSelector } from 'react-redux';
import { authApi } from '@api/authApi';
import {
  selectUser,
  selectIsLoggedIn,
  selectAuthLoading,
  checkAuthStatus,
} from '@store/slices/authSlice';
import SessionDevicesPanel from '@/components/settings/SessionDevicesPanel';
import AccountDangerZone from '@/components/settings/AccountDangerZone';
import { useLang } from '@/context/LangContext';
import { useTheme } from '@/context/ThemeContext';

type DisableState = { open: boolean; password: string; code: string; submitting: boolean };
type RegenState = { open: boolean; code: string; submitting: boolean; codes: string[] | null };
type ChangePwState = { open: boolean; current: string; next: string; confirm: string; submitting: boolean };

export default function SecuritySettingsPage() {
  const { t } = useLang();
  const { isDark } = useTheme();
  const router = useRouter();
  const dispatch = useDispatch();
  const user = useSelector(selectUser);
  const isLoggedIn = useSelector(selectIsLoggedIn);
  const authLoading = useSelector(selectAuthLoading);

  const [disable, setDisable] = useState<DisableState>({ open: false, password: '', code: '', submitting: false });
  const [regen, setRegen] = useState<RegenState>({ open: false, code: '', submitting: false, codes: null });
  const [changePw, setChangePw] = useState<ChangePwState>({
    open: false, current: '', next: '', confirm: '', submitting: false,
  });

  useEffect(() => {
    if (authLoading) return;
    if (!isLoggedIn) {
      router.replace(`/login?next=${encodeURIComponent(ROUTES.SETTINGS_SECURITY)}`);
    }
  }, [authLoading, isLoggedIn, router]);

  useEffect(() => {
    if (isLoggedIn) {
      dispatch(checkAuthStatus() as any);
    }
  }, [dispatch, isLoggedIn]);

  const isAdmin = user?.role === 'admin';
  const totpOn = !!user?.totpEnabled;

  const onDisable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!disable.password || !disable.code) return;
    setDisable((s) => ({ ...s, submitting: true }));
    try {
      await authApi.disable2FA({ password: disable.password, code: disable.code });
      toast.success(t('security.toast.2faDisabled'));
      setDisable({ open: false, password: '', code: '', submitting: false });
      dispatch(checkAuthStatus() as any);
    } catch (err: any) {
      toast.error(err.response?.data?.message || t('security.toast.error'));
      setDisable((s) => ({ ...s, submitting: false }));
    }
  };

  const onRegen = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regen.code) return;
    setRegen((s) => ({ ...s, submitting: true }));
    try {
      const { data } = await authApi.regenerateBackupCodes({ code: regen.code });
      setRegen({ open: true, code: '', submitting: false, codes: data.data.backupCodes });
      toast.success(t('security.toast.backupRegenerated'));
    } catch (err: any) {
      toast.error(err.response?.data?.message || t('security.toast.invalidCode'));
      setRegen((s) => ({ ...s, submitting: false }));
    }
  };

  const onChangePw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (changePw.next !== changePw.confirm) {
      toast.error(t('security.toast.passwordMismatch'));
      return;
    }
    setChangePw((s) => ({ ...s, submitting: true }));
    try {
      await authApi.changePassword({ currentPassword: changePw.current, newPassword: changePw.next });
      toast.success(t('security.toast.passwordChanged'));
      router.replace('/login');
    } catch (err: any) {
      toast.error(err.response?.data?.message || t('security.toast.error'));
      setChangePw((s) => ({ ...s, submitting: false }));
    }
  };

  if (authLoading || !user) return null;

  // Theme classes
  const pageBg = isDark ? 'bg-[#0A0E1A] text-white' : 'bg-slate-50 text-slate-900';
  const linkBack = isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900';
  const subTxt = isDark ? 'text-slate-400' : 'text-slate-600';
  const sectionCls = isDark ? 'bg-[#111726]/40 border-white/5' : 'bg-white border-slate-200 shadow-sm';
  const ghostBtn = isDark ? 'bg-white/5 hover:bg-white/10 border-white/10' : 'bg-slate-100 hover:bg-slate-200 border-slate-200';
  const inputCls = isDark
    ? 'bg-[#0A0E1A]/50 border-white/10 text-white placeholder-slate-500'
    : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400';
  const modalBg = isDark ? 'bg-[#111726] border-white/10' : 'bg-white border-slate-200 shadow-2xl';
  const codeBoxBg = isDark ? 'bg-white/5 border-white/10' : 'bg-slate-100 border-slate-200';
  const codeCellBg = isDark ? 'bg-white/5 text-white' : 'bg-white text-slate-900 border border-slate-200';

  return (
    <div className={`min-h-screen py-10 px-4 ${pageBg}`}>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <Link href="/profile" className={`text-sm ${linkBack}`}>← {t('security.backProfile')}</Link>
          <h1 className="text-3xl font-bold mt-2">{t('security.title')}</h1>
          <p className={`text-sm mt-1 ${subTxt}`}>{t('security.subtitle')}</p>
        </div>

        <SessionDevicesPanel />

        {/* Password */}
        <section className={`border rounded-2xl p-6 ${sectionCls}`}>
          <div className="flex items-center justify-between mb-2">
            <div>
              <h2 className="text-lg font-semibold">{t('security.password.title')}</h2>
              <p className={`text-sm ${subTxt}`}>{t('security.password.subtitle')}</p>
            </div>
            {!changePw.open && (
              <button
                onClick={() => setChangePw((s) => ({ ...s, open: true }))}
                className={`px-4 py-2 border rounded-lg text-sm ${ghostBtn}`}
              >
                {t('security.password.change')}
              </button>
            )}
          </div>

          {changePw.open && (
            <form onSubmit={onChangePw} className="space-y-3 mt-4">
              <input
                type="password" placeholder={t('security.password.currentPlaceholder')}
                value={changePw.current}
                onChange={(e) => setChangePw((s) => ({ ...s, current: e.target.value }))}
                className={`w-full border rounded-xl px-4 py-3 ${inputCls}`}
                autoComplete="current-password"
              />
              <input
                type="password" placeholder={t('security.password.newPlaceholder')}
                value={changePw.next}
                onChange={(e) => setChangePw((s) => ({ ...s, next: e.target.value }))}
                className={`w-full border rounded-xl px-4 py-3 ${inputCls}`}
                autoComplete="new-password"
              />
              <input
                type="password" placeholder={t('security.password.confirmPlaceholder')}
                value={changePw.confirm}
                onChange={(e) => setChangePw((s) => ({ ...s, confirm: e.target.value }))}
                className={`w-full border rounded-xl px-4 py-3 ${inputCls}`}
                autoComplete="new-password"
              />
              <div className="flex gap-2">
                <button
                  type="submit" disabled={changePw.submitting}
                  className="flex-1 py-3 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl disabled:opacity-50"
                >{changePw.submitting ? t('security.saving') : t('security.save')}</button>
                <button
                  type="button"
                  onClick={() => setChangePw({ open: false, current: '', next: '', confirm: '', submitting: false })}
                  className={`px-4 py-3 border rounded-xl ${ghostBtn}`}
                >{t('security.cancel')}</button>
              </div>
            </form>
          )}
        </section>

        {/* 2FA */}
        <section className={`border rounded-2xl p-6 ${sectionCls}`}>
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold">{t('security.twofa.title')}</h2>
                {totpOn && <span className="text-xs bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full">{t('security.twofa.on')}</span>}
                {!totpOn && <span className="text-xs bg-slate-500/20 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-full">{t('security.twofa.off')}</span>}
              </div>
              <p className={`text-sm mt-1 ${subTxt}`}>
                {isAdmin
                  ? t('security.twofa.adminHint')
                  : t('security.twofa.userHint')}
              </p>
            </div>
          </div>

          {!totpOn && (
            <Link
              href="/auth/2fa-setup"
              className="inline-block px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg text-sm"
            >
              {t('security.twofa.enable')}
            </Link>
          )}

          {totpOn && (
            <div className="space-y-3 mt-4">
              <button
                onClick={() => setRegen({ open: true, code: '', submitting: false, codes: null })}
                className={`w-full text-left px-4 py-3 border rounded-xl text-sm ${ghostBtn}`}
              >
                {t('security.twofa.regen')}
              </button>
              {!isAdmin && (
                <button
                  onClick={() => setDisable({ open: true, password: '', code: '', submitting: false })}
                  className="w-full text-left px-4 py-3 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 rounded-xl text-sm text-rose-600 dark:text-rose-300"
                >
                  {t('security.twofa.disable')}
                </button>
              )}
            </div>
          )}
        </section>

        <AccountDangerZone />

        {/* Disable modal */}
        {disable.open && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
            <form onSubmit={onDisable} className={`w-full max-w-md border rounded-2xl p-6 space-y-3 ${modalBg}`}>
              <h3 className="text-lg font-semibold">{t('security.disableModal.title')}</h3>
              <p className={`text-sm ${subTxt}`}>{t('security.disableModal.subtitle')}</p>
              <input
                type="password" placeholder={t('security.password.currentPlaceholder')}
                value={disable.password}
                onChange={(e) => setDisable((s) => ({ ...s, password: e.target.value }))}
                className={`w-full border rounded-xl px-4 py-3 ${inputCls}`}
                autoComplete="current-password"
              />
              <input
                type="text" placeholder={t('security.disableModal.codePlaceholder')}
                value={disable.code}
                onChange={(e) => setDisable((s) => ({ ...s, code: e.target.value.toUpperCase() }))}
                className={`w-full border rounded-xl px-4 py-3 font-mono ${inputCls}`}
              />
              <div className="flex gap-2">
                <button type="submit" disabled={disable.submitting} className="flex-1 py-3 bg-rose-500 hover:bg-rose-600 text-white rounded-xl disabled:opacity-50">
                  {disable.submitting ? t('security.disabling') : t('security.disable')}
                </button>
                <button
                  type="button"
                  onClick={() => setDisable({ open: false, password: '', code: '', submitting: false })}
                  className={`px-4 py-3 border rounded-xl ${ghostBtn}`}
                >{t('security.cancel')}</button>
              </div>
            </form>
          </div>
        )}

        {/* Regen backup codes modal */}
        {regen.open && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
            <div className={`w-full max-w-md border rounded-2xl p-6 space-y-3 ${modalBg}`}>
              {!regen.codes && (
                <form onSubmit={onRegen} className="space-y-3">
                  <h3 className="text-lg font-semibold">{t('security.backupModal.newTitle')}</h3>
                  <p className={`text-sm ${subTxt}`}>{t('security.backupModal.newSubtitle')}</p>
                  <input
                    type="text" placeholder="000000" inputMode="numeric" maxLength={6}
                    value={regen.code}
                    onChange={(e) => setRegen((s) => ({ ...s, code: e.target.value.replace(/\D/g, '') }))}
                    className={`w-full border rounded-xl px-4 py-3 text-center text-xl tracking-[6px] font-mono ${inputCls}`}
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button type="submit" disabled={regen.submitting || regen.code.length !== 6} className="flex-1 py-3 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl disabled:opacity-50">
                      {regen.submitting ? t('security.creating') : t('security.create')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setRegen({ open: false, code: '', submitting: false, codes: null })}
                      className={`px-4 py-3 border rounded-xl ${ghostBtn}`}
                    >{t('security.cancel')}</button>
                  </div>
                </form>
              )}

              {regen.codes && (
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold">{t('security.backupModal.generatedTitle')}</h3>
                  <p className="text-sm text-amber-600 dark:text-amber-300/90">
                    {t('security.backupModal.generatedSubtitle')}
                  </p>
                  <div className={`grid grid-cols-2 gap-2 border rounded-xl p-4 font-mono ${codeBoxBg}`}>
                    {regen.codes.map((c) => (
                      <div key={c} className={`text-center text-sm py-1.5 rounded ${codeCellBg}`}>{c}</div>
                    ))}
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(regen.codes!.join('\n'));
                      toast.success(t('security.toast.copied'));
                    }}
                    className={`w-full py-3 border rounded-xl text-sm ${ghostBtn}`}
                  >{t('security.backupModal.copyAll')}</button>
                  <button
                    onClick={() => setRegen({ open: false, code: '', submitting: false, codes: null })}
                    className="w-full py-3 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl"
                  >{t('security.backupModal.savedClose')}</button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
