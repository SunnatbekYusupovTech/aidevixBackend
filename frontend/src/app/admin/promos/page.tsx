'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  getPromoCodes, createPromoCode, updatePromoCode, deletePromoCode, unwrapAdmin,
} from '@/api/adminApi';
import { FiPlus, FiTrash2, FiToggleLeft, FiToggleRight, FiTag } from 'react-icons/fi';
import toast from 'react-hot-toast';

type PromoCode = {
  _id: string;
  code: string;
  description: string;
  type: 'percent' | 'fixed';
  value: number;
  maxUses: number | null;
  usedCount: number;
  expiresAt: string | null;
  isActive: boolean;
  createdBy?: { username: string };
  createdAt: string;
};

const EMPTY_FORM = {
  code: '', description: '', type: 'percent' as 'percent' | 'fixed',
  value: 10, maxUses: '', expiresAt: '',
};

export default function PromosPage() {
  const [promos, setPromos]       = useState<PromoCode[]>([]);
  const [total, setTotal]         = useState(0);
  const [page, setPage]           = useState(1);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [statusFilter, setStatus] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm]           = useState(EMPTY_FORM);
  const [creating, setCreating]   = useState(false);
  const [deletingId, setDel]      = useState<string | null>(null);

  const limit = 20;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getPromoCodes({ page, limit, search, status: statusFilter });
      const d   = unwrapAdmin<{ promos: PromoCode[]; pagination: { total: number } }>(res);
      setPromos(d.promos);
      setTotal(d.pagination.total);
    } catch {
      toast.error('Promo kodlarni yuklashda xato');
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.code.trim() || !form.value) return toast.error('Kod va qiymat majburiy');
    setCreating(true);
    try {
      await createPromoCode({
        code: form.code.trim().toUpperCase(),
        description: form.description,
        type: form.type,
        value: Number(form.value),
        maxUses: form.maxUses ? Number(form.maxUses) : null,
        expiresAt: form.expiresAt || null,
      });
      toast.success('Promo kod yaratildi');
      setShowModal(false);
      setForm(EMPTY_FORM);
      load();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || 'Yaratishda xato');
    } finally {
      setCreating(false);
    }
  };

  const toggleActive = async (promo: PromoCode) => {
    try {
      await updatePromoCode(promo._id, { isActive: !promo.isActive });
      setPromos(ps => ps.map(p => p._id === promo._id ? { ...p, isActive: !p.isActive } : p));
    } catch {
      toast.error('Holatni o\'zgartirishda xato');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bu promo kodni o\'chirishni tasdiqlaysizmi?')) return;
    setDel(id);
    try {
      await deletePromoCode(id);
      toast.success('O\'chirildi');
      setPromos(ps => ps.filter(p => p._id !== id));
      setTotal(t => t - 1);
    } catch {
      toast.error('O\'chirishda xato');
    } finally {
      setDel(null);
    }
  };

  const fmtDate = (d: string | null) => d ? new Date(d).toLocaleDateString('uz-UZ') : '—';
  const isExpired = (d: string | null) => d ? new Date(d) < new Date() : false;
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold text-white">Promo Kodlar</h2>
          <p className="mt-1 text-sm text-slate-400">Jami: {total} ta kod</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-black hover:bg-amber-400 transition-colors"
        >
          <FiPlus className="h-4 w-4" /> Yangi kod
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Kod bo'yicha qidirish..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          className="flex-1 min-w-[200px] rounded-xl border border-white/10 bg-[#111726] px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-amber-500/50 focus:outline-none"
        />
        <select
          value={statusFilter}
          onChange={e => { setStatus(e.target.value); setPage(1); }}
          className="rounded-xl border border-white/10 bg-[#111726] px-4 py-2.5 text-sm text-white focus:border-amber-500/50 focus:outline-none"
        >
          <option value="">Barchasi</option>
          <option value="active">Faol</option>
          <option value="inactive">Nofaol</option>
        </select>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#111726]">
        {loading ? (
          <div className="flex h-48 items-center justify-center">
            <span className="loading loading-spinner loading-lg text-amber-400" />
          </div>
        ) : promos.length === 0 ? (
          <div className="flex h-48 flex-col items-center justify-center gap-3 text-slate-500">
            <FiTag className="h-8 w-8" />
            <p className="text-sm">Promo kodlar topilmadi</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-xs uppercase tracking-wider text-slate-500">
                  <th className="px-5 py-4 text-left">Kod</th>
                  <th className="px-5 py-4 text-left">Tur / Qiymat</th>
                  <th className="px-5 py-4 text-left">Foydalanildi</th>
                  <th className="px-5 py-4 text-left">Muddati</th>
                  <th className="px-5 py-4 text-left">Holat</th>
                  <th className="px-5 py-4 text-left">Yaratilgan</th>
                  <th className="px-5 py-4 text-right">Amallar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {promos.map(p => (
                  <tr key={p._id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-5 py-4">
                      <div>
                        <span className="font-mono font-bold text-amber-300">{p.code}</span>
                        {p.description && (
                          <p className="mt-0.5 text-xs text-slate-500 truncate max-w-[160px]">{p.description}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        p.type === 'percent'
                          ? 'bg-sky-500/15 text-sky-300'
                          : 'bg-violet-500/15 text-violet-300'
                      }`}>
                        {p.type === 'percent' ? `${p.value}%` : `${new Intl.NumberFormat('uz-UZ').format(p.value)} UZS`}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-slate-300">
                      {p.usedCount}
                      {p.maxUses !== null && (
                        <span className="text-slate-500"> / {p.maxUses}</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      {p.expiresAt ? (
                        <span className={isExpired(p.expiresAt) ? 'text-red-400' : 'text-slate-300'}>
                          {fmtDate(p.expiresAt)}
                          {isExpired(p.expiresAt) && <span className="ml-1 text-xs">(tugagan)</span>}
                        </span>
                      ) : (
                        <span className="text-slate-500">Muddatsiz</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <button
                        onClick={() => toggleActive(p)}
                        className={`flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors ${
                          p.isActive
                            ? 'bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25'
                            : 'bg-slate-700/50 text-slate-400 hover:bg-slate-700'
                        }`}
                      >
                        {p.isActive ? <FiToggleRight className="h-3.5 w-3.5" /> : <FiToggleLeft className="h-3.5 w-3.5" />}
                        {p.isActive ? 'Faol' : 'Nofaol'}
                      </button>
                    </td>
                    <td className="px-5 py-4 text-xs text-slate-500">
                      <div>{fmtDate(p.createdAt)}</div>
                      {p.createdBy && <div className="text-slate-600">{p.createdBy.username}</div>}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={() => handleDelete(p._id)}
                        disabled={deletingId === p._id}
                        className="rounded-lg p-2 text-slate-500 hover:bg-red-500/10 hover:text-red-400 transition-colors disabled:opacity-50"
                      >
                        <FiTrash2 className="h-4 w-4" />
                      </button>
                    </td>
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

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#111726] p-6 shadow-2xl">
            <h3 className="mb-5 font-display text-xl font-bold text-white">Yangi promo kod</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-400">Kod *</label>
                <input
                  value={form.code}
                  onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                  placeholder="SUMMER25"
                  className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-2.5 font-mono text-sm uppercase text-white placeholder-slate-600 focus:border-amber-500/50 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-400">Tavsif (ixtiyoriy)</label>
                <input
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Yozgi chegirma..."
                  className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:border-amber-500/50 focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-400">Tur *</label>
                  <select
                    value={form.type}
                    onChange={e => setForm(f => ({ ...f, type: e.target.value as 'percent' | 'fixed' }))}
                    className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-2.5 text-sm text-white focus:border-amber-500/50 focus:outline-none"
                  >
                    <option value="percent">Foiz (%)</option>
                    <option value="fixed">Belgilangan (UZS)</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-400">
                    Qiymat * {form.type === 'percent' ? '(%)' : '(UZS)'}
                  </label>
                  <input
                    type="number"
                    value={form.value}
                    onChange={e => setForm(f => ({ ...f, value: Number(e.target.value) }))}
                    min={1}
                    max={form.type === 'percent' ? 100 : undefined}
                    className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-2.5 text-sm text-white focus:border-amber-500/50 focus:outline-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-400">Max foydalanish</label>
                  <input
                    type="number"
                    value={form.maxUses}
                    onChange={e => setForm(f => ({ ...f, maxUses: e.target.value }))}
                    placeholder="Cheksiz"
                    min={1}
                    className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:border-amber-500/50 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-400">Tugash sanasi</label>
                  <input
                    type="date"
                    value={form.expiresAt}
                    onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))}
                    className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-2.5 text-sm text-white focus:border-amber-500/50 focus:outline-none"
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); setForm(EMPTY_FORM); }}
                  className="flex-1 rounded-xl border border-white/10 py-2.5 text-sm text-slate-300 hover:bg-white/5"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 rounded-xl bg-amber-500 py-2.5 text-sm font-semibold text-black hover:bg-amber-400 disabled:opacity-60"
                >
                  {creating ? 'Yaratilmoqda...' : 'Yaratish'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
