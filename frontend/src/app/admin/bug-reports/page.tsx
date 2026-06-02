'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  getAdminBugReports,
  reviewBugReport,
  unwrapAdmin,
} from '@/api/adminApi';
import toast from 'react-hot-toast';
import { FiAlertTriangle, FiCheck, FiX, FiGift, FiChevronDown, FiExternalLink } from 'react-icons/fi';

type BugReport = {
  _id: string;
  title: string;
  description: string;
  pageUrl?: string;
  suggestion?: string;
  status: 'pending' | 'rejected' | 'bug_ok' | 'done';
  bugXpGranted: boolean;
  suggestionXpGranted: boolean;
  adminNote?: string;
  createdAt: string;
  user?: { _id: string; username: string; email: string; avatar?: string };
};

const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: '', label: 'Hammasi' },
  { value: 'pending', label: 'Kutilmoqda' },
  { value: 'bug_ok', label: 'Bug tasdiqlandi' },
  { value: 'done', label: 'Yakunlandi' },
  { value: 'rejected', label: 'Rad etilgan' },
];

const STATUS_BADGE: Record<BugReport['status'], { label: string; cls: string }> = {
  pending:  { label: 'Kutilmoqda',      cls: 'bg-amber-500/15 text-amber-300' },
  bug_ok:   { label: 'Bug tasdiqlandi', cls: 'bg-sky-500/15 text-sky-300' },
  done:     { label: 'Yakunlandi',      cls: 'bg-emerald-500/15 text-emerald-300' },
  rejected: { label: 'Rad etilgan',     cls: 'bg-rose-500/15 text-rose-300' },
};

export default function AdminBugReportsPage() {
  const [reports, setReports] = useState<BugReport[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  const limit = 20;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAdminBugReports({ page, limit, status: status || undefined });
      const d = unwrapAdmin<{ items: BugReport[]; total: number }>(res);
      setReports(d.items ?? []);
      setTotal(d.total ?? 0);
    } catch {
      toast.error('Xabarlarni yuklashda xato');
    } finally {
      setLoading(false);
    }
  }, [page, status]);

  useEffect(() => { load(); }, [load]);

  const act = async (r: BugReport, action: 'reject' | 'award_bug' | 'award_suggestion') => {
    setActingId(r._id);
    try {
      await reviewBugReport(r._id, action, notes[r._id]?.trim() || undefined);
      toast.success(
        action === 'reject' ? 'Rad etildi'
        : action === 'award_bug' ? 'Bug mukofoti berildi'
        : 'Taklif mukofoti berildi'
      );
      await load();
    } catch {
      toast.error('Amalda xato');
    } finally {
      setActingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold text-white">Bug xabarlar</h2>
          <p className="mt-1 text-sm text-slate-400">Jami: {total} ta xabar</p>
        </div>
        <select
          value={status}
          onChange={e => { setStatus(e.target.value); setPage(1); }}
          className="rounded-xl border border-white/10 bg-[#0f121c] px-4 py-2.5 text-sm text-white focus:border-amber-500/50 focus:outline-none"
        >
          {STATUS_FILTERS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="flex h-48 items-center justify-center rounded-2xl border border-white/10 bg-[#0f121c]">
            <span className="loading loading-spinner loading-lg text-amber-400" />
          </div>
        ) : reports.length === 0 ? (
          <div className="flex h-48 flex-col items-center justify-center gap-3 rounded-2xl border border-white/10 bg-[#0f121c] text-slate-500">
            <FiAlertTriangle className="h-8 w-8" />
            <p className="text-sm">Xabarlar topilmadi</p>
          </div>
        ) : (
          reports.map(r => {
            const badge = STATUS_BADGE[r.status];
            const isOpen = expanded === r._id;
            const busy = actingId === r._id;
            return (
              <div key={r._id} className="overflow-hidden rounded-2xl border border-white/10 bg-[#0f121c]">
                <button
                  onClick={() => setExpanded(isOpen ? null : r._id)}
                  className="flex w-full items-center gap-4 px-5 py-4 text-left hover:bg-white/[0.02] transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${badge.cls}`}>
                        {badge.label}
                      </span>
                      <p className="truncate font-medium text-white">{r.title}</p>
                    </div>
                    <p className="mt-1 truncate text-xs text-slate-500">
                      {r.user?.username || '—'} · {new Date(r.createdAt).toLocaleDateString('uz')}
                    </p>
                  </div>
                  <FiChevronDown className={`h-5 w-5 shrink-0 text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>

                {isOpen && (
                  <div className="border-t border-white/10 px-5 py-4 space-y-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Tavsif</p>
                      <p className="mt-1 whitespace-pre-wrap text-sm text-slate-300">{r.description}</p>
                    </div>
                    {r.suggestion && (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Taklif</p>
                        <p className="mt-1 whitespace-pre-wrap text-sm text-slate-300">{r.suggestion}</p>
                      </div>
                    )}
                    {r.pageUrl && (
                      <a href={r.pageUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs text-sky-400 hover:underline">
                        <FiExternalLink className="h-3.5 w-3.5" /> {r.pageUrl}
                      </a>
                    )}
                    <div className="flex flex-wrap gap-4 text-xs text-slate-500">
                      <span>Bug XP: {r.bugXpGranted ? '✅' : '—'}</span>
                      <span>Taklif XP: {r.suggestionXpGranted ? '✅' : '—'}</span>
                      <span>Email: {r.user?.email || '—'}</span>
                    </div>
                    {r.adminNote && (
                      <p className="rounded-lg bg-white/5 px-3 py-2 text-xs text-slate-400">Admin izoh: {r.adminNote}</p>
                    )}

                    {(r.status === 'pending' || r.status === 'bug_ok') && (
                      <div className="space-y-3 border-t border-white/10 pt-4">
                        <input
                          value={notes[r._id] || ''}
                          onChange={e => setNotes(n => ({ ...n, [r._id]: e.target.value }))}
                          placeholder="Admin izohi (ixtiyoriy)"
                          className="w-full rounded-xl border border-white/10 bg-[#0b0e16] px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-amber-500/50 focus:outline-none"
                        />
                        <div className="flex flex-wrap gap-2">
                          {r.status === 'pending' && (
                            <>
                              <button
                                onClick={() => act(r, 'award_bug')}
                                disabled={busy}
                                className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-black hover:bg-emerald-400 disabled:opacity-50"
                              >
                                <FiCheck className="h-4 w-4" /> Bug mukofotini ber
                              </button>
                              <button
                                onClick={() => act(r, 'reject')}
                                disabled={busy}
                                className="inline-flex items-center gap-2 rounded-xl border border-rose-500/40 px-4 py-2 text-sm font-semibold text-rose-300 hover:bg-rose-500/10 disabled:opacity-50"
                              >
                                <FiX className="h-4 w-4" /> Rad etish
                              </button>
                            </>
                          )}
                          {r.status === 'bug_ok' && (
                            <button
                              onClick={() => act(r, 'award_suggestion')}
                              disabled={busy}
                              className="inline-flex items-center gap-2 rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-black hover:bg-sky-400 disabled:opacity-50"
                            >
                              <FiGift className="h-4 w-4" /> Taklif mukofotini ber
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">{total} tadan {(page - 1) * limit + 1}–{Math.min(page * limit, total)}</p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="rounded-lg border border-white/10 px-3 py-1.5 text-sm text-slate-300 hover:bg-white/5 disabled:opacity-40"
            >
              Oldingi
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="rounded-lg border border-white/10 px-3 py-1.5 text-sm text-slate-300 hover:bg-white/5 disabled:opacity-40"
            >
              Keyingi
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
