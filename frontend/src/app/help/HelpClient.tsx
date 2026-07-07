'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  IoSearch, IoChevronDown, IoChatbubbles, IoBookOutline,
  IoVideocam, IoTrophy, IoCard, IoShieldCheckmark, IoSparkles,
  IoMail, IoLogoYoutube,
} from 'react-icons/io5';
import { FaTelegramPlane } from 'react-icons/fa';
import { useTheme } from '@/context/ThemeContext';
import { useLang } from '@/context/LangContext';

const CATEGORY_ICONS = [
  { id: 'start', icon: <IoSparkles /> },
  { id: 'courses', icon: <IoVideocam /> },
  { id: 'xp', icon: <IoTrophy /> },
  { id: 'pay', icon: <IoCard /> },
  { id: 'acc', icon: <IoShieldCheckmark /> },
];

export default function HelpClient() {
  const { isDark } = useTheme();
  const { t } = useLang();
  const [search, setSearch] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);

  const CATEGORIES = CATEGORY_ICONS.map(({ id, icon }) => ({
    id,
    icon,
    title: t(`help.cat.${id}.title`),
    description: t(`help.cat.${id}.desc`),
    items: [1, 2, 3, 4].map((n) => ({
      q: t(`help.cat.${id}.q${n}`),
      a: t(`help.cat.${id}.a${n}`),
    })),
  }));

  const filtered = useMemo(() => {
    if (!search.trim()) return CATEGORIES;
    const q = search.toLowerCase();
    return CATEGORIES
      .map((cat) => ({
        ...cat,
        items: cat.items.filter(
          (it) => it.q.toLowerCase().includes(q) || it.a.toLowerCase().includes(q)
        ),
      }))
      .filter((cat) => cat.items.length > 0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, t]);

  const totalQuestions = filtered.reduce((sum, cat) => sum + cat.items.length, 0);

  const bgClass = isDark ? 'bg-[#0A0E1A] text-white' : 'bg-slate-50 text-slate-900';
  const cardBg = isDark ? 'bg-[#111726]/70 border-white/5' : 'bg-white border-slate-200';
  const muted = isDark ? 'text-slate-400' : 'text-slate-600';

  return (
    <div className={`min-h-screen pt-24 pb-20 ${bgClass}`}>
      <div className="mx-auto max-w-5xl px-4">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10 max-w-2xl mx-auto"
        >
          <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-indigo-400 mb-3">
            {t('help.kicker')}
          </div>
          <h1 className="font-display text-3xl sm:text-5xl font-black tracking-[-0.04em] mb-4">
            {t('help.title')}
          </h1>
          <p className={`text-sm sm:text-base ${muted}`}>{t('help.subtitle')}</p>
        </motion.div>

        {/* Search */}
        <div className={`flex items-center gap-3 mb-8 px-5 py-3 rounded-2xl border ${cardBg}`}>
          <IoSearch className="text-slate-500 text-lg flex-shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value.slice(0, 80))}
            placeholder={t('help.search')}
            className={`flex-1 bg-transparent outline-none text-sm ${
              isDark ? 'placeholder:text-slate-500' : 'placeholder:text-slate-400'
            }`}
          />
          {search && (
            <span className={`text-xs px-2 py-1 rounded-md ${
              isDark ? 'bg-white/5' : 'bg-slate-100'
            }`}>
              {t('help.results').replace('{0}', String(totalQuestions))}
            </span>
          )}
        </div>

        {/* Categories + FAQ */}
        {filtered.length === 0 ? (
          <div className={`rounded-3xl border p-12 text-center ${cardBg}`}>
            <IoBookOutline className="text-5xl mx-auto text-slate-500 mb-3" />
            <h3 className="font-bold text-lg mb-1">{t('help.empty.title')}</h3>
            <p className={`text-sm mb-5 ${muted}`}>{t('help.empty.text')}</p>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-500 text-white font-bold text-sm hover:shadow-lg hover:shadow-indigo-500/30"
            >
              <IoChatbubbles /> {t('help.empty.cta')}
            </Link>
          </div>
        ) : (
          <div className="space-y-8">
            {filtered.map((cat) => (
              <motion.section
                key={cat.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 text-white flex items-center justify-center text-lg">
                    {cat.icon}
                  </div>
                  <div>
                    <h2 className="font-display text-lg sm:text-xl font-black tracking-tight">{cat.title}</h2>
                    <p className={`text-xs ${muted}`}>{cat.description}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  {cat.items.map((item, idx) => {
                    const id = `${cat.id}-${idx}`;
                    const open = openId === id;
                    return (
                      <div
                        key={id}
                        className={`rounded-2xl border overflow-hidden ${cardBg} ${
                          open ? 'border-indigo-400/40' : ''
                        }`}
                      >
                        <button
                          onClick={() => setOpenId(open ? null : id)}
                          className="w-full flex items-center justify-between gap-3 p-4 text-left hover:bg-white/[0.02] transition-colors"
                          aria-expanded={open}
                        >
                          <span className="font-bold text-sm sm:text-base flex-1">{item.q}</span>
                          <IoChevronDown
                            className={`flex-shrink-0 text-indigo-400 transition-transform ${
                              open ? 'rotate-180' : ''
                            }`}
                          />
                        </button>
                        <AnimatePresence>
                          {open && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden"
                            >
                              <div className={`px-4 pb-4 text-sm leading-relaxed ${muted}`}>
                                {item.a}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              </motion.section>
            ))}
          </div>
        )}

        {/* Contact CTA */}
        <div className={`mt-14 rounded-3xl border p-6 sm:p-8 text-center ${cardBg}`}>
          <h3 className="font-display text-xl sm:text-2xl font-black mb-2">{t('help.cta.title')}</h3>
          <p className={`text-sm mb-5 max-w-md mx-auto ${muted}`}>{t('help.cta.text')}</p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-indigo-500 text-white font-bold text-sm hover:shadow-lg hover:shadow-indigo-500/30"
            >
              <IoMail /> {t('help.cta.email')}
            </Link>
            <a
              href="https://t.me/aidevix_support"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-sky-500 text-white font-bold text-sm hover:shadow-lg hover:shadow-sky-500/30"
            >
              <FaTelegramPlane /> {t('help.cta.tg')}
            </a>
            <a
              href="https://youtube.com/@aidevix"
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm border ${
                isDark ? 'bg-white/5 border-white/10 hover:bg-white/10' : 'bg-white border-slate-200 hover:bg-slate-100'
              }`}
            >
              <IoLogoYoutube /> {t('help.cta.yt')}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
