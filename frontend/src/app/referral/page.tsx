'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '@hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useLang } from '@/context/LangContext';
import { useTheme } from '@/context/ThemeContext';
import { FiCopy, FiCheck, FiUsers, FiAward } from 'react-icons/fi';
import { FaTelegramPlane, FaWhatsapp, FaFacebookF } from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import gsap from 'gsap';
import api from '@api/axiosInstance';
import { sounds } from '@utils/sounds';

export default function ReferralPage() {
  const { user, isLoggedIn, loading } = useAuth();
  const router = useRouter();
  const { t, lang } = useLang();
  const { isDark } = useTheme();
  const [copied, setCopied] = useState(false);
  const [referralData, setReferralData] = useState<any>(null);
  const [loadingData, setLoadingData] = useState(false);
  const referralLocalText = {
    yourCode: lang === 'en' ? 'Your code:' : lang === 'ru' ? 'Ваш код:' : 'Sizning kodingiz:',
    countSuffix: lang === 'en' ? 'people' : lang === 'ru' ? 'чел' : 'ta',
    loading: lang === 'en' ? 'Loading...' : lang === 'ru' ? 'Загрузка...' : 'Yuklanmoqda...',
    noTop:
      lang === 'en'
        ? 'No one is in the top ranking yet'
        : lang === 'ru'
          ? 'Пока никого нет в топ-рейтинге'
          : "Hali hech kim top reytingda yo'q",
    dateLocale: lang === 'en' ? 'en-US' : lang === 'ru' ? 'ru-RU' : 'uz-UZ',
  };

  const containerRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!loading && !isLoggedIn) router.push('/login');
  }, [loading, isLoggedIn, router]);

  useEffect(() => {
    if (!isLoggedIn) return;
    setLoadingData(true);
    api.get('/auth/referrals')
      .then(res => setReferralData(res.data?.data))
      .catch(err => console.error('Referral fetch error:', err))
      .finally(() => setLoadingData(false));
  }, [isLoggedIn]);

  useEffect(() => {
    if (isLoggedIn && cardRef.current) {
      gsap.fromTo(cardRef.current, { y: 50, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, ease: 'power3.out' });
    }
  }, [isLoggedIn]);

  if (loading || !isLoggedIn || !user) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <span className="loading loading-spinner text-indigo-500 w-12 h-12"></span>
      </div>
    );
  }

  const referralCode = (user as any).referralCode || '...';
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://aidevix.uz';
  const inviteLink = `${origin}/register?ref=${referralCode}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteLink);
    sounds.ding();
    setCopied(true);
    toast.success(t('referral.copied'));
    setTimeout(() => setCopied(false), 2000);
  };

  const shareText =
    lang === 'en'
      ? `🚀 Learning programming on Aidevix is awesome! ${inviteLink}`
      : lang === 'ru'
        ? `🚀 На Aidevix можно круто учиться программированию! ${inviteLink}`
        : `🚀 Aidevix platformasida dasturlashni zo'r o'rganish mumkin ekan! ${inviteLink}`;

  const totalFriends = referralData?.totalFriends ?? ((user as any)?.referralsCount || 0);
  const totalXp = referralData?.totalEarnedXp ?? (totalFriends * 1000);

  // Theme-aware classes
  const bg = isDark ? 'bg-[#0A0E1A]' : 'bg-slate-50';
  const cardBg = isDark ? 'bg-[#131B31]/80 border-white/5' : 'bg-white border-gray-200';
  const inputBg = isDark ? 'bg-[#0A0E1A] border-indigo-500/30 text-emerald-300' : 'bg-gray-50 border-indigo-200 text-emerald-700';
  const textMain = isDark ? 'text-white' : 'text-gray-900';
  const textMuted = isDark ? 'text-gray-400' : 'text-gray-500';
  const sectionBg = isDark ? 'bg-[#131B31]/50 border-white/5' : 'bg-white border-gray-200';
  const itemBg = isDark ? 'bg-white/5 hover:bg-white/10' : 'bg-gray-50 hover:bg-gray-100';
  const friendBg = isDark ? 'bg-[#0A0E1A]/50 border-white/5' : 'bg-gray-50 border-gray-200';

  return (
    <div className={`relative min-h-screen w-full min-w-0 max-w-full overflow-x-clip py-16 sm:py-24 ${bg}`} ref={containerRef}>
      {/* Background blobs */}
      <div className="absolute top-0 left-1/4 w-[50vw] h-[50vw] max-w-[800px] max-h-[800px] bg-emerald-600/10 rounded-full blur-[150px] -translate-y-1/2 pointer-events-none"></div>
      <div className="absolute bottom-0 right-1/4 w-[40vw] h-[40vw] max-w-[600px] max-h-[600px] bg-indigo-600/10 rounded-full blur-[120px] translate-y-1/3 pointer-events-none"></div>

      <div className="max-w-5xl mx-auto px-3 sm:px-6 relative z-10">

        {/* ─── Header ─── */}
        <div className="text-center mb-8 sm:mb-12" ref={cardRef}>
          <div className="inline-flex items-center gap-2 mb-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-3 sm:px-4 py-1.5 rounded-full font-medium tracking-wide text-xs sm:text-sm">
            <span className="animate-pulse">💎</span> {t('referral.badge')}
          </div>
          <h1 className={`mb-4 max-w-full text-balance text-2xl font-extrabold tracking-tight sm:mb-6 sm:text-3xl md:text-5xl lg:text-6xl ${textMain}`}>
            {t('referral.title')} <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-200">
              {t('referral.title2')}
            </span>
          </h1>
          <p className={`text-sm sm:text-base md:text-xl max-w-2xl mx-auto ${textMuted}`}>
            {t('referral.subtitle', { you: '1000 XP', friend: '500 XP' })}
          </p>
        </div>

        {/* ─── Main Grid ─── */}
        <div className="grid lg:grid-cols-5 gap-5 sm:gap-8 items-start mb-10 sm:mb-16">

          {/* Link Box */}
          <div className={`lg:col-span-3 backdrop-blur-xl border rounded-2xl sm:rounded-3xl p-4 sm:p-8 shadow-2xl relative overflow-hidden ${cardBg}`}>
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-indigo-500"></div>

            <h2 className={`text-xl sm:text-2xl font-bold mb-2 ${textMain}`}>{t('referral.yourLink')}</h2>
            <p className={`mb-5 sm:mb-8 text-sm ${textMuted}`}>{t('referral.yourLinkSub')}</p>

            {/* My Referral Code Badge */}
            <div className="mb-4 flex flex-wrap items-center gap-2 sm:gap-3">
              <span className={`text-sm font-medium ${textMuted}`}>{referralLocalText.yourCode}</span>
              <span className="bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 font-mono font-black text-sm sm:text-lg px-3 sm:px-4 py-1 rounded-xl tracking-widest">
                {referralCode}
              </span>
            </div>

            <div className="flex flex-col gap-4">
              <div className="relative flex flex-col gap-2 sm:block">
                <input
                  type="text"
                  value={inviteLink}
                  readOnly
                  className={`w-full border-2 font-medium py-3.5 sm:py-4 pl-4 sm:pl-6 pr-4 sm:pr-36 rounded-xl sm:rounded-2xl text-xs sm:text-sm focus:outline-none focus:border-indigo-500 transition-colors ${inputBg}`}
                />
                <button
                  onClick={handleCopy}
                  className="sm:absolute sm:right-2 sm:top-1/2 sm:-translate-y-1/2 w-full sm:w-auto justify-center bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2 px-4 sm:px-5 rounded-xl transition-all flex items-center gap-2 shadow-[0_0_15px_rgba(99,102,241,0.3)]"
                >
                  {copied ? <FiCheck size={16} /> : <FiCopy size={16} />}
                  <span>{copied ? t('referral.copied') : t('referral.copy')}</span>
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-3 mt-2">
                <span className={`text-sm ${textMuted}`}>{t('referral.shareVia')}</span>
                <a href={`https://t.me/share/url?url=${encodeURIComponent(inviteLink)}&text=${encodeURIComponent(shareText)}`}
                  target="_blank" rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full bg-[#1A2234] border border-white/5 flex items-center justify-center text-[#0088cc] hover:bg-[#0088cc] hover:text-white transition-all hover:scale-110">
                  <FaTelegramPlane size={18} />
                </a>
                <a href={`https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`}
                  target="_blank" rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full bg-[#1A2234] border border-white/5 flex items-center justify-center text-[#25D366] hover:bg-[#25D366] hover:text-white transition-all hover:scale-110">
                  <FaWhatsapp size={18} />
                </a>
                <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(inviteLink)}`}
                  target="_blank" rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full bg-[#1A2234] border border-white/5 flex items-center justify-center text-[#1877F2] hover:bg-[#1877F2] hover:text-white transition-all hover:scale-110">
                  <FaFacebookF size={18} />
                </a>
              </div>
            </div>
          </div>

          {/* Stats Box */}
          <div className={`lg:col-span-2 backdrop-blur-xl border rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-xl relative overflow-hidden flex flex-col gap-4 sm:gap-6 ${cardBg}`}>
            <div>
              <h3 className={`text-sm font-medium uppercase tracking-wider mb-2 ${textMuted}`}>{t('referral.totalFriends')}</h3>
              <div className="flex items-baseline gap-2">
                <span className={`text-4xl sm:text-5xl font-black ${textMain}`}>{loadingData ? '...' : totalFriends}</span>
                <span className={textMuted}>{referralLocalText.countSuffix}</span>
              </div>
            </div>
            <div className={`w-full h-px ${isDark ? 'bg-white/10' : 'bg-gray-200'}`}></div>
            <div>
              <h3 className={`text-sm font-medium uppercase tracking-wider mb-2 ${textMuted}`}>{t('referral.earned')}</h3>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl sm:text-4xl font-black text-emerald-400">+ {loadingData ? '...' : totalXp}</span>
                <span className={`text-base sm:text-xl font-bold ${textMuted}`}>XP</span>
              </div>
            </div>
            <div className={`rounded-2xl p-4 flex items-center justify-between ${isDark ? 'bg-indigo-900/30 border border-indigo-500/20' : 'bg-indigo-50 border border-indigo-100'}`}>
              <p className={`font-bold text-base leading-tight ${textMain}`}>{t('referral.unlimited')}</p>
              <span className="text-5xl filter drop-shadow-[0_0_15px_rgba(255,215,0,0.6)]">🏆</span>
            </div>
          </div>
        </div>

        {/* ─── Bottom: Leaderboard + History ─── */}
        <div className="grid lg:grid-cols-2 gap-5 sm:gap-8">

          {/* Top Referrers */}
          <div className={`backdrop-blur-md border rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-lg ${sectionBg}`}>
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-yellow-500/10 text-yellow-500 rounded-xl">
                <FiAward size={24} />
              </div>
              <h3 className={`text-lg sm:text-xl font-bold ${textMain}`}>{t('referral.topHeroes')}</h3>
            </div>
            <div className="space-y-3">
              {loadingData ? (
                <div className="text-center py-6 text-gray-500">{referralLocalText.loading}</div>
              ) : referralData?.topReferrers?.length > 0 ? (
                referralData.topReferrers.map((u: any, idx: number) => (
                  <div key={u._id} className={`flex items-center justify-between p-4 rounded-2xl transition-colors ${itemBg}`}>
                    <div className="flex items-center gap-4">
                      <span className="text-xl">{idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}</span>
                      <div>
                        <div className={`font-semibold flex items-center gap-2 ${textMain}`}>
                          {u.firstName || u.username}
                          <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded-md uppercase">{u.rankTitle}</span>
                        </div>
                        <div className="text-sm text-yellow-400">✨ {u.xp} XP</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-2xl font-black ${textMain}`}>{u.referralsCount}</div>
                      <div className="text-[10px] text-gray-400 uppercase tracking-widest">{t('general.friend')}</div>
                    </div>
                  </div>
                ))
              ) : (
                <div className={`text-center py-8 ${textMuted}`}>{referralLocalText.noTop}</div>
              )}
            </div>
          </div>

          {/* My Friends History */}
          <div className={`backdrop-blur-md border rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-lg ${sectionBg}`}>
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl">
                <FiUsers size={24} />
              </div>
              <h3 className={`text-lg sm:text-xl font-bold ${textMain}`}>{t('referral.myFriends')}</h3>
            </div>
            <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
              {loadingData ? (
                <div className="text-center py-6 text-gray-500">{referralLocalText.loading}</div>
              ) : referralData?.myFriends?.length > 0 ? (
                referralData.myFriends.map((friend: any) => (
                  <div key={friend._id} className={`flex items-center justify-between p-4 border rounded-2xl ${friendBg}`}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-800 flex items-center justify-center text-white font-bold">
                        {(friend.username?.[0] || 'U').toUpperCase()}
                      </div>
                      <div>
                        <div className={`font-medium ${textMain}`}>{friend.firstName || friend.username}</div>
                        <div className={`text-xs ${textMuted}`}>
                          {new Date(friend.createdAt).toLocaleDateString(referralLocalText.dateLocale)} {t('referral.joined')}
                        </div>
                      </div>
                    </div>
                    <div className="text-emerald-400 font-bold bg-emerald-500/10 px-3 py-1 rounded-lg text-sm">+1000 XP</div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12">
                  <div className="text-4xl mb-3">👥</div>
                  <p className={textMuted}>{t('referral.noFriends')}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(255,255,255,0.02); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
      `}} />
    </div>
  );
}
