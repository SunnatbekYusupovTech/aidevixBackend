'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { FiEdit3, FiExternalLink, FiPlus, FiSave, FiTrash2, FiX } from 'react-icons/fi';
import ConfirmModal from '@/components/admin/ConfirmModal';
import { apiErrorMessage, metodikaAdminApi, metodikaApi, type MetodikaModule, type MetodikaOutline } from '@/api/metodikaApi';
import {
  AccessTab, AuditTab, Field, LessonEditor, PagesTab, btnDanger, btnGhost, btnPrimary, inputCls,
} from '@/components/metodika/MetodikaAdminParts';

const TABS = [
  ['lessons', 'Modullar va darslar'],
  ['pages', 'Pasport va ilovalar'],
  ['access', 'Kirish ruxsatlari'],
  ['audit', 'Jurnal'],
] as const;
type Tab = (typeof TABS)[number][0];

type ModuleForm = Pick<MetodikaModule, 'title' | 'subtitle' | 'weeks' | 'outcome' | 'summary' | 'order' | 'isPublished'> & { _id?: string };
const EMPTY_MODULE: ModuleForm = { title: '', subtitle: '', weeks: '', outcome: '', summary: '', order: 0, isPublished: true };

function ModuleModal({ initial, onClose, onSaved }: { initial: ModuleForm; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return toast.error('Modul nomi majburiy');
    setSaving(true);
    try {
      const { _id, ...body } = form;
      if (_id) await metodikaAdminApi.updateModule(_id, body);
      else await metodikaAdminApi.createModule({ ...body, order: body.order || undefined });
      toast.success('Saqlandi');
      onSaved();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Saqlashda xato'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
      <form onSubmit={save} className="max-h-[90vh] w-full max-w-xl space-y-4 overflow-y-auto rounded-3xl border border-white/10 bg-[#111726] p-6">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white">{form._id ? 'Modulni tahrirlash' : 'Yangi modul'}</h3>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-white/5" aria-label="Yopish"><FiX className="h-4 w-4" /></button>
        </div>
        <Field label="Nomi"><input className={inputCls} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Ost sarlavha"><input className={inputCls} placeholder="1-blok · 1–2-hafta" value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} /></Field>
          <Field label="Haftalar"><input className={inputCls} placeholder="1–2-hafta" value={form.weeks} onChange={(e) => setForm({ ...form, weeks: e.target.value })} /></Field>
          <Field label="Tartib"><input type="number" min={0} className={inputCls} value={form.order} onChange={(e) => setForm({ ...form, order: Number(e.target.value) })} /></Field>
        </div>
        <Field label="Blok natijasi"><input className={inputCls} value={form.outcome} onChange={(e) => setForm({ ...form, outcome: e.target.value })} /></Field>
        <Field label="Tavsif"><textarea rows={5} className={inputCls} value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} /></Field>
        <label className="flex items-center gap-3 text-sm text-slate-200">
          <input type="checkbox" className="toggle toggle-warning toggle-sm" checked={form.isPublished} onChange={(e) => setForm({ ...form, isPublished: e.target.checked })} />
          Chop etilgan
        </label>
        <div className="flex justify-end gap-2">
          <button type="button" className={btnGhost} onClick={onClose}>Bekor qilish</button>
          <button type="submit" className={btnPrimary} disabled={saving}><FiSave className="h-4 w-4" /> Saqlash</button>
        </div>
      </form>
    </div>
  );
}

