'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { FiMenu, FiX, FiExternalLink, FiShield, FiSearch } from 'react-icons/fi';
import { useSelector } from 'react-redux';
import { selectUser } from '@store/slices/authSlice';
import AdminRoute from '@/components/auth/AdminRoute';
import { ADMIN_NAV } from '@/config/adminNav';
import { globalSearch } from '@/api/adminApi';
import SiteLogoMark from '@components/common/SiteLogoMark';

type SearchResults = {
  users: { _id: string; username: string; email: string }[];
  courses: { _id: string; title: string }[];
  videos: { _id: string; title: string }[];
};

function GlobalSearch() {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<SearchResults | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (q.length < 2) { setResults(null); setOpen(false); return; }
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await globalSearch(q);
        setResults((res.data as { data: SearchResults }).data);
        setOpen(true);
      } catch { /* silent */ } finally { setLoading(false); }
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const hasAny = results && (
    results.users.length + results.courses.length + results.videos.length > 0
  );

  return (
    <div ref={ref} className="relative hidden w-72 sm:block">
      <FiSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Qidiruv..."
        className="w-full rounded-xl border border-slate-700 bg-slate-950 py-2 pl-9 pr-3 text-sm text-white placeholder:text-slate-600 focus:border-amber-500/50 focus:outline-none"
      />
      {loading && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 loading loading-spinner loading-xs text-amber-400" />
      )}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            className="absolute top-full z-50 mt-2 w-full overflow-hidden rounded-2xl border border-white/10 bg-[#0f121c] shadow-2xl"
          >
            {!hasAny ? (
              <p className="px-4 py-6 text-center text-sm text-slate-500">Hech narsa topilmadi</p>
            ) : (
              <div className="divide-y divide-white/5 text-sm">
                {results!.users.length > 0 && (
                  <div>
                    <p className="px-4 pt-3 text-[10px] font-bold uppercase tracking-widest text-slate-500">Foydalanuvchilar</p>
                    {results!.users.map((u) => (
                      <button
                        key={u._id}
                        className="flex w-full items-center gap-2 px-4 py-2 text-left hover:bg-white/5"
                        onClick={() => { router.push(`/admin/users/${u._id}`); setOpen(false); setQ(''); }}
                      >
                        <span className="font-medium text-white">{u.username}</span>
                        <span className="truncate text-xs text-slate-500">{u.email}</span>
                      </button>
                    ))}
                  </div>
                )}
                {results!.courses.length > 0 && (
                  <div>
                    <p className="px-4 pt-3 text-[10px] font-bold uppercase tracking-widest text-slate-500">Kurslar</p>
                    {results!.courses.map((c) => (
                      <button
                        key={c._id}
                        className="flex w-full items-center gap-2 px-4 py-2 text-left hover:bg-white/5"
                        onClick={() => { router.push(`/admin/courses/${c._id}`); setOpen(false); setQ(''); }}
                      >
                        <span className="font-medium text-white">{c.title}</span>
                      </button>
                    ))}
                  </div>
                )}
                {results!.videos.length > 0 && (
                  <div>
                    <p className="px-4 pt-3 text-[10px] font-bold uppercase tracking-widest text-slate-500">Videolar</p>
                    {results!.videos.map((v) => (
                      <div key={v._id} className="px-4 py-2">
                        <span className="text-slate-300">{v.title}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function NavLink({
  href, label, hint, icon, active, onNavigate,
}: {
  href: string; label: string; hint: string; icon: React.ReactNode; active: boolean; onNavigate?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      title={hint}
      className={`relative flex items-center gap-3 rounded-xl px-3 py-2.5 font-medium transition-all ${
        active ? 'text-white' : 'text-slate-400 hover:bg-white/5 hover:text-slate-100'
      }`}
    >
      {active && (
        <motion.div
          layoutId="admin-nav-glow"
          className="absolute inset-0 -z-10 rounded-xl border border-amber-500/25 bg-gradient-to-r from-amber-500/15 via-amber-400/5 to-transparent"
          transition={{ type: 'spring', bounce: 0.18, duration: 0.45 }}
        />
      )}
      {active && (
        <span className="absolute left-0 top-1/2 h-8 w-1 -translate-y-1/2 rounded-r-full bg-gradient-to-b from-amber-300 to-amber-600 shadow-[0_0_12px_rgba(251,191,36,0.55)]" />
      )}
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${
          active
            ? 'border-amber-500/40 bg-amber-500/15 text-amber-200'
            : 'border-slate-700/80 bg-slate-900 text-slate-500'
        }`}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm">{label}</span>
        <span className="block truncate text-[11px] font-normal text-slate-500">{hint}</span>
      </span>
    </Link>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const user = useSelector(selectUser);
  const [mobileOpen, setMobileOpen] = useState(false);

  const pageTitle =
    ADMIN_NAV.flatMap((s) => s.items).find((i) => i.href === pathname)?.label ||
    (pathname?.includes('/admin/courses/') ? 'Kurs tahriri' :
     pathname?.includes('/admin/users/') ? 'Foydalanuvchi' : 'Admin');

  const sidebar = (
    <div className="flex h-full flex-col border-r border-white/10 bg-[#0A0E1A]/95 backdrop-blur-xl">
      <div className="flex h-16 shrink-0 items-center gap-3 border-b border-white/10 px-5">
        <SiteLogoMark size={40} className="rounded-xl ring-2 ring-amber-500/40 shadow-lg shadow-amber-500/20" />
        <div className="min-w-0">
          <p className="truncate font-display text-sm font-bold tracking-wide text-white">Aidevix Admin</p>
          <p className="truncate text-[11px] text-amber-200/80">Premium boshqaruv paneli</p>
        </div>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
        {ADMIN_NAV.map((section) => (
          <div key={section.title}>
            <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
              {section.title}
            </p>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const active =
                  pathname === item.href || (item.href !== '/admin' && pathname?.startsWith(item.href + '/'));
                return (
                  <NavLink
                    key={item.href}
                    {...item}
                    active={!!active}
                    onNavigate={() => setMobileOpen(false)}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="shrink-0 border-t border-white/10 p-4">
        <Link
          href="/"
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-700/80 bg-slate-900/80 py-2.5 text-sm font-medium text-slate-200 transition hover:border-amber-500/40 hover:bg-slate-800"
        >
          <FiExternalLink className="h-4 w-4 opacity-70" />
          Saytga qaytish
        </Link>
      </div>
    </div>
  );

  return (
    <AdminRoute>
      <div className="min-h-screen bg-[#06070d] font-sans text-slate-200">
        <div
          className="pointer-events-none fixed inset-0 opacity-[0.07]"
          style={{
            backgroundImage: `radial-gradient(circle at 20% 20%, rgba(251,191,36,0.9), transparent 45%),
              radial-gradient(circle at 80% 0%, rgba(99,102,241,0.7), transparent 40%),
              radial-gradient(circle at 50% 100%, rgba(14,165,233,0.5), transparent 50%)`,
          }}
        />

        <div className="relative z-10 flex min-h-screen">
          <aside className="sticky top-0 hidden h-screen w-72 shrink-0 lg:block">{sidebar}</aside>

          <AnimatePresence>
            {mobileOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden"
                onClick={() => setMobileOpen(false)}
              />
            )}
          </AnimatePresence>
          <AnimatePresence>
            {mobileOpen && (
              <motion.aside
                initial={{ x: -300 }}
                animate={{ x: 0 }}
                exit={{ x: -300 }}
                transition={{ type: 'spring', damping: 26, stiffness: 320 }}
                className="fixed inset-y-0 left-0 z-50 w-[min(100vw-3rem,18rem)] shadow-2xl lg:hidden"
              >
                {sidebar}
              </motion.aside>
            )}
          </AnimatePresence>

          <div className="flex min-w-0 flex-1 flex-col">
            <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between gap-4 border-b border-white/10 bg-[#0A0E1A]/85 px-4 backdrop-blur-md sm:px-8">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className="rounded-lg border border-slate-700/80 p-2 text-slate-200 lg:hidden"
                  onClick={() => setMobileOpen((o) => !o)}
                  aria-label="Menyu"
                >
                  {mobileOpen ? <FiX className="h-5 w-5" /> : <FiMenu className="h-5 w-5" />}
                </button>
                <div>
                  <h1 className="font-display text-lg font-bold text-white sm:text-xl">{pageTitle}</h1>
                  <p className="hidden text-xs text-slate-500 sm:block">Barcha o'zgarishlar API orqali saqlanadi</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <GlobalSearch />
                <span className="hidden items-center gap-2 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-300 sm:inline-flex">
                  <FiShield className="h-3.5 w-3.5" />
                  {user?.role === 'admin' ? 'Administrator' : user?.role}
                </span>
                <div className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-600 bg-slate-900 text-sm font-bold text-amber-200">
                  {(user?.username || '?').slice(0, 1).toUpperCase()}
                </div>
              </div>
            </header>

            <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-8 sm:py-8">
              <div className="mx-auto max-w-7xl">{children}</div>
            </main>
          </div>
        </div>
      </div>
    </AdminRoute>
  );
}
