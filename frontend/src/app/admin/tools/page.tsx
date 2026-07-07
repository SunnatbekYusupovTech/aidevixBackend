'use client';

import React, { useState } from 'react';
import {
  createDailyChallenge,
  sendTelegramMessage,
  bulkLinkBunny,
  getAiNewsAdmin,
  createAiNewsAdmin,
  updateAiNewsAdmin,
  deleteAiNewsAdmin,
} from '@/api/adminApi';
import toast from 'react-hot-toast';
import { FiSend, FiLink, FiActivity, FiTrash2, FiRefreshCcw } from 'react-icons/fi';

const TYPES = [
  { value: 'watch_video', label: "Video ko'rish" },
  { value: 'complete_quiz', label: 'Quiz tugatish' },
  { value: 'streak', label: 'Streak' },
  { value: 'enroll_course', label: 'Kursga yozilish' },
  { value: 'rate_course', label: 'Kursni baholash' },
] as const;

function ChallengeSection() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<string>('watch_video');
  const [targetCount, setTargetCount] = useState(1);
  const [xpReward, setXpReward] = useState(50);
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !date) { toast.error('Sarlavha va sana majburiy'); return; }
    setSaving(true);
    try {
      await createDailyChallenge({
        title: title.trim(),
        description: description.trim() || `${title.trim()} — kunlik vazifa`,
        type, targetCount, xpReward, date,
      });
      toast.success('Kunlik vazifa yaratildi');
      setTitle('');
      setDescription('');
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || 'Yaratishda xato');
    } finally { setSaving(false); }
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-[#111726] p-6 shadow-xl">
      <div className="mb-5 flex items-center gap-2">
        <FiActivity className="text-amber-400" />
        <h3 className="font-display text-lg font-bold text-white">Kunlik vazifa (challenge)</h3>
      </div>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-400">Sarlavha</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white focus:border-amber-500/50 focus:outline-none"
            placeholder="Masalan: 3 ta darsni ko'ring"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-400">Tavsif (ixtiyoriy)</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white focus:border-amber-500/50 focus:outline-none"
          />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-400">Tur</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white focus:border-amber-500/50 focus:outline-none"
            >
              {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-400">Sana</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white focus:border-amber-500/50 focus:outline-none"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-400">Maqsad (soni)</label>
            <input
              type="number" min={1} value={targetCount}
              onChange={(e) => setTargetCount(Number(e.target.value) || 1)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white focus:border-amber-500/50 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-400">XP mukofoti</label>
            <input
              type="number" min={0} value={xpReward}
              onChange={(e) => setXpReward(Number(e.target.value) || 0)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white focus:border-amber-500/50 focus:outline-none"
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 py-3 font-semibold text-slate-950 shadow-lg shadow-amber-500/25 disabled:opacity-50"
        >
          {saving ? 'Saqlanmoqda…' : 'Vazifani yaratish'}
        </button>
      </form>
    </div>
  );
}

function TelegramSection() {
  const [message, setMessage] = useState('');
  const [parseMode, setParseMode] = useState('HTML');
  const [sending, setSending] = useState(false);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) { toast.error('Xabar matni bo\'sh'); return; }
    setSending(true);
    try {
      await sendTelegramMessage(message.trim(), parseMode);
      toast.success('@aidevix kanaliga yuborildi');
      setMessage('');
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || 'Yuborishda xato');
    } finally { setSending(false); }
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-[#111726] p-6 shadow-xl">
      <div className="mb-5 flex items-center gap-2">
        <FiSend className="text-sky-400" />
        <h3 className="font-display text-lg font-bold text-white">Telegram kanalga xabar</h3>
        <span className="rounded-full bg-sky-500/10 px-2 py-0.5 text-[11px] text-sky-300 border border-sky-500/20">
          @aidevix
        </span>
      </div>
      <form onSubmit={send} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-400">
            Xabar matni ({parseMode === 'HTML' ? 'HTML teglari qo\'llab-quvvatlanadi' : 'oddiy matn'})
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={6}
            placeholder={'<b>Yangilik!</b>\n\nAidevix platformasiga yangi kurslar qo\'shildi 🚀'}
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 font-mono text-sm text-white placeholder:font-sans placeholder:text-slate-600 focus:border-sky-500/50 focus:outline-none"
          />
          <p className="mt-1 text-xs text-slate-500">
            {message.length} belgi
          </p>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-400">Format</label>
          <select
            value={parseMode}
            onChange={(e) => setParseMode(e.target.value)}
            className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm text-white focus:border-sky-500/50 focus:outline-none"
          >
            <option value="HTML">HTML</option>
            <option value="Markdown">Markdown</option>
            <option value="">Oddiy matn</option>
          </select>
        </div>
        <button
          type="submit"
          disabled={sending || !message.trim()}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 px-6 py-3 font-semibold text-white shadow-lg shadow-sky-500/25 disabled:opacity-50"
        >
          <FiSend className="h-4 w-4" />
          {sending ? 'Yuborilmoqda…' : 'Kanalga yuborish'}
        </button>
      </form>
    </div>
  );
}

