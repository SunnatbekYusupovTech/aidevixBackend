'use client';

import { FormEvent, ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { FiCopy, FiKey, FiPlus, FiRefreshCw, FiSave, FiTrash2, FiUpload } from 'react-icons/fi';
import ConfirmModal from '@/components/admin/ConfirmModal';
import {
  apiErrorMessage, metodikaAdminApi, metodikaApi,
  type DiagramType, type MetodikaAccessRow, type MetodikaAuditRow, type MetodikaImage,
  type MetodikaLesson, type MetodikaModule, type MetodikaPage, type SectionType,
} from '@/api/metodikaApi';
import { SecureImage } from './MetodikaContent';

// ─── Umumiy UI ───────────────────────────────────────────────────────────────

export const inputCls =
  'w-full rounded-xl border border-white/10 bg-[#0a0e1a] px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:border-amber-500/50 focus:outline-none';
export const btnPrimary =
  'inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-bold text-black transition-colors hover:bg-amber-400 disabled:opacity-50';
export const btnGhost =
  'inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-sm font-semibold text-slate-200 transition-colors hover:bg-white/5 disabled:opacity-50';
export const btnDanger =
  'inline-flex items-center justify-center gap-2 rounded-xl border border-red-500/30 px-3 py-2 text-sm font-semibold text-red-300 transition-colors hover:bg-red-500/10 disabled:opacity-50';

export const Field = ({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) => (
  <label className="block">
    <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</span>
    {children}
    {hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
  </label>
);

const Area = ({ value, onChange, rows = 4, mono }: { value: string; onChange: (v: string) => void; rows?: number; mono?: boolean }) => (
  <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={rows} className={`${inputCls} ${mono ? 'font-mono text-xs' : ''}`} />
);

const Panel = ({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) => (
  <section className="rounded-2xl border border-white/10 bg-[#111726] p-5">
    <div className="mb-4 flex items-center justify-between gap-3">
      <h3 className="text-sm font-bold text-white">{title}</h3>
      {action}
    </div>
    <div className="space-y-4">{children}</div>
  </section>
);

const toLines = (items?: string[]) => (items ?? []).join('\n');
const fromLines = (value: string) => value.split('\n').map((l) => l.trim()).filter(Boolean);
const splitRow = (line: string) => line.split('|').map((c) => c.trim());
const fmtDate = (d?: string | null) => (d ? new Date(d).toLocaleString('uz-UZ', { dateStyle: 'short', timeStyle: 'short' }) : '—');

// ─── Dars tahrirlovchi ───────────────────────────────────────────────────────

const LIST_FIELDS = [
  ['keyPoints', 'Nimani tushuntirish va tekshirish'],
  ['mentorPrep', 'Mentor tayyorgarligi'],
  ['demo', "Ko'rsatish (demo)"],
  ['practice', 'Amaliy ish (ishtirokchilar)'],
  ['mistakes', 'Tipik xatolar'],
  ['homeworkRequired', 'Uyga vazifa — majburiy'],
  ['homeworkOptional', "Uyga vazifa — qo'shimcha"],
] as const;

const TEXT_FIELDS = [
  ['goal', 'Maqsad', 3],
  ['outcome', 'Natija (artefakt)', 3],
  ['description', "Dars haqida to'liq ma'lumot", 6],
  ['why', "Nega aynan shu mavzu o'rgatiladi", 5],
  ['relation', 'Biznesga va loyihaga aloqasi', 3],
  ['decision', 'Rahbar qarori', 2],
] as const;

type ListKey = (typeof LIST_FIELDS)[number][0];
type TextKey = (typeof TEXT_FIELDS)[number][0];

type DiagramForm = { type: DiagramType; title: string; caption: string; leftTitle: string; rightTitle: string; items: string };
type LinkForm = { title: string; url: string; note: string };

type LessonForm = Record<TextKey | ListKey, string> & {
  number: number; title: string; module: string; week: number; durationMinutes: number; isPublished: boolean;
  timeline: string; templateTitle: string; templateBody: string;
  links: LinkForm[]; diagrams: DiagramForm[]; captions: Record<string, string>;
};

const DIAGRAM_LABELS: Record<DiagramType, string> = {
  flow: 'Oqim (qadamlar →)', cycle: 'Sikl (takrorlanadi)', compare: 'Solishtirish (2 ustun)', layers: 'Qatlamlar', cards: 'Kartochkalar',
};

const toForm = (l: MetodikaLesson): LessonForm => ({
  number: l.number, title: l.title, week: l.week, durationMinutes: l.durationMinutes, isPublished: l.isPublished,
  module: typeof l.module === 'object' ? l.module._id : l.module,
  goal: l.goal ?? '', outcome: l.outcome ?? '', description: l.description ?? '', why: l.why ?? '',
  relation: l.relation ?? '', decision: l.decision ?? '',
  keyPoints: toLines(l.keyPoints), mentorPrep: toLines(l.mentorPrep), demo: toLines(l.demo), practice: toLines(l.practice),
  mistakes: toLines(l.mistakes), homeworkRequired: toLines(l.homeworkRequired), homeworkOptional: toLines(l.homeworkOptional),
  timeline: (l.timeline ?? []).map((t) => [t.time, t.title, t.details].filter((c, i) => i < 2 || c).join(' | ')).join('\n'),
  templateTitle: l.template?.title ?? '', templateBody: l.template?.body ?? '',
  links: (l.links ?? []).map(({ title, url, note }) => ({ title, url, note: note ?? '' })),
  diagrams: (l.diagrams ?? []).map((d) => ({
    type: d.type, title: d.title ?? '', caption: d.caption ?? '', leftTitle: d.leftTitle ?? '', rightTitle: d.rightTitle ?? '',
    items: d.items.map((i) => (i.text ? `${i.label} | ${i.text}` : i.label)).join('\n'),
  })),
  captions: Object.fromEntries((l.images ?? []).map((img) => [img._id, img.caption ?? ''])),
});

const toPayload = (f: LessonForm) => ({
  number: f.number, title: f.title, module: f.module, week: f.week, durationMinutes: f.durationMinutes, isPublished: f.isPublished,
  goal: f.goal, outcome: f.outcome, description: f.description, why: f.why, relation: f.relation, decision: f.decision,
  keyPoints: fromLines(f.keyPoints), mentorPrep: fromLines(f.mentorPrep), demo: fromLines(f.demo), practice: fromLines(f.practice),
  mistakes: fromLines(f.mistakes), homeworkRequired: fromLines(f.homeworkRequired), homeworkOptional: fromLines(f.homeworkOptional),
  timeline: fromLines(f.timeline).map((line) => {
    const [time = '', title = '', ...rest] = splitRow(line);
    return title ? { time, title, details: rest.join(' | ') } : { time: '', title: time, details: '' };
  }),
  template: { title: f.templateTitle, body: f.templateBody },
  links: f.links.filter((l) => l.url.trim()),
  diagrams: f.diagrams.map((d) => ({
    ...d,
    items: fromLines(d.items).map((line) => {
      const [label = '', ...rest] = splitRow(line);
      return { label, text: rest.join(' | ') };
    }),
  })),
  imageCaptions: f.captions,
});

export function LessonEditor({ lessonId, modules, onSaved, onDeleted }: {
  lessonId: string; modules: MetodikaModule[]; onSaved: () => void; onDeleted: () => void;
}) {
  const [form, setForm] = useState<LessonForm | null>(null);
  const [images, setImages] = useState<MetodikaImage[]>([]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Komponent `key={lessonId}` bilan ochiladi — har dars uchun toza holatdan boshlanadi.
  useEffect(() => {
    metodikaApi.lesson(lessonId)
      .then((l) => { setForm(toForm(l)); setImages(l.images ?? []); })
      .catch((err) => toast.error(apiErrorMessage(err, 'Darsni yuklashda xato')));
  }, [lessonId]);

  if (!form) return <div className="h-64 animate-pulse rounded-2xl bg-white/5" />;

  const set = <K extends keyof LessonForm>(key: K, value: LessonForm[K]) => setForm((f) => (f ? { ...f, [key]: value } : f));
  const patchAt = <T,>(list: T[], index: number, patch: Partial<T>) => list.map((item, i) => (i === index ? { ...item, ...patch } : item));

  const save = async (e?: FormEvent) => {
    e?.preventDefault();
    if (!form.title.trim()) return toast.error('Dars nomi majburiy');
    setSaving(true);
    try {
      await metodikaAdminApi.updateLesson(lessonId, toPayload(form));
      toast.success('Saqlandi');
      onSaved();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Saqlashda xato'));
    } finally {
      setSaving(false);
    }
  };

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    try {
      let latest = images;
      for (const file of Array.from(files)) {
        if (file.size > 3 * 1024 * 1024) { toast.error(`${file.name}: 3 MB dan katta`); continue; }
        latest = await metodikaAdminApi.uploadImage(lessonId, file);
      }
      setImages(latest);
      setForm((f) => (f ? { ...f, captions: { ...Object.fromEntries(latest.map((i) => [i._id, i.caption ?? ''])), ...f.captions } } : f));
      toast.success("Rasm qo'shildi");
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Rasm yuklashda xato'));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const removeImage = async (imageId: string) => {
    try {
      setImages(await metodikaAdminApi.deleteImage(lessonId, imageId));
      toast.success("Rasm o'chirildi");
    } catch (err) {
      toast.error(apiErrorMessage(err, "O'chirishda xato"));
    }
  };

  const remove = async () => {
    try {
      await metodikaAdminApi.deleteLesson(lessonId);
      toast.success("Dars o'chirildi");
      onDeleted();
    } catch (err) {
      toast.error(apiErrorMessage(err, "O'chirishda xato"));
    }
  };

  return (
    <form onSubmit={save} className="space-y-5">
      <div className="sticky top-0 z-10 -mx-1 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#0d1220]/95 px-4 py-3 backdrop-blur">
        <p className="min-w-0 truncate text-sm font-bold text-white">{form.number}. {form.title || 'Nomsiz dars'}</p>
        <div className="flex gap-2">
          <button type="button" className={btnDanger} onClick={() => setConfirmDelete(true)}><FiTrash2 className="h-4 w-4" /> O'chirish</button>
          <button type="submit" className={btnPrimary} disabled={saving}><FiSave className="h-4 w-4" /> {saving ? 'Saqlanmoqda…' : 'Saqlash'}</button>
        </div>
      </div>

      <Panel title="Asosiy">
        <Field label="Dars nomi"><input className={inputCls} value={form.title} onChange={(e) => set('title', e.target.value)} maxLength={200} /></Field>
        <div className="grid gap-4 sm:grid-cols-4">
          <Field label="Dars №"><input type="number" min={1} className={inputCls} value={form.number} onChange={(e) => set('number', Number(e.target.value))} /></Field>
          <Field label="Hafta"><input type="number" min={0} className={inputCls} value={form.week} onChange={(e) => set('week', Number(e.target.value))} /></Field>
          <Field label="Davomiyligi (daq)"><input type="number" min={10} className={inputCls} value={form.durationMinutes} onChange={(e) => set('durationMinutes', Number(e.target.value))} /></Field>
          <Field label="Modul">
            <select className={inputCls} value={form.module} onChange={(e) => set('module', e.target.value)}>
              {modules.map((m) => <option key={m._id} value={m._id}>{m.title}</option>)}
            </select>
          </Field>
        </div>
        <label className="flex items-center gap-3 text-sm text-slate-200">
          <input type="checkbox" className="toggle toggle-warning toggle-sm" checked={form.isPublished} onChange={(e) => set('isPublished', e.target.checked)} />
          Chop etilgan (o'chirilsa — faqat siz ko'rasiz)
        </label>
      </Panel>

      <Panel title="Mazmun">
        {TEXT_FIELDS.map(([key, label, rows]) => (
          <Field key={key} label={label}><Area value={form[key]} onChange={(v) => set(key, v)} rows={rows} /></Field>
        ))}
      </Panel>

      <Panel title="Daqiqali reja">
        <Field label="Har qator: vaqt | sarlavha | tafsilot" hint="Masalan: 0–15 | Uy vazifasi | 2–3 ishtirokchi natija ko'rsatadi">
          <Area value={form.timeline} onChange={(v) => set('timeline', v)} rows={8} mono />
        </Field>
      </Panel>

      <Panel title="Ro'yxatlar (har qator — bitta band)">
        {LIST_FIELDS.map(([key, label]) => (
          <Field key={key} label={label}><Area value={form[key]} onChange={(v) => set(key, v)} rows={5} /></Field>
        ))}
      </Panel>

      <Panel title="Shablon (ixtiyoriy)">
        <Field label="Sarlavha"><input className={inputCls} value={form.templateTitle} onChange={(e) => set('templateTitle', e.target.value)} /></Field>
        <Field label="Matn"><Area value={form.templateBody} onChange={(v) => set('templateBody', v)} rows={7} mono /></Field>
      </Panel>

      <Panel
        title={`Sxemalar — rasmda tushuntirish (${form.diagrams.length})`}
        action={<button type="button" className={btnGhost} onClick={() => set('diagrams', [...form.diagrams, { type: 'flow', title: '', caption: '', leftTitle: '', rightTitle: '', items: '' }])}><FiPlus className="h-4 w-4" /> Sxema</button>}
      >
        {form.diagrams.length === 0 && <p className="text-sm text-slate-500">Hozircha sxema yo'q.</p>}
        {form.diagrams.map((d, i) => (
          <div key={i} className="space-y-3 rounded-xl border border-white/10 bg-[#0d1220] p-4">
            <div className="grid gap-3 sm:grid-cols-[200px_1fr_auto]">
              <select className={inputCls} value={d.type} onChange={(e) => set('diagrams', patchAt(form.diagrams, i, { type: e.target.value as DiagramType }))}>
                {Object.entries(DIAGRAM_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
              <input className={inputCls} placeholder="Sxema sarlavhasi" value={d.title} onChange={(e) => set('diagrams', patchAt(form.diagrams, i, { title: e.target.value }))} />
              <button type="button" className={btnDanger} onClick={() => set('diagrams', form.diagrams.filter((_, j) => j !== i))} aria-label="Sxemani o'chirish"><FiTrash2 className="h-4 w-4" /></button>
            </div>
            {d.type === 'compare' && (
              <div className="grid gap-3 sm:grid-cols-2">
                <input className={inputCls} placeholder="Chap ustun nomi" value={d.leftTitle} onChange={(e) => set('diagrams', patchAt(form.diagrams, i, { leftTitle: e.target.value }))} />
                <input className={inputCls} placeholder="O'ng ustun nomi" value={d.rightTitle} onChange={(e) => set('diagrams', patchAt(form.diagrams, i, { rightTitle: e.target.value }))} />
              </div>
            )}
            <Field label={d.type === 'compare' ? 'Har qator: chap | o\'ng' : 'Har qator: nom | izoh (izoh ixtiyoriy)'}>
              <Area value={d.items} onChange={(v) => set('diagrams', patchAt(form.diagrams, i, { items: v }))} rows={5} mono />
            </Field>
            <input className={inputCls} placeholder="Sxema ostidagi izoh (ixtiyoriy)" value={d.caption} onChange={(e) => set('diagrams', patchAt(form.diagrams, i, { caption: e.target.value }))} />
          </div>
        ))}
      </Panel>

      <Panel
        title={`Rasmlar (${images.length}/12)`}
        action={
          <>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={(e) => upload(e.target.files)} />
            <button type="button" className={btnGhost} disabled={uploading} onClick={() => fileRef.current?.click()}>
              <FiUpload className="h-4 w-4" /> {uploading ? 'Yuklanmoqda…' : "Rasm qo'shish"}
            </button>
          </>
        }
      >
        <p className="text-xs text-slate-500">JPG, PNG yoki WEBP, har biri 3 MB gacha. Rasmlar ochiq CDN'ga emas, yopiq bazaga saqlanadi va faqat ruxsat bilan ko'rsatiladi.</p>
        {images.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2">
            {images.map((img) => (
              <div key={img._id} className="overflow-hidden rounded-xl border border-white/10 bg-[#0d1220]">
                <SecureImage assetId={img.asset} alt={form.captions[img._id] ?? ''} className="max-h-56 w-full object-contain" />
                <div className="flex gap-2 p-3">
                  <input className={inputCls} placeholder="Rasm izohi" value={form.captions[img._id] ?? ''} onChange={(e) => set('captions', { ...form.captions, [img._id]: e.target.value })} />
                  <button type="button" className={btnDanger} onClick={() => removeImage(img._id)} aria-label="Rasmni o'chirish"><FiTrash2 className="h-4 w-4" /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>

      <Panel
        title={`Foydali havolalar (${form.links.length})`}
        action={<button type="button" className={btnGhost} onClick={() => set('links', [...form.links, { title: '', url: '', note: '' }])}><FiPlus className="h-4 w-4" /> Havola</button>}
      >
        {form.links.length === 0 && <p className="text-sm text-slate-500">Hozircha havola yo'q.</p>}
        {form.links.map((link, i) => (
          <div key={i} className="grid gap-2 sm:grid-cols-[1fr_1.4fr_1fr_auto]">
            <input className={inputCls} placeholder="Nomi" value={link.title} onChange={(e) => set('links', patchAt(form.links, i, { title: e.target.value }))} />
            <input className={inputCls} placeholder="https://…" value={link.url} onChange={(e) => set('links', patchAt(form.links, i, { url: e.target.value }))} />
            <input className={inputCls} placeholder="Izoh (ixtiyoriy)" value={link.note} onChange={(e) => set('links', patchAt(form.links, i, { note: e.target.value }))} />
            <button type="button" className={btnDanger} onClick={() => set('links', form.links.filter((_, j) => j !== i))} aria-label="Havolani o'chirish"><FiTrash2 className="h-4 w-4" /></button>
          </div>
        ))}
      </Panel>

      <ConfirmModal
        open={confirmDelete}
        title="Darsni o'chirish"
        message={`"${form.title}" darsi va uning barcha rasmlari butunlay o'chiriladi. Bu amalni qaytarib bo'lmaydi.`}
        confirmLabel="O'chirish"
        onConfirm={remove}
        onCancel={() => setConfirmDelete(false)}
      />
    </form>
  );
}

// ─── Sahifalar ───────────────────────────────────────────────────────────────

const SECTION_LABELS: Record<SectionType, string> = {
  text: 'Matn', list: "Ro'yxat (har qator — band)", table: 'Jadval (ustunlar | bilan, 1-qator sarlavha)', note: 'Eslatma', code: 'Shablon / kod',
};

export function PagesTab() {
  const [pages, setPages] = useState<Pick<MetodikaPage, '_id' | 'title' | 'order' | 'isPublished'>[]>([]);
  const [current, setCurrent] = useState<MetodikaPage | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const load = useCallback(() => {
    metodikaApi.outline().then((o) => setPages(o.pages)).catch((err) => toast.error(apiErrorMessage(err, 'Yuklashda xato')));
  }, []);
  useEffect(load, [load]);

  const openPage = (id: string) => metodikaApi.page(id).then(setCurrent).catch((err) => toast.error(apiErrorMessage(err, 'Yuklashda xato')));

  const create = async () => {
    try {
      const page = await metodikaAdminApi.createPage({ title: 'Yangi sahifa', sections: [{ heading: '', type: 'text', body: '' }], isPublished: false });
      load();
      setCurrent(page);
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Yaratishda xato'));
    }
  };

  const save = async () => {
    if (!current) return;
    setSaving(true);
    try {
      const { title, order, isPublished, sections } = current;
      setCurrent(await metodikaAdminApi.updatePage(current._id, { title, order, isPublished, sections }));
      toast.success('Saqlandi');
      load();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Saqlashda xato'));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!current) return;
    try {
      await metodikaAdminApi.deletePage(current._id);
      toast.success("O'chirildi");
      setCurrent(null);
      setConfirmDelete(false);
      load();
    } catch (err) {
      toast.error(apiErrorMessage(err, "O'chirishda xato"));
    }
  };

  const setSection = (index: number, patch: Partial<MetodikaPage['sections'][number]>) =>
    setCurrent((p) => (p ? { ...p, sections: p.sections.map((s, i) => (i === index ? { ...s, ...patch } : s)) } : p));

  return (
    <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
      <div className="space-y-2">
        <button type="button" className={`${btnGhost} w-full`} onClick={create}><FiPlus className="h-4 w-4" /> Yangi sahifa</button>
        {pages.map((p) => (
          <button
            key={p._id}
            type="button"
            onClick={() => openPage(p._id)}
            className={`block w-full rounded-xl px-3 py-2.5 text-left text-sm ${current?._id === p._id ? 'bg-amber-500/15 text-amber-200' : 'text-slate-300 hover:bg-white/5'}`}
          >
            {p.title} {!p.isPublished && <span className="text-xs text-red-300">· qoralama</span>}
          </button>
        ))}
      </div>

      {!current ? (
        <p className="rounded-2xl border border-dashed border-white/10 p-10 text-center text-sm text-slate-500">Tahrirlash uchun sahifani tanlang.</p>
      ) : (
        <div className="space-y-5">
          <Panel
            title="Sahifa"
            action={
              <div className="flex gap-2">
                <button type="button" className={btnDanger} onClick={() => setConfirmDelete(true)}><FiTrash2 className="h-4 w-4" /> O'chirish</button>
                <button type="button" className={btnPrimary} onClick={save} disabled={saving}><FiSave className="h-4 w-4" /> Saqlash</button>
              </div>
            }
          >
            <div className="grid gap-4 sm:grid-cols-[1fr_120px]">
              <Field label="Nomi"><input className={inputCls} value={current.title} onChange={(e) => setCurrent({ ...current, title: e.target.value })} /></Field>
              <Field label="Tartib"><input type="number" className={inputCls} value={current.order} onChange={(e) => setCurrent({ ...current, order: Number(e.target.value) })} /></Field>
            </div>
            <label className="flex items-center gap-3 text-sm text-slate-200">
              <input type="checkbox" className="toggle toggle-warning toggle-sm" checked={current.isPublished} onChange={(e) => setCurrent({ ...current, isPublished: e.target.checked })} />
              Chop etilgan
            </label>
          </Panel>

          {current.sections.map((section, i) => (
            <Panel
              key={i}
              title={`Bo'lim ${i + 1}`}
              action={<button type="button" className={btnDanger} onClick={() => setCurrent({ ...current, sections: current.sections.filter((_, j) => j !== i) })}><FiTrash2 className="h-4 w-4" /></button>}
            >
              <div className="grid gap-3 sm:grid-cols-[1fr_280px]">
                <input className={inputCls} placeholder="Sarlavha (ixtiyoriy)" value={section.heading} onChange={(e) => setSection(i, { heading: e.target.value })} />
                <select className={inputCls} value={section.type} onChange={(e) => setSection(i, { type: e.target.value as SectionType })}>
                  {Object.entries(SECTION_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </div>
              <Area value={section.body} onChange={(v) => setSection(i, { body: v })} rows={8} mono={section.type === 'table' || section.type === 'code'} />
            </Panel>
          ))}
          <button type="button" className={btnGhost} onClick={() => setCurrent({ ...current, sections: [...current.sections, { heading: '', type: 'text', body: '' }] })}>
            <FiPlus className="h-4 w-4" /> Bo'lim qo'shish
          </button>
        </div>
      )}

      <ConfirmModal open={confirmDelete} title="Sahifani o'chirish" message="Sahifa butunlay o'chiriladi." confirmLabel="O'chirish" onConfirm={remove} onCancel={() => setConfirmDelete(false)} />
    </div>
  );
}

// ─── Kirish ruxsatlari ───────────────────────────────────────────────────────

export function AccessTab() {
  const [rows, setRows] = useState<MetodikaAccessRow[]>([]);
  const [form, setForm] = useState({ identifier: '', login: '', password: '', expiresAt: '', note: '' });
  const [issued, setIssued] = useState<{ username: string; login: string; password: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<MetodikaAccessRow | null>(null);

  const load = useCallback(() => {
    metodikaAdminApi.listAccess().then(setRows).catch((err) => toast.error(apiErrorMessage(err, 'Yuklashda xato')));
  }, []);
  useEffect(load, [load]);

  const create = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.identifier.trim()) return toast.error('Foydalanuvchi email yoki username kiriting');
    setBusy(true);
    try {
      const row = await metodikaAdminApi.createAccess({
        identifier: form.identifier.trim(),
        login: form.login.trim() || undefined,
        password: form.password || undefined,
        expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
        note: form.note,
      });
      setIssued({ username: row.user?.username ?? '', login: row.login, password: row.password ?? '' });
      setForm({ identifier: '', login: '', password: '', expiresAt: '', note: '' });
      load();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Ruxsat berishda xato'));
    } finally {
      setBusy(false);
    }
  };

  const update = async (row: MetodikaAccessRow, body: Parameters<typeof metodikaAdminApi.updateAccess>[1]) => {
    try {
      const updated = await metodikaAdminApi.updateAccess(row._id, body);
      if (updated.password) setIssued({ username: row.user?.username ?? '', login: updated.login, password: updated.password });
      else toast.success('Yangilandi');
      load();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Yangilashda xato'));
    }
  };

  const remove = async () => {
    if (!confirmDelete) return;
    try {
      await metodikaAdminApi.deleteAccess(confirmDelete._id);
      toast.success('Ruxsat olib tashlandi');
      setConfirmDelete(null);
      load();
    } catch (err) {
      toast.error(apiErrorMessage(err, "O'chirishda xato"));
    }
  };

  const copy = (text: string) => navigator.clipboard.writeText(text).then(() => toast.success('Nusxalandi'), () => toast.error("Nusxalab bo'lmadi"));

  return (
    <div className="space-y-5">
      {issued && (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5">
          <p className="text-sm font-bold text-emerald-200">@{issued.username} uchun kirish ma'lumotlari — faqat HOZIR ko'rsatiladi</p>
          <p className="mt-1 text-xs text-emerald-200/70">Parol bazada faqat hash ko'rinishida saqlanadi. Yopsangiz, qayta ko'ra olmaysiz — faqat yangisini chiqarasiz.</p>
          <div className="mt-3 flex flex-wrap items-center gap-3 font-mono text-sm text-white">
            <span>login: <b>{issued.login}</b></span>
            <span>parol: <b>{issued.password}</b></span>
            <button type="button" className={btnGhost} onClick={() => copy(`Metodika: https://aidevix.uz/metodika\nLogin: ${issued.login}\nParol: ${issued.password}`)}><FiCopy className="h-4 w-4" /> Nusxalash</button>
            <button type="button" className={btnGhost} onClick={() => setIssued(null)}>Yopish</button>
          </div>
        </div>
      )}

      <Panel title="Yangi ruxsat berish">
        <form onSubmit={create} className="grid gap-3 lg:grid-cols-[1.4fr_1fr_1fr_1fr_1.2fr_auto]">
          <input className={inputCls} placeholder="Saytdagi email yoki username *" value={form.identifier} onChange={(e) => setForm({ ...form, identifier: e.target.value })} />
          <input className={inputCls} placeholder="Login (bo'sh — avtomatik)" value={form.login} onChange={(e) => setForm({ ...form, login: e.target.value })} autoComplete="off" />
          <input className={inputCls} placeholder="Parol (bo'sh — avtomatik)" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} autoComplete="off" />
          <input type="date" className={inputCls} title="Amal qilish muddati (ixtiyoriy)" value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} />
          <input className={inputCls} placeholder="Izoh (masalan: mentor)" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
          <button type="submit" className={btnPrimary} disabled={busy}><FiKey className="h-4 w-4" /> Berish</button>
        </form>
        <p className="text-xs text-slate-500">Foydalanuvchi avval saytda ro'yxatdan o'tgan bo'lishi kerak. Login/parol faqat SHU akkauntda ishlaydi — boshqa akkauntga berib yuborilsa ham ochilmaydi.</p>
      </Panel>

      <div className="overflow-x-auto rounded-2xl border border-white/10 bg-[#111726]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wider text-slate-500">
              <th className="px-4 py-3">Foydalanuvchi</th><th className="px-4 py-3">Login</th><th className="px-4 py-3">Holat</th>
              <th className="px-4 py-3">Muddat</th><th className="px-4 py-3">Oxirgi kirish</th><th className="px-4 py-3">Izoh</th><th className="px-4 py-3 text-right">Amallar</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {rows.length === 0 && <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-500">Hali hech kimga ruxsat berilmagan.</td></tr>}
            {rows.map((row) => {
              const expired = row.expiresAt ? new Date(row.expiresAt) < new Date() : false;
              return (
                <tr key={row._id}>
                  <td className="px-4 py-3">
                    <span className="font-semibold text-white">@{row.user?.username ?? "o'chirilgan"}</span>
                    <span className="block text-xs text-slate-500">{row.user?.email}</span>
                  </td>
                  <td className="px-4 py-3 font-mono text-amber-300">{row.login}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${row.isActive && !expired ? 'bg-emerald-500/15 text-emerald-300' : 'bg-red-500/15 text-red-300'}`}>
                      {!row.isActive ? "To'xtatilgan" : expired ? 'Muddati tugagan' : 'Faol'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-300">{row.expiresAt ? new Date(row.expiresAt).toLocaleDateString('uz-UZ') : 'Cheksiz'}</td>
                  <td className="px-4 py-3 text-slate-300">{fmtDate(row.lastLoginAt)}<span className="block text-xs text-slate-500">{row.lastIp}</span></td>
                  <td className="max-w-[180px] truncate px-4 py-3 text-slate-400">{row.note}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button type="button" className={btnGhost} onClick={() => update(row, { isActive: !row.isActive })}>{row.isActive ? "To'xtatish" : 'Yoqish'}</button>
                      <button type="button" className={btnGhost} title="Yangi parol chiqarish" onClick={() => update(row, { resetPassword: true })}><FiRefreshCw className="h-4 w-4" /></button>
                      <button type="button" className={btnDanger} title="Ruxsatni olib tashlash" onClick={() => setConfirmDelete(row)}><FiTrash2 className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <ConfirmModal
        open={Boolean(confirmDelete)}
        title="Ruxsatni olib tashlash"
        message={`@${confirmDelete?.user?.username ?? ''} metodikani darhol ko'ra olmay qoladi.`}
        confirmLabel="Olib tashlash"
        onConfirm={remove}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}

// ─── Jurnal ──────────────────────────────────────────────────────────────────

const ACTION_LABELS: Record<string, [string, string]> = {
  unlock_ok: ['Kirdi', 'text-emerald-300'],
  unlock_fail: ["Noto'g'ri login/parol", 'text-red-300'],
  unlock_locked: ['Bloklangan urinish', 'text-red-300'],
  lock: ['Yopdi', 'text-slate-300'],
  view_outline: ['Mundarijani ochdi', 'text-slate-300'],
  view_lesson: ["Darsni ko'rdi", 'text-sky-300'],
  view_page: ["Sahifani ko'rdi", 'text-sky-300'],
  client_devtools: ['DevTools ochdi', 'text-red-300'],
  client_copy: ['Nusxalashga urindi', 'text-amber-300'],
  client_print: ['Chop etishga urindi', 'text-amber-300'],
  client_screenshot_key: ['PrintScreen bosdi', 'text-red-300'],
  client_contextmenu: ["O'ng tugma bosdi", 'text-amber-300'],
  admin_change: ['Tahrir', 'text-violet-300'],
  access_granted: ['Ruxsat berildi', 'text-emerald-300'],
  access_updated: ['Ruxsat yangilandi', 'text-violet-300'],
  access_revoked: ['Ruxsat olib tashlandi', 'text-red-300'],
};

export function AuditTab() {
  const [rows, setRows] = useState<MetodikaAuditRow[] | null>(null);
  const load = useCallback(() => {
    metodikaAdminApi.audit().then(setRows).catch((err) => toast.error(apiErrorMessage(err, 'Yuklashda xato')));
  }, []);
  useEffect(load, [load]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-400">Oxirgi 300 ta hodisa. Yozuvlar 180 kun saqlanadi.</p>
        <button type="button" className={btnGhost} onClick={load}><FiRefreshCw className="h-4 w-4" /> Yangilash</button>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-white/10 bg-[#111726]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wider text-slate-500">
              <th className="px-4 py-3">Vaqt</th><th className="px-4 py-3">Kim</th><th className="px-4 py-3">Hodisa</th><th className="px-4 py-3">Tafsilot</th><th className="px-4 py-3">IP</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {rows === null && <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-500">Yuklanmoqda…</td></tr>}
            {rows?.length === 0 && <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-500">Jurnal bo'sh.</td></tr>}
            {rows?.map((row) => {
              const [label, tone] = ACTION_LABELS[row.action] ?? [row.action, 'text-slate-300'];
              return (
                <tr key={row._id}>
                  <td className="whitespace-nowrap px-4 py-2.5 text-slate-400">{fmtDate(row.createdAt)}</td>
                  <td className="px-4 py-2.5 text-white">@{row.user?.username ?? '—'}</td>
                  <td className={`px-4 py-2.5 font-semibold ${tone}`}>{label}</td>
                  <td className="max-w-[320px] truncate px-4 py-2.5 text-slate-400">{row.target}</td>
                  <td className="px-4 py-2.5 font-mono text-xs text-slate-500">{row.ip}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
