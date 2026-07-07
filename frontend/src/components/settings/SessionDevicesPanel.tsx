'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { sessionApi, type SessionInfo } from '@/api/sessionApi';
import { useLang } from '@/context/LangContext';

const formatDate = (iso: string, locale: string) => {
  try {
    return new Date(iso).toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return iso;
  }
};

const summariseUa = (ua: string | null, unknownDeviceLabel: string, browserLabel: string) => {
  if (!ua) return unknownDeviceLabel;
  const lower = ua.toLowerCase();
  let os = 'OS';
  if (lower.includes('windows')) os = 'Windows';
  else if (lower.includes('mac os') || lower.includes('macintosh')) os = 'macOS';
  else if (lower.includes('iphone') || lower.includes('ios')) os = 'iOS';
  else if (lower.includes('android')) os = 'Android';
  else if (lower.includes('linux')) os = 'Linux';

  let browser = browserLabel;
  if (lower.includes('edg/')) browser = 'Edge';
  else if (lower.includes('chrome/')) browser = 'Chrome';
  else if (lower.includes('firefox/')) browser = 'Firefox';
  else if (lower.includes('safari/')) browser = 'Safari';
  return `${browser} · ${os}`;
};

export default function SessionDevicesPanel() {
  const { t, lang } = useLang();
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [revokingAll, setRevokingAll] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await sessionApi.list();
      const raw = res.data as { data?: SessionInfo[] };
      setSessions(Array.isArray(raw.data) ? raw.data : []);
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      toast.error(msg || t('security.sessions.toast.loadError'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  const revoke = async (id: string) => {
    setBusyId(id);
    try {
      await sessionApi.revoke(id);
      toast.success(t('security.sessions.toast.revoked'));
      setSessions((prev) => prev.filter((s) => s.id !== id));
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      toast.error(msg || t('security.sessions.toast.revokeFailed'));
    } finally {
      setBusyId(null);
    }
  };

  const revokeAllOthers = async () => {
    if (sessions.length <= 1) return;
    if (!window.confirm(t('security.sessions.confirmRevokeOthers'))) {
      return;
    }
    setRevokingAll(true);
    try {
      const res = await sessionApi.revokeOthers();
      const m = (res.data as { message?: string } | undefined)?.message;
      toast.success(m || t('security.sessions.toast.revokedOthers'));
      await load();
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      toast.error(msg || t('security.sessions.toast.revokeFailed'));
    } finally {
      setRevokingAll(false);
    }
  };

  return (
    <section className="bg-[#111726]/40 border border-white/5 rounded-2xl p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <h2 className="text-lg font-semibold">{t('security.sessions.title')}</h2>
          <p className="text-slate-400 text-sm mt-0.5">{t('security.sessions.subtitle')}</p>
        </div>
        {sessions.length > 1 && (
          <button
            type="button"
            onClick={revokeAllOthers}
            disabled={revokingAll || loading}
            className="shrink-0 text-xs sm:text-sm px-4 py-2 rounded-xl bg-orange-500/15 text-orange-200 border border-orange-500/25 hover:bg-orange-500/25 transition disabled:opacity-50"
          >
            {revokingAll ? t('security.sessions.revoking') : t('security.sessions.revokeOthers')}
          </button>
        )}
      </div>

      {loading ? (
        <p className="text-slate-500 text-sm">{t('general.loading')}</p>
      ) : sessions.length === 0 ? (
        <p className="text-slate-500 text-sm">{t('security.sessions.empty')}</p>
      ) : (
        <ul className="space-y-3">
          {sessions.map((s) => (
            <li
              key={s.id}
              className={`rounded-xl border p-4 ${
                s.current ? 'border-indigo-500/35 bg-indigo-500/[0.07]' : 'border-white/10 bg-white/[0.03]'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm text-slate-100">{summariseUa(s.ua, t('security.sessions.unknownDevice'), t('security.sessions.browser'))}</span>
                    {s.current && (
                      <span className="text-[10px] uppercase tracking-wide bg-indigo-500/25 text-indigo-200 px-2 py-0.5 rounded-md">
                        {t('security.sessions.thisDevice')}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {t('security.sessions.ip')}: <span className="text-slate-300">{s.ip || '—'}</span>
                  </p>
                  <p className="text-xs text-slate-500">{t('security.sessions.lastActive')}: {formatDate(s.lastUsedAt, lang === 'ru' ? 'ru-RU' : lang === 'en' ? 'en-US' : 'uz-UZ')}</p>
                  <p className="text-xs text-slate-600 mt-0.5">
                    {t('security.sessions.created')}: {formatDate(s.createdAt, lang === 'ru' ? 'ru-RU' : lang === 'en' ? 'en-US' : 'uz-UZ')} · {t('security.sessions.expires')}: {formatDate(s.absoluteExpiresAt, lang === 'ru' ? 'ru-RU' : lang === 'en' ? 'en-US' : 'uz-UZ')}
                  </p>
                </div>
                {!s.current && (
                  <button
                    type="button"
                    onClick={() => revoke(s.id)}
                    disabled={busyId === s.id}
                    className="shrink-0 text-xs px-3 py-1.5 rounded-lg bg-rose-500/15 text-rose-200 border border-rose-500/20 hover:bg-rose-500/25 disabled:opacity-50"
                  >
                    {busyId === s.id ? '…' : t('security.sessions.revokeOne')}
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
