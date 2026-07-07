'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  IoCheckmarkCircle, IoCalendarClear, IoChatbubbles, IoCodeSlash,
  IoArrowForward, IoPersonCircle,
} from 'react-icons/io5';
import { mentorshipApi } from '@/api/mentorshipApi';
import { useLang } from '@/context/LangContext';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@hooks/useAuth';
import { toast } from 'react-hot-toast';

type Mentor = {
  _id: string;
  username: string;
  firstName?: string;
  lastName?: string;
  jobTitle?: string;
  rankTitle?: string;
};

// Yangi bo'limlar uchun qo'shimcha matn — asosiy label'lar mavjud i18n
// kalitlardan (mentorship.*) olinadi, bu blok faqat yangi kontent uchun.
const EXTRA: Record<'uz' | 'ru' | 'en', {
  kicker: string;
  steps: { title: string; text: string }[];
  chooseMentor: string;
  noMentors: string;
  duration: string;
  durationLabel: string;
  loginFirst: string;
  bookError: string;
  timeHint: string;
}> = {
  uz: {
    kicker: 'SHAXSIY YO\'L-YO\'RIQ',
    steps: [
      { title: 'Mentorni tanlang', text: 'MASTER va LEGEND darajali tajribali dasturchilar ro\'yxatidan o\'zingizga mosini tanlang.' },
      { title: 'Vaqtni belgilang', text: 'Sizga qulay kun va soatni tanlang. Sessiya 45 daqiqa davom etadi.' },
      { title: 'Sessiyaga kiring', text: 'Kod review, karyera maslahati yoki texnik savollar bo\'yicha jonli suhbat.' },
    ],
    chooseMentor: 'Mentorni tanlang',
    noMentors: 'Hozircha mavjud mentorlar yo\'q. Tez orada qaytib ko\'ring.',
    duration: '45 daqiqa',
    loginFirst: 'Sessiya band qilish uchun avval tizimga kiring',
    durationLabel: 'Davomiylik',
    bookError: 'Xatolik yuz berdi. Qaytadan urinib ko\'ring.',
    timeHint: 'Kamida 1 soat oldindan tanlang',
  },
  ru: {
    kicker: 'ПЕРСОНАЛЬНОЕ НАСТАВНИЧЕСТВО',
    steps: [
      { title: 'Выберите ментора', text: 'Выберите подходящего из списка опытных разработчиков уровня MASTER и LEGEND.' },
      { title: 'Назначьте время', text: 'Выберите удобные день и час. Сессия длится 45 минут.' },
      { title: 'Присоединяйтесь', text: 'Живой разговор: код-ревью, карьерный совет или технические вопросы.' },
    ],
    chooseMentor: 'Выберите ментора',
    noMentors: 'Пока нет доступных менторов. Загляните позже.',
    duration: '45 минут',
    durationLabel: 'Длительность',
    loginFirst: 'Войдите в систему, чтобы забронировать сессию',
    bookError: 'Произошла ошибка. Попробуйте ещё раз.',
    timeHint: 'Выберите минимум за 1 час',
  },
  en: {
    kicker: 'PERSONAL GUIDANCE',
    steps: [
      { title: 'Pick a mentor', text: 'Choose from experienced MASTER and LEGEND level developers.' },
      { title: 'Set a time', text: 'Pick a day and hour that works for you. Sessions last 45 minutes.' },
      { title: 'Join the session', text: 'A live conversation: code review, career advice or technical questions.' },
    ],
    chooseMentor: 'Choose your mentor',
    noMentors: 'No mentors available right now. Check back soon.',
    duration: '45 minutes',
    durationLabel: 'Duration',
    loginFirst: 'Log in first to book a session',
    bookError: 'Something went wrong. Please try again.',
    timeHint: 'Pick at least 1 hour ahead',
  },
};

const STEP_ICONS = [<IoPersonCircle key="s1" />, <IoCalendarClear key="s2" />, <IoChatbubbles key="s3" />];

