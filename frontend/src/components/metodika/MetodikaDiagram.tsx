'use client';

import { Fragment } from 'react';
import { FiArrowDown, FiArrowRight, FiRepeat } from 'react-icons/fi';
import type { MetodikaDiagram as Diagram } from '@/api/metodikaApi';

// "Rasm ko'rinishidagi tushuntirish": tuzilmali ma'lumotdan chiziladigan sxemalar.
// Rasm fayli emas — shuning uchun admin panelda matn kabi tahrirlanadi.

const Step = ({ index, label, text }: { index: number; label: string; text: string }) => (
  <div className="flex min-w-0 flex-1 flex-col rounded-2xl border border-white/10 bg-[#0f1524] p-4">
    <span className="mb-2 flex h-6 w-6 items-center justify-center rounded-full bg-amber-500/15 text-xs font-bold text-amber-300">
      {index + 1}
    </span>
    <span className="text-sm font-semibold leading-snug text-white">{label}</span>
    {text && <span className="mt-1 text-xs leading-relaxed text-slate-400">{text}</span>}
  </div>
);

function Flow({ items, loop }: { items: Diagram['items']; loop?: boolean }) {
  return (
    <div>
      <div className="flex flex-col items-stretch gap-2 lg:flex-row">
        {items.map((item, i) => (
          <Fragment key={i}>
            <Step index={i} label={item.label} text={item.text} />
            {i < items.length - 1 && (
              <span className="flex shrink-0 items-center justify-center text-amber-400/70">
                <FiArrowRight className="hidden h-5 w-5 lg:block" />
                <FiArrowDown className="h-5 w-5 lg:hidden" />
              </span>
            )}
          </Fragment>
        ))}
      </div>
      {loop && (
        <div className="mt-3 flex items-center gap-2 rounded-xl border border-dashed border-amber-500/30 px-4 py-2 text-xs text-amber-300/90">
          <FiRepeat className="h-4 w-4 shrink-0" />
          Oxirgi qadamdan birinchisiga qaytadi — maqsadga erishguncha takrorlanadi.
        </div>
      )}
    </div>
  );
}

function Compare({ diagram }: { diagram: Diagram }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10">
      <div className="grid grid-cols-2 text-sm font-semibold">
        <div className="bg-sky-500/10 px-4 py-3 text-sky-300">{diagram.leftTitle || 'A'}</div>
        <div className="border-l border-white/10 bg-amber-500/10 px-4 py-3 text-amber-300">{diagram.rightTitle || 'B'}</div>
      </div>
      {diagram.items.map((item, i) => (
        <div key={i} className="grid grid-cols-2 border-t border-white/10 text-sm text-slate-200">
          <div className="px-4 py-3">{item.label}</div>
          <div className="border-l border-white/10 px-4 py-3">{item.text}</div>
        </div>
      ))}
    </div>
  );
}

function Layers({ items }: { items: Diagram['items'] }) {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-2">
      {items.map((item, i) => (
        <div
          key={i}
          className="rounded-xl border border-amber-500/20 px-4 py-3"
          style={{ backgroundColor: `rgba(245, 158, 11, ${0.05 + (i / Math.max(items.length - 1, 1)) * 0.13})` }}
        >
          <span className="text-sm font-semibold text-white">{item.label}</span>
          {item.text && <span className="text-sm text-slate-300"> — {item.text}</span>}
        </div>
      ))}
    </div>
  );
}

function Cards({ items }: { items: Diagram['items'] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {items.map((item, i) => (
        <div key={i} className="rounded-2xl border border-white/10 bg-[#0f1524] p-4">
          <div className="text-sm font-semibold text-white">{item.label}</div>
          {item.text && <div className="mt-1 text-xs leading-relaxed text-slate-400">{item.text}</div>}
        </div>
      ))}
    </div>
  );
}

export default function MetodikaDiagram({ diagram }: { diagram: Diagram }) {
  if (!diagram.items?.length) return null;
  return (
    <figure className="rounded-3xl border border-white/10 bg-[#111726] p-5">
      {diagram.title && (
        <figcaption className="mb-4 text-sm font-bold uppercase tracking-wider text-amber-300">{diagram.title}</figcaption>
      )}
      {diagram.type === 'compare' && <Compare diagram={diagram} />}
      {diagram.type === 'layers' && <Layers items={diagram.items} />}
      {diagram.type === 'cards' && <Cards items={diagram.items} />}
      {diagram.type === 'flow' && <Flow items={diagram.items} />}
      {diagram.type === 'cycle' && <Flow items={diagram.items} loop />}
      {diagram.caption && <p className="mt-4 text-sm leading-relaxed text-slate-400">{diagram.caption}</p>}
    </figure>
  );
}