function BulkLinkSection() {
  const [raw, setRaw] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ succeeded: number; failed: { error: string }[] } | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const lines = raw.trim().split('\n').filter(Boolean);
    const links = lines.map((l) => {
      const [videoId, bunnyVideoId] = l.split(',').map((s) => s.trim());
      return { videoId, bunnyVideoId };
    }).filter((x) => x.videoId && x.bunnyVideoId);

    if (links.length === 0) { toast.error('Hech qanday juft topilmadi'); return; }
    setLoading(true);
    try {
      const res = await bulkLinkBunny(links);
      const d = (res.data as { data: { succeeded: { videoId: string }[]; failed: { error: string }[] } }).data;
      setResult({ succeeded: d.succeeded.length, failed: d.failed });
      toast.success(`${d.succeeded.length} ta video ulandi`);
      if (d.failed.length > 0) toast.error(`${d.failed.length} ta xato`);
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || 'Xato yuz berdi');
    } finally { setLoading(false); }
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-[#111726] p-6 shadow-xl">
      <div className="mb-5 flex items-center gap-2">
        <FiLink className="text-violet-400" />
        <h3 className="font-display text-lg font-bold text-white">Bulk Bunny GUID ulash</h3>
      </div>
      <p className="mb-4 text-sm text-slate-400">
        Har qatorda: <code className="rounded bg-slate-800 px-1.5 text-xs text-amber-200">videoId,bunnyVideoId</code>
      </p>
      <form onSubmit={submit} className="space-y-4">
        <textarea
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          rows={6}
          placeholder={"6748f3a1c2d3e4f5a6b7c8d9,03bda3b1-c05e-4a36-9edc-d1772ffa1312\n..."}
          className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 font-mono text-sm text-white placeholder:font-sans placeholder:text-slate-600 focus:border-violet-500/50 focus:outline-none"
        />
        <button
          type="submit"
          disabled={loading || !raw.trim()}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-600 px-6 py-3 font-semibold text-white shadow-lg shadow-violet-500/25 disabled:opacity-50"
        >
          <FiLink className="h-4 w-4" />
          {loading ? 'Ulanmoqda…' : "Hammasini ulash"}
        </button>
      </form>
      {result && (
        <div className="mt-4 rounded-xl border border-white/10 bg-slate-950 p-4 text-sm">
          <p className="text-emerald-400">{result.succeeded} ta muvaffaqiyatli</p>
          {result.failed.map((f, i) => (
            <p key={i} className="text-red-400">{f.error}</p>
          ))}
        </div>
      )}
    </div>
  );
}

type AiNewsItem = {
  _id: string;
  title: string;
  summary: string;
  imageUrl?: string | null;
  platform: 'telegram' | 'instagram';
  href: string;
  cta?: string;
  order?: number;
  isActive: boolean;
  startsAt?: string | null;
  endsAt?: string | null;
  clicks?: number;
};