export default function MentorshipPage() {
  const { t, lang } = useLang();
  const { isDark } = useTheme();
  const { isLoggedIn } = useAuth();
  const extra = EXTRA[lang as 'uz' | 'ru' | 'en'] || EXTRA.uz;

  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [loading, setLoading] = useState(true);
  const [topic, setTopic] = useState('');
  const [selectedMentor, setSelectedMentor] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    mentorshipApi.getMentors()
      .then((res) => {
        const items = res?.data?.data?.mentors || [];
        setMentors(items);
        if (items[0]?._id) setSelectedMentor(items[0]._id);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const bgClass = isDark ? 'bg-[#0A0E1A] text-white' : 'bg-slate-50 text-slate-900';
  const cardBg = isDark ? 'bg-[#0d1224]/70 border-white/5' : 'bg-white border-slate-200';
  const muted = isDark ? 'text-slate-400' : 'text-slate-600';
  const inputCls = `w-full rounded-xl border px-4 py-3 text-sm outline-none transition-colors ${
    isDark
      ? 'bg-white/5 border-white/10 text-white focus:border-indigo-400/60 placeholder:text-slate-500'
      : 'bg-white border-slate-200 text-slate-900 focus:border-indigo-500 placeholder:text-slate-400'
  }`;

  const minDateTime = useMemo(() => {
    const d = new Date(Date.now() + 60 * 60 * 1000);
    d.setMinutes(0, 0, 0);
    // datetime-local formati: YYYY-MM-DDTHH:mm (lokal vaqt)
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }, []);

  const canSubmit = Boolean(selectedMentor && scheduledAt && topic.trim()) && !submitting;

  const book = async () => {
    if (!isLoggedIn) {
      toast.error(extra.loginFirst);
      return;
    }
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await mentorshipApi.createBooking({
        mentorId: selectedMentor,
        topic: topic.trim(),
        scheduledAt: new Date(scheduledAt).toISOString(),
        durationMin: 45,
      });
      toast.success(t('mentorship.bookSent'));
      setTopic('');
      setScheduledAt('');
    } catch {
      toast.error(extra.bookError);
    } finally {
      setSubmitting(false);
    }
  };

  const mentorName = (m: Mentor) =>
    m.firstName ? `${m.firstName}${m.lastName ? ` ${m.lastName}` : ''}` : m.username;

  return (
    <div className={`min-h-screen pt-24 pb-20 ${bgClass}`}>
      <div className="mx-auto max-w-6xl px-4">
        {/* Hero */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-14 max-w-2xl"
        >
          <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-indigo-400 mb-3">
            {extra.kicker}
          </div>
          <h1 className="font-display text-3xl sm:text-5xl font-black tracking-[-0.04em] mb-4">
            {t('mentorship.title')}
          </h1>
          <p className={`text-base sm:text-lg leading-relaxed ${muted}`}>
            {t('mentorship.subtitle')}
          </p>
        </motion.section>

        {/* Booking: mentor tanlash + forma */}
        <section className="grid lg:grid-cols-[1.2fr_1fr] gap-6 mb-16 items-start">
          {/* Mentor cards */}
          <div>
            <h2 className="font-bold text-base mb-4">{extra.chooseMentor}</h2>

            {loading ? (
              <div className="grid sm:grid-cols-2 gap-3" aria-hidden="true">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className={`rounded-2xl border p-4 animate-pulse ${cardBg}`}>
                    <div className={`h-10 w-10 rounded-xl mb-3 ${isDark ? 'bg-white/10' : 'bg-slate-200'}`} />
                    <div className={`h-3.5 w-2/3 rounded mb-2 ${isDark ? 'bg-white/10' : 'bg-slate-200'}`} />
                    <div className={`h-3 w-1/2 rounded ${isDark ? 'bg-white/[0.06]' : 'bg-slate-100'}`} />
                  </div>
                ))}
              </div>
            ) : mentors.length === 0 ? (
              <div className={`rounded-2xl border p-8 text-center ${cardBg}`}>
                <IoChatbubbles className={`text-3xl mx-auto mb-3 ${muted}`} />
                <p className={`text-sm ${muted}`}>{extra.noMentors}</p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-3" role="radiogroup" aria-label={extra.chooseMentor}>
                {mentors.map((m) => {
                  const active = selectedMentor === m._id;
                  return (
                    <button
                      key={m._id}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => setSelectedMentor(m._id)}
                      className={`rounded-2xl border p-4 text-left transition-all active:scale-[0.98] ${
                        active
                          ? isDark
                            ? 'border-indigo-400/60 bg-indigo-500/10'
                            : 'border-indigo-500 bg-indigo-50'
                          : cardBg
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 text-white font-black text-sm">
                          {mentorName(m).charAt(0).toUpperCase()}
                        </div>
                        {active && <IoCheckmarkCircle className="text-xl text-indigo-400" />}
                      </div>
                      <div className="mt-3 font-bold text-sm">{mentorName(m)}</div>
                      <div className={`text-xs mt-0.5 ${muted}`}>{m.jobTitle || 'Engineer'}</div>
                      <span className={`mt-2 inline-block rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                        isDark ? 'border-amber-400/30 bg-amber-400/10 text-amber-300' : 'border-amber-500/30 bg-amber-50 text-amber-700'
                      }`}>
                        {m.rankTitle || 'MENTOR'}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Booking form */}
          <div className={`rounded-3xl border p-6 sm:p-7 relative overflow-hidden lg:sticky lg:top-24 ${cardBg}`}>
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-transparent to-purple-500/10 pointer-events-none" />
            <div className="relative grid gap-4">
              <div className="grid gap-2">
                <label htmlFor="mt-topic" className="text-sm font-semibold">{t('mentorship.topic')}</label>
                <input
                  id="mt-topic"
                  className={inputCls}
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder={t('mentorship.topicDefault')}
                  maxLength={120}
                />
              </div>

              <div className="grid gap-2">
                <label htmlFor="mt-time" className="text-sm font-semibold">{t('mentorship.time')}</label>
                <input
                  id="mt-time"
                  type="datetime-local"
                  className={inputCls}
                  value={scheduledAt}
                  min={minDateTime}
                  onChange={(e) => setScheduledAt(e.target.value)}
                />
                <p className={`text-xs ${muted}`}>{extra.timeHint}</p>
              </div>

              <div className={`flex items-center justify-between rounded-xl border px-4 py-3 text-sm ${
                isDark ? 'border-white/10 bg-white/[0.03]' : 'border-slate-200 bg-slate-50'
              }`}>
                <span className={muted}>{extra.durationLabel}</span>
                <span className="font-bold">{extra.duration}</span>
              </div>

              {isLoggedIn ? (
                <button
                  onClick={book}
                  disabled={!canSubmit}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 px-6 py-3.5 text-sm font-bold text-white transition-all hover:shadow-lg hover:shadow-indigo-500/30 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
                >
                  {submitting ? (
                    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden="true" />
                  ) : (
                    <IoCodeSlash />
                  )}
                  {t('mentorship.book')}
                </button>
              ) : (
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 px-6 py-3.5 text-sm font-bold text-white transition-all hover:shadow-lg hover:shadow-indigo-500/30"
                >
                  {extra.loginFirst} <IoArrowForward />
                </Link>
              )}
            </div>
          </div>
        </section>

        {/* Qanday ishlaydi — 3 qadam */}
        <section className="grid sm:grid-cols-3 gap-4">
          {extra.steps.map((s, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ delay: i * 0.06 }}
              className={`rounded-3xl border p-6 ${cardBg}`}
            >
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 text-white text-xl mb-4">
                {STEP_ICONS[i]}
              </div>
              <h3 className="font-bold text-base mb-2">{s.title}</h3>
              <p className={`text-sm leading-relaxed ${muted}`}>{s.text}</p>
            </motion.div>
          ))}
        </section>
      </div>
    </div>
  );
}
