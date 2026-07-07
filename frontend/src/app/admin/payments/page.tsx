'use client';

import React, { useEffect, useState } from 'react';
import { getRecentPayments, unwrapAdmin } from '@/api/adminApi';
import toast from 'react-hot-toast';
import { FiDownload } from 'react-icons/fi';

type Pay = {
  _id: string;
  amount: number;
  status: string;
  provider?: string;
  createdAt: string;
  user?: { username?: string; email?: string };
  course?: { title?: string };
};

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<Pay[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit] = useState(20);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await getRecentPayments({ page, limit });
        const d = unwrapAdmin<{ payments: Pay[]; pagination: { total: number } }>(res);
        if (cancelled) return;
        setPayments(d.payments || []);
        setTotal(d.pagination?.total ?? 0);
      } catch {
        if (!cancelled) toast.error("To'lovlarni yuklashda xato");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [page, limit]);

  const fmt = (n: number) => new Intl.NumberFormat('uz-UZ').format(n || 0);
  const pages = Math.max(1, Math.ceil(total / limit));

  const exportCSV = () => {
    const header = "Sana,Foydalanuvchi,Email,Kurs,Provayder,Holat,Summa (UZS)";
    const rows = payments.map((p) =>
      [
        p.createdAt ? new Date(p.createdAt).toLocaleDateString('uz-UZ') : '',
        p.user?.username || '',
        p.user?.email || '',
        p.course?.title || '',
        p.provider || '',
        p.status,
        p.amount,
      ].join(',')
    );
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payments-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold text-white">To’lovlar</h2>
          <p className="mt-1 text-sm text-slate-400">
            Yakunlangan va boshqa holatdagi tranzaksiyalar. Summa — backend bo’yicha UZS.
          </p>
        </div>
        <button
          type="button"
          onClick={exportCSV}
          disabled={payments.length === 0}
          className="flex w-full sm:w-auto shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-600 bg-slate-900 px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:border-emerald-500/50 hover:text-emerald-300 disabled:opacity-40"
        >
          <FiDownload className="h-4 w-4" />
          CSV eksport
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#111726] shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-white/10 bg-slate-950/80 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-5 py-4">Sana</th>
                <th className="px-5 py-4">Foydalanuvchi</th>
                <th className="px-5 py-4">Kurs</th>
                <th className="px-5 py-4">Provayder</th>
                <th className="px-5 py-4">Holat</th>
                <th className="px-5 py-4 text-right">Summa</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center">
                    <span className="loading loading-spinner loading-md text-amber-400" />
                  </td>
                </tr>
              ) : payments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    To‘lovlar hozircha yo‘q
                  </td>
                </tr>
              ) : (
                payments.map((p) => (
                  <tr key={p._id} className="hover:bg-white/[0.02]">
                    <td className="px-5 py-4 text-slate-400">
                      {p.createdAt ? new Date(p.createdAt).toLocaleString('uz-UZ') : '—'}
                    </td>
                    <td className="px-5 py-4">
                      <span className="font-medium text-white">{p.user?.username || '—'}</span>
                      <div className="max-w-[200px] truncate text-xs text-slate-500">{p.user?.email}</div>
                    </td>
                    <td className="max-w-[200px] truncate px-5 py-4 text-slate-300">{p.course?.title || '—'}</td>
                    <td className="px-5 py-4 text-slate-400">{p.provider || '—'}</td>
                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          p.status === 'completed'
                            ? 'bg-emerald-500/15 text-emerald-300'
                            : 'bg-slate-700/50 text-slate-300'
                        }`}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right font-mono text-amber-200/90">{fmt(p.amount)} UZS</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 px-5 py-4 text-xs text-slate-500">
          <span>
            Jami yozuvlar: <strong className="text-slate-300">{total}</strong>
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((x) => Math.max(1, x - 1))}
              className="rounded-lg border border-slate-700 px-3 py-1.5 text-slate-200 disabled:opacity-40"
            >
              Oldingi
            </button>
            <span className="self-center text-slate-400">
              {page} / {pages}
            </span>
            <button
              type="button"
              disabled={page >= pages}
              onClick={() => setPage((x) => Math.min(pages, x + 1))}
              className="rounded-lg border border-slate-700 px-3 py-1.5 text-slate-200 disabled:opacity-40"
            >
              Keyingi
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
