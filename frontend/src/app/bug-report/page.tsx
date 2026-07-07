'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSelector } from 'react-redux';
import { selectIsLoggedIn } from '@store/slices/authSlice';
import { useLang } from '@/context/LangContext';
import { useTheme } from '@/context/ThemeContext';
import { ROUTES } from '@utils/constants';
import { bugReportApi, type BugReportMine } from '@api/bugReportApi';
import { toast } from 'react-hot-toast';

function statusLabel(status: string, t: (k: string) => string) {
  const k = `bugReport.status.${status}` as const;
  const v = t(k);
  return v === k ? status : v;
}

export default function BugReportPage() {
  const { t } = useLang();
  const { isDark } = useTheme();
  const isAuth = useSelector(selectIsLoggedIn);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [pageUrl, setPageUrl] = useState('');
  const [suggestion, setSuggestion] = useState('');
  const [sending, setSending] = useState(false);
  const [mine, setMine] = useState<BugReportMine[]>([]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setPageUrl((u) => (u ? u : `${window.location.origin}${window.location.pathname || '/'}`));
  }, []);

  useEffect(() => {
    if (!isAuth) return;
    bugReportApi
      .mine()
      .then(({ data }) => setMine(data.data || []))
      .catch(() => {});
  }, [isAuth]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuth) {
      toast.error(t('bugReport.errLogin'));
      return;
    }
    if (title.trim().length < 5) {
      toast.error(t('bugReport.errTitleShort'));
      return;
    }
    if (description.trim().length < 20) {
      toast.error(t('bugReport.errDescShort'));
      return;
    }
    try {
      setSending(true);
      await bugReportApi.submit({
        title: title.trim(),
        description: description.trim(),
        pageUrl: pageUrl.trim() || undefined,
        suggestion: suggestion.trim() || undefined,
      });
      toast.success(t('bugReport.success'));
      setTitle('');
      setDescription('');
      setSuggestion('');
      const { data } = await bugReportApi.mine();
      setMine(data.data || []);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || t('bugReport.errGeneric'));
    } finally {
      setSending(false);
    }
  };

  // Theme-aware
  const pageBg = isDark ? 'bg-[#0A0E1A] text-slate-200' : 'bg-slate-50 text-slate-900';
  const titleCls = isDark ? 'text-white' : 'text-slate-900';
  const subCls = isDark ? 'text-slate-400' : 'text-slate-600';
  const cardCls = isDark ? 'border-white/10 bg-white/[0.03]' : 'border-slate-200 bg-white shadow-sm';
  const cardTextCls = isDark ? 'text-slate-400' : 'text-slate-600';
  const labelCls = isDark ? 'text-slate-500' : 'text-slate-500';
  const inputCls = isDark
    ? 'border-white/10 bg-white/5 text-white focus:border-indigo-500/50'
    : 'border-slate-200 bg-slate-50 text-slate-900 focus:border-indigo-500';
  const histCardCls = isDark
    ? 'border-white/10 bg-[#0A0E1A]/80'
    : 'border-slate-200 bg-white';
  const histTitleCls = isDark ? 'text-white' : 'text-slate-900';
  const histStatusCls = isDark ? 'bg-white/10 text-slate-400' : 'bg-slate-100 text-slate-500';
  const histSubCls = isDark ? 'text-slate-500' : 'text-slate-500';
  const histNoteCls = isDark ? 'text-slate-400' : 'text-slate-600';
  const dividerCls = isDark ? 'border-white/10' : 'border-slate-200';
  const hintCls = isDark ? 'text-slate-500' : 'text-slate-500';

  return (
    <div className={`min-h-screen px-3 pb-20 pt-24 selection:bg-indigo-500/30 sm:px-4 sm:pt-28 md:px-6 ${pageBg}`}>
      <div className="mx-auto max-w-2xl">
        <h1 className={`text-2xl font-black tracking-tight sm:text-3xl ${titleCls}`}>{t('bugReport.pageTitle')}</h1>
        <p className={`mt-2 text-sm leading-relaxed ${subCls}`}>{t('bugReport.subtitle')}</p>

        {!isAuth ? (
          <div className={`mt-10 rounded-2xl border p-8 text-center ${cardCls}`}>
            <p className={`mb-4 ${cardTextCls}`}>{t('nav.login')} — {t('bugReport.loginRequired')}</p>
            <Link
              href={ROUTES.LOGIN}
              className="inline-flex rounded-2xl bg-indigo-600 px-6 py-3 font-bold text-white hover:bg-indigo-500"
            >
              {t('nav.login')}
            </Link>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="mt-8 space-y-5">
            <div>
              <label className={`mb-1.5 block text-xs font-bold uppercase tracking-wider ${labelCls}`}>
                {t('bugReport.fieldTitle')}
              </label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={160}
                required
                className={`w-full rounded-2xl border px-4 py-3 outline-none ${inputCls}`}
              />
            </div>
            <div>
              <label className={`mb-1.5 block text-xs font-bold uppercase tracking-wider ${labelCls}`}>
                {t('bugReport.fieldDesc')}
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={6}
                maxLength={8000}
                required
                className={`w-full resize-y rounded-2xl border px-4 py-3 text-sm outline-none ${inputCls}`}
              />
            </div>
            <div>
              <label className={`mb-1.5 block text-xs font-bold uppercase tracking-wider ${labelCls}`}>
                {t('bugReport.fieldUrl')}
              </label>
              <input
                value={pageUrl}
                onChange={(e) => setPageUrl(e.target.value)}
                maxLength={800}
                className={`w-full rounded-2xl border px-4 py-3 text-sm outline-none ${inputCls}`}
              />
            </div>
            <div>
              <label className={`mb-1.5 block text-xs font-bold uppercase tracking-wider ${labelCls}`}>
                {t('bugReport.fieldSuggestion')}
              </label>
              <p className={`mb-1 text-[11px] ${hintCls}`}>{t('bugReport.hintSuggestion')}</p>
              <textarea
                value={suggestion}
                onChange={(e) => setSuggestion(e.target.value)}
                rows={4}
                maxLength={4000}
                className={`w-full resize-y rounded-2xl border px-4 py-3 text-sm outline-none ${inputCls}`}
              />
            </div>
            <button
              type="submit"
              disabled={sending}
              className="w-full rounded-2xl bg-indigo-600 py-3.5 font-bold text-white transition-all hover:bg-indigo-500 disabled:opacity-50"
            >
              {sending ? t('bugReport.sending') : t('bugReport.submit')}
            </button>
          </form>
        )}

        {isAuth && mine.length > 0 && (
          <section className={`mt-14 border-t pt-10 ${dividerCls}`}>
            <h2 className={`mb-4 text-lg font-bold ${titleCls}`}>{t('bugReport.history')}</h2>
            <ul className="space-y-3">
              {mine.map((r) => (
                <li
                  key={r._id}
                  className={`rounded-2xl border px-4 py-3 text-sm ${histCardCls}`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className={`font-semibold ${histTitleCls}`}>{r.title}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${histStatusCls}`}>
                      {statusLabel(r.status, t)}
                    </span>
                  </div>
                  <div className={`mt-1 flex flex-wrap gap-3 text-xs ${histSubCls}`}>
                    <span>
                      {t('bugReport.bugXp')}: {r.bugXpGranted ? '+100' : '—'}
                    </span>
                    <span>
                      {t('bugReport.sugXp')}: {r.suggestionXpGranted ? '+100' : '—'}
                    </span>
                  </div>
                  {r.adminNote ? <p className={`mt-2 text-xs ${histNoteCls}`}>{r.adminNote}</p> : null}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
