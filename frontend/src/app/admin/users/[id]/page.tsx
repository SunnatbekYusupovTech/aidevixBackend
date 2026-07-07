'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getUserDetail, awardXpToUser, unwrapAdmin } from '@/api/adminApi';
import { FiArrowLeft, FiUser, FiAward, FiBookOpen, FiDollarSign, FiZap } from 'react-icons/fi';
import toast from 'react-hot-toast';

type UserDetail = {
  user: {
    _id: string; username: string; email: string; role: string;
    isActive: boolean; createdAt: string; avatar?: string;
  };
  stats: { xp: number; level: number; streak: number; badges: string[] } | null;
  enrollments: { _id: string; courseId?: { title?: string; category?: string }; createdAt: string; isCompleted: boolean }[];
  payments: { _id: string; amount: number; status: string; provider?: string; createdAt: string }[];
};

export default function AdminUserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData]           = useState<UserDetail | null>(null);
  const [loading, setLoading]     = useState(true);
  const [xpModal, setXpModal]     = useState(false);
  const [xpAmount, setXpAmount]   = useState(100);
  const [xpReason, setXpReason]   = useState('');
  const [awarding, setAwarding]   = useState(false);

  useEffect(() => {
    if (!id) return;
    getUserDetail(id)
      .then((res) => setData(unwrapAdmin<UserDetail>(res)))
      .catch(() => toast.error("Foydalanuvchi ma'lumotlarini yuklashda xato"))
      .finally(() => setLoading(false));
  }, [id]);

  const handleAwardXp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!xpAmount || xpAmount < 1) return toast.error('XP miqdorini kiriting');
    setAwarding(true);
    try {
      const res = await awardXpToUser(id, xpAmount, xpReason);
      const d = (res.data as { data: { xp: number; level: number } }).data;
      toast.success(`${xpAmount} XP berildi! Yangi XP: ${d.xp}`);
      setXpModal(false);
      setXpReason('');
      // Refresh stats
      getUserDetail(id).then(r => setData(unwrapAdmin<UserDetail>(r))).catch(() => {});
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || 'XP berishda xato');
    } finally {
      setAwarding(false);
    }
  };

  const fmt = (n: number) => new Intl.NumberFormat('uz-UZ').format(n || 0);
  const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('uz-UZ') : '—';

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <span className="loading loading-spinner loading-lg text-amber-400" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-8 text-center text-red-200">
        Foydalanuvchi topilmadi
      </div>
    );
  }

  const { user, stats, enrollments, payments } = data;

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="rounded-xl border border-slate-700 p-2 text-slate-300 hover:bg-white/5"
        >
          <FiArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h2 className="font-display text-2xl font-bold text-white">{user.username}</h2>
          <p className="text-sm text-slate-400">{user.email}</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setXpModal(true)}
            className="flex items-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-300 hover:bg-amber-500/20 transition-colors"
          >
            <FiZap className="h-3.5 w-3.5" /> XP Berish
          </button>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
            user.role === 'admin'
              ? 'border border-amber-500/30 bg-amber-500/15 text-amber-200'
              : 'border border-slate-600 bg-slate-900 text-slate-300'
          }`}>
            {user.role}
          </span>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
            user.isActive === false
              ? 'border border-red-500/30 bg-red-500/10 text-red-300'
              : 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
          }`}>
            {user.isActive === false ? 'Bloklangan' : 'Faol'}
          </span>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { icon: <FiAward />, label: 'XP', value: fmt(stats?.xp ?? 0), color: 'text-amber-400' },
          { icon: <FiUser />, label: 'Daraja', value: stats?.level ?? 0, color: 'text-sky-400' },
          { icon: <FiBookOpen />, label: 'Kurslar', value: enrollments.length, color: 'text-emerald-400' },
          { icon: <FiDollarSign />, label: "To'lovlar", value: payments.length, color: 'text-violet-400' },
        ].map((c) => (
          <div key={c.label} className="rounded-2xl border border-white/10 bg-[#111726] p-5">
            <div className={`mb-2 ${c.color}`}>{c.icon}</div>
            <p className="text-xs text-slate-500">{c.label}</p>
            <p className="mt-1 font-display text-2xl font-bold text-white">{c.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Enrollments */}
        <div className="rounded-2xl border border-white/10 bg-[#111726] p-6">
          <h3 className="mb-4 font-display text-lg font-bold text-white">Kurslar ({enrollments.length})</h3>
          {enrollments.length === 0 ? (
            <p className="text-sm text-slate-500">Kurslar yo'q</p>
          ) : (
            <ul className="space-y-2">
              {enrollments.map((e) => (
                <li key={e._id} className="flex items-center justify-between gap-3 rounded-xl border border-white/5 bg-slate-950/50 px-4 py-3 text-sm">
                  <span className="min-w-0 flex-1 truncate font-medium text-slate-200">
                    {e.courseId?.title || '—'}
                  </span>
                  <div className="flex shrink-0 items-center gap-2">
                    {e.courseId?.category && (
                      <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] text-slate-400">
                        {e.courseId.category}
                      </span>
                    )}
                    <span className={`text-xs ${e.isCompleted ? 'text-emerald-400' : 'text-slate-500'}`}>
                      {e.isCompleted ? 'Tugatgan' : 'Jarayonda'}
                    </span>
                    <span className="text-xs text-slate-600">{fmtDate(e.createdAt)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Payments */}
        <div className="rounded-2xl border border-white/10 bg-[#111726] p-6">
          <h3 className="mb-4 font-display text-lg font-bold text-white">To'lovlar ({payments.length})</h3>
          {payments.length === 0 ? (
            <p className="text-sm text-slate-500">To'lovlar yo'q</p>
          ) : (
            <ul className="space-y-2">
              {payments.map((p) => (
                <li key={p._id} className="flex items-center justify-between gap-3 rounded-xl border border-white/5 bg-slate-950/50 px-4 py-3 text-sm">
                  <span className="font-mono text-amber-200/90">{fmt(p.amount)} UZS</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs ${
                    p.status === 'completed'
                      ? 'bg-emerald-500/15 text-emerald-300'
                      : 'bg-slate-700/50 text-slate-300'
                  }`}>
                    {p.status}
                  </span>
                  <span className="text-xs text-slate-500">{p.provider || '—'}</span>
                  <span className="text-xs text-slate-600">{fmtDate(p.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Badges */}
      {stats?.badges && stats.badges.length > 0 && (
        <div className="rounded-2xl border border-white/10 bg-[#111726] p-6">
          <h3 className="mb-4 font-display text-lg font-bold text-white">Medalllar</h3>
          <div className="flex flex-wrap gap-2">
            {stats.badges.map((b) => (
              <span key={b} className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-sm text-amber-200">
                {b}
              </span>
            ))}
          </div>
        </div>
      )}

      <p className="text-xs text-slate-600">
        Ro'yxatdan o'tgan: {fmtDate(user.createdAt)} · ID: {user._id}
      </p>

      {/* XP Award Modal */}
      {xpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#111726] p-6 shadow-2xl">
            <div className="mb-5 flex items-center gap-2">
              <FiZap className="h-5 w-5 text-amber-400" />
              <h3 className="font-display text-lg font-bold text-white">XP Berish</h3>
            </div>
            <p className="mb-4 text-sm text-slate-400">
              <span className="font-semibold text-white">{user.username}</span> ga XP qo'shish
            </p>
            <form onSubmit={handleAwardXp} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-400">XP miqdori *</label>
                <div className="flex gap-2">
                  {[50, 100, 250, 500].map(v => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setXpAmount(v)}
                      className={`flex-1 rounded-lg border py-1.5 text-xs font-semibold transition-colors ${
                        xpAmount === v
                          ? 'border-amber-500/50 bg-amber-500/15 text-amber-300'
                          : 'border-white/10 text-slate-400 hover:bg-white/5'
                      }`}
                    >
                      {v}
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  value={xpAmount}
                  onChange={e => setXpAmount(Number(e.target.value))}
                  min={1}
                  max={100000}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-2.5 text-sm text-white focus:border-amber-500/50 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-400">Sabab (ixtiyoriy)</label>
                <input
                  value={xpReason}
                  onChange={e => setXpReason(e.target.value)}
                  placeholder="Musobaqa g'olibi, xizmat uchun..."
                  className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:border-amber-500/50 focus:outline-none"
                />
              </div>
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => { setXpModal(false); setXpReason(''); }}
                  className="flex-1 rounded-xl border border-white/10 py-2.5 text-sm text-slate-300 hover:bg-white/5"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={awarding}
                  className="flex-1 rounded-xl bg-amber-500 py-2.5 text-sm font-semibold text-black hover:bg-amber-400 disabled:opacity-60"
                >
                  {awarding ? 'Berilmoqda...' : `+${xpAmount} XP berish`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
