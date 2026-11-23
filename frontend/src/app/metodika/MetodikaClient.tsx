'use client';

import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSelector } from 'react-redux';
import { FiBookOpen, FiChevronRight, FiEdit3, FiFileText, FiLock, FiLogIn, FiMenu, FiShield, FiX } from 'react-icons/fi';
import { selectAuthLoading, selectIsLoggedIn } from '@store/slices/authSlice';
import {
  apiErrorCode, apiErrorMessage, metodikaApi,
  type MetodikaLesson, type MetodikaOutline, type MetodikaPage, type MetodikaSession,
} from '@/api/metodikaApi';
import MetodikaShield from '@/components/metodika/MetodikaShield';
import { LessonView, PageView, clearMetodikaImageCache } from '@/components/metodika/MetodikaContent';

type Selection = { kind: 'home' } | { kind: 'lesson'; id: string } | { kind: 'page'; id: string };

const Spinner = () => (
  <div className="flex min-h-screen items-center justify-center bg-[#0a0e1a]">
    <span className="loading loading-spinner loading-lg text-amber-400" />
  </div>
);

const Gate = ({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) => (
  <div className="flex min-h-screen items-center justify-center bg-[#0a0e1a] px-4 py-10">
    <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#111726] p-8 shadow-2xl">
      <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-500/30 bg-amber-500/10 text-amber-400">
        {icon}
      </div>
      <h1 className="font-display text-xl font-bold text-white">{title}</h1>
      {children}
    </div>
  </div>
);

function UnlockForm({ onUnlocked }: { onUnlocked: () => void }) {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!login.trim() || !password) return;
    setBusy(true);
    setError('');
    try {
      await metodikaApi.unlock(login.trim(), password);
      setPassword('');
      onUnlocked();
    } catch (err) {
      setError(apiErrorMessage(err, "Kirib bo'lmadi. Qayta urinib ko'ring."));
    } finally {
      setBusy(false);
    }
  };

  const input = 'w-full rounded-xl border border-white/10 bg-[#0a0e1a] px-4 py-3 text-sm text-white placeholder-slate-600 focus:border-amber-500/50 focus:outline-none';

  return (
    <Gate icon={<FiLock className="h-5 w-5" />} title="Maxfiy metodika">
      <p className="mt-2 text-sm leading-relaxed text-slate-400">
        Bu bo'lim faqat ruxsat berilgan akkauntlar uchun. Sizga berilgan maxsus login va parolni kiriting.
      </p>
      <form onSubmit={submit} className="mt-6 space-y-3" autoComplete="off">
        <input className={input} placeholder="Metodika logini" value={login} onChange={(e) => setLogin(e.target.value)} autoComplete="off" spellCheck={false} maxLength={40} />
        <input className={input} placeholder="Metodika paroli" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" maxLength={128} />
        {error && <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</p>}
        <button type="submit" disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-3 text-sm font-bold text-black transition-colors hover:bg-amber-400 disabled:opacity-60">
          {busy && <span className="loading loading-spinner loading-xs" />}
          Ochish
        </button>
      </form>
      <p className="mt-5 text-xs leading-relaxed text-slate-500">
        Har bir kirish va ko'rilgan sahifa jurnalga yoziladi. Sessiya 2 soatdan so'ng yopiladi.
      </p>
    </Gate>
  );
}