function AiNewsSection() {
  const [items, setItems] = useState<AiNewsItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    title: '',
    summary: '',
    platform: 'telegram',
    href: 'https://t.me/aidevix',
    cta: "To'liq yangilikni ko'rish",
    order: 0,
    imageUrl: '',
    startsAt: '',
    endsAt: '',
  });

  const load = async () => {
    setLoading(true);
    try {
      const res = await getAiNewsAdmin();
      setItems(((res.data as { data?: { news?: AiNewsItem[] } })?.data?.news) || []);
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || 'AI news roʻyxatini olishda xato');
    } finally {
      setLoading(false);
    }
  };

  const createItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.summary.trim() || !form.href.trim()) {
      toast.error('title, summary, href majburiy');
      return;
    }
    setCreating(true);
    try {
      await createAiNewsAdmin({
        title: form.title.trim(),
        summary: form.summary.trim(),
        platform: form.platform as 'telegram' | 'instagram',
        href: form.href.trim(),
        cta: form.cta.trim(),
        order: Number(form.order) || 0,
        imageUrl: form.imageUrl.trim() || undefined,
        startsAt: form.startsAt || undefined,
        endsAt: form.endsAt || undefined,
      });
      toast.success('AI yangilik qoʻshildi');
      setForm({
        title: '',
        summary: '',
        platform: 'telegram',
        href: 'https://t.me/aidevix',
        cta: "To'liq yangilikni ko'rish",
        order: 0,
        imageUrl: '',
        startsAt: '',
        endsAt: '',
      });
      await load();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || "Qo'shishda xato");
    } finally {
      setCreating(false);
    }
  };

  const toggleActive = async (item: AiNewsItem) => {
    try {
      await updateAiNewsAdmin(item._id, { isActive: !item.isActive });
      await load();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || 'Statusni yangilashda xato');
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Rostdan ham bu yangilikni o'chirmoqchimisiz?")) return;
    try {
      await deleteAiNewsAdmin(id);
      toast.success("O'chirildi");
      await load();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || "O'chirishda xato");
    }
  };

  React.useEffect(() => {
    void load();
  }, []);

  return (
    <div className="rounded-2xl border border-white/10 bg-[#111726] p-6 shadow-xl">
      <div className="mb-5 flex items-center justify-between gap-3">
        <h3 className="font-display text-lg font-bold text-white">AI News Banner boshqaruvi</h3>
        <button
          type="button"
          onClick={() => void load()}
          className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-200 hover:bg-white/10"
        >
          <FiRefreshCcw className="h-3.5 w-3.5" />
          Yangilash
        </button>
      </div>

      <form onSubmit={createItem} className="space-y-3 rounded-xl border border-white/10 bg-slate-950 p-4">
        <input
          value={form.title}
          onChange={(e) => setForm((s) => ({ ...s, title: e.target.value }))}
          placeholder="Sarlavha"
          className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-indigo-500/50 focus:outline-none"
        />
        <textarea
          value={form.summary}
          onChange={(e) => setForm((s) => ({ ...s, summary: e.target.value }))}
          placeholder="Qisqa summary"
          rows={2}
          className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-indigo-500/50 focus:outline-none"
        />
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <select
            value={form.platform}
            onChange={(e) => setForm((s) => ({ ...s, platform: e.target.value }))}
            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-indigo-500/50 focus:outline-none"
          >
            <option value="telegram">Telegram</option>
            <option value="instagram">Instagram</option>
          </select>
          <input
            value={form.cta}
            onChange={(e) => setForm((s) => ({ ...s, cta: e.target.value }))}
            placeholder="CTA"
            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-indigo-500/50 focus:outline-none"
          />
          <input
            type="number"
            value={form.order}
            onChange={(e) => setForm((s) => ({ ...s, order: Number(e.target.value) || 0 }))}
            placeholder="Order"
            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-indigo-500/50 focus:outline-none"
          />
        </div>
        <input
          value={form.imageUrl}
          onChange={(e) => setForm((s) => ({ ...s, imageUrl: e.target.value }))}
          placeholder="Thumbnail URL (https://...)"
          className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-indigo-500/50 focus:outline-none"
        />
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs text-slate-400">Start time (schedule)</label>
            <input
              type="datetime-local"
              value={form.startsAt}
              onChange={(e) => setForm((s) => ({ ...s, startsAt: e.target.value }))}
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-indigo-500/50 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-slate-400">End time (ixtiyoriy)</label>
            <input
              type="datetime-local"
              value={form.endsAt}
              onChange={(e) => setForm((s) => ({ ...s, endsAt: e.target.value }))}
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-indigo-500/50 focus:outline-none"
            />
          </div>
        </div>
        <input
          value={form.href}
          onChange={(e) => setForm((s) => ({ ...s, href: e.target.value }))}
          placeholder="https://..."
          className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-indigo-500/50 focus:outline-none"
        />
        <button
          type="submit"
          disabled={creating}
          className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-400 disabled:opacity-50"
        >
          {creating ? "Saqlanmoqda..." : "AI news qo'shish"}
        </button>
      </form>

      <div className="mt-4 space-y-2">
        {loading && <p className="text-sm text-slate-500">Yuklanmoqda...</p>}
        {!loading && items.length === 0 && <p className="text-sm text-slate-500">Hozircha news yo'q</p>}
        {items.map((item) => (
          <div key={item._id} className="flex items-start justify-between gap-3 rounded-xl border border-white/10 bg-slate-950 p-3">
            <div className="min-w-0">
              {item.imageUrl && (
                <img
                  src={item.imageUrl}
                  alt={item.title}
                  className="mb-2 h-20 w-full rounded-lg object-cover"
                />
              )}
              <p className="truncate text-sm font-semibold text-white">{item.title}</p>
              <p className="mt-1 line-clamp-2 text-xs text-slate-400">{item.summary}</p>
              <p className="mt-1 text-[11px] text-slate-500">
                {item.platform} · order: {item.order || 0} · clicks: {item.clicks || 0}
              </p>
              <p className="mt-1 text-[11px] text-indigo-300/70">
                {item.startsAt ? `Start: ${new Date(item.startsAt).toLocaleString()}` : 'Start: hozir'}
                {item.endsAt ? ` · End: ${new Date(item.endsAt).toLocaleString()}` : ''}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => void toggleActive(item)}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${item.isActive ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-700 text-slate-200'}`}
              >
                {item.isActive ? 'Aktiv' : 'Noaktiv'}
              </button>
              <button
                type="button"
                onClick={() => void remove(item._id)}
                className="rounded-lg bg-rose-500/20 p-2 text-rose-300 hover:bg-rose-500/30"
                aria-label="Delete"
              >
                <FiTrash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AdminToolsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold text-white">Vositalar</h2>
        <p className="mt-1 text-sm text-slate-400">
          Kunlik vazifalar, Telegram xabar yuborish va Bunny.net bulk GUID ulash.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ChallengeSection />
        <TelegramSection />
      </div>
      <BulkLinkSection />
      <AiNewsSection />
    </div>
  );
}
