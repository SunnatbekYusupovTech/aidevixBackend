'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  getCourseById, updateCourse,
  getCourseVideos, createVideo, updateVideo, deleteVideo,
  getUploadCredentials, getVideoStatus, linkVideoToStream,
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
import type { StreamStatus } from '@/types/video';

// ─── Types ────────────────────────────────────────────────────────────────────
type VideoRow = {
  _id: string;
  title: string;
  description?: string;
  order: number;
  duration: number;
  streamStatus: StreamStatus;
};

/**
 * mkhls'dan keladigan yagona haqiqiy progress ko'rsatkichi.
 * `progress_percent` ataylab yo'q: mkhls uni hech qachon oshirmaydi
 * (transcode davomida 0, oxirida 100).
 */
type TranscodeInfo = { presetsDone: string[]; presetsTotal: number } | null;

type UploadPhase = 'idle' | 'creating' | 'uploading' | 'done' | 'error';

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

function StatusBadge({ status }: { status: StreamStatus }) {
  const cls =
    status === 'ready' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
    : status === 'failed' ? 'border-red-500/30 bg-red-500/10 text-red-300'
    : status === 'processing' ? 'border-amber-500/30 bg-amber-500/10 text-amber-300'
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
  const [transcode, setTranscode] = useState<Record<string, TranscodeInfo>>({});
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
  const phaseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Edit modal
  const [editVid, setEditVid] = useState<VideoRow | null>(null);
  const [editForm, setEditForm] = useState({
    title: '', description: '', order: 0, durationMin: 0, streamPath: '',
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
      // 1️⃣ DB yozuvi va mkhls stream yo'lini yaratish
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
        toast.error('Upload URL olishda xato — mkhls sozlamalarini tekshiring');
        setPhase('error');
        return;
      }

      // 2️⃣ Faylni backend proxy orqali mkhls ga yuklash
      setPhase('uploading');
      await uploadVideoBinary(upload.uploadUrl, file, setProgress);

      // 3️⃣ Transcode navbatga qo'yildi. Kutmaymiz.
      //
      // Ilgari bu yerda 6 daqiqalik polling turardi va undan keyin "Timeout"
      // xatosi tashlanardi. Bunny uchun to'g'ri edi; mkhls'da 40 daqiqalik dars
      // 40-60 daqiqa transcode bo'ladi (spec §14.1), ya'ni har bir haqiqiy dars
      // sog'-salomat ishlanayotgan holda "Timeout" deb ko'rsatilardi.
      // Kuzatishni ro'yxat qatori o'z polling'i bilan bajaradi.
      setPhase('done');
      toast.success(`${autoTitle} — yuklandi, transcode navbatga qo'yildi`);
      setTopic(''); setDesc(''); setFile(null);
      setShowUpload(false);
      phaseTimeoutRef.current = setTimeout(() => setPhase('idle'), 1500);
      fetchData();
    } catch (err: any) {
      setPhase('error');
      // Backend proxy uch xil sababdan 502 qaytarishi mumkin
      // (videoController.js:780, 813, 827) — mkhls.uploadVideo umuman
      // muvaffaqiyatsiz bo'lishi (fayl hech qachon yetib bormagan bo'lishi
      // mumkin), startTranscode muvaffaqiyatsiz bo'lishi (fayl yuklangan,
      // lekin transcode boshlanmagan), yoki tashqi umumiy xato. Uchalasi
      // ham boshqa-boshqa holat, shuning uchun bitta status kodga bitta
      // frontend xabarini bog'lash noto'g'ri bo'lardi — backend har biriga
      // aniq xabar yuboradi, shuni ko'rsatamiz.
      toast.error(err?.response?.data?.message || err?.message || 'Yuklashda xato');
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
      // Faqat-yozish: streamPath ochiq `videos/course/:id` endpointidan ataylab
      // olib tashlangan (provayder identifikatori, spec §10.4), shuning uchun
      // uni ko'rsatadigan ma'lumot bu yerda yo'q. Yo'l determinlashgan —
      // placeholder uni eslatib turadi.
      streamPath: '',
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
      const path = editForm.streamPath.trim();
      if (path) {
        await linkVideoToStream(editVid._id, path);
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
  const readStatus = useCallback(async (videoId: string) => {
    const res = await getVideoStatus(videoId);
    const d = unwrapAdmin<{
      streamStatus: StreamStatus;
      duration?: number;
      transcode: TranscodeInfo;
    }>(res);
    setVideos(prev =>
      prev.map(v =>
        v._id === videoId
          ? { ...v, streamStatus: d.streamStatus, duration: d.duration ?? v.duration }
          : v,
      ),
    );
    setTranscode(prev => ({ ...prev, [videoId]: d.transcode }));
    return d;
  }, []);

  const refreshStatus = async (vid: VideoRow) => {
    try {
      const d = await readStatus(vid._id);
      toast.success(`Status: ${d.streamStatus}`);
    } catch {
      toast.error('Status olishda xato');
    }
  };

  // `processing` qatorlarini kuzatib turadi.
  //
  // Uchta cheklov ataylab: faqat processing qatorlari, 20 soniya, va faqat tab
  // ko'rinib turganda. Bu endpoint student poll'idan farq qiladi —
  // `checkVideoStatus`da hech qanday cooldown yo'q, har chaqiruv to'g'ridan-to'g'ri
  // mkhls'ga boradi. Bir kurs ommaviy yuklanayotganda o'nlab qator bir vaqtda
  // processing bo'lishi mumkin va ochiq qoldirilgan tab soatlab mkhls'ni urardi.
  useEffect(() => {
    const processingIds = videos.filter(v => v.streamStatus === 'processing').map(v => v._id);
    if (processingIds.length === 0) return;

    const tick = () => {
      if (document.visibilityState !== 'visible') return;
      processingIds.forEach(vid => { readStatus(vid).catch(() => {}); });
    };

    tick();
    const timer = setInterval(tick, 20_000);
    document.addEventListener('visibilitychange', tick);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', tick);
    };
    // `videos` o'rniga uning processing id'lari — har bir duration yangilanishida
    // interval qayta ishga tushmasligi uchun.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videos.map(v => (v.streamStatus === 'processing' ? v._id : '')).join(','), readStatus]);

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
    creating:   'Yozuv yaratilmoqda…',
    uploading:  `Yuklanmoqda ${progress}%`,
    done:       '✓ Yuklandi',
    error:      'Qayta urinish',
  };

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="flex h-64 items-center justify-center">
      <span className="loading loading-spinner loading-lg text-amber-400" />
    </div>
  );

  const busy = phase === 'creating' || phase === 'uploading';

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
            <div className="flex items-center gap-2">
              <h1 className="font-display text-lg font-bold leading-tight text-white">{course?.title}</h1>
              <span
                className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                  course?.isFree
                    ? 'border-sky-500/30 bg-sky-500/10 text-sky-300'
                    : 'border-amber-500/30 bg-amber-500/10 text-amber-300'
                }`}
              >
                {course?.isFree ? 'Bepul kurs' : 'Pullik kurs'}
              </span>
            </div>
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
                    {(phase === 'uploading' || phase === 'creating') && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs text-slate-400">
                          <span>{phaseLabel[phase]}</span>
                          {phase === 'uploading' && <span>{progress}%</span>}
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                          <motion.div
                            className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500"
                            animate={{ width: phase === 'uploading' ? `${progress}%` : '8%' }}
                            transition={{ duration: 0.4 }}
                          />
                        </div>
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
                        <StatusBadge status={vid.streamStatus || 'pending'} />
                      </div>
                      {vid.streamStatus === 'processing' &&
                        (transcode[vid._id]?.presetsTotal ?? 0) > 0 && (
                          <div className="mt-2 max-w-xs">
                            <div className="h-1 overflow-hidden rounded-full bg-slate-800">
                              <div
                                className="h-full rounded-full bg-amber-500 transition-all"
                                style={{
                                  width: `${
                                    (transcode[vid._id]!.presetsDone.length /
                                      transcode[vid._id]!.presetsTotal) *
                                    100
                                  }%`,
                                }}
                              />
                            </div>
                            <p className="mt-1 text-[10px] text-slate-500">
                              {transcode[vid._id]!.presetsDone.length}/
                              {transcode[vid._id]!.presetsTotal} preset
                              {transcode[vid._id]!.presetsDone.length > 0 &&
                                ` — ${transcode[vid._id]!.presetsDone.join(', ')} tayyor`}
                            </p>
                          </div>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex shrink-0 items-center gap-1 opacity-0 transition group-hover:opacity-100">
                      {vid.streamStatus === 'processing' && (
                        <button
                          onClick={() => refreshStatus(vid)}
                          title="Statusni yangilash"
                          className="rounded-lg p-2 text-amber-400 hover:bg-amber-500/10"
                        >
                          <FiRefreshCw className="h-3.5 w-3.5" />
                        </button>
                      )}
                      {vid.streamStatus === 'pending' && (
                        <button
                          onClick={() => openEdit(vid)}
                          title="mkhls yo'liga ulash"
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
                <Field label="mkhls yo'li (qo'lda ulash — ixtiyoriy)">
                  <input
                    value={editForm.streamPath}
                    onChange={e => setEditForm({ ...editForm, streamPath: e.target.value })}
                    placeholder={`aidevix/${editVid?._id ?? '<videoId>'}.mp4`}
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
