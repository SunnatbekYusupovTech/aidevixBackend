'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  getCourseById, updateCourse,
  getCourseVideos, createVideo, updateVideo, deleteVideo,
  getUploadCredentials, getVideoStatus, linkVideoToBunny,
  uploadThumbnail, uploadVideoBinary,
  unwrapAdmin,
} from '@/api/adminApi';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  FiArrowLeft, FiSave, FiPlus, FiTrash2, FiEdit2,
  FiVideo, FiUploadCloud, FiClock, FiRefreshCw, FiLink,
} from 'react-icons/fi';

// ─── Types ────────────────────────────────────────────────────────────────────
type VideoRow = {
  _id: string;
  title: string;
  description?: string;
  order: number;
  duration: number;
  bunnyVideoId: string | null;
  bunnyStatus: string;
};

type UploadPhase = 'idle' | 'creating' | 'uploading' | 'processing' | 'done' | 'error';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const inp =
  'w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm text-white placeholder:text-slate-600 focus:border-amber-500/50 focus:outline-none transition';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-slate-400">{label}</label>
      {children}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cls =
    status === 'ready' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
    : status === 'failed' || status === 'error' ? 'border-red-500/30 bg-red-500/10 text-red-300'
    : status === 'encoding' || status === 'processing' ? 'border-amber-500/30 bg-amber-500/10 text-amber-300'
    : 'border-slate-600/30 bg-slate-700/20 text-slate-400';
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${cls}`}>
      {status || 'pending'}
    </span>
  );
}

function fmtDur(secs: number) {
  if (!secs) return '—';
  const m = Math.floor(secs / 60);
  const s = String(secs % 60).padStart(2, '0');
  return `${m}:${s}`;
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function EditCoursePage() {
  const { id } = useParams<{ id: string }>();

  const [course, setCourse]       = useState<any>(null);
  const [videos, setVideos]       = useState<VideoRow[]>([]);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [thumbUploading, setThumbUploading] = useState(false);
  const thumbRef = useRef<HTMLInputElement>(null);

  // Course form
  const [form, setForm] = useState({
    title: '', description: '', price: 0,
    level: '', category: '', isPublished: false,
  });

  // Upload panel
  const [showUpload, setShowUpload] = useState(false);
  const [phase, setPhase]           = useState<UploadPhase>('idle');
  const [progress, setProgress]     = useState(0);
  const [topic, setTopic]           = useState('');
  const [desc, setDesc]             = useState('');
  const [file, setFile]             = useState<File | null>(null);
  const [dragOver, setDragOver]     = useState(false);
  const fileRef  = useRef<HTMLInputElement>(null);
  const pollRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const phaseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Edit modal
  const [editVid, setEditVid] = useState<VideoRow | null>(null);
  const [editForm, setEditForm] = useState({
    title: '', description: '', order: 0, durationMin: 0, bunnyGuid: '',
  });

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    try {
      const [cRes, vRes] = await Promise.all([getCourseById(id), getCourseVideos(id)]);
      const c = unwrapAdmin<{ course: any }>(cRes).course;
      setCourse(c);
      setForm({
        title: c.title || '', description: c.description || '',
        price: c.price || 0, level: c.level || '',
        category: c.category || '', isPublished: c.isPublished || false,
      });
      const sorted = (unwrapAdmin<{ videos: VideoRow[] }>(vRes).videos || [])
        .sort((a, b) => a.order - b.order);
      setVideos(sorted);
    } catch {
      toast.error("Ma'lumot yuklanmadi");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => () => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (phaseTimeoutRef.current) clearTimeout(phaseTimeoutRef.current);
  }, []);

  // ── Course save ────────────────────────────────────────────────────────────
  const saveCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateCourse(id, form);
      toast.success('Kurs saqlandi');
    } catch {
      toast.error("Saqlab bo'lmadi");
    } finally {
      setSaving(false);
    }
  };

  // ── Upload flow ────────────────────────────────────────────────────────────
  const nextOrder  = videos.length;            // 0-indexed order for next video
  const nextLesson = videos.length + 1;        // human-readable lesson number
  const autoTitle  = topic.trim() ? `${nextLesson}-Dars: ${topic.trim()}` : '';

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f?.type.startsWith('video/')) setFile(f);
    else toast.error('Faqat video fayl qabul qilinadi');
  };

  const startUpload = async () => {
    if (!file || !autoTitle) {
      toast.error('Fayl va mavzu nomi majburiy');
      return;
    }

    setPhase('creating');
    setProgress(0);

    try {
      // 1️⃣ DB + Bunny slot yaratish
      const cRes = await createVideo({
        title: autoTitle,
        description: desc.trim() || `${autoTitle} — mashg'ulot`,
        courseId: id,
        order: nextOrder,
        duration: 0,
      });
      const payload = unwrapAdmin<{
        video: { _id: string };
        upload: { uploadUrl: string; headers: Record<string, string> } | null;
      }>(cRes);

      const videoId = payload.video._id;
      const upload  = payload.upload;

      if (!upload?.uploadUrl) {
        toast.error('Upload URL olishda xato — BUNNY_STREAM_API_KEY tekshiring');
        setPhase('error');
        return;
      }

      // 2️⃣ Faylni backend proxy orqali Bunny ga yuklash (AccessKey leak qilinmaydi)
      setPhase('uploading');
      await uploadVideoBinary(upload.uploadUrl, file, setProgress);

      // 3️⃣ Bunny encoding tugashini kutish (har 5 sekundda tekshirish)
      setPhase('processing');
      await new Promise<void>((resolve, reject) => {
        let attempts = 0;
        pollRef.current = setInterval(async () => {
          attempts++;
          try {
            const sRes = await getVideoStatus(videoId);
            const d = unwrapAdmin<{ bunnyStatus: string; isReady: boolean }>(sRes);
            setVideos(prev =>
              prev.map(v => v._id === videoId ? { ...v, bunnyStatus: d.bunnyStatus } : v)
            );
            if (d.isReady || d.bunnyStatus === 'ready') {
              clearInterval(pollRef.current!);
              resolve();
            } else if (d.bunnyStatus === 'failed' || d.bunnyStatus === 'error') {
              clearInterval(pollRef.current!);
              reject(new Error('Bunny encoding muvaffaqiyatsiz'));
            } else if (attempts > 72) {
              clearInterval(pollRef.current!);
              reject(new Error('Timeout — 6 daqiqa kutildi'));
            }
          } catch {
            if (attempts > 72) { clearInterval(pollRef.current!); reject(new Error('Timeout')); }
          }
        }, 5000);
      });

      setPhase('done');
      toast.success(`${autoTitle} — muvaffaqiyatli yuklandi!`);
      setTopic(''); setDesc(''); setFile(null);
      setShowUpload(false);
      phaseTimeoutRef.current = setTimeout(() => setPhase('idle'), 1500);
      fetchData();
    } catch (err: any) {
      setPhase('error');
      toast.error(err.message || 'Yuklashda xato');
    }
  };

  // ── Edit ───────────────────────────────────────────────────────────────────
  const openEdit = (vid: VideoRow) => {
    setEditVid(vid);
    setEditForm({
      title: vid.title,
      description: vid.description || '',
      order: vid.order,
      durationMin: vid.duration ? Math.round(vid.duration / 60) : 0,
      bunnyGuid: vid.bunnyVideoId || '',
    });
  };

  const saveEdit = async () => {
    if (!editVid) return;
    try {
      await updateVideo(editVid._id, {
        title: editForm.title,
        description: editForm.description,
        order: editForm.order,
        duration: Math.round((Number(editForm.durationMin) || 0) * 60),
      });
      const newGuid = editForm.bunnyGuid.trim();
      if (newGuid && newGuid !== editVid.bunnyVideoId) {
        await linkVideoToBunny(editVid._id, newGuid);
      }
      toast.success('Video yangilandi');
      setEditVid(null);
      fetchData();
    } catch {
      toast.error("Saqlab bo'lmadi");
    }
  };

  // ── Delete ─────────────────────────────────────────────────────────────────
  const handleDelete = async (vid: VideoRow) => {
    if (!confirm(`"${vid.title}" ni o'chirish?`)) return;
    try {
      await deleteVideo(vid._id);
      setVideos(prev => prev.filter(v => v._id !== vid._id));
      toast.success("O'chirildi");
    } catch {
      toast.error("O'chirib bo'lmadi");
    }
  };

  // ── Refresh single video status ────────────────────────────────────────────
  const refreshStatus = async (vid: VideoRow) => {
    try {
      const res = await getVideoStatus(vid._id);
      const d   = unwrapAdmin<{ bunnyStatus: string; duration?: number }>(res);
      setVideos(prev =>
        prev.map(v =>
          v._id === vid._id
            ? { ...v, bunnyStatus: d.bunnyStatus, duration: d.duration ?? v.duration }
            : v
        )
      );
      toast.success(`Status: ${d.bunnyStatus}`);
    } catch {
      toast.error('Status olishda xato');
    }
  };

  // ── Thumbnail upload ───────────────────────────────────────────────────────
  const handleThumbUpload = async (file: File) => {
    setThumbUploading(true);
    try {
      const res = await uploadThumbnail(id, file);
      const url = (res.data as { data?: { url?: string }; url?: string })?.data?.url
               || (res.data as { url?: string })?.url;
      if (url) setCourse((c: any) => ({ ...c, thumbnail: url }));
      toast.success('Thumbnail yuklandi');
    } catch {
      toast.error("Thumbnail yuklab bo'lmadi");
    } finally {
      setThumbUploading(false);
    }
  };

  // ── Phase labels ───────────────────────────────────────────────────────────
  const phaseLabel: Record<UploadPhase, string> = {
    idle:       'Yuklashni boshlash',
    creating:   'Slot yaratilmoqda…',
    uploading:  `Yuklanmoqda ${progress}%`,
    processing: 'Bunny kodlayapti…',
    done:       '✓ Tayyor!',
    error:      'Qayta urinish',
  };

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="flex h-64 items-center justify-center">
      <span className="loading loading-spinner loading-lg text-amber-400" />
    </div>
  );

  const busy = phase === 'creating' || phase === 'uploading' || phase === 'processing';

  return (
    <div className="space-y-8 pb-20">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-white/10 bg-[#111726] p-5 shadow-xl">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/courses"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-700 bg-slate-900 text-slate-300 transition hover:border-amber-500/40"
          >
            <FiArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="font-display text-lg font-bold leading-tight text-white">{course?.title}</h1>
            <p className="mt-0.5 text-xs text-slate-500">{videos.length} ta dars</p>
          </div>
        </div>
        <button
          onClick={saveCourse}
          disabled={saving}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-5 py-2.5 font-semibold text-slate-950 shadow-lg shadow-amber-500/20 transition disabled:opacity-50 hover:shadow-amber-500/40"
        >
          {saving ? <span className="loading loading-spinner loading-xs" /> : <FiSave className="h-4 w-4" />}
          Kursni saqlash
        </button>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-5">

        {/* ── Kurs ma'lumotlari ───────────────────────────────────────────── */}
        <div className="lg:col-span-2">
          <div className="rounded-2xl border border-white/10 bg-[#111726] p-6 shadow-xl">
            <p className="mb-5 border-b border-white/10 pb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
              Kurs ma'lumotlari
            </p>
            <form onSubmit={saveCourse} className="space-y-4">
              <Field label="Sarlavha">
                <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className={inp} />
              </Field>
              <Field label="Tavsif">
                <textarea rows={4} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className={`${inp} resize-none`} />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Narx (UZS)">
                  <input type="number" value={form.price} onChange={e => setForm({ ...form, price: Number(e.target.value) })} className={inp} />
                </Field>
                <Field label="Daraja">
                  <select value={form.level} onChange={e => setForm({ ...form, level: e.target.value })} className={inp}>
                    <option value="">Tanlang</option>
                    <option>Beginner</option>
                    <option>Intermediate</option>
                    <option>Advanced</option>
                  </select>
                </Field>
              </div>
              <Field label="Kategoriya">
                <input value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className={inp} />
              </Field>
              <div className="flex items-center justify-between rounded-xl border border-white/5 bg-slate-950/50 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-white">Chop etish</p>
                  <p className="text-xs text-slate-500">O'quvchilarga ko'rinadi</p>
                </div>
                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={form.isPublished}
                    onChange={e => setForm({ ...form, isPublished: e.target.checked })}
                  />
                  <div className="h-6 w-11 rounded-full bg-slate-700 transition after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-amber-500 peer-checked:after:translate-x-full" />
                </label>
              </div>
            </form>
          </div>

          {/* Thumbnail */}
          <div className="rounded-2xl border border-white/10 bg-[#111726] p-5 shadow-xl">
            <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Muqova (Thumbnail)</p>
            <div className="flex items-center gap-4">
              <div className="h-20 w-32 shrink-0 overflow-hidden rounded-xl border border-slate-700 bg-slate-900">
                {course?.thumbnail ? (
                  <img
                    src={typeof course.thumbnail === 'string' ? course.thumbnail : course.thumbnail?.url}
                    alt="thumbnail"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-slate-600 text-xs">Rasm yo'q</div>
                )}
              </div>
              <div>
                <input
                  ref={thumbRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleThumbUpload(f); }}
                />
                <button
                  type="button"
                  onClick={() => thumbRef.current?.click()}
                  disabled={thumbUploading}
                  className="flex items-center gap-2 rounded-xl border border-slate-600 bg-slate-900 px-4 py-2 text-sm text-slate-200 transition hover:border-amber-500/40 disabled:opacity-50"
                >
                  {thumbUploading
                    ? <span className="loading loading-spinner loading-xs" />
                    : <FiUploadCloud className="h-4 w-4" />}
                  {thumbUploading ? 'Yuklanmoqda…' : 'Rasm yuklash'}
                </button>
                <p className="mt-1 text-xs text-slate-600">JPG, PNG, WebP — max 5MB</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Video manager ───────────────────────────────────────────────── */}
        <div className="space-y-5 lg:col-span-3">

          {/* Upload panel */}
          <div className="rounded-2xl border border-white/10 bg-[#111726] p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
                Yangi dars yuklash
              </p>
              <button
                onClick={() => { setShowUpload(p => !p); setPhase('idle'); }}
                className={`flex items-center gap-2 rounded-xl border px-3 py-1.5 text-sm font-medium transition ${
                  showUpload
                    ? 'border-slate-700 bg-slate-800 text-slate-300'
                    : 'border-amber-500/30 bg-amber-500/10 text-amber-200 hover:bg-amber-500/20'
                }`}
              >
                <FiPlus className="h-4 w-4" />
                {showUpload ? 'Yopish' : "Video qo'shish"}
              </button>
            </div>

            <AnimatePresence>
              {showUpload && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="space-y-4 pt-1">

                    {/* Auto-numbering + topic */}
                    <div className="grid grid-cols-2 gap-4">
                      <Field label={`Dars № (avtomatik)`}>
                        <input
                          value={nextLesson}
                          disabled
                          className={`${inp} cursor-not-allowed font-mono opacity-50`}
                        />
                      </Field>
                      <Field label="Mavzu nomi *">
                        <input
                          value={topic}
                          onChange={e => setTopic(e.target.value)}
                          placeholder="Sarlovha teglari"
                          className={inp}
                          disabled={busy}
                        />
                      </Field>
                    </div>

                    {/* Auto-title preview */}
                    {autoTitle && (
                      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-2 text-xs text-amber-200">
                        Sarlavha: <strong className="text-amber-100">{autoTitle}</strong>
                      </div>
                    )}

                    {/* Description */}
                    <Field label="Vazifa / Tavsif">
                      <textarea
                        rows={2}
                        value={desc}
                        onChange={e => setDesc(e.target.value)}
                        placeholder="Bu darsda nima o'rganasiz..."
                        className={`${inp} resize-none`}
                        disabled={busy}
                      />
                    </Field>

                    {/* Drop zone */}
                    <div
                      onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                      onDragLeave={() => setDragOver(false)}
                      onDrop={handleDrop}
                      onClick={() => !busy && fileRef.current?.click()}
                      className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-8 text-center transition ${
                        busy ? 'cursor-not-allowed opacity-50'
                        : dragOver ? 'border-amber-400 bg-amber-500/10'
                        : 'border-slate-700 bg-slate-950/50 hover:border-amber-500/50'
                      }`}
                    >
                      <FiUploadCloud className={`h-10 w-10 transition ${dragOver ? 'text-amber-400' : 'text-slate-600'}`} />
                      {file ? (
                        <div>
                          <p className="font-medium text-white">{file.name}</p>
                          <p className="text-xs text-slate-400">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
                        </div>
                      ) : (
                        <div>
                          <p className="text-sm font-medium text-slate-300">Video faylni shu yerga tashlang</p>
                          <p className="text-xs text-slate-500">yoki bosib tanlang — MP4, MOV, WebM</p>
                        </div>
                      )}
                      <input
                        ref={fileRef}
                        type="file"
                        accept="video/*"
                        className="hidden"
                        onChange={e => setFile(e.target.files?.[0] || null)}
                      />
                    </div>

                    {/* Progress bar */}
                    {(phase === 'uploading' || phase === 'processing' || phase === 'creating') && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs text-slate-400">
                          <span>{phaseLabel[phase]}</span>
                          {phase === 'uploading' && <span>{progress}%</span>}
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                          <motion.div
                            className={`h-full rounded-full ${phase === 'processing' ? 'animate-pulse bg-amber-400' : 'bg-gradient-to-r from-amber-500 to-orange-500'}`}
                            animate={{ width: phase === 'uploading' ? `${progress}%` : phase === 'processing' ? '100%' : '8%' }}
                            transition={{ duration: 0.4 }}
                          />
                        </div>
                        {phase === 'processing' && (
                          <p className="text-center text-xs text-slate-500">
                            Bunny.net video kodlayapti — 1–3 daqiqa kuting…
                          </p>
                        )}
                      </div>
                    )}

                    <button
                      onClick={startUpload}
                      disabled={!file || !autoTitle || busy}
                      className="w-full rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 py-3 font-semibold text-slate-950 shadow-lg shadow-amber-500/20 transition disabled:opacity-40 hover:shadow-amber-500/40"
                    >
                      {phaseLabel[phase]}
                    </button>

                    {phase === 'error' && (
                      <p className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2 text-center text-xs text-red-300">
                        Xato yuz berdi. CORS bloklagan bo'lsa — backend orqali yuklashni yoqish kerak.
                      </p>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Video list */}
          <div className="rounded-2xl border border-white/10 bg-[#111726] p-6 shadow-xl">
            <p className="mb-5 border-b border-white/10 pb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
              Darslar ({videos.length})
            </p>

            {videos.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                <FiVideo className="h-10 w-10 text-slate-700" />
                <p className="text-sm text-slate-500">Hali darslar yo'q.<br />Yuqoridan video qo'shing.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {videos.map(vid => (
                  <div
                    key={vid._id}
                    className="group flex items-center gap-4 rounded-xl border border-white/5 bg-slate-950/50 px-4 py-3 transition hover:border-white/10"
                  >
                    {/* Lesson badge */}
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-700 bg-slate-800 font-mono text-xs font-bold text-amber-200">
                      {vid.order + 1}
                    </span>

                    {/* Info */}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-white">{vid.title}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <span className="flex items-center gap-1 text-xs text-slate-500">
                          <FiClock className="h-3 w-3" />
                          {fmtDur(vid.duration)}
                        </span>
                        <StatusBadge status={vid.bunnyStatus || 'pending'} />
                        {vid.bunnyVideoId && (
                          <span className="font-mono text-[10px] text-slate-600">
                            {vid.bunnyVideoId.slice(0, 8)}…
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex shrink-0 items-center gap-1 opacity-0 transition group-hover:opacity-100">
                      {(vid.bunnyStatus === 'encoding' || vid.bunnyStatus === 'processing') && (
                        <button
                          onClick={() => refreshStatus(vid)}
                          title="Statusni yangilash"
                          className="rounded-lg p-2 text-amber-400 hover:bg-amber-500/10"
                        >
                          <FiRefreshCw className="h-3.5 w-3.5" />
                        </button>
                      )}
                      {!vid.bunnyVideoId && (
                        <button
                          onClick={() => openEdit(vid)}
                          title="Bunny GUID ulash"
                          className="rounded-lg p-2 text-sky-400 hover:bg-sky-500/10"
                        >
                          <FiLink className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <button onClick={() => openEdit(vid)} className="rounded-lg p-2 text-slate-300 hover:bg-white/5">
                        <FiEdit2 className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => handleDelete(vid)} className="rounded-lg p-2 text-red-400 hover:bg-red-500/10">
                        <FiTrash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Edit modal ──────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {editVid && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#111726] p-6 shadow-2xl"
            >
              <h3 className="mb-5 font-display text-lg font-bold text-white">
                Darsni tahrirlash
              </h3>
              <div className="space-y-4">
                <Field label="Sarlavha">
                  <input
                    value={editForm.title}
                    onChange={e => setEditForm({ ...editForm, title: e.target.value })}
                    className={inp}
                  />
                </Field>
                <Field label="Vazifa / Tavsif">
                  <textarea
                    rows={3}
                    value={editForm.description}
                    onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                    className={`${inp} resize-none`}
                  />
                </Field>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Tartib raqami (0 dan)">
                    <input
                      type="number"
                      value={editForm.order}
                      onChange={e => setEditForm({ ...editForm, order: Number(e.target.value) })}
                      className={inp}
                    />
                  </Field>
                  <Field label="Davomiylik (daqiqa)">
                    <input
                      type="number"
                      value={editForm.durationMin}
                      onChange={e => setEditForm({ ...editForm, durationMin: Number(e.target.value) })}
                      className={inp}
                    />
                  </Field>
                </div>
                <Field label="Bunny GUID (ulash yoki yangilash)">
                  <input
                    value={editForm.bunnyGuid}
                    onChange={e => setEditForm({ ...editForm, bunnyGuid: e.target.value })}
                    placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                    className={`${inp} font-mono text-xs`}
                  />
                </Field>
              </div>
              <div className="mt-6 flex justify-end gap-3 border-t border-white/10 pt-5">
                <button
                  onClick={() => setEditVid(null)}
                  className="rounded-xl border border-slate-700 px-5 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-slate-800"
                >
                  Bekor
                </button>
                <button
                  onClick={saveEdit}
                  className="rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-6 py-2.5 text-sm font-semibold text-slate-950 shadow-lg shadow-amber-500/20 transition hover:shadow-amber-500/40"
                >
                  Saqlash
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
