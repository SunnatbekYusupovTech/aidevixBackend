'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useDispatch, useSelector } from 'react-redux';
import { AnimatePresence, motion } from 'framer-motion';
import { selectUser } from '@store/slices/authSlice';
import { useUserStats } from '@hooks/useUserStats';
import { useSubscription } from '@hooks/useSubscription';
import { fetchUserStats, updateProfileThunk } from '@store/slices/userStatsSlice';
import { uploadApi } from '@api/uploadApi';
import { toast } from 'react-hot-toast';
import { useLang } from '@/context/LangContext';
import { useAuth } from '@hooks/useAuth';
import {
  FiEdit2,
  FiMapPin,
  FiUser,
  FiBriefcase,
  FiInstagram,
  FiMail,
  FiCheckCircle,
  FiAward,
  FiZap,
  FiCamera,
  FiX,
  FiShield
} from 'react-icons/fi';
import { userApi } from '@api/userApi';
import api from '@api/axiosInstance';
import SavedPromptsSection from '@components/profile/SavedPromptsSection';
import { ROUTES } from '@utils/constants';

export default function ProfilePage() {
  const router = useRouter();
  const { isLoggedIn, loading: authLoading } = useAuth();
  const dispatch = useDispatch();
  const user = useSelector(selectUser);
  const { xp, level, badges, videosWatched, bio, skills, avatar, loading: statsLoading } = useUserStats();
  const sub = useSubscription();
  const { t, lang } = useLang();
  const profileLocalText = {
    security2fa: lang === 'en' ? 'Security / 2FA' : lang === 'ru' ? 'Безопасность / 2FA' : 'Xavfsizlik / 2FA',
    upgradeNow: lang === 'en' ? 'Upgrade Now' : lang === 'ru' ? 'Улучшить сейчас' : 'Upgrade Now',
    streakShieldTitle: lang === 'en' ? 'Streak Shield' : lang === 'ru' ? 'Щит серии' : 'Streak Shield',
    streakShieldDesc:
      lang === 'en'
        ? 'Protects your streak from a one-day break. You get 1 free shield each week.'
        : lang === 'ru'
          ? 'Защищает серию от однодневного пропуска. Каждую неделю вы получаете 1 бесплатный щит.'
          : 'Streakingizni bir kunlik uzilishdan himoya qiladi. Har hafta 1 ta bepul beriladi.',
    streakUsing: lang === 'en' ? 'Using...' : lang === 'ru' ? 'Применяется...' : 'Ishlatilmoqda...',
    streakUse: lang === 'en' ? 'Use Shield' : lang === 'ru' ? 'Использовать щит' : 'Himoyani ishlatish',
    aiStackTitle:
      lang === 'en'
        ? 'AI tools you use'
        : lang === 'ru'
          ? 'AI-инструменты, которые вы используете'
          : 'Siz ishlatadigan AI Tools',
    selectedCount:
      lang === 'en'
        ? 'selected'
        : lang === 'ru'
          ? 'выбрано'
          : 'tanlangan',
    aiStackSub:
      lang === 'en'
        ? 'Select the AI coding tools you use - this will appear on the leaderboard.'
        : lang === 'ru'
          ? 'Отметьте AI-инструменты для кодинга, которыми вы пользуетесь - это отобразится в лидерборде.'
          : "Qaysi AI coding toollardan foydalanishingizni belgilang - leaderboard'da ko'rinadi.",
    aiStackSaving: lang === 'en' ? 'Saving...' : lang === 'ru' ? 'Сохранение...' : 'Saqlanmoqda...',
    aiStackSave: lang === 'en' ? 'Save AI Stack' : lang === 'ru' ? 'Сохранить AI Stack' : 'AI Stack ni saqlash',
    yourStack: lang === 'en' ? 'Your Stack' : lang === 'ru' ? 'Ваш Stack' : "Sizning Stack'ingiz",
    shieldUsedOk:
      lang === 'en'
        ? 'Streak Shield used! Your streak is protected for today 🛡️'
        : lang === 'ru'
          ? 'Щит серии активирован! Сегодня ваша серия защищена 🛡️'
          : 'Streak Shield ishlatildi! Bugungi streakingiz himoyalandi 🛡️',
    genericError: lang === 'en' ? 'Something went wrong' : lang === 'ru' ? 'Произошла ошибка' : 'Xato yuz berdi',
    aiStackSaved: lang === 'en' ? 'AI Stack saved! ✅' : lang === 'ru' ? 'AI Stack сохранён! ✅' : 'AI Stack saqlandi! ✅',
    aiStackSaveError: lang === 'en' ? 'Failed to save' : lang === 'ru' ? 'Ошибка сохранения' : 'Saqlashda xato',
  };

  useEffect(() => {
    if (!authLoading && !isLoggedIn) {
      router.replace('/login?returnUrl=%2Fprofile');
    }
  }, [authLoading, isLoggedIn, router]);

  const AI_TOOLS = [
    { name: 'Claude Code', icon: '🤖', color: 'from-orange-500/10 to-amber-500/10 border-orange-500/20 text-orange-300' },
    { name: 'Cursor', icon: '⚡', color: 'from-blue-500/10 to-cyan-500/10 border-blue-500/20 text-blue-300' },
    { name: 'GitHub Copilot', icon: '🐙', color: 'from-slate-500/10 to-gray-500/10 border-slate-500/20 text-slate-300' },
    { name: 'ChatGPT', icon: '💬', color: 'from-emerald-500/10 to-teal-500/10 border-emerald-500/20 text-emerald-300' },
    { name: 'Gemini', icon: '✨', color: 'from-violet-500/10 to-purple-500/10 border-violet-500/20 text-violet-300' },
    { name: 'Windsurf', icon: '🌊', color: 'from-sky-500/10 to-blue-500/10 border-sky-500/20 text-sky-300' },
    { name: 'Devin', icon: '🦾', color: 'from-red-500/10 to-rose-500/10 border-red-500/20 text-red-300' },
    { name: 'Replit AI', icon: '🔁', color: 'from-pink-500/10 to-fuchsia-500/10 border-pink-500/20 text-pink-300' },
    { name: 'Codeium', icon: '🔮', color: 'from-indigo-500/10 to-blue-500/10 border-indigo-500/20 text-indigo-300' },
    { name: 'Other', icon: '🛠️', color: 'from-zinc-500/10 to-neutral-500/10 border-zinc-500/20 text-zinc-300' },
  ];

  const TABS = [
    t('profile.tab.info'),
    t('profile.tab.subs'),
    t('profile.tab.achievements'),
    t('profile.tab.savedPrompts'),
    'AI Stack',
  ];

  const [activeTab, setActiveTab] = useState(TABS[0]);
  const [selectedTools, setSelectedTools] = useState<string[]>(user?.aiStack || []);
  const [savingStack, setSavingStack] = useState(false);
  const [streakFreezes, setStreakFreezes] = useState<number>(0);
  const [usingFreeze, setUsingFreeze] = useState(false);

  useEffect(() => {
    if (user?.aiStack) setSelectedTools(user.aiStack);
  }, [user?.aiStack]);

  useEffect(() => {
    const controller = new AbortController();
    api.get('xp/stats', { signal: controller.signal })
      .then(({ data }) => {
        setStreakFreezes(data?.data?.streakFreezes ?? 0);
      })
      .catch((err) => {
        if (err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED') return;
        if (process.env.NODE_ENV !== 'production') {
          console.warn('xp/stats:', err?.message || err);
        }
      });
    return () => controller.abort();
  }, []);

  const handleUseFreeze = async () => {
    if (streakFreezes <= 0) return;
    setUsingFreeze(true);
    try {
      await userApi.useStreakFreeze();
      setStreakFreezes(prev => Math.max(0, prev - 1));
      toast.success(profileLocalText.shieldUsedOk);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || profileLocalText.genericError);
    } finally {
      setUsingFreeze(false);
    }
  };

  const toggleTool = (tool: string) => {
    setSelectedTools(prev =>
      prev.includes(tool) ? prev.filter(t => t !== tool) : [...prev, tool]
    );
  };

  const handleSaveStack = async () => {
    try {
      setSavingStack(true);
      await dispatch(updateProfileThunk({ aiStack: selectedTools })).unwrap();
      toast.success(profileLocalText.aiStackSaved);
    } catch {
      toast.error(profileLocalText.aiStackSaveError);
    } finally {
      setSavingStack(false);
    }
  };
  const avatarInputRef = useRef(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Sync activeTab when language changes
  useEffect(() => {
    setActiveTab(TABS[0]);
  }, [t('profile.tab.info')]);

  // Form states initialized properly from Redux/Stats
  const [editDraft, setEditDraft] = useState({
    ism: '',
    familiya: '',
    kasb: '',
    bio: '',
  });

  // Sync editDraft with server data when modal opens
  useEffect(() => {
    if (editOpen) {
      setEditDraft({
        ism: user?.firstName || '',
        familiya: user?.lastName || '',
        kasb: user?.jobTitle || '',
        bio: bio || '',
      });
    }
  }, [editOpen, user, bio]);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      await dispatch(updateProfileThunk({
        bio: editDraft.bio,
        ism: editDraft.ism,
        familiya: editDraft.familiya,
        kasb: editDraft.kasb
      })).unwrap();

      toast.success(t('profile.toast.updated'));
      setEditOpen(false);
    } catch (err) {
      toast.error(err || t('profile.toast.error'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    if (file.size > 2 * 1024 * 1024) {
      toast.error(t('profile.toast.avatarSize'));
      return;
    }

    const nextPreview = URL.createObjectURL(file);
    setAvatarPreview(nextPreview);

    try {
      setAvatarUploading(true);
      await uploadApi.uploadAvatar(file);
      toast.success(t('profile.toast.avatarUpdated'));
      dispatch(fetchUserStats());
      setAvatarPreview(null);
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        t('profile.toast.avatarError');
      toast.error(message);
      setAvatarPreview(null);
    } finally {
      setAvatarUploading(false);
    }
  };

  if (authLoading || !isLoggedIn) {
    return (
      <div className="min-h-screen bg-[#0A0E1A] flex items-center justify-center">
        <div className="loading loading-spinner loading-lg text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050507] px-3 pb-16 pt-20 text-slate-200 selection:bg-indigo-500/30 sm:px-6 sm:pb-20 sm:pt-28 lg:px-12">
      <div className="mx-auto max-w-6xl">

        {/* --- HERO SECTION --- */}
        <div className="relative mb-8 sm:mb-12">
          <div className="absolute inset-0 -z-10 translate-y-[-20%] rounded-full bg-gradient-to-r from-indigo-500/10 to-purple-500/10 blur-3xl"></div>

          <div className="relative overflow-hidden rounded-3xl border border-white/5 bg-[#0d101a] p-5 shadow-2xl sm:rounded-[2rem] sm:p-8 md:rounded-[2.5rem] md:p-12">
            <div className="flex flex-col items-center gap-6 md:flex-row md:gap-8 lg:gap-10">

              {/* Avatar Section */}
              <div className="group relative shrink-0">
                <div className="h-28 w-28 rounded-full bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 p-1 shadow-[0_0_30px_rgba(99,102,241,0.2)] sm:h-32 sm:w-32 md:h-40 md:w-40">
                  <div className="h-full w-full overflow-hidden rounded-full bg-[#0d101a] p-1">
                    <img
                      src={avatarPreview || avatar || user?.avatar || `https://ui-avatars.com/api/?name=${user?.username || 'U'}&background=312e81&color=fff&size=200`}
                      alt="Profile"
                      className="h-full w-full rounded-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                  </div>
                </div>

                <button
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={avatarUploading}
                  className="absolute bottom-1 right-1 flex h-9 w-9 items-center justify-center rounded-full border-4 border-[#0d101a] bg-indigo-500 text-white shadow-lg transition-all hover:scale-110 hover:bg-indigo-400 active:scale-95 disabled:opacity-50 sm:bottom-2 sm:right-2 sm:h-10 sm:w-10"
                  aria-label="Change avatar"
                >
                  <FiCamera size={16} className="sm:hidden" />
                  <FiCamera size={18} className="hidden sm:block" />
                </button>
                <input ref={avatarInputRef} type="file" className="hidden" accept="image/*" onChange={handleAvatarChange} />
              </div>

              {/* User Identity Info */}
              <div className="min-w-0 flex-1 text-center md:text-left">
                <div className="mb-3 flex flex-col items-center gap-2 sm:gap-3 md:mb-4 md:flex-row md:items-center md:gap-4">
                  <h1 className="max-w-full text-balance break-words text-2xl font-black tracking-tight text-white sm:text-3xl md:text-4xl lg:text-5xl">
                    {user?.firstName || user?.username} {user?.lastName || ''}
                  </h1>
                  <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-emerald-400 sm:px-3 sm:text-xs">
                    <FiCheckCircle size={12} /> {t('profile.badge.active')}
                  </span>
                </div>

                <p className="mb-5 text-base font-medium text-slate-400 sm:mb-6 sm:text-lg md:text-xl">
                  {user?.jobTitle || t('profile.default.job')}
                </p>

                <div className="flex flex-wrap justify-center gap-x-6 gap-y-3 sm:gap-x-8 md:justify-start">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold uppercase tracking-tighter text-slate-500 sm:text-xs">{t('profile.stat.level')}</span>
                    <span className="flex items-center gap-1.5 text-xl font-black text-indigo-400 sm:text-2xl">
                       <FiZap size={18} className="fill-indigo-400" /> {level || 1}
                    </span>
                  </div>
                  <div className="hidden h-10 w-px bg-white/5 md:block"></div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold uppercase tracking-tighter text-slate-500 sm:text-xs">{t('profile.stat.xp')}</span>
                    <span className="text-xl font-black text-white sm:text-2xl">{xp || 0}</span>
                  </div>
                  <div className="hidden h-10 w-px bg-white/5 md:block"></div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold uppercase tracking-tighter text-slate-500 sm:text-xs">{t('profile.stat.videos')}</span>
                    <span className="text-xl font-black text-white sm:text-2xl">{videosWatched || 0}</span>
                  </div>
                </div>
              </div>

              {/* Edit + security */}
              <div className="flex w-full flex-col gap-2.5 self-stretch sm:flex-row md:w-auto md:flex-col md:self-start lg:flex-row">
                <button
                  onClick={() => setEditOpen(true)}
                  className="group flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-bold text-slate-200 transition-all hover:bg-white/10 sm:px-6"
                >
                  <FiEdit2 className="transition-colors group-hover:text-indigo-400" />
                  {t('profile.btn.edit')}
                </button>
                <Link
                  href={ROUTES.SETTINGS_SECURITY}
                  className="flex items-center justify-center gap-2 rounded-2xl border border-indigo-500/30 bg-indigo-500/10 px-5 py-3 text-sm font-bold text-indigo-200 transition-all hover:bg-indigo-500/20 sm:px-6"
                >
                  <FiShield size={18} />
                  {profileLocalText.security2fa}
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* --- TABS --- */}
        <div className="no-scrollbar -mx-3 mb-8 flex gap-2 overflow-x-auto px-3 pb-2 sm:mx-0 sm:mb-10 sm:px-0">
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`shrink-0 whitespace-nowrap rounded-2xl px-5 py-2.5 text-xs font-bold transition-all sm:px-8 sm:py-3 sm:text-sm ${
                activeTab === tab
                  ? 'bg-indigo-600 text-white shadow-[0_4px_20px_rgba(79,70,229,0.3)]'
                  : 'border border-transparent bg-white/5 text-slate-500 hover:border-white/5 hover:text-slate-300'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* --- TAB CONTENT --- */}
        <AnimatePresence mode="wait">
          {activeTab === t('profile.tab.info') && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-8"
            >
              {/* Left Details */}
              <div className="space-y-6 sm:space-y-8 lg:col-span-2">
                <div className="rounded-2xl border border-white/5 bg-[#0d101a] p-5 shadow-xl sm:rounded-3xl sm:p-8">
                  <h3 className="mb-6 flex items-center gap-3 text-lg font-bold text-white sm:mb-8 sm:text-xl">
                    <FiUser className="text-indigo-500" />
                    {t('profile.section.info')}
                  </h3>

                  <div className="mb-6 grid grid-cols-1 gap-5 sm:mb-8 sm:grid-cols-2 sm:gap-6">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-600">{t('profile.field.firstName')}</label>
                      <p className="break-words text-base font-bold text-white sm:text-lg">{user?.firstName || t('profile.notSet')}</p>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-600">{t('profile.field.lastName')}</label>
                      <p className="break-words text-base font-bold text-white sm:text-lg">{user?.lastName || t('profile.notSet')}</p>
                    </div>
                  </div>

                  <div className="mb-6 space-y-1 sm:mb-8">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-600">{t('profile.field.job')}</label>
                    <p className="break-words text-base font-bold text-white sm:text-lg">{user?.jobTitle || t('profile.default.job')}</p>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-600">{t('profile.field.bio')}</label>
                    <p className="break-words italic leading-relaxed text-slate-400">
                      &ldquo;{bio || t('profile.noBio')}&rdquo;
                    </p>
                  </div>
                </div>

                {/* Skills Section */}
                <div className="rounded-2xl border border-white/5 bg-[#0d101a] p-5 shadow-xl sm:rounded-3xl sm:p-8">
                  <h3 className="mb-6 flex items-center gap-3 text-lg font-bold text-white sm:mb-8 sm:text-xl">
                    <FiAward className="text-indigo-500" />
                    {t('profile.section.skills')}
                  </h3>
                  <div className="flex flex-wrap gap-2 sm:gap-3">
                    {skills?.length > 0 ? skills.map((skill, i) => (
                      <span key={i} className="rounded-xl border border-indigo-500/10 bg-indigo-500/5 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-indigo-300 sm:px-4 sm:py-2 sm:text-xs">
                        {skill}
                      </span>
                    )) : (
                      <p className="italic text-slate-500">{t('profile.noSkills')}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Side Info */}
              <div className="space-y-6 sm:space-y-8">
                <div className="rounded-2xl border border-white/5 bg-[#0d101a] p-5 shadow-xl sm:rounded-3xl sm:p-8">
                  <h3 className="mb-6 text-lg font-bold text-white sm:mb-8 sm:text-xl">{t('profile.section.contact')}</h3>
                  <div className="space-y-5 sm:space-y-6">
                    <div className="flex min-w-0 items-center gap-3 sm:gap-4">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/5 text-slate-400 sm:h-12 sm:w-12">
                        <FiMail size={20} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-black uppercase text-slate-600">Email</p>
                        <p className="truncate font-bold text-slate-200">{user?.email}</p>
                      </div>
                    </div>
                    <div className="flex min-w-0 items-center gap-3 sm:gap-4">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-500/5 text-indigo-400 sm:h-12 sm:w-12">
                        <FiInstagram size={20} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-black uppercase text-slate-600">Instagram</p>
                        <p className="truncate font-bold text-slate-200">@{sub?.instagram?.username || t('profile.needsLink')}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 p-5 text-white shadow-2xl sm:rounded-3xl sm:p-8">
                   <div className="relative z-10">
                      <h4 className="mb-2 text-xl font-black italic sm:text-2xl">Aidevix Pro</h4>
                      <p className="mb-5 text-sm text-white/70 sm:mb-6">{t('profile.pro.desc')}</p>
                      <button className="w-full rounded-2xl bg-white py-3 text-xs font-black uppercase tracking-widest text-indigo-600 transition-transform hover:scale-[1.02]">
                        {profileLocalText.upgradeNow}
                      </button>
                   </div>
                   <div className="absolute right-[-20%] top-[-20%] h-48 w-48 rounded-full bg-white/10 blur-3xl transition-transform duration-700 group-hover:scale-150"></div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === t('profile.tab.subs') && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-20 text-center bg-[#0d101a] border border-white/5 rounded-3xl text-slate-500 font-medium">
               {t('profile.subs.soon')}
            </motion.div>
          )}

          {activeTab === t('profile.tab.savedPrompts') && (
            <SavedPromptsSection />
          )}

          {activeTab === t('profile.tab.achievements') && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 sm:space-y-8">
              {/* Streak Shield Card */}
              <div className="rounded-2xl border border-indigo-500/20 bg-[#0d101a] p-5 sm:rounded-3xl sm:p-8">
                <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:gap-6">
                  <div className="flex w-full min-w-0 flex-1 items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-indigo-500/20 bg-indigo-500/10 text-2xl sm:h-14 sm:w-14 sm:text-3xl">
                      🛡️
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="flex flex-wrap items-center gap-2 text-base font-bold text-white sm:text-lg">
                        {profileLocalText.streakShieldTitle}
                        <span className="rounded-full border border-indigo-500/20 bg-indigo-500/10 px-2 py-0.5 text-xs font-bold text-indigo-400">
                          {streakFreezes} / 5
                        </span>
                      </h3>
                      <p className="mt-1 text-sm text-slate-400">
                        {profileLocalText.streakShieldDesc}
                      </p>
                      <div className="mt-3 flex gap-1.5">
                        {[...Array(5)].map((_, i) => (
                          <div
                            key={i}
                            className={`flex h-7 w-7 items-center justify-center rounded-lg border text-sm sm:h-8 sm:w-8 sm:text-base ${
                              i < streakFreezes
                                ? 'border-indigo-500/40 bg-indigo-500/20 text-indigo-300'
                                : 'border-white/5 bg-white/[0.03] text-slate-700'
                            }`}
                          >
                            🛡️
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={handleUseFreeze}
                    disabled={usingFreeze || streakFreezes <= 0}
                    className="w-full shrink-0 whitespace-nowrap rounded-2xl bg-indigo-500 px-6 py-3 text-sm font-bold text-white transition-all hover:bg-indigo-400 active:scale-95 disabled:opacity-40 sm:w-auto"
                  >
                    {usingFreeze ? profileLocalText.streakUsing : profileLocalText.streakUse}
                  </button>
                </div>
              </div>

              {/* Badges Grid */}
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5 md:grid-cols-4 md:gap-6">
                {badges?.length > 0 ? badges.map((badge, i) => (
                  <div key={i} className="rounded-2xl border border-white/5 bg-[#0d101a] p-4 text-center sm:rounded-3xl sm:p-6">
                    <div className="mb-2 text-3xl sm:mb-3 sm:text-4xl">{badge.icon || '🏆'}</div>
                    <h5 className="break-words text-sm font-bold text-white">{badge.name}</h5>
                    <p className="mt-1 text-[10px] uppercase text-slate-500">{new Date(badge.earnedAt).toLocaleDateString()}</p>
                  </div>
                )) : (
                  <div className="col-span-full py-16 text-center text-slate-500">{t('profile.noAchievements')}</div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'AI Stack' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 sm:space-y-8">
              <div className="rounded-2xl border border-white/5 bg-[#0d101a] p-5 shadow-xl sm:rounded-3xl sm:p-8">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <h3 className="flex items-center gap-2 text-lg font-bold text-white sm:gap-3 sm:text-xl">
                    <span className="text-2xl">⚡</span> {profileLocalText.aiStackTitle}
                  </h3>
                  <span className="text-xs text-slate-500">{selectedTools.length} / {AI_TOOLS.length} {profileLocalText.selectedCount}</span>
                </div>
                <p className="mb-6 text-sm text-slate-500 sm:mb-8">{profileLocalText.aiStackSub}</p>

                <div className="mb-8 grid grid-cols-2 gap-3 min-[420px]:grid-cols-3 sm:gap-4 lg:grid-cols-5 sm:mb-10">
                  {AI_TOOLS.map((tool) => {
                    const active = selectedTools.includes(tool.name);
                    return (
                      <button
                        key={tool.name}
                        onClick={() => toggleTool(tool.name)}
                        className={`relative flex flex-col items-center gap-2 rounded-2xl border bg-gradient-to-br p-4 transition-all duration-200 sm:gap-3 sm:p-5 ${
                          active
                            ? `${tool.color} scale-[1.03] shadow-lg`
                            : 'border-white/5 bg-white/[0.03] text-slate-500 hover:border-white/10 hover:bg-white/5'
                        }`}
                      >
                        {active && (
                          <div className="absolute right-2 top-2 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-500">
                            <span className="text-[8px] font-black text-white">✓</span>
                          </div>
                        )}
                        <span className="text-2xl sm:text-3xl">{tool.icon}</span>
                        <span className="text-center text-[11px] font-bold leading-tight sm:text-xs">{tool.name}</span>
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={handleSaveStack}
                  disabled={savingStack}
                  className="w-full rounded-2xl bg-indigo-600 py-3.5 text-xs font-bold uppercase tracking-widest text-white shadow-lg shadow-indigo-600/20 transition-all hover:bg-indigo-500 active:scale-95 disabled:opacity-50 sm:py-4"
                >
                  {savingStack ? profileLocalText.aiStackSaving : profileLocalText.aiStackSave}
                </button>
              </div>

              {selectedTools.length > 0 && (
                <div className="rounded-2xl border border-white/5 bg-[#0d101a] p-5 sm:rounded-3xl sm:p-8">
                  <h4 className="mb-5 text-xs font-bold uppercase tracking-widest text-slate-400 sm:mb-6 sm:text-sm">{profileLocalText.yourStack}</h4>
                  <div className="flex flex-wrap gap-2 sm:gap-3">
                    {selectedTools.map(tool => {
                      const t = AI_TOOLS.find(a => a.name === tool);
                      return (
                        <span key={tool} className={`flex items-center gap-2 rounded-xl border bg-gradient-to-r px-3 py-1.5 text-xs font-bold sm:px-4 sm:py-2 sm:text-sm ${t?.color || 'border-white/10 text-slate-300'}`}>
                          <span>{t?.icon}</span> {tool}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* --- EDIT MODAL --- */}
      <AnimatePresence>
        {editOpen && (
          <div className="fixed inset-0 z-[1000] flex items-end justify-center p-2 sm:items-center sm:p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-white/10 bg-[#0d101a] p-5 shadow-2xl sm:max-h-[88vh] sm:rounded-[2rem] sm:p-8 md:rounded-[2.5rem] md:p-12"
            >
              {/* Decoration */}
              <div className="pointer-events-none absolute right-0 top-0 -z-10 h-64 w-64 bg-indigo-500/5 blur-3xl"></div>

              <div className="mb-6 flex items-center justify-between gap-3 sm:mb-10">
                <h2 className="min-w-0 truncate text-xl font-black italic text-white sm:text-2xl md:text-3xl">{t('profile.modal.title')}</h2>
                <button onClick={() => setEditOpen(false)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/5 text-slate-400 transition-colors hover:text-white sm:h-10 sm:w-10">
                   <FiX size={20} />
                </button>
              </div>

              <form onSubmit={handleSave} className="space-y-5 sm:space-y-8">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6">
                  <div className="space-y-2">
                    <label className="px-1 text-[10px] font-black uppercase text-slate-500">{t('profile.field.firstName')}</label>
                    <input
                      type="text"
                      value={editDraft.ism}
                      onChange={(e) => setEditDraft({...editDraft, ism: e.target.value})}
                      className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 font-medium text-white transition-all focus:border-indigo-500/50 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 sm:px-5 sm:py-4"
                      placeholder={t('profile.modal.firstPlaceholder')}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="px-1 text-[10px] font-black uppercase text-slate-500">{t('profile.field.lastName')}</label>
                    <input
                      type="text"
                      value={editDraft.familiya}
                      onChange={(e) => setEditDraft({...editDraft, familiya: e.target.value})}
                      className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 font-medium text-white transition-all focus:border-indigo-500/50 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 sm:px-5 sm:py-4"
                      placeholder={t('profile.modal.lastPlaceholder')}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="px-1 text-[10px] font-black uppercase text-slate-500">{t('profile.modal.jobLabel')}</label>
                  <input
                    type="text"
                    value={editDraft.kasb}
                    onChange={(e) => setEditDraft({...editDraft, kasb: e.target.value})}
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 font-medium text-white transition-all focus:border-indigo-500/50 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 sm:px-5 sm:py-4"
                    placeholder={t('profile.modal.jobPlaceholder')}
                  />
                </div>

                <div className="space-y-2">
                  <label className="px-1 text-[10px] font-black uppercase text-slate-500">{t('profile.modal.bioLabel')}</label>
                  <textarea
                    rows={4}
                    value={editDraft.bio}
                    onChange={(e) => setEditDraft({...editDraft, bio: e.target.value})}
                    className="w-full resize-none rounded-2xl border border-white/10 bg-white/5 px-4 py-3 font-medium text-white transition-all focus:border-indigo-500/50 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 sm:px-5 sm:py-4"
                    placeholder={t('profile.modal.bioPlaceholder')}
                  />
                </div>

                <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:gap-4 sm:pt-4">
                  <button
                    type="button"
                    onClick={() => setEditOpen(false)}
                    className="flex-1 rounded-2xl bg-white/5 py-3.5 text-[10px] font-bold uppercase tracking-widest text-slate-400 transition-all hover:bg-white/10 sm:py-4"
                  >
                    {t('profile.modal.cancel')}
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="flex-1 rounded-2xl bg-indigo-600 py-3.5 text-[10px] font-bold uppercase tracking-widest text-white shadow-lg shadow-indigo-600/20 transition-all hover:bg-indigo-500 active:scale-95 disabled:opacity-50 sm:py-4"
                  >
                    {isSaving ? t('profile.modal.saving') : t('profile.modal.save')}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
