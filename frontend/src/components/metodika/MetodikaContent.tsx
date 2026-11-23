'use client';

import { ReactNode, useEffect, useState } from 'react';
import {
  FiAlertTriangle, FiBookOpen, FiCheckCircle, FiClock, FiExternalLink, FiHelpCircle,
  FiHome, FiMonitor, FiTarget, FiTool, FiUserCheck, FiZap,
} from 'react-icons/fi';
import { metodikaApi, type MetodikaLesson, type MetodikaPage, type MetodikaSection } from '@/api/metodikaApi';
import MetodikaDiagram from './MetodikaDiagram';

// Rasm blob'lari sahifa ochiq turgan vaqtgacha xotirada saqlanadi: himoya qatlami
// kontentni vaqtincha DOM'dan olib tashlab qaytarganda qayta yuklanmasligi uchun.
const blobCache = new Map<string, string>();
export const clearMetodikaImageCache = () => {
  blobCache.forEach((url) => URL.revokeObjectURL(url));
  blobCache.clear();
};

export function SecureImage({ assetId, alt, className }: { assetId: string; alt: string; className?: string }) {
  const [url, setUrl] = useState<string | null>(blobCache.get(assetId) ?? null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (blobCache.has(assetId)) return undefined;
    let alive = true;
    metodikaApi.asset(assetId)
      .then((blob) => {
        const objectUrl = URL.createObjectURL(blob);
        blobCache.set(assetId, objectUrl);
        if (alive) setUrl(objectUrl);
      })
      .catch(() => { if (alive) setFailed(true); });
    return () => { alive = false; };
  }, [assetId]);

  if (failed) return <div className="flex h-40 items-center justify-center rounded-2xl border border-white/10 text-sm text-slate-500">Rasm yuklanmadi</div>;
  if (!url) return <div className="h-40 animate-pulse rounded-2xl bg-white/5" />;
  return <img src={url} alt={alt} draggable={false} className={`pointer-events-none ${className ?? ''}`} />;
}

const Card = ({ icon, title, tone = 'default', children }: {
  icon: ReactNode; title: string; tone?: 'default' | 'accent' | 'danger'; children: ReactNode;
}) => {
  const tones = {
    default: 'border-white/10 bg-[#111726]',
    accent: 'border-amber-500/25 bg-amber-500/[0.06]',
    danger: 'border-red-500/20 bg-red-500/[0.05]',
  };
  return (
    <section className={`rounded-3xl border p-5 sm:p-6 ${tones[tone]}`}>
      <h3 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400">
        <span className={tone === 'danger' ? 'text-red-400' : 'text-amber-400'}>{icon}</span>
        {title}
      </h3>
      {children}
    </section>
  );
};

const Bullets = ({ items }: { items: string[] }) => (
  <ul className="space-y-2.5">
    {items.map((item, i) => (
      <li key={i} className="flex gap-3 text-sm leading-relaxed text-slate-200">
        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
        <span>{item}</span>
      </li>
    ))}
  </ul>
);

const Prose = ({ children }: { children: string }) => (
  <p className="whitespace-pre-line text-sm leading-relaxed text-slate-200">{children}</p>
);

