'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { getAllEnrollments, unwrapAdmin } from '@/api/adminApi';
import { FiList, FiCheckCircle, FiClock } from 'react-icons/fi';
import toast from 'react-hot-toast';

type Enrollment = {
  _id: string;
  userId?: { _id: string; username: string; email: string; avatar?: string };
  courseId?: { _id: string; title: string; category?: string; thumbnail?: string };
  isCompleted: boolean;
  progress?: number;
  createdAt: string;
};

export default function EnrollmentsPage() {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [total, setTotal]             = useState(0);
  const [page, setPage]               = useState(1);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState('');
  const [debouncedSearch, setDebounced] = useState('');
  const [completedFilter, setCompleted] = useState('');

  const limit = 20;

  // Debounce
  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAllEnrollments({
        page, limit,
        search: debouncedSearch,
        isCompleted: completedFilter,
      });
      const d = unwrapAdmin<{ enrollments: Enrollment[]; pagination: { total: number } }>(res);
      setEnrollments(d.enrollments);
      setTotal(d.pagination.total);
    } catch {
      toast.error('Yozilmalarni yuklashda xato');
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, completedFilter]);

  useEffect(() => { load(); }, [load]);

  const fmtDate = (d: string) => new Date(d).toLocaleDateString('uz-UZ');
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="font-display text-2xl font-bold text-white">Yozilmalar</h2>
        <p className="mt-1 text-sm text-slate-400">Jami: {total} ta yozilma</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Foydalanuvchi yoki kurs bo'yicha qidirish..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          className="flex-1 min-w-[220px] rounded-xl border border-white/10 bg-[#111726] px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-amber-500/50 focus:outline-none"
        />
        <select
          value={completedFilter}
          onChange={e => { setCompleted(e.target.value); setPage(1); }}
          className="rounded-xl border border-white/10 bg-[#111726] px-4 py-2.5 text-sm text-white focus:border-amber-500/50 focus:outline-none"
        >
          <option value="">Barchasi</option>
          <option value="true">Tugatganlar</option>
          <option value="false">Jarayondagilar</option>
        </select>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Jami yozilma', value: total, color: 'text-white' },
          { label: 'Tugatganlar', value: enrollments.filter(e => e.isCompleted).length, color: 'text-emerald-400' },
          { label: 'Jarayonda', value: enrollments.filter(e => !e.isCompleted).length, color: 'text-amber-400' },
        ].map(s => (
          <div key={s.label} className="rounded-2xl border border-white/10 bg-[#111726] px-5 py-4">
            <p className="text-xs text-slate-500">{s.label}</p>
            <p className={`mt-1 font-display text-2xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#111726]">
        {loading ? (
          <div className="flex h-48 items-center justify-center">
            <span className="loading loading-spinner loading-lg text-amber-400" />
          </div>
        ) : enrollments.length === 0 ? (
          <div className="flex h-48 flex-col items-center justify-center gap-3 text-slate-500">
            <FiList className="h-8 w-8" />
            <p className="text-sm">Yozilmalar topilmadi</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-xs uppercase tracking-wider text-slate-500">
                  <th className="px-5 py-4 text-left">Foydalanuvchi</th>
                  <th className="px-5 py-4 text-left">Kurs</th>
                  <th className="px-5 py-4 text-left">Kategoriya</th>
                  <th className="px-5 py-4 text-left">Holat</th>
                  <th className="px-5 py-4 text-left">Sana</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {enrollments.map(e => (
                  <tr key={e._id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-5 py-4">
                      <div>
                        <p className="font-medium text-slate-200">{e.userId?.username || '—'}</p>
                        <p className="text-xs text-slate-500">{e.userId?.email || ''}</p>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <p className="max-w-[220px] truncate font-medium text-slate-200">
                        {e.courseId?.title || '—'}
                      </p>
                    </td>
                    <td className="px-5 py-4">
                      {e.courseId?.category ? (
                        <span className="rounded-full bg-slate-800 px-2.5 py-0.5 text-xs text-slate-400">
                          {e.courseId.category}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-5 py-4">
                      {e.isCompleted ? (
                        <span className="flex items-center gap-1.5 text-emerald-400 text-xs font-semibold">
                          <FiCheckCircle className="h-3.5 w-3.5" /> Tugatgan
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-amber-400 text-xs font-semibold">
                          <FiClock className="h-3.5 w-3.5" /> Jarayonda
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-xs text-slate-500">{fmtDate(e.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">
            {total} tadan {(page - 1) * limit + 1}–{Math.min(page * limit, total)}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="rounded-lg border border-white/10 px-3 py-1.5 text-sm text-slate-300 hover:bg-white/5 disabled:opacity-40"
            >
              Oldingi
            </button>
            <span className="flex items-center px-3 text-sm text-slate-400">
              {page} / {totalPages}
            </span>
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
