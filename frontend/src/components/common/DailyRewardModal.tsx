'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import { FiGift, FiX } from 'react-icons/fi';
import gsap from 'gsap';
import api from '@api/axiosInstance';
import { useAuth } from '@hooks/useAuth';
import { updateUser } from '@store/slices/authSlice';
import { sounds } from '@utils/sounds';
import { useLang } from '@/context/LangContext';

const SESSION_KEY = 'daily_reward_dismissed';

const isClaimAvailableToday = (lastClaimedDaily?: string | null) => {
  if (!lastClaimedDaily) {
    return true;
  }

  const lastClaim = new Date(lastClaimedDaily);
  if (Number.isNaN(lastClaim.getTime())) {
    return true;
  }

  // UTC kun bo'yicha solishtirish (backend bilan bir xil)
  const todayUTC = new Date().toISOString().slice(0, 10);
  const lastClaimUTC = lastClaim.toISOString().slice(0, 10);
  return todayUTC !== lastClaimUTC;
};

const isDismissedThisSession = () => {
  try {
    const val = sessionStorage.getItem(SESSION_KEY);
    if (!val) return false;
    // Bugungi kun uchun dismiss qilinganini tekshirish
    return val === new Date().toISOString().slice(0, 10);
  } catch {
    return false;
  }
};

const markDismissed = () => {
  try {
    sessionStorage.setItem(SESSION_KEY, new Date().toISOString().slice(0, 10));
  } catch {
    // sessionStorage not available
  }
};

export default function DailyRewardModal() {
  const dispatch = useDispatch();
  const { user, isLoggedIn } = useAuth();
  const { t } = useLang();
  const [show, setShow] = useState(false);
  const [rewardClaimed, setRewardClaimed] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (
      !isLoggedIn ||
      !isClaimAvailableToday(user?.lastClaimedDaily) ||
      isDismissedThisSession()
    ) {
      setShow(false);
      return;
    }

    const timer = setTimeout(() => {
      setShow(true);
    }, 1500);

    return () => clearTimeout(timer);
  }, [isLoggedIn, user?.lastClaimedDaily]);

  useEffect(() => {
    if (!show || !modalRef.current || !contentRef.current) {
      return;
    }

    gsap.fromTo(modalRef.current, { opacity: 0 }, { opacity: 1, duration: 0.3 });
    gsap.fromTo(
      contentRef.current,
      { scale: 0.5, y: 50, opacity: 0 },
      { scale: 1, y: 0, opacity: 1, duration: 0.6, ease: 'back.out(1.5)' },
    );
  }, [show]);

  const closeModal = useCallback(() => {
    markDismissed();
    if (modalRef.current) {
      gsap.to(modalRef.current, {
        opacity: 0,
        duration: 0.3,
        onComplete: () => setShow(false),
      });
      return;
    }

    setShow(false);
  }, []);

  const handleClaim = async () => {
    if (rewardClaimed || claiming) {
      return;
    }

    setClaiming(true);
    try {
      const { data } = await api.post('/auth/daily-reward');
      setRewardClaimed(true);
      markDismissed();
      sounds.coin();

      dispatch(
        updateUser({
          xp: data.xp,
          streak: data.streak,
          lastClaimedDaily: data.lastClaimedDaily,
        }),
      );

      gsap.to(contentRef.current, {
        scale: 1.05,
        duration: 0.2,
        yoyo: true,
        repeat: 1,
      });

      setTimeout(() => {
        closeModal();
      }, 1500);
    } catch (error) {
      console.error(error);
      closeModal();
    } finally {
      setClaiming(false);
    }
  };

  if (!show) {
    return null;
  }

  return (
    <div
      ref={modalRef}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0A0E1A]/80 px-4 backdrop-blur-sm"
    >
      <div
        ref={contentRef}
        className="relative w-full max-w-sm overflow-hidden rounded-3xl border border-indigo-500/30 bg-gradient-to-b from-[#161D31] to-[#0A0E1A] p-8 text-center shadow-[0_0_50px_rgba(79,70,229,0.3)]"
      >
        <button
          onClick={closeModal}
          className="absolute right-4 top-4 rounded-full bg-white/5 p-1 text-slate-400 transition-colors hover:text-white"
        >
          <FiX size={20} />
        </button>

        <div className="pointer-events-none absolute left-1/2 top-1/4 h-32 w-32 -translate-x-1/2 rounded-full bg-yellow-500/20 blur-[50px]" />

        <div className="relative z-10 mb-4 flex justify-center text-6xl text-amber-300">
          <FiGift aria-hidden />
        </div>

        <h2 className="mb-2 text-2xl font-black text-white">{t('daily.title')}</h2>
        <p className="mb-8 text-sm leading-relaxed text-slate-400">{t('daily.sub')}</p>

        {rewardClaimed ? (
          <div className="flex items-center justify-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/20 px-6 py-3 font-bold text-emerald-400">
            {t('daily.claimed')}
          </div>
        ) : (
          <button
            onClick={handleClaim}
            disabled={claiming}
            className="w-full rounded-xl bg-gradient-to-r from-yellow-500 to-amber-500 py-4 text-lg font-black text-black shadow-[0_0_20px_rgba(252,211,77,0.4)] transition-transform active:scale-95 hover:to-yellow-400 disabled:opacity-60"
          >
            {t('daily.claim')}
          </button>
        )}
      </div>
    </div>
  );
}
