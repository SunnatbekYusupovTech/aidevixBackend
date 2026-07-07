'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  IoMail, IoLogoInstagram, IoChatbubbles, IoCheckmarkCircle,
  IoSend, IoLocationOutline, IoTimeOutline, IoAlertCircle,
} from 'react-icons/io5';
import { FaTelegramPlane } from 'react-icons/fa';
import { useTheme } from '@/context/ThemeContext';
import { useLang } from '@/context/LangContext';
import { contactApi } from '@/api/contactApi';

type FormState = {
  name: string;
  email: string;
  subject: string;
  message: string;
  _honeypot: string;
};

export default function ContactClient() {
  const { isDark } = useTheme();
  const { t } = useLang();
  const sp = useSearchParams();
  const subjectParam = sp.get('subject');

  const SUBJECT_PRESETS: Record<string, string> = {
    'team-plan': t('contact.subj.team'),
    partnership: t('contact.subj.partnership'),
    bug: t('contact.subj.bug'),
    general: t('contact.subj.general'),
  };

  const [form, setForm] = useState<FormState>({
    name: '',
    email: '',
    subject: subjectParam && SUBJECT_PRESETS[subjectParam] ? SUBJECT_PRESETS[subjectParam] : '',
    message: '',
    _honeypot: '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    if (subjectParam && SUBJECT_PRESETS[subjectParam] && !form.subject) {
      setForm((f) => ({ ...f, subject: SUBJECT_PRESETS[subjectParam] }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subjectParam]);

  const update = (key: keyof FormState, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus(null);

    if (form.name.trim().length < 2) return setStatus({ type: 'error', message: t('contact.error.name') });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return setStatus({ type: 'error', message: t('contact.error.email') });
    if (form.subject.trim().length < 3) return setStatus({ type: 'error', message: t('contact.error.subject') });
    if (form.message.trim().length < 10) return setStatus({ type: 'error', message: t('contact.error.message') });

    setSubmitting(true);
    try {
      await contactApi.submit(form);
      setStatus({ type: 'success', message: t('contact.success') });
      setForm({ name: '', email: '', subject: '', message: '', _honeypot: '' });
    } catch (err: any) {
      setStatus({
        type: 'error',
        message: err?.response?.data?.message || t('contact.error.generic'),
      });
    } finally {
      setSubmitting(false);
    }
  };

  const bgClass = isDark ? 'bg-[#0A0E1A] text-white' : 'bg-slate-50 text-slate-900';
  const cardBg = isDark ? 'bg-[#111726]/70 border-white/5' : 'bg-white border-slate-200';
  const muted = isDark ? 'text-slate-400' : 'text-slate-600';
  const inputBase = `w-full px-4 py-3 rounded-xl border outline-none text-sm transition-colors ${
    isDark
      ? 'bg-white/5 border-white/10 placeholder:text-slate-500 focus:border-indigo-400/60 focus:bg-white/10'
      : 'bg-slate-50 border-slate-200 placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white'
  }`;

  const CONTACTS = [
    { icon: <IoMail />, label: 'Email', value: 'support@aidevix.uz', href: 'mailto:support@aidevix.uz', accent: 'text-indigo-400' },
    { icon: <FaTelegramPlane />, label: 'Telegram', value: '@aidevix_support', href: 'https://t.me/aidevix_support', accent: 'text-sky-400' },
    { icon: <IoLogoInstagram />, label: 'Instagram', value: '@aidevix.uz', href: 'https://instagram.com/aidevix.uz', accent: 'text-pink-400' },
  ];

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
            {t('contact.kicker')}
          </div>
          <h1 className="font-display text-3xl sm:text-5xl font-black tracking-[-0.04em] mb-4">
            {t('contact.title')}
          </h1>
          <p className={`text-sm sm:text-base ${muted}`}>{t('contact.subtitle')}</p>
        </motion.div>

        <div className="grid lg:grid-cols-[1.2fr_0.8fr] gap-6">
          {/* Form */}
          <motion.form
            onSubmit={handleSubmit}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            className={`rounded-3xl border p-6 sm:p-8 ${cardBg}`}
            noValidate
          >
            <h2 className="text-lg font-black mb-1">{t('contact.form.title')}</h2>
            <p className={`text-xs mb-6 ${muted}`}>{t('contact.form.required')}</p>

            {/* Honeypot */}
            <input
              type="text"
              name="company_url"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              value={form._honeypot}
              onChange={(e) => update('_honeypot', e.target.value)}
              className="absolute opacity-0 pointer-events-none w-0 h-0 -left-[9999px]"
            />

            <div className="grid sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${muted}`}>
                  {t('contact.form.name')} *
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => update('name', e.target.value.slice(0, 100))}
                  placeholder="Sunnatbek"
                  required
                  className={inputBase}
                />
              </div>
              <div>
                <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${muted}`}>
                  {t('contact.form.email')} *
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => update('email', e.target.value.slice(0, 200))}
                  placeholder="you@example.com"
                  required
                  className={inputBase}
                />
              </div>
            </div>

            <div className="mb-4">
              <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${muted}`}>
                {t('contact.form.subject')} *
              </label>
              <input
                type="text"
                value={form.subject}
                onChange={(e) => update('subject', e.target.value.slice(0, 200))}
                placeholder={t('contact.form.subjectPh')}
                required
                className={inputBase}
              />
            </div>

            <div className="mb-4">
              <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${muted}`}>
                {t('contact.form.message')} * <span className="text-slate-500">({form.message.length}/5000)</span>
              </label>
              <textarea
                value={form.message}
                onChange={(e) => update('message', e.target.value.slice(0, 5000))}
                placeholder={t('contact.form.messagePh')}
                required
                rows={6}
                className={`${inputBase} resize-y min-h-[140px]`}
              />
            </div>

            <AnimatePresence>
              {status && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className={`mb-4 rounded-xl p-3 text-sm flex items-start gap-2 ${
                    status.type === 'success'
                      ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                      : 'bg-red-500/10 border border-red-500/30 text-red-300'
                  }`}
                >
                  {status.type === 'success' ? <IoCheckmarkCircle className="flex-shrink-0 mt-0.5" /> : <IoAlertCircle className="flex-shrink-0 mt-0.5" />}
                  <span>{status.message}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <button
              type="submit"
              disabled={submitting}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-bold text-sm disabled:opacity-50 hover:shadow-lg hover:shadow-indigo-500/30 transition-shadow"
            >
              {submitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {t('contact.form.submitting')}
                </>
              ) : (
                <>
                  <IoSend /> {t('contact.form.submit')}
                </>
              )}
            </button>
          </motion.form>

          {/* Side panel */}
          <motion.div
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-4"
          >
            <div className={`rounded-3xl border p-6 ${cardBg}`}>
              <h3 className="font-bold text-sm uppercase tracking-widest text-slate-400 mb-4">
                {t('contact.side.direct')}
              </h3>
              <div className="space-y-3">
                {CONTACTS.map((c) => (
                  <a
                    key={c.label}
                    href={c.href}
                    target={c.href.startsWith('http') ? '_blank' : undefined}
                    rel="noopener noreferrer"
                    className={`group flex items-center gap-3 p-3 rounded-xl border transition-all hover:-translate-y-0.5 ${
                      isDark ? 'bg-white/3 border-white/5 hover:border-indigo-400/30' : 'bg-slate-50 border-slate-200 hover:border-indigo-400/60'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-lg ${c.accent}`}>
                      {c.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`text-xs uppercase tracking-wider ${muted}`}>{c.label}</div>
                      <div className="font-bold text-sm truncate">{c.value}</div>
                    </div>
                  </a>
                ))}
              </div>
            </div>

            <div className={`rounded-3xl border p-6 ${cardBg}`}>
              <h3 className="font-bold text-sm uppercase tracking-widest text-slate-400 mb-4">
                {t('contact.side.hours')}
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2">
                  <IoTimeOutline className={muted} />
                  <span>{t('contact.side.workhours')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <IoLocationOutline className={muted} />
                  <span>{t('contact.side.location')}</span>
                </div>
                <div className="flex items-start gap-2 mt-2 text-xs">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 animate-pulse flex-shrink-0" />
                  <span className={muted}>{t('contact.side.support247')}</span>
                </div>
              </div>
            </div>

            <div className={`rounded-3xl border p-6 ${cardBg}`}>
              <h3 className="font-bold text-sm uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2">
                <IoChatbubbles /> {t('contact.side.help.title')}
              </h3>
              <p className={`text-sm mb-4 ${muted}`}>{t('contact.side.help.text')}</p>
              <Link
                href="/help"
                className="inline-flex items-center gap-1.5 text-sm font-bold text-indigo-400 hover:text-indigo-300"
              >
                {t('contact.side.help.cta')} →
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
