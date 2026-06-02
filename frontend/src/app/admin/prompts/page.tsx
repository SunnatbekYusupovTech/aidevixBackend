'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  getAdminPrompts,
  setPromptVisibility,
  featurePromptAdmin,
  deletePromptAdmin,
  unwrapAdmin,
} from '@/api/adminApi';
import toast from 'react-hot-toast';
import { FiSearch, FiStar, FiTrash2, FiEye, FiEyeOff, FiZap, FiHeart } from 'react-icons/fi';
import ConfirmModal from '@/components/admin/ConfirmModal';

type PromptRow = {
  _id: string;
  title: string;
  description?: string;
  content: string;
  category?: string;
  tool?: string;
  tags?: string[];
  isPublic: boolean;
  isFeatured: boolean;
  likesCount: number;
  viewsCount: number;
  createdAt: string;
  author?: { _id: string; username: string; email: string; avatar?: string };
};

const CATEGORIES = ['all', 'coding', 'debugging', 'vibe_coding', 'claude', 'cursor', 'copilot', 'architecture', 'refactoring', 'testing', 'documentation', 'other'];
const TOOLS = ['all', 'Claude Code', 'Cursor', 'GitHub Copilot', 'ChatGPT', 'Gemini', 'Windsurf', 'Any'];

export default function AdminPromptsPage() {
  const [prompts, setPrompts] = useState<PromptRow[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [tool, setTool] = useState('all');
  const [visibility, setVisibility] = useState<'' | 'public' | 'hidden'>('');
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState<PromptRow | null>(null);
  const [acting, setActing] = useState(false);

  const limit = 20;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAdminPrompts({
        page,
        limit,
        search: search.trim() || undefined,
        category: category !== 'all' ? category : undefined,
        tool: tool !== 'all' ? tool : undefined,
        visibility: visibility || undefined,
      });
      const d = unwrapAdmin<{ prompts: PromptRow[]; pagination: { total: number } }>(res);
      setPrompts(d.prompts ?? []);
      setTotal(d.pagination?.total ?? 0);
    } catch {
      toast.error('Promptlarni yuklashda xato');
    } finally {
      setLoading(false);
    }
  }, [page, search, category, tool, visibility]);

  useEffect(() => {
    const t = setTimeout(() => load(), search ? 350 : 0);
    return () => clearTimeout(t);
  }, [load, search]);

  const toggleVisibility = async (p: PromptRow) => {
    try {
      await setPromptVisibility(p._id, !p.isPublic);
      setPrompts(ps => ps.map(x => x._id === p._id ? { ...x, isPublic: !p.isPublic } : x));
      toast.success(p.isPublic ? 'Yashirildi' : 'Ochildi');
    } catch {
      toast.error('Xato');
    }
  };

  const toggleFeature = async (p: PromptRow) => {
    try {
      await featurePromptAdmin(p._id, !p.isFeatured);
      setPrompts(ps => ps.map(x => x._id === p._id ? { ...x, isFeatured: !p.isFeatured } : x));
      toast.success(p.isFeatured ? 'Feature olib tashlandi' : 'Featured qilindi');
    } catch {
      toast.error('Xato');
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setActing(true);
    try {
      await deletePromptAdmin(confirmDelete._id);
      setPrompts(ps => ps.filter(x => x._id !== confirmDelete._id));
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
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold text-white">Promptlar</h2>
          <p className="mt-1 text-sm text-slate-400">Jami: {total} ta prompt</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative min-w-[220px] flex-1">
          <FiSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Sarlavha, kontent, tavsif..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="w-full rounded-xl border border-white/10 bg-[#0f121c] py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-500 focus:border-amber-500/50 focus:outline-none"
          />
        </div>
        <select
          value={category}
          onChange={e => { setCategory(e.target.value); setPage(1); }}
          className="rounded-xl border border-white/10 bg-[#0f121c] px-4 py-2.5 text-sm text-white focus:border-amber-500/50 focus:outline-none"
        >
          {CATEGORIES.map(c => <option key={c} value={c}>{c === 'all' ? 'Barcha kategoriya' : c}</option>)}
        </select>
        <select
          value={tool}
          onChange={e => { setTool(e.target.value); setPage(1); }}
          className="rounded-xl border border-white/10 bg-[#0f121c] px-4 py-2.5 text-sm text-white focus:border-amber-500/50 focus:outline-none"
        >
          {TOOLS.map(t => <option key={t} value={t}>{t === 'all' ? 'Barcha tool' : t}</option>)}
        </select>
        <select
          value={visibility}
          onChange={e => { setVisibility(e.target.value as '' | 'public' | 'hidden'); setPage(1); }}
          className="rounded-xl border border-white/10 bg-[#0f121c] px-4 py-2.5 text-sm text-white focus:border-amber-500/50 focus:outline-none"
        >
          <option value="">Hammasi</option>
          <option value="public">Ochiq</option>
          <option value="hidden">Yashirilgan</option>
        </select>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0f121c]">
        {loading ? (
          <div className="flex h-48 items-center justify-center">
            <span className="loading loading-spinner loading-lg text-amber-400" />
          </div>
        ) : prompts.length === 0 ? (
          <div className="flex h-48 flex-col items-center justify-center gap-3 text-slate-500">
            <FiZap className="h-8 w-8" />
            <p className="text-sm">Promptlar topilmadi</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-xs uppercase tracking-wider text-slate-500">
                  <th className="px-5 py-4 text-left">Prompt</th>
                  <th className="px-5 py-4 text-left">Muallif</th>
                  <th className="px-5 py-4 text-left">Kategoriya</th>
                  <th className="px-5 py-4 text-left">Statistika</th>
                  <th className="px-5 py-4 text-left">Holat</th>
                  <th className="px-5 py-4 text-right">Amallar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {prompts.map(p => (
                  <tr key={p._id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-5 py-4">
                      <div className="max-w-md">
                        <div className="flex items-center gap-2">
                          {p.isFeatured && <FiStar className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />}
                          <p className="truncate font-medium text-white">{p.title}</p>
                        </div>
                        {p.description && (
                          <p className="mt-0.5 truncate text-xs text-slate-500">{p.description}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-xs">
                      <div className="text-slate-300">{p.author?.username || '—'}</div>
                      <div className="text-slate-600">{p.author?.email || ''}</div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-col gap-1">
                        {p.category && (
                          <span className="inline-flex w-fit items-center rounded-full bg-sky-500/15 px-2 py-0.5 text-xs text-sky-300">
                            {p.category}
                          </span>
                        )}
                        {p.tool && (
                          <span className="inline-flex w-fit items-center rounded-full bg-violet-500/15 px-2 py-0.5 text-xs text-violet-300">
                            {p.tool}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-xs text-slate-400">
                      <div className="flex items-center gap-1"><FiHeart className="h-3 w-3" /> {p.likesCount || 0}</div>
                      <div className="flex items-center gap-1 mt-0.5"><FiEye className="h-3 w-3" /> {p.viewsCount || 0}</div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        p.isPublic
                          ? 'bg-emerald-500/15 text-emerald-300'
                          : 'bg-slate-700/50 text-slate-400'
                      }`}>
                        {p.isPublic ? 'Ochiq' : 'Yashirilgan'}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => toggleFeature(p)}
                          title={p.isFeatured ? 'Featured olib tashlash' : 'Featured qilish'}
                          className={`rounded-lg p-2 transition-colors ${
                            p.isFeatured
                              ? 'text-amber-400 hover:bg-amber-500/10'
                              : 'text-slate-500 hover:bg-white/5 hover:text-amber-300'
                          }`}
                        >
                          <FiStar className={`h-4 w-4 ${p.isFeatured ? 'fill-current' : ''}`} />
                        </button>
                        <button
                          onClick={() => toggleVisibility(p)}
                          title={p.isPublic ? 'Yashirish' : 'Ochish'}
                          className="rounded-lg p-2 text-slate-500 hover:bg-white/5 hover:text-sky-300 transition-colors"
                        >
                          {p.isPublic ? <FiEyeOff className="h-4 w-4" /> : <FiEye className="h-4 w-4" />}
                        </button>
                        <button
                          onClick={() => setConfirmDelete(p)}
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

      <ConfirmModal
        open={!!confirmDelete}
        title="Promptni o'chirishni tasdiqlaysizmi?"
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
