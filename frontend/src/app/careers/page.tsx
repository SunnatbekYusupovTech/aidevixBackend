'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  IoBriefcase, IoOpenOutline, IoSearch, IoSparkles, IoLocation,
  IoTime, IoTrophy, IoFlash, IoHeart, IoRocket,
} from 'react-icons/io5';
import { jobApi } from '@/api/jobApi';
import { useLang } from '@/context/LangContext';
import { useTheme } from '@/context/ThemeContext';

type Job = {
  _id: string;
  company: string;
  title: string;
  location?: string;
  level?: string;
  type?: string;
  applyUrl: string;
  skills?: string[];
  salaryMin?: number | null;
  salaryMax?: number | null;
};

const LEVELS = ['Junior', 'Middle', 'Senior', 'Lead'];
const TYPES = ['Full-time', 'Part-time', 'Contract', 'Remote'];

const PERKS = [
  { icon: <IoSparkles />, title: 'AI-first ish muhiti', text: 'Claude, Cursor, Copilot — eng yangi AI tools bilan' },
  { icon: <IoTrophy />, title: 'Mission-driven jamoa', text: 'O\'zbek dasturchilarining yangi avlodini tarbiyalaymiz' },
  { icon: <IoFlash />, title: 'Tez o\'sish', text: 'Star o\'rniga skills bo\'yicha promotion' },
  { icon: <IoHeart />, title: 'Egalik kursi', text: 'O\'z fikrlaringizni amalga oshira olasiz' },
  { icon: <IoRocket />, title: 'Remote-friendly', text: 'Toshkent yoki internetli istalgan joydan' },
  { icon: <IoBriefcase />, title: 'Tinglovchi rahbariyat', text: 'Bir-biri bilan teng — har bir ovoz muhim' },
];

const formatSalary = (min?: number | null, max?: number | null) => {
  if (!min && !max) return null;
  if (min && max) return `${(min / 1_000_000).toFixed(1)}–${(max / 1_000_000).toFixed(1)}M so'm`;
  if (min) return `${(min / 1_000_000).toFixed(1)}M+ so'm`;
  return `gacha ${((max as number) / 1_000_000).toFixed(1)}M so'm`;
};

