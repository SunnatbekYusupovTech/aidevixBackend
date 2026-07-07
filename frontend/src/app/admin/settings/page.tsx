'use client';

import React from 'react';
import Link from 'next/link';
import { BACKEND_ORIGIN } from '@/utils/constants';
import { FiBook, FiKey, FiExternalLink, FiVideo } from 'react-icons/fi';

const DOC = `${BACKEND_ORIGIN}/api-docs`;
const ADMIN_DOC = `${BACKEND_ORIGIN}/admin-docs`;

export default function AdminSettingsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-display text-2xl font-bold text-white">Sozlamalar va hujjatlar</h2>
        <p className="mt-1 max-w-2xl text-sm text-slate-400">
          Maxfiy kalitlar (.env) faqat serverda saqlanadi. Bu yerda faqat havolalar va eslatmalar — jamoa uchun
          yagona manba sifatida Swagger ishlating.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <a
          href={DOC}
          target="_blank"
          rel="noopener noreferrer"
          className="group flex flex-col rounded-2xl border border-white/10 bg-[#111726] p-6 transition hover:border-amber-500/35 hover:shadow-lg hover:shadow-amber-500/10"
        >
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-sky-500/30 bg-sky-500/10 text-sky-300">
            <FiBook className="h-5 w-5" />
          </div>
          <h3 className="font-display text-lg font-bold text-white">Umumiy API (Swagger)</h3>
          <p className="mt-2 flex-1 text-sm text-slate-400">
            Barcha ommaviy va autentifikatsiyali endpointlar. Try it out uchun backend CORS sozlangan bo‘lishi kerak.
          </p>
          <span className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-amber-400 group-hover:text-amber-300">
            Ochish <FiExternalLink className="h-4 w-4" />
          </span>
          <code className="mt-2 truncate rounded bg-slate-950 px-2 py-1 text-[11px] text-slate-500">{DOC}</code>
        </a>

        <a
          href={ADMIN_DOC}
          target="_blank"
          rel="noopener noreferrer"
          className="group flex flex-col rounded-2xl border border-white/10 bg-[#111726] p-6 transition hover:border-amber-500/35"
        >
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-200">
            <FiKey className="h-5 w-5" />
          </div>
          <h3 className="font-display text-lg font-bold text-white">Admin API hujjati</h3>
          <p className="mt-2 flex-1 text-sm text-slate-400">
            <code className="text-amber-200/90">/api/admin/*</code>, video yuklash, challenge va boshqalar bo‘yicha
            batafsil tavsiflar.
          </p>
          <span className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-amber-400">
            Ochish <FiExternalLink className="h-4 w-4" />
          </span>
          <code className="mt-2 truncate rounded bg-slate-950 px-2 py-1 text-[11px] text-slate-500">{ADMIN_DOC}</code>
        </a>

        <div className="rounded-2xl border border-white/10 bg-[#111726] p-6 md:col-span-2">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-violet-500/30 bg-violet-500/10 text-violet-300">
              <FiVideo className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-display text-lg font-bold text-white">Bunny.net Stream</h3>
              <p className="mt-2 text-sm text-slate-400">
                Videolar <strong className="text-slate-200">Stream Library</strong> orqali uzatiladi. Muhit
                o‘zgaruvchilari: <code className="rounded bg-slate-950 px-1.5 py-0.5 text-xs">BUNNY_STREAM_API_KEY</code>
                , <code className="rounded bg-slate-950 px-1.5 py-0.5 text-xs">BUNNY_LIBRARY_ID</code>,{' '}
                <code className="rounded bg-slate-950 px-1.5 py-0.5 text-xs">BUNNY_TOKEN_KEY</code>. Admin kurs
                sahifasida yangi video yaratilganda slot ochiladi, keyin faylni Bunny ga PUT qilasiz.
              </p>
              <Link
                href="/admin/courses"
                className="mt-4 inline-block text-sm font-medium text-amber-400 hover:text-amber-300"
              >
                Kurslarga o‘tish →
              </Link>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-6 md:col-span-2">
          <p className="text-sm text-amber-100/90">
            <strong className="text-amber-200">Local ishlab chiqish:</strong> frontend{' '}
            <code className="rounded bg-black/30 px-1.5">NEXT_PUBLIC_BACKEND_URL</code> yoki{' '}
            <code className="rounded bg-black/30 px-1.5">NEXT_PUBLIC_API_ORIGIN</code> ni backend manziliga
            qo‘ying — aks holda havolalar production Railway ga ishora qiladi.
          </p>
        </div>
      </div>
    </div>
  );
}
