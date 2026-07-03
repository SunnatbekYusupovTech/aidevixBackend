'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IoClose, IoCopy, IoChevronForward } from 'react-icons/io5';
import { FiBookmark } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import { promptApi, type Prompt } from '@api/promptApi';
import { useLang } from '@/context/LangContext';

const CATEGORY_KEYS = [
  'all', 'system', 'vibe_coding', 'claude', 'cursor', 'copilot',
  'coding', 'debugging', 'architecture', 'refactoring', 'testing', 'documentation',
] as const;

const CATEGORY_EMOJI: Record<string, string> = {
  all: '🌐', system: '⚙️', vibe_coding: '⚡', claude: '🤖', cursor: '🖱️', copilot: '🐙',
  coding: '💻', debugging: '🔍', architecture: '🏗️', refactoring: '♻️', testing: '🧪', documentation: '📚',
};

function categoryMeta(key: string, t: (k: string, v?: Record<string, string>) => string) {
  return {
    key,
    label: t(`prompts.cat.${key}`),
    emoji: CATEGORY_EMOJI[key] ?? '📎',
  };
}

type SavedRow = Prompt & { savedAt?: string };

function DetailSheet({ prompt, onClose, onUnsave }: { prompt: SavedRow; onClose: () => void; onUnsave: () => void }) {
  const { t } = useLang();
  const [copied, setCopied] = useState(false);
  const cat = categoryMeta(prompt.category, t);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(prompt.content);
      setCopied(true);
      toast.success(t('profile.savedPrompts.copyOk'));
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t('profile.savedPrompts.copyErr'));
    }
  };

  return (
    <motion.div
      className="fixed inset-0 z-[200] flex items-end justify-center sm:items-center sm:p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <button type="button" aria-label="close" onClick={onClose} className="absolute inset-0 bg-black/75 backdrop-blur-sm" />
      <motion.div
        initial={{ y: '100%', opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: '100%', opacity: 0 }}
        transition={{ type: 'spring', damping: 28, stiffness: 320 }}
        className="relative flex max-h-[min(92vh,880px)] w-full max-w-3xl flex-col overflow-hidden rounded-t-[1.75rem] border border-white/10 bg-[#0A0E1A] shadow-2xl sm:rounded-3xl"
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-white/5 px-5 py-4 sm:px-6 sm:py-5">
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="rounded-lg border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                {cat.emoji} {cat.label}
              </span>
              <span className="rounded-lg border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-bold text-slate-400">
                {prompt.tool}
              </span>
            </div>
            <h2 className="text-balance text-lg font-bold leading-snug text-white sm:text-xl">{prompt.title}</h2>
            <p className="mt-1 text-xs text-slate-500">@{prompt.author?.username}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/5 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
          >
            <IoClose size={20} />
          </button>
        </div>
        {prompt.description?.trim() ? (
          <p className="shrink-0 border-b border-white/5 px-5 py-3 text-sm leading-relaxed text-slate-400 sm:px-6">
            {prompt.description}
          </p>
        ) : null}
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6 sm:py-5">
          <pre className="whitespace-pre-wrap break-words font-mono text-[13px] leading-relaxed text-slate-200 sm:text-sm">
            {prompt.content}
          </pre>
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-white/5 bg-[#0A0E1A]/80 px-5 py-4 backdrop-blur sm:px-6">
          <button
            type="button"
            onClick={onUnsave}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-bold text-slate-300 transition-all hover:bg-white/10"
          >
            {t('profile.savedPrompts.unsave')}
          </button>
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-2 rounded-xl border border-indigo-500/20 bg-indigo-600/15 px-4 py-2.5 text-xs font-bold text-indigo-300 transition-all hover:bg-indigo-600/25"
          >
            <IoCopy size={14} /> {copied ? t('profile.savedPrompts.copied') : t('profile.savedPrompts.copy')}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function SavedPromptsSection() {
  const { t } = useLang();
  const filterCategories = useMemo(
    () =>
      CATEGORY_KEYS.map((key) => ({
        key,
        emoji: CATEGORY_EMOJI[key],
        label: t(`prompts.cat.${key}`),
      })),
    [t]
  );
  const [category, setCategory] = useState('all');
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [prompts, setPrompts] = useState<SavedRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<SavedRow | null>(null);

  useEffect(() => {
    const tmr = setTimeout(() => setDebouncedSearch(searchInput.trim()), 350);
    return () => clearTimeout(tmr);
  }, [searchInput]);

  const load = useCallback(
    async (p: number, reset: boolean) => {
      setLoading(true);
      try {
        const params: Record<string, string | number> = { page: p, limit: 12 };
        if (category !== 'all') params.category = category;
        if (debouncedSearch) params.search = debouncedSearch;
        const { data } = await promptApi.getSaved(params);
        const list = data.data.prompts as SavedRow[];
        setTotal(data.data.total);
        setPage(p);
        setPrompts((prev) => (reset ? list : [...prev, ...list]));
      } catch {
        toast.error(t('profile.savedPrompts.loadErr'));
        if (reset) setPrompts([]);
      } finally {
        setLoading(false);
      }
    },
    [category, debouncedSearch, t]
  );

  useEffect(() => {
    setPrompts([]);
    load(1, true);
  }, [category, debouncedSearch, load]);

  const pages = useMemo(() => Math.max(1, Math.ceil(total / 12)), [total]);
  const hasMore = prompts.length < total;

  const handleUnsave = async (id: string) => {
    try {
      await promptApi.unsave(id);
      toast.success(t('profile.savedPrompts.removed'));
      setPrompts((prev) => prev.filter((x) => x._id !== id));
      setTotal((n) => Math.max(0, n - 1));
      setDetail((d) => (d?._id === id ? null : d));
    } catch {
      toast.error(t('profile.savedPrompts.unsaveErr'));
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="rounded-3xl border border-white/5 bg-[#0d101a] p-6 shadow-xl sm:p-8">
        <h3 className="mb-2 flex items-center gap-3 text-xl font-bold text-white">
          <FiBookmark className="text-indigo-400" />
          {t('profile.savedPrompts.title')}
        </h3>
        <p className="mb-6 text-sm text-slate-500">{t('profile.savedPrompts.subtitle')}</p>

        <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1">
            <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-600">
              {t('profile.savedPrompts.search')}
            </label>
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder={t('profile.savedPrompts.searchPh')}
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:border-indigo-500/50 focus:outline-none"
            />
          </div>
          <div className="sm:w-56">
            <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-600">
              {t('profile.savedPrompts.category')}
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-[#0A0E1A] px-4 py-3 text-sm text-white focus:border-indigo-500/50 focus:outline-none"
            >
              {filterCategories.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.emoji} {c.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading && prompts.length === 0 ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-28 animate-pulse rounded-2xl bg-white/5" />
            ))}
          </div>
        ) : prompts.length === 0 ? (
          <div className="py-16 text-center text-slate-500">{t('profile.savedPrompts.empty')}</div>
        ) : (
          <>
            <ul className="space-y-3">
              {prompts.map((p) => {
                const cat = categoryMeta(p.category, t);
                return (
                  <li
                    key={p._id}
                    className="flex flex-col gap-3 rounded-2xl border border-white/5 bg-white/[0.02] p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-white line-clamp-2">{p.title}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-slate-500">
                        <span>
                          {cat.emoji} {cat.label}
                        </span>
                        <span>·</span>
                        <span>{p.tool}</span>
                        {p.savedAt && (
                          <>
                            <span>·</span>
                            <span>{new Date(p.savedAt).toLocaleDateString()}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setDetail(p)}
                        className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-slate-300 hover:bg-white/10"
                      >
                        {t('profile.savedPrompts.open')} <IoChevronForward size={12} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUnsave(p._id)}
                        className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-xs font-bold text-rose-300 hover:bg-rose-500/20"
                      >
                        {t('profile.savedPrompts.unsave')}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
            {hasMore && (
              <div className="mt-8 text-center">
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => load(page + 1, false)}
                  className="rounded-2xl border border-white/10 bg-white/5 px-8 py-3 text-sm font-bold text-slate-300 hover:bg-white/10 disabled:opacity-50"
                >
                  {loading ? '…' : t('profile.savedPrompts.more')}
                </button>
              </div>
            )}
            <p className="mt-4 text-center text-xs text-slate-600">
              {t('profile.savedPrompts.pageOf', { page: String(page), pages: String(pages) })}
            </p>
          </>
        )}
      </div>

      <AnimatePresence>
        {detail ? (
          <DetailSheet
            key={detail._id}
            prompt={detail}
            onClose={() => setDetail(null)}
            onUnsave={() => handleUnsave(detail._id)}
          />
        ) : null}
      </AnimatePresence>
    </motion.div>
  );
}