export function LessonView({ lesson }: { lesson: MetodikaLesson }) {
  const moduleTitle = typeof lesson.module === 'object' ? lesson.module.title : '';
  const hours = lesson.durationMinutes / 60;

  return (
    <article className="space-y-5">
      <header className="rounded-3xl border border-white/10 bg-gradient-to-br from-[#161d31] to-[#0f1524] p-6 sm:p-8">
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-400">
          <span className="rounded-full bg-amber-500/15 px-3 py-1 text-amber-300">{lesson.number}-dars</span>
          {moduleTitle && <span className="rounded-full bg-white/5 px-3 py-1">{moduleTitle}</span>}
          <span className="rounded-full bg-white/5 px-3 py-1">{lesson.week}-hafta</span>
          <span className="flex items-center gap-1 rounded-full bg-white/5 px-3 py-1">
            <FiClock className="h-3 w-3" /> {Number.isInteger(hours) ? hours : hours.toFixed(1)} soat ({lesson.durationMinutes} daq)
          </span>
          {!lesson.isPublished && <span className="rounded-full bg-red-500/15 px-3 py-1 text-red-300">Qoralama</span>}
        </div>
        <h1 className="mt-4 font-display text-2xl font-bold leading-tight text-white sm:text-3xl">{lesson.title}</h1>
      </header>

      <div className="grid gap-5 lg:grid-cols-2">
        {lesson.goal && <Card icon={<FiTarget />} title="Maqsad" tone="accent"><Prose>{lesson.goal}</Prose></Card>}
        {lesson.outcome && <Card icon={<FiCheckCircle />} title="Natija (artefakt)" tone="accent"><Prose>{lesson.outcome}</Prose></Card>}
      </div>

      {lesson.description && <Card icon={<FiBookOpen />} title="Dars haqida to'liq ma'lumot"><Prose>{lesson.description}</Prose></Card>}
      {lesson.why && <Card icon={<FiHelpCircle />} title="Nega aynan shu mavzu o'rgatiladi"><Prose>{lesson.why}</Prose></Card>}
      {lesson.relation && <Card icon={<FiZap />} title="Biznesga va loyihaga aloqasi"><Prose>{lesson.relation}</Prose></Card>}

      {lesson.diagrams?.length > 0 && (
        <div className="space-y-4">
          <h2 className="px-1 text-xs font-bold uppercase tracking-widest text-slate-500">Sxemalar — rasmda tushuntirish</h2>
          {lesson.diagrams.map((d, i) => <MetodikaDiagram key={d._id ?? i} diagram={d} />)}
        </div>
      )}

      {lesson.images?.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          {lesson.images.map((img) => (
            <figure key={img._id} className="overflow-hidden rounded-3xl border border-white/10 bg-[#111726]">
              <SecureImage assetId={img.asset} alt={img.caption || lesson.title} className="w-full" />
              {img.caption && <figcaption className="px-4 py-3 text-xs text-slate-400">{img.caption}</figcaption>}
            </figure>
          ))}
        </div>
      )}

      {lesson.timeline?.length > 0 && (
        <Card icon={<FiClock />} title={`Daqiqali reja (${lesson.durationMinutes} daq)`}>
          <ol className="relative space-y-4 border-l border-white/10 pl-5">
            {lesson.timeline.map((row, i) => (
              <li key={i} className="relative">
                <span className="absolute -left-[25px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-[#111726] bg-amber-400" />
                <div className="flex flex-wrap items-baseline gap-x-3">
                  <span className="font-mono text-xs font-semibold text-amber-300">{row.time}</span>
                  <span className="text-sm font-semibold text-white">{row.title}</span>
                </div>
                {row.details && <p className="mt-1 text-sm leading-relaxed text-slate-400">{row.details}</p>}
              </li>
            ))}
          </ol>
        </Card>
      )}

      {lesson.keyPoints?.length > 0 && <Card icon={<FiBookOpen />} title="Nimani tushuntirish va tekshirish"><Bullets items={lesson.keyPoints} /></Card>}

      <div className="grid gap-5 lg:grid-cols-2">
        {lesson.mentorPrep?.length > 0 && <Card icon={<FiUserCheck />} title="Mentor tayyorgarligi"><Bullets items={lesson.mentorPrep} /></Card>}
        {lesson.demo?.length > 0 && <Card icon={<FiMonitor />} title="Ko'rsatish (demo)"><Bullets items={lesson.demo} /></Card>}
      </div>

      {lesson.practice?.length > 0 && <Card icon={<FiTool />} title="Amaliy ish (ishtirokchilar)" tone="accent"><Bullets items={lesson.practice} /></Card>}

      {lesson.template?.body && (
        <Card icon={<FiBookOpen />} title={lesson.template.title || 'Shablon'}>
          <pre className="overflow-x-auto whitespace-pre-wrap rounded-2xl border border-white/10 bg-[#0a0e1a] p-4 font-mono text-xs leading-relaxed text-slate-200">{lesson.template.body}</pre>
        </Card>
      )}

      {lesson.mistakes?.length > 0 && <Card icon={<FiAlertTriangle />} title="Tipik xatolar" tone="danger"><Bullets items={lesson.mistakes} /></Card>}

      {(lesson.homeworkRequired?.length > 0 || lesson.homeworkOptional?.length > 0) && (
        <Card icon={<FiHome />} title="Uyga vazifa">
          {lesson.homeworkRequired?.length > 0 && (
            <>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-amber-300">Majburiy</p>
              <Bullets items={lesson.homeworkRequired} />
            </>
          )}
          {lesson.homeworkOptional?.length > 0 && (
            <>
              <p className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wider text-slate-400">Qo'shimcha</p>
              <Bullets items={lesson.homeworkOptional} />
            </>
          )}
        </Card>
      )}

      {lesson.links?.length > 0 && (
        <Card icon={<FiExternalLink />} title="Foydali havolalar">
          <ul className="grid gap-2 sm:grid-cols-2">
            {lesson.links.map((link, i) => (
              <li key={link._id ?? i}>
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="flex h-full items-start gap-3 rounded-2xl border border-white/10 bg-[#0f1524] p-3 transition-colors hover:border-amber-500/40"
                >
                  <FiExternalLink className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-white">{link.title}</span>
                    {link.note && <span className="block text-xs text-slate-400">{link.note}</span>}
                    <span className="block truncate text-xs text-slate-500">{link.url.replace(/^https?:\/\//, '')}</span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {lesson.decision && (
        <section className="rounded-3xl border border-amber-500/40 bg-gradient-to-br from-amber-500/15 to-transparent p-6">
          <h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-amber-300">Rahbar qarori</h3>
          <p className="text-base font-medium leading-relaxed text-white">{lesson.decision}</p>
        </section>
      )}
    </article>
  );
}

const lines = (body: string) => body.split('\n').map((l) => l.trim()).filter(Boolean);

function Section({ section }: { section: MetodikaSection }) {
  if (section.type === 'list') return <Bullets items={lines(section.body)} />;
  if (section.type === 'code') {
    return <pre className="overflow-x-auto whitespace-pre-wrap rounded-2xl border border-white/10 bg-[#0a0e1a] p-4 font-mono text-xs text-slate-200">{section.body}</pre>;
  }
  if (section.type === 'table') {
    const [head, ...rows] = lines(section.body).map((l) => l.split('|').map((c) => c.trim()));
    if (!head) return null;
    return (
      <div className="overflow-x-auto rounded-2xl border border-white/10">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="bg-white/5 text-xs uppercase tracking-wider text-slate-400">
              {head.map((cell, i) => <th key={i} className="px-4 py-3 font-semibold">{cell}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {rows.map((row, r) => (
              <tr key={r}>
                {row.map((cell, c) => (
                  <td key={c} className={`px-4 py-3 align-top ${c === 0 ? 'font-semibold text-white' : 'text-slate-300'}`}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  return <Prose>{section.body}</Prose>;
}

export function PageView({ page }: { page: MetodikaPage }) {
  return (
    <article className="space-y-5">
      <header className="rounded-3xl border border-white/10 bg-gradient-to-br from-[#161d31] to-[#0f1524] p-6 sm:p-8">
        <h1 className="font-display text-2xl font-bold text-white sm:text-3xl">{page.title}</h1>
        {!page.isPublished && <span className="mt-3 inline-block rounded-full bg-red-500/15 px-3 py-1 text-xs text-red-300">Qoralama</span>}
      </header>
      {page.sections.map((section, i) => (
        <section
          key={section._id ?? i}
          className={`rounded-3xl border p-5 sm:p-6 ${section.type === 'note' ? 'border-amber-500/30 bg-amber-500/[0.07]' : 'border-white/10 bg-[#111726]'}`}
        >
          {section.heading && <h2 className="mb-3 text-base font-bold text-white">{section.heading}</h2>}
          <Section section={section} />
        </section>
      ))}
    </article>
  );
}