function Overview({ outline, onOpen }: { outline: MetodikaOutline; onOpen: (s: Selection) => void }) {
  return (
    <div className="space-y-5">
      <header className="rounded-3xl border border-white/10 bg-gradient-to-br from-[#161d31] to-[#0f1524] p-6 sm:p-8">
        <p className="text-xs font-bold uppercase tracking-widest text-amber-300">Kurs metodikasi · mentor uchun qo'llanma</p>
        <h1 className="mt-3 font-display text-3xl font-bold leading-tight text-white sm:text-4xl">Sun'iy intellekt biznes egalari uchun</h1>
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            [String(outline.modules.length), 'modul (blok)'],
            [String(outline.totals.lessons), 'dars'],
            [`${Math.round(outline.totals.minutes / 60)} soat`, 'jami auditoriya vaqti'],
            ['1 agent', 'har bir ishtirokchida'],
          ].map(([value, label]) => (
            <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="font-display text-xl font-bold text-white">{value}</div>
              <div className="text-xs text-slate-400">{label}</div>
            </div>
          ))}
        </div>
      </header>

      {outline.modules.map((mod) => (
        <section key={mod._id} className="rounded-3xl border border-white/10 bg-[#111726] p-5 sm:p-6">
          <p className="text-xs font-bold uppercase tracking-widest text-amber-300">{mod.subtitle || mod.weeks}</p>
          <h2 className="mt-1 font-display text-xl font-bold text-white">{mod.title}</h2>
          {mod.outcome && <p className="mt-1 text-sm font-medium text-slate-300">Natija: {mod.outcome}</p>}
          {mod.summary && <p className="mt-3 text-sm leading-relaxed text-slate-400">{mod.summary}</p>}
          <ul className="mt-4 divide-y divide-white/5 overflow-hidden rounded-2xl border border-white/10">
            {mod.lessons.map((lesson) => (
              <li key={lesson._id}>
                <button
                  type="button"
                  onClick={() => onOpen({ kind: 'lesson', id: lesson._id })}
                  className="flex w-full items-center gap-4 px-4 py-3 text-left transition-colors hover:bg-white/[0.04]"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 font-mono text-sm font-bold text-amber-300">
                    {String(lesson.number).padStart(2, '0')}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-white">{lesson.title}</span>
                    {lesson.outcome && <span className="block truncate text-xs text-slate-500">{lesson.outcome}</span>}
                  </span>
                  <span className="hidden shrink-0 text-xs text-slate-500 sm:block">{lesson.week}-hafta</span>
                  <FiChevronRight className="h-4 w-4 shrink-0 text-slate-600" />
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function Reader({ session, onLocked }: { session: MetodikaSession; onLocked: () => void }) {
  const [outline, setOutline] = useState<MetodikaOutline | null>(null);
  const [selection, setSelection] = useState<Selection>({ kind: 'home' });
  const [lessons, setLessons] = useState<Record<string, MetodikaLesson>>({});
  const [pages, setPages] = useState<Record<string, MetodikaPage>>({});
  const [error, setError] = useState('');
  const [navOpen, setNavOpen] = useState(false);
  const mainRef = useRef<HTMLDivElement>(null);

  const fail = useCallback((err: unknown) => {
    if (apiErrorCode(err) === 'METODIKA_LOCKED') return onLocked();
    setError(apiErrorMessage(err, "Yuklab bo'lmadi. Birozdan so'ng urinib ko'ring."));
  }, [onLocked]);

  useEffect(() => {
    metodikaApi.outline().then(setOutline).catch(fail);
    return clearMetodikaImageCache;
  }, [fail]);

  const open = useCallback((next: Selection) => {
    setSelection(next);
    setNavOpen(false);
    setError('');
    mainRef.current?.scrollTo({ top: 0 });
    if (next.kind === 'lesson' && !lessons[next.id]) {
      metodikaApi.lesson(next.id).then((l) => setLessons((s) => ({ ...s, [next.id]: l }))).catch(fail);
    }
    if (next.kind === 'page' && !pages[next.id]) {
      metodikaApi.page(next.id).then((p) => setPages((s) => ({ ...s, [next.id]: p }))).catch(fail);
    }
  }, [lessons, pages, fail]);

  const lock = async () => {
    await metodikaApi.lock().catch(() => undefined);
    onLocked();
  };

  if (!outline) return error ? <Gate icon={<FiShield className="h-5 w-5" />} title="Xatolik"><p className="mt-2 text-sm text-slate-400">{error}</p></Gate> : <Spinner />;

  const isActive = (s: Selection) => s.kind === selection.kind && ('id' in s ? s.id === (selection as { id?: string }).id : true);
  const navButton = (active: boolean) =>
    `flex w-full items-start gap-2 rounded-xl px-3 py-2 text-left text-sm transition-colors ${active ? 'bg-amber-500/15 text-amber-200' : 'text-slate-400 hover:bg-white/5 hover:text-slate-100'}`;

  const current =
    selection.kind === 'lesson' ? lessons[selection.id] :
    selection.kind === 'page' ? pages[selection.id] : null;

  // Shield Reader ICHIDA: kontent yashirilganda faqat UI daraxti olib tashlanadi,
  // yuklangan darslar va tanlov (Reader state) saqlanib qoladi — qayta so'rov ketmaydi.
  return (
    <MetodikaShield viewer={session.viewer} enforce={!session.isOwner}>
    <div className="flex h-screen bg-[#0a0e1a] text-white">
      <aside className={`${navOpen ? 'flex' : 'hidden'} fixed inset-0 z-50 w-full flex-col border-r border-white/10 bg-[#0d1220] lg:static lg:z-auto lg:flex lg:w-80 lg:shrink-0`}>
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-amber-300">Maxfiy</p>
            <p className="font-display text-base font-bold">Metodika</p>
          </div>
          <button type="button" className="rounded-lg p-2 text-slate-400 hover:bg-white/5 lg:hidden" onClick={() => setNavOpen(false)} aria-label="Yopish">
            <FiX className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
          <button type="button" className={navButton(isActive({ kind: 'home' }))} onClick={() => open({ kind: 'home' })}>
            <FiBookOpen className="mt-0.5 h-4 w-4 shrink-0" /> Dastur xaritasi
          </button>

          {outline.modules.map((mod) => (
            <div key={mod._id}>
              <p className="px-3 pb-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">{mod.title}</p>
              {mod.lessons.map((lesson) => (
                <button key={lesson._id} type="button" className={navButton(isActive({ kind: 'lesson', id: lesson._id }))} onClick={() => open({ kind: 'lesson', id: lesson._id })}>
                  <span className="mt-0.5 w-5 shrink-0 font-mono text-xs opacity-70">{String(lesson.number).padStart(2, '0')}</span>
                  <span className="leading-snug">{lesson.title}</span>
                </button>
              ))}
            </div>
          ))}

          {outline.pages.length > 0 && (
            <div>
              <p className="px-3 pb-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">Pasport va ilovalar</p>
              {outline.pages.map((page) => (
                <button key={page._id} type="button" className={navButton(isActive({ kind: 'page', id: page._id }))} onClick={() => open({ kind: 'page', id: page._id })}>
                  <FiFileText className="mt-0.5 h-4 w-4 shrink-0" />
                  <span className="leading-snug">{page.title}</span>
                </button>
              ))}
            </div>
          )}
        </nav>

        <div className="space-y-2 border-t border-white/10 p-3">
          <p className="px-2 text-xs text-slate-500">{session.viewer.name} · @{session.viewer.username}</p>
          {session.isOwner ? (
            <Link href="/admin/metodika" className="flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-3 py-2 text-sm font-bold text-black hover:bg-amber-400">
              <FiEdit3 className="h-4 w-4" /> Tahrirlash va ruxsatlar
            </Link>
          ) : (
            <button type="button" onClick={lock} className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-sm font-semibold text-slate-300 hover:bg-white/5">
              <FiLock className="h-4 w-4" /> Yopish
            </button>
          )}
        </div>
      </aside>

      <div ref={mainRef} className="min-w-0 flex-1 overflow-y-auto">
        <div className="sticky top-0 z-40 flex items-center gap-3 border-b border-white/10 bg-[#0a0e1a]/90 px-4 py-3 backdrop-blur lg:hidden">
          <button type="button" onClick={() => setNavOpen(true)} className="rounded-lg p-2 text-slate-300 hover:bg-white/5" aria-label="Mundarija">
            <FiMenu className="h-5 w-5" />
          </button>
          <span className="font-display text-sm font-bold">Metodika</span>
        </div>

        <main className="mx-auto max-w-4xl px-4 py-6 sm:px-8 sm:py-10">
          {error && <p className="mb-5 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</p>}
          {selection.kind === 'home' && <Overview outline={outline} onOpen={open} />}
          {selection.kind === 'lesson' && (current ? <LessonView lesson={current as MetodikaLesson} /> : !error && <div className="h-64 animate-pulse rounded-3xl bg-white/5" />)}
          {selection.kind === 'page' && (current ? <PageView page={current as MetodikaPage} /> : !error && <div className="h-64 animate-pulse rounded-3xl bg-white/5" />)}
        </main>
      </div>
    </div>
    </MetodikaShield>
  );
}

export default function MetodikaClient() {
  const isLoggedIn = useSelector(selectIsLoggedIn);
  const authLoading = useSelector(selectAuthLoading);
  const [session, setSession] = useState<MetodikaSession | null>(null);
  const [sessionError, setSessionError] = useState('');

  const loadSession = useCallback(() => {
    metodikaApi.session()
      .then((next) => { setSessionError(''); setSession(next); })
      .catch((err) => setSessionError(apiErrorMessage(err, "Sessiyani tekshirib bo'lmadi.")));
  }, []);

  useEffect(() => {
    if (!authLoading && isLoggedIn) loadSession();
  }, [authLoading, isLoggedIn, loadSession]);

  if (authLoading) return <Spinner />;

  if (!isLoggedIn) {
    return (
      <Gate icon={<FiLogIn className="h-5 w-5" />} title="Avval saytga kiring">
        <p className="mt-2 text-sm leading-relaxed text-slate-400">
          Bu bo'lim faqat ro'yxatdan o'tgan va maxsus ruxsat berilgan foydalanuvchilar uchun.
        </p>
        <Link href="/login" className="mt-6 flex items-center justify-center rounded-xl bg-amber-500 px-4 py-3 text-sm font-bold text-black hover:bg-amber-400">
          Kirish
        </Link>
      </Gate>
    );
  }

  if (sessionError) {
    return (
      <Gate icon={<FiShield className="h-5 w-5" />} title="Xatolik">
        <p className="mt-2 text-sm text-slate-400">{sessionError}</p>
        <button type="button" onClick={loadSession} className="mt-6 w-full rounded-xl border border-white/10 px-4 py-3 text-sm font-semibold text-slate-200 hover:bg-white/5">
          Qayta urinish
        </button>
      </Gate>
    );
  }

  if (!session) return <Spinner />;
  if (!session.unlocked) return <UnlockForm onUnlocked={loadSession} />;

  return <Reader session={session} onLocked={() => setSession({ ...session, unlocked: false })} />;
}