function LessonsTab() {
  const [outline, setOutline] = useState<MetodikaOutline | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [moduleForm, setModuleForm] = useState<ModuleForm | null>(null);
  const [confirmModule, setConfirmModule] = useState<MetodikaModule | null>(null);

  const load = useCallback(() => {
    metodikaApi.outline().then(setOutline).catch((err) => toast.error(apiErrorMessage(err, 'Yuklashda xato')));
  }, []);
  useEffect(load, [load]);

  const addLesson = async (moduleId: string) => {
    try {
      const lesson = await metodikaAdminApi.createLesson({ module: moduleId, title: 'Yangi dars', isPublished: false });
      load();
      setSelected(lesson._id);
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Dars yaratishda xato'));
    }
  };

  const removeModule = async () => {
    if (!confirmModule) return;
    try {
      await metodikaAdminApi.deleteModule(confirmModule._id);
      toast.success("Modul o'chirildi");
      if (confirmModule.lessons.some((l) => l._id === selected)) setSelected(null);
      setConfirmModule(null);
      load();
    } catch (err) {
      toast.error(apiErrorMessage(err, "O'chirishda xato"));
    }
  };

  if (!outline) return <div className="h-64 animate-pulse rounded-2xl bg-white/5" />;

  return (
    <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
      <div className="space-y-4">
        <button type="button" className={`${btnGhost} w-full`} onClick={() => setModuleForm(EMPTY_MODULE)}><FiPlus className="h-4 w-4" /> Yangi modul</button>
        {outline.modules.map((mod) => (
          <div key={mod._id} className="rounded-2xl border border-white/10 bg-[#111726] p-3">
            <div className="flex items-start justify-between gap-2 px-1 pb-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-white">{mod.title}</p>
                <p className="text-xs text-slate-500">{mod.weeks}{!mod.isPublished && ' · qoralama'}</p>
              </div>
              <div className="flex shrink-0 gap-1">
                <button type="button" title="Tahrirlash" className="rounded-lg p-1.5 text-slate-400 hover:bg-white/5 hover:text-white" onClick={() => setModuleForm(mod)}><FiEdit3 className="h-4 w-4" /></button>
                <button type="button" title="O'chirish" className="rounded-lg p-1.5 text-slate-400 hover:bg-red-500/10 hover:text-red-300" onClick={() => setConfirmModule(mod)}><FiTrash2 className="h-4 w-4" /></button>
              </div>
            </div>
            {mod.lessons.map((lesson) => (
              <button
                key={lesson._id}
                type="button"
                onClick={() => setSelected(lesson._id)}
                className={`flex w-full gap-2 rounded-xl px-2.5 py-2 text-left text-sm ${selected === lesson._id ? 'bg-amber-500/15 text-amber-200' : 'text-slate-300 hover:bg-white/5'}`}
              >
                <span className="w-5 shrink-0 font-mono text-xs opacity-70">{String(lesson.number).padStart(2, '0')}</span>
                <span className="leading-snug">{lesson.title}{!lesson.isPublished && <span className="text-xs text-red-300"> · qoralama</span>}</span>
              </button>
            ))}
            <button type="button" className="mt-1 flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-xs font-semibold text-slate-500 hover:bg-white/5 hover:text-amber-300" onClick={() => addLesson(mod._id)}>
              <FiPlus className="h-3.5 w-3.5" /> Dars qo'shish
            </button>
          </div>
        ))}
      </div>

      <div className="min-w-0">
        {selected ? (
          <LessonEditor key={selected} lessonId={selected} modules={outline.modules} onSaved={load} onDeleted={() => { setSelected(null); load(); }} />
        ) : (
          <p className="rounded-2xl border border-dashed border-white/10 p-10 text-center text-sm text-slate-500">Tahrirlash uchun chapdan darsni tanlang yoki yangisini qo'shing.</p>
        )}
      </div>

      {moduleForm && <ModuleModal initial={moduleForm} onClose={() => setModuleForm(null)} onSaved={() => { setModuleForm(null); load(); }} />}
      <ConfirmModal
        open={Boolean(confirmModule)}
        title="Modulni o'chirish"
        message={`"${confirmModule?.title ?? ''}" moduli va undagi ${confirmModule?.lessons.length ?? 0} ta dars (rasmlari bilan) butunlay o'chiriladi.`}
        confirmLabel="O'chirish"
        onConfirm={removeModule}
        onCancel={() => setConfirmModule(null)}
      />
    </div>
  );
}

export default function AdminMetodikaPage() {
  const [tab, setTab] = useState<Tab>('lessons');
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    metodikaApi.session().then((s) => setAllowed(s.isOwner)).catch(() => setAllowed(false));
  }, []);

  if (allowed === null) return <div className="h-64 animate-pulse rounded-2xl bg-white/5" />;
  if (!allowed) {
    return <p className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-sm text-red-200">Metodikani faqat egasi boshqaradi.</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold text-white">Metodika</h2>
          <p className="mt-1 text-sm text-slate-400">Maxfiy kurs metodikasi: kontent, kirish ruxsatlari va kuzatuv jurnali.</p>
        </div>
        <Link href="/metodika" className={btnGhost}><FiExternalLink className="h-4 w-4" /> O'quvchi ko'rinishi</Link>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-white/10 pb-3">
        {TABS.map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${tab === id ? 'bg-amber-500 text-black' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'lessons' && <LessonsTab />}
      {tab === 'pages' && <PagesTab />}
      {tab === 'access' && <AccessTab />}
      {tab === 'audit' && <AuditTab />}
    </div>
  );
}