export default function CareersPage() {
  const { t } = useLang();
  const { isDark } = useTheme();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [level, setLevel] = useState<string>('all');
  const [type, setType] = useState<string>('all');

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    jobApi
      .list()
      .then((res: any) => {
        if (mounted) setJobs(res?.data?.data?.jobs || []);
      })
      .catch(() => {
        if (mounted) setJobs([]);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const filtered = useMemo(() => {
    return jobs.filter((j) => {
      if (level !== 'all' && (j.level || '').toLowerCase() !== level.toLowerCase()) return false;
      if (type !== 'all' && (j.type || '').toLowerCase() !== type.toLowerCase()) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        j.title?.toLowerCase().includes(q) ||
        j.company?.toLowerCase().includes(q) ||
        j.location?.toLowerCase().includes(q) ||
        j.skills?.some((s) => s.toLowerCase().includes(q))
      );
    });
  }, [jobs, search, level, type]);

  const bgClass = isDark ? 'bg-[#0A0E1A] text-white' : 'bg-slate-50 text-slate-900';
  const cardBg = isDark ? 'bg-[#111726]/70 border-white/5' : 'bg-white border-slate-200';
  const muted = isDark ? 'text-slate-400' : 'text-slate-600';

  return (
    <div className={`min-h-screen pt-24 pb-20 ${bgClass}`}>
      <div className="mx-auto max-w-7xl px-4">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12 max-w-2xl mx-auto"
        >
          <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-indigo-400 mb-3">
            Careers
          </div>
          <h1 className="font-display text-3xl sm:text-5xl font-black tracking-[-0.04em] mb-4">
            {t('careers.title') || "Aidevix'ga qo'shiling"}
          </h1>
          <p className={`text-sm sm:text-base ${muted}`}>
            {t('careers.subtitle') || "Biz bilan O'zbekistondagi yangi avlod dasturchilarini tarbiyalashga yordam bering."}
          </p>
        </motion.div>

        {/* Perks */}
        <section className="mb-12">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {PERKS.map((p, i) => (
              <motion.div
                key={p.title}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{ delay: i * 0.04 }}
                className={`rounded-2xl border p-5 ${cardBg}`}
              >
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 text-white flex items-center justify-center text-lg mb-3">
                  {p.icon}
                </div>
                <h3 className="font-bold text-sm mb-1">{p.title}</h3>
                <p className={`text-xs leading-relaxed ${muted}`}>{p.text}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Filter bar */}
        <div className={`flex flex-col md:flex-row gap-3 mb-6 p-3 rounded-2xl border ${cardBg}`}>
          <div className="flex-1 flex items-center gap-2 px-2">
            <IoSearch className="text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value.slice(0, 60))}
              placeholder="Lavozim, kompaniya yoki skill bo'yicha qidiring..."
              className={`flex-1 bg-transparent outline-none text-sm py-2 ${
                isDark ? 'placeholder:text-slate-500' : 'placeholder:text-slate-400'
              }`}
            />
          </div>
          <select
            value={level}
            onChange={(e) => setLevel(e.target.value)}
            className={`text-xs sm:text-sm font-bold rounded-lg px-3 py-2 border outline-none ${
              isDark ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'
            }`}
          >
            <option value="all">Barcha daraja</option>
            {LEVELS.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className={`text-xs sm:text-sm font-bold rounded-lg px-3 py-2 border outline-none ${
              isDark ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'
            }`}
          >
            <option value="all">Barcha turi</option>
            {TYPES.map((tp) => (
              <option key={tp} value={tp}>{tp}</option>
            ))}
          </select>
        </div>

        {/* Jobs list */}
        <div className="space-y-3">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className={`rounded-2xl border p-5 animate-pulse ${cardBg}`}>
                <div className="h-5 bg-white/10 rounded w-2/3 mb-2" />
                <div className="h-3 bg-white/5 rounded w-1/3" />
              </div>
            ))
          ) : filtered.length === 0 ? (
            <div className={`rounded-3xl border p-12 text-center ${cardBg}`}>
              <IoBriefcase className="text-5xl mx-auto text-slate-500 mb-3" />
              <h3 className="font-bold text-lg mb-1">
                {jobs.length === 0
                  ? t('careers.empty') || 'Hozircha ochiq vakansiya yo\'q'
                  : 'Filterga mos vakansiya topilmadi'}
              </h3>
              <p className={`text-sm mb-5 ${muted}`}>
                {jobs.length === 0
                  ? 'Talantlar bizga doim kerak. CV yuborib qo\'ying — mos imkoniyat chiqsa biz birinchi bog\'lanamiz.'
                  : 'Filterlarni o\'zgartirib ko\'ring.'}
              </p>
              <Link
                href="/contact?subject=partnership"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-indigo-500 text-white font-bold text-sm hover:shadow-lg hover:shadow-indigo-500/30"
              >
                CV yuborish →
              </Link>
            </div>
          ) : (
            filtered.map((job, i) => (
              <motion.a
                key={job._id}
                href={job.applyUrl}
                target="_blank"
                rel="noopener noreferrer"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className={`group rounded-2xl border p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-4 hover:-translate-y-0.5 hover:border-indigo-400/40 transition-all ${cardBg}`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1.5">
                    {job.level && (
                      <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                        {job.level}
                      </span>
                    )}
                    {job.type && (
                      <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                        {job.type}
                      </span>
                    )}
                  </div>
                  <h3 className="font-bold text-base sm:text-lg group-hover:text-indigo-400 transition-colors">
                    {job.title}
                  </h3>
                  <div className={`text-sm mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 ${muted}`}>
                    <span className="font-semibold">{job.company}</span>
                    {job.location && (
                      <span className="inline-flex items-center gap-1">
                        <IoLocation /> {job.location}
                      </span>
                    )}
                    {formatSalary(job.salaryMin, job.salaryMax) && (
                      <span className="inline-flex items-center gap-1 text-emerald-400">
                        💰 {formatSalary(job.salaryMin, job.salaryMax)}
                      </span>
                    )}
                  </div>
                  {job.skills && job.skills.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {job.skills.slice(0, 5).map((s) => (
                        <span
                          key={s}
                          className={`text-[10px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider ${
                            isDark ? 'bg-white/5 text-slate-300' : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 text-sm font-bold text-indigo-400 flex-shrink-0">
                  Murojaat <IoOpenOutline />
                </div>
              </motion.a>
            ))
          )}
        </div>

        {/* CTA */}
        <div className={`mt-12 rounded-3xl border p-8 text-center ${cardBg}`}>
          <h3 className="font-display text-xl sm:text-2xl font-black mb-2">Mos vakansiya topilmadi?</h3>
          <p className={`text-sm mb-5 max-w-md mx-auto ${muted}`}>
            CV va qisqa motivatsiya xati yuboring — talant bazasiga qo'shamiz va imkoniyat chiqishi bilan birinchi bo'lib bog'lanamiz.
          </p>
          <Link
            href="/contact?subject=partnership"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-bold text-sm hover:shadow-lg hover:shadow-indigo-500/30 transition-shadow"
          >
            <IoTime /> CV yuborish
          </Link>
        </div>
      </div>
    </div>
  );
}
