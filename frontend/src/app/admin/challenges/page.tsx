'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  getAdminChallenges,
  updateChallenge,
  deleteChallenge,
  unwrapAdmin,
} from '@/api/adminApi';
import toast from 'react-hot-toast';
import { FiAward, FiTrash2, FiEdit2, FiX, FiCheck } from 'react-icons/fi';
import ConfirmModal from '@/components/admin/ConfirmModal';

type Challenge = {
  _id: string;
  title: string;
  description: string;
  type: string;
  targetCount: number;
  xpReward: number;
  date: string;
  isActive: boolean;
  createdAt: string;
};

const TYPES = ['watch_video', 'complete_quiz', 'streak', 'enroll_course', 'rate_course', 'use_ai_tool', 'share_prompt'];
const TYPE_LABEL: Record<string, string> = {
  watch_video: 'Video ko\'rish',
  complete_quiz: 'Kviz yechish',
  streak: 'Streak',
  enroll_course: 'Kursga yozilish',
  rate_course: 'Kurs baholash',
  use_ai_tool: 'AI tool',
  share_prompt: 'Prompt ulashish',
};

export default function AdminChallengesPage() {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Challenge | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Challenge | null>(null);
  const [acting, setActing] = useState(false);

  const limit = 30;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAdminChallenges({ page, limit });
      const d = unwrapAdmin<{ challenges: Challenge[]; pagination: { total: number } }>(res);
      setChallenges(d.challenges ?? []);
      setTotal(d.pagination?.total ?? 0);
    } catch {
      toast.error('Vazifalarni yuklashda xato');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { load(); }, [load]);

  const toggleActive = async (c: Challenge) => {
    try {
      await updateChallenge(c._id, { isActive: !c.isActive });
      setChallenges(cs => cs.map(x => x._id === c._id ? { ...x, isActive: !c.isActive } : x));
      toast.success(c.isActive ? 'O\'chirildi' : 'Faollashtirildi');
    } catch {
      toast.error('Xato');
    }
  };

  const saveEdit = async () => {
    if (!editing) return;
    if (!editing.title.trim() || !editing.description.trim()) {
      toast.error('Sarlavha va tavsif bo\'sh bo\'lmasin');
      return;
    }
    setSaving(true);
    try {
      const res = await updateChallenge(editing._id, {
        title: editing.title.trim(),
        description: editing.description.trim(),
        type: editing.type,
        targetCount: Number(editing.targetCount) || 1,
        xpReward: Number(editing.xpReward) || 0,
        isActive: editing.isActive,
      });
      const updated = unwrapAdmin<{ challenge: Challenge }>(res).challenge;
      setChallenges(cs => cs.map(x => x._id === editing._id ? { ...x, ...updated } : x));
      toast.success('Saqlandi');
      setEditing(null);
    } catch {
      toast.error('Saqlashda xato (qiymatlarni tekshiring)');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setActing(true);
    try {
      await deleteChallenge(confirmDelete._id);
      setChallenges(cs => cs.filter(x => x._id !== confirmDelete._id));
      setTotal(t => Math.max(0, t - 1));
      toast.success('O\'chirildi');
      setConfirmDelete(null);
    } catch {
      toast.error('O\'chirishda xato');
    } finally {
      setActing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold text-white">Kunlik vazifalar</h2>
        <p className="mt-1 text-sm text-slate-400">Jami: {total} ta vazifa</p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0f121c]">
        {loading ? (
          <div className="flex h-48 items-center justify-center">
            <span className="loading loading-spinner loading-lg text-amber-400" />
          </div>
        ) : challenges.length === 0 ? (
          <div className="flex h-48 flex-col items-center justify-center gap-3 text-slate-500">
            <FiAward className="h-8 w-8" />
            <p className="text-sm">Vazifalar topilmadi</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-xs uppercase tracking-wider text-slate-500">
                  <th className="px-5 py-4 text-left">Vazifa</th>
                  <th className="px-5 py-4 text-left">Tur</th>
                  <th className="px-5 py-4 text-left">Maqsad</th>
                  <th className="px-5 py-4 text-left">XP</th>
                  <th className="px-5 py-4 text-left">Sana</th>
                  <th className="px-5 py-4 text-left">Holat</th>
                  <th className="px-5 py-4 text-right">Amallar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {challenges.map(c => (
                  <tr key={c._id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-5 py-4">
                      <div className="max-w-md">
                        <p className="truncate font-medium text-white">{c.title}</p>
                        <p className="mt-0.5 truncate text-xs text-slate-500">{c.description}</p>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="inline-flex w-fit items-center rounded-full bg-violet-500/15 px-2 py-0.5 text-xs text-violet-300">
                        {TYPE_LABEL[c.type] || c.type}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-slate-300">{c.targetCount}</td>
                    <td className="px-5 py-4 text-amber-300">+{c.xpReward}</td>
                    <td className="px-5 py-4 text-xs text-slate-400">{c.date}</td>
                    <td className="px-5 py-4">
                      <button
                        onClick={() => toggleActive(c)}
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors ${
                          c.isActive
                            ? 'bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25'
                            : 'bg-slate-700/50 text-slate-400 hover:bg-slate-600/50'
                        }`}
                      >
                        {c.isActive ? 'Faol' : 'Nofaol'}
                      </button>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => setEditing(c)}
                          title="Tahrirlash"
                          className="rounded-lg p-2 text-slate-500 hover:bg-white/5 hover:text-sky-300 transition-colors"
                        >
                          <FiEdit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setConfirmDelete(c)}
                          title="O'chirish"
                          className="rounded-lg p-2 text-slate-500 hover:bg-red-500/10 hover:text-red-400 transition-colors"
                        >
                          <FiTrash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => !saving && setEditing(null)}>
          <div
            className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#0f121c] p-6 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">Vazifani tahrirlash</h3>
              <button onClick={() => !saving && setEditing(null)} className="rounded-lg p-1.5 text-slate-500 hover:bg-white/5 hover:text-white">
                <FiX className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-400">Sarlavha</label>
                <input
                  value={editing.title}
                  onChange={e => setEditing({ ...editing, title: e.target.value })}
                  className="w-full rounded-xl border border-white/10 bg-[#0b0e16] px-4 py-2.5 text-sm text-white focus:border-amber-500/50 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-400">Tavsif</label>
                <textarea
                  value={editing.description}
                  onChange={e => setEditing({ ...editing, description: e.target.value })}
                  rows={3}
                  className="w-full resize-none rounded-xl border border-white/10 bg-[#0b0e16] px-4 py-2.5 text-sm text-white focus:border-amber-500/50 focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="mb-1.5 block text-xs font-medium text-slate-400">Tur</label>
                  <select
                    value={editing.type}
                    onChange={e => setEditing({ ...editing, type: e.target.value })}
                    className="w-full rounded-xl border border-white/10 bg-[#0b0e16] px-4 py-2.5 text-sm text-white focus:border-amber-500/50 focus:outline-none"
                  >
                    {TYPES.map(t => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-400">Maqsad miqdori</label>
                  <input
                    type="number"
                    min={1}
                    value={editing.targetCount}
                    onChange={e => setEditing({ ...editing, targetCount: Number(e.target.value) })}
                    className="w-full rounded-xl border border-white/10 bg-[#0b0e16] px-4 py-2.5 text-sm text-white focus:border-amber-500/50 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-400">XP mukofot</label>
                  <input
                    type="number"
                    min={0}
                    value={editing.xpReward}
                    onChange={e => setEditing({ ...editing, xpReward: Number(e.target.value) })}
                    className="w-full rounded-xl border border-white/10 bg-[#0b0e16] px-4 py-2.5 text-sm text-white focus:border-amber-500/50 focus:outline-none"
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-300">
                <input
                  type="checkbox"
                  checked={editing.isActive}
                  onChange={e => setEditing({ ...editing, isActive: e.target.checked })}
                  className="h-4 w-4 rounded border-white/20 bg-[#0b0e16]"
                />
                Faol
              </label>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setEditing(null)}
                disabled={saving}
                className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-300 hover:bg-white/5 disabled:opacity-40"
              >
                Bekor
              </button>
              <button
                onClick={saveEdit}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-black hover:bg-amber-400 disabled:opacity-50"
              >
                <FiCheck className="h-4 w-4" /> {saving ? 'Saqlanmoqda...' : 'Saqlash'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={!!confirmDelete}
        title="Vazifani o'chirishni tasdiqlaysizmi?"
        message={confirmDelete ? `"${confirmDelete.title}" — qaytarib bo'lmaydi.` : ''}
        confirmLabel="O'chirish"
        variant="danger"
        loading={acting}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}
